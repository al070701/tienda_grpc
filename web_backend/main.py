from fastapi import FastAPI, HTTPException, UploadFile, File, Form, Body, Query, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi import Request
from fastapi.responses import RedirectResponse

import shutil
import os
import grpc
import mercadopago

from datetime import datetime
from pydantic import BaseModel
from typing import List, Optional
from uuid import uuid4
from pymongo import MongoClient
from pymongo import ReturnDocument

import inventario_pb2
import inventario_pb2_grpc


# =================================================
# CONFIGURACIÓN GENERAL
# =================================================

GRPC_SERVER = "inventario:50051"

MONGO_URI = os.getenv("MONGO_URI", "mongodb://mongo:27017/rellenitos")

MERCADO_PAGO_ACCESS_TOKEN = os.getenv("MERCADO_PAGO_ACCESS_TOKEN")
PUBLIC_BASE_URL = os.getenv("PUBLIC_BASE_URL", "http://localhost:8000")

sdk_mercado_pago = None
if MERCADO_PAGO_ACCESS_TOKEN:
    sdk_mercado_pago = mercadopago.SDK(MERCADO_PAGO_ACCESS_TOKEN)

# =================================================
# MONGO
# =================================================

mongo_client = MongoClient(MONGO_URI)
mongo_db = mongo_client["rellenitos"]

pedidos_collection = mongo_db["pedidos"]
usuarios_collection = mongo_db["usuarios"]


# =================================================
# APP
# =================================================

app = FastAPI()

@app.get("/")
def inicio():
    return RedirectResponse(url="/frontend/pages/tienda.html")

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
IMAGES_DIR = os.path.join(BASE_DIR, "images")
os.makedirs(IMAGES_DIR, exist_ok=True)

app.mount("/frontend", StaticFiles(directory="frontend"), name="frontend")
app.mount("/images", StaticFiles(directory=IMAGES_DIR), name="images")


# =================================================
# CORS
# =================================================

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# =================================================
# CONEXIÓN gRPC CON INVENTARIO
# =================================================

channel_inventario = grpc.insecure_channel("inventario:50051")
stub_inventario = inventario_pb2_grpc.InventarioServiceStub(channel_inventario)


# =================================================
# MODELOS
# =================================================

class CompraRequest(BaseModel):
    id: int
    cantidad: int
    usuario: str

class ItemCompra(BaseModel):
    id: int
    nombre: str
    precio: float
    cantidad: int


class CompraCarritoRequest(BaseModel):
    usuario: str
    items: List[ItemCompra]

def construir_items_pedido_sin_descontar(data: CompraCarritoRequest):
    items_pedido = []
    total = 0

    for item in data.items:
        if item.cantidad <= 0:
            raise HTTPException(
                status_code=400,
                detail=f"Cantidad inválida para {item.nombre}"
            )

        subtotal = float(item.precio) * item.cantidad
        total += subtotal

        items_pedido.append({
            "producto_id": item.id,
            "nombre": item.nombre,
            "precio": float(item.precio),
            "cantidad": item.cantidad,
            "subtotal": subtotal
        })

    return items_pedido, total

def preparar_pedido_mercado_pago(data: CompraCarritoRequest):
    items_pedido = []
    items_mp = []
    total = 0

    with grpc.insecure_channel(GRPC_SERVER) as channel:
        stub = inventario_pb2_grpc.InventarioServiceStub(channel)

        for item in data.items:
            if item.cantidad <= 0:
                raise HTTPException(
                    status_code=400,
                    detail=f"Cantidad inválida para {item.nombre}"
                )

            respuesta = stub.VerificarStock(
                inventario_pb2.ProductoRequest(
                    id=item.id,
                    cantidad=item.cantidad
                )
            )

            if respuesta.stock < item.cantidad:
                raise HTTPException(
                    status_code=400,
                    detail=f"Stock insuficiente para {item.nombre}"
                )

            precio_real = float(respuesta.precio)
            subtotal = precio_real * item.cantidad
            total += subtotal

            items_pedido.append({
                "producto_id": item.id,
                "nombre": item.nombre,
                "precio": precio_real,
                "cantidad": item.cantidad,
                "subtotal": subtotal
            })

            items_mp.append({
                "title": item.nombre,
                "quantity": int(item.cantidad),
                "unit_price": precio_real,
                "currency_id": "MXN"
            })

    return items_pedido, items_mp, total

@app.post("/mercadopago/crear-preferencia")
def crear_preferencia_mercado_pago(data: CompraCarritoRequest):
    if sdk_mercado_pago is None:
        raise HTTPException(
            status_code=500,
            detail="Mercado Pago no está configurado. Revisa MERCADO_PAGO_ACCESS_TOKEN en .env"
        )

    if not data.items:
        raise HTTPException(status_code=400, detail="El carrito está vacío")
    
    items_pedido, items_mp, total = preparar_pedido_mercado_pago(data)
    
    pedido_id = f"MP-{uuid4().hex[:10]}"
    
    preference_data = {
        "items": items_mp,
        
        "external_reference": pedido_id,
        
        "back_urls": {
            "success": f"{PUBLIC_BASE_URL}/pago-exitoso",
            "failure": f"{PUBLIC_BASE_URL}/pago-fallido",
            "pending": f"{PUBLIC_BASE_URL}/pago-pendiente"
            },
            "auto_return": "approved",
            
            "notification_url": f"{PUBLIC_BASE_URL}/webhook/mercadopago?source_news=webhooks"
            
            }
    
    try:
        preference_response = sdk_mercado_pago.preference().create(preference_data)
        preference = preference_response["response"]
        
        pedido = {
            "_id": pedido_id,
            "usuario": data.usuario,
            "items": items_pedido,
            "total": total,
            "estado": "Pendiente de pago",
            "estado_pago": "pending",
            "metodo_pago": "mercado_pago",
            "mercado_pago": {
            "preference_id": preference.get("id")
            },
            "fecha_creacion": datetime.now(),
            "fecha_actualizacion": datetime.now(),
            "fecha_pago": None,
            "rechazado": False,
            "motivo_rechazo": None
            }
        pedidos_collection.insert_one(pedido)

        return {
            "pedido_id": pedido_id,
            "preference_id": preference.get("id"),
            "init_point": preference.get("init_point"),
            "sandbox_init_point": preference.get("sandbox_init_point")
        }

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"No se pudo crear la preferencia de Mercado Pago: {str(e)}"
        )   

@app.post("/webhook/mercadopago")
async def webhook_mercadopago(request: Request):
    try:
        try:
            payload = await request.json()
        except Exception:
            payload = {}

        print("Webhook recibido:", payload)

        tipo = (
            payload.get("type")
            or request.query_params.get("type")
            or request.query_params.get("topic")
        )

        data_payload = payload.get("data", {}) or {}

        payment_id = (
            data_payload.get("id")
            or request.query_params.get("data.id")
            or request.query_params.get("id")
        )

        if tipo == "payment" and payment_id:
            payment_response = sdk_mercado_pago.payment().get(payment_id)
            payment = payment_response.get("response", {})

            estado_pago = payment.get("status")
            external_reference = payment.get("external_reference")

            print("ID de pago:", payment_id)
            print("Estado:", estado_pago)
            print("Referencia externa:", external_reference)

            if not external_reference:
                return {"status": "ok", "mensaje": "Pago sin external_reference"}

            if estado_pago == "approved":
                aprobar_pedido_mercado_pago(
                    pedido_id=external_reference,
                    payment_id=str(payment_id)
                )

            elif estado_pago == "pending":
                pedidos_collection.update_one(
                    {"_id": external_reference},
                    {
                        "$set": {
                            "estado": "Pendiente de pago",
                            "estado_pago": "pending",
                            "mercado_pago_payment_id": str(payment_id),
                            "fecha_actualizacion": datetime.now()
                        }
                    }
                )

            elif estado_pago in ["rejected", "cancelled"]:
                pedidos_collection.update_one(
                    {"_id": external_reference},
                    {
                        "$set": {
                            "estado": "Rechazado",
                            "estado_pago": estado_pago,
                            "metodo_pago": "mercado_pago",
                            "mercado_pago_payment_id": str(payment_id),
                            "rechazado": True,
                            "motivo_rechazo": "Pago no aprobado por Mercado Pago",
                            "fecha_actualizacion": datetime.now()
                        }
                    }
                )

        return {"status": "ok"}

    except Exception as e:
        print("Error en webhook Mercado Pago:", e)
        return {"status": "error", "detail": str(e)}

@app.get("/pago-exitoso")
def pago_exitoso(request: Request):
    query = request.url.query
    extra = "&" + query if query else ""
    return RedirectResponse(
        url=f"/frontend/pages/tienda.html?mp=success{extra}"
    )


@app.get("/pago-fallido")
def pago_fallido(request: Request):
    query = request.url.query
    extra = "&" + query if query else ""
    return RedirectResponse(
        url=f"/frontend/pages/tienda.html?mp=failure{extra}"
    )

@app.get("/pago-pendiente")
def pago_pendiente(request: Request):
    query = request.url.query
    extra = "&" + query if query else ""
    return RedirectResponse(
        url=f"/frontend/pages/tienda.html?mp=pending{extra}"
    )

def aprobar_pedido_mercado_pago(pedido_id: str, payment_id: str):

    pedido = pedidos_collection.find_one_and_update(
        {
            "_id": pedido_id,
            "estado_pago": "pending"
        },
        {
            "$set": {
                "estado": "Procesando pago aprobado",
                "estado_pago": "processing_approved",
                "mercado_pago_payment_id": str(payment_id),
                "fecha_actualizacion": datetime.now()
            }
        },
        return_document=ReturnDocument.AFTER
    )

    if not pedido:

        pedido_existente = pedidos_collection.find_one({"_id": pedido_id})

        if not pedido_existente:
            print(f"No se encontró el pedido {pedido_id}")
            return

        if pedido_existente.get("estado_pago") == "approved":
            print(f"El pedido {pedido_id} ya estaba aprobado. No se descuenta stock otra vez.")
            return

        print(
            f"El pedido {pedido_id} no está pendiente. "
            f"Estado actual: {pedido_existente.get('estado_pago')}"
        )
        return

    items = pedido.get("items", [])

    if not items:
        pedidos_collection.update_one(
            {"_id": pedido_id},
            {
                "$set": {
                    "estado": "Error en pedido",
                    "estado_pago": "approved_stock_error",
                    "motivo_rechazo": "El pedido no tiene productos",
                    "fecha_actualizacion": datetime.now()
                }
            }
        )
        print(f"El pedido {pedido_id} no tiene productos.")
        return

    items_actualizados = []

    try:
        with grpc.insecure_channel(GRPC_SERVER) as channel:
            stub = inventario_pb2_grpc.InventarioServiceStub(channel)

            # 1. Validar TODO el stock otra vez antes de descontar
            for item in items:

                producto_id = int(item["producto_id"])
                cantidad = int(item["cantidad"])

                if cantidad <= 0:
                    raise Exception(f"Cantidad inválida para {item.get('nombre', producto_id)}")

                respuesta_stock = stub.VerificarStock(
                    inventario_pb2.ProductoRequest(
                        id=producto_id,
                        cantidad=cantidad
                    )
                )

                if int(respuesta_stock.stock) < cantidad:
                    pedidos_collection.update_one(
                        {"_id": pedido_id},
                        {
                            "$set": {
                                "estado": "Rechazado",
                                "estado_pago": "stock_insuficiente_post_pago",
                                "metodo_pago": "mercado_pago",
                                "mercado_pago_payment_id": str(payment_id),
                                "rechazado": True,
                                "motivo_rechazo": f"Stock insuficiente para {item.get('nombre', producto_id)} después del pago",
                                "fecha_actualizacion": datetime.now()
                            }
                        }
                    )

                    print(
                        f"Stock insuficiente para pedido {pedido_id}. "
                        f"Producto: {producto_id}. "
                        f"Disponible: {respuesta_stock.stock}. "
                        f"Solicitado: {cantidad}."
                    )
                    return

            # 2. Si todos tienen stock, ahora sí descontar por gRPC
            for item in items:

                producto_id = int(item["producto_id"])
                cantidad = int(item["cantidad"])

                respuesta = stub.DescontarStock(
                    inventario_pb2.ProductoRequest(
                        id=producto_id,
                        cantidad=cantidad
                    )
                )

                item["stock_restante"] = respuesta.stock
                items_actualizados.append(item)

    except Exception as e:
        pedidos_collection.update_one(
            {"_id": pedido_id},
            {
                "$set": {
                    "estado": "Error al descontar stock",
                    "estado_pago": "approved_stock_error",
                    "mercado_pago_payment_id": str(payment_id),
                    "fecha_actualizacion": datetime.now(),
                    "motivo_rechazo": str(e)
                }
            }
        )

        print(f"Error al descontar stock del pedido {pedido_id}: {e}")
        return

    pedidos_collection.update_one(
        {"_id": pedido_id},
        {
            "$set": {
                "items": items_actualizados,
                "estado": "En preparación",
                "estado_pago": "approved",
                "metodo_pago": "mercado_pago",
                "mercado_pago_payment_id": str(payment_id),
                "fecha_actualizacion": datetime.now(),
                "fecha_pago": datetime.now(),
                "rechazado": False,
                "motivo_rechazo": None
            }
        }
    )

    print(f"Pedido {pedido_id} aprobado y actualizado correctamente.")
    
@app.get("/mercadopago/confirmar-retorno")
def confirmar_retorno_mercado_pago(
    payment_id: str = None,
    external_reference: str = None
):
    if sdk_mercado_pago is None:
        raise HTTPException(
            status_code=500,
            detail="Mercado Pago no está configurado"
        )

    if not payment_id:
        raise HTTPException(
            status_code=400,
            detail="No llegó payment_id desde Mercado Pago"
        )

    payment_response = sdk_mercado_pago.payment().get(payment_id)
    payment = payment_response.get("response", {})

    estado_pago = payment.get("status")
    pedido_id = payment.get("external_reference") or external_reference

    if not pedido_id:
        raise HTTPException(
            status_code=400,
            detail="No se encontró external_reference del pedido"
        )

    if estado_pago == "approved":
        aprobar_pedido_mercado_pago(
            pedido_id=pedido_id,
            payment_id=str(payment_id)
        )

    elif estado_pago == "pending":
        pedidos_collection.update_one(
            {"_id": pedido_id},
            {
                "$set": {
                    "estado": "Pendiente de pago",
                    "estado_pago": "pending",
                    "mercado_pago_payment_id": str(payment_id),
                    "fecha_actualizacion": datetime.now()
                }
            }
        )

    elif estado_pago in ["rejected", "cancelled"]:
        pedidos_collection.update_one(
            {"_id": pedido_id},
            {
                "$set": {
                    "estado": "Rechazado",
                    "estado_pago": estado_pago,
                    "metodo_pago": "mercado_pago",
                    "mercado_pago_payment_id": str(payment_id),
                    "rechazado": True,
                    "motivo_rechazo": "Pago no aprobado por Mercado Pago",
                    "fecha_actualizacion": datetime.now()
                }
            }
        )

    return {
        "status": "ok",
        "estado_pago": estado_pago,
        "pedido_id": pedido_id
    }

@app.post("/comprar-carrito")
def comprar_carrito(data: CompraCarritoRequest):

    if not data.items:
        raise HTTPException(status_code=400, detail="El carrito está vacío")

    pedido_id = f"PED-{uuid4().hex[:10]}"

    items_pedido = []
    total = 0

    try:
        with grpc.insecure_channel(GRPC_SERVER) as channel:
            stub = inventario_pb2_grpc.InventarioServiceStub(channel)

            for item in data.items:
                if item.cantidad <= 0:
                    raise HTTPException(
                        status_code=400,
                        detail=f"Cantidad inválida para {item.nombre}"
                    )

                respuesta = stub.DescontarStock(
                    inventario_pb2.ProductoRequest(
                        id=item.id,
                        cantidad=item.cantidad
                    )
                )

                subtotal = float(item.precio) * item.cantidad
                total += subtotal

                items_pedido.append({
                    "producto_id": item.id,
                    "nombre": item.nombre,
                    "precio": float(item.precio),
                    "cantidad": item.cantidad,
                    "subtotal": subtotal,
                    "stock_restante": respuesta.stock
                })

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"No se pudo procesar la compra: {str(e)}"
        )

    pedido = {
        "_id": pedido_id,
        "usuario": data.usuario,
        "items": items_pedido,
        "total": total,
        "estado": "En preparación",
        "metodo_pago": "simulado",
        "fecha_creacion": datetime.now(),
        "fecha_actualizacion": datetime.now(),
        "rechazado": False,
        "motivo_rechazo": None
    }

    pedidos_collection.insert_one(pedido)

    return {
        "pedido_id": pedido_id,
        "mensaje": "Compra realizada correctamente",
        "estado": "En preparación",
        "total": total,
        "items": items_pedido
    }

# =================================================
# HOME
# =================================================

@app.get("/")
def home():
    return {"mensaje": "Backend Web funcionando correctamente 🚀"}


# =================================================
# LISTAR PRODUCTOS
# =================================================

@app.get("/productos")
def listar_productos():

    try:
        response = stub_inventario.ListarProductos(
            inventario_pb2.Empty()
        )

        productos = []

        for p in response.productos:
            productos.append({
                "id": p.id,
                "nombre": p.nombre,
                "precio": p.precio,
                "stock": p.stock,
                "imagen": p.imagen,
                "categoria": p.categoria,
                "descripcion": p.descripcion
            })

        return productos

    except Exception as e:
        print("ERROR EN /productos:")
        print(e)

        raise HTTPException(
            status_code=500,
            detail=str(e)
        )


# =================================================
# COMPRA 
# =================================================

@app.post("/comprar")
def comprar_producto(data: CompraRequest):

    with grpc.insecure_channel(GRPC_SERVER) as channel:
        stub = inventario_pb2_grpc.InventarioServiceStub(channel)

        respuesta = stub.DescontarStock(
            inventario_pb2.ProductoRequest(
                id=data.id,
                cantidad=data.cantidad
            )
        )

    pedido_id = f"LEG-{uuid4().hex[:10]}"

    pedido = {
        "_id": pedido_id,
        "usuario": data.usuario,
        "items": [
            {
                "producto_id": data.id,
                "cantidad": data.cantidad,
                "precio": float(respuesta.precio),
                "subtotal": float(respuesta.precio) * data.cantidad,
                "stock_restante": respuesta.stock
            }
        ],
        "total": float(respuesta.precio) * data.cantidad,
        "estado": "en preparacion",
        "estado_pago": "approved",
        "metodo_pago": "simulado",
        "fecha_actualizacion": datetime.now(),
        "fecha_pago": datetime.now(),
        "mercado_pago": None,
        "rechazado": False,
        "motivo_rechazo": None
    }

    pedidos_collection.insert_one(pedido)

    return {
        "pedido_id": pedido_id,
        "stock": respuesta.stock,
        "precio": respuesta.precio
    }

@app.get("/pedidos/cliente/{usuario}")
def obtener_pedidos_cliente(usuario: str):

    pedidos = list(
        pedidos_collection
        .find({"usuario": usuario})
        .sort("fecha_creacion", -1)
    )

    for pedido in pedidos:
        pedido["_id"] = str(pedido["_id"])

        if "fecha_creacion" in pedido:
            pedido["fecha_creacion"] = pedido["fecha_creacion"].isoformat()

        if "fecha_actualizacion" in pedido:
            pedido["fecha_actualizacion"] = pedido["fecha_actualizacion"].isoformat()

        if "fecha_pago" in pedido and pedido["fecha_pago"]:
            pedido["fecha_pago"] = pedido["fecha_pago"].isoformat()

    return pedidos

# =================================================
# HISTORIAL CLIENTE
# =================================================

@app.get("/historial/{usuario}")
def historial_usuario(usuario: str):

    pedidos = list(
        pedidos_collection.find(
            {"usuario": usuario}
        ).sort("fecha_creacion", -1)
    )

    for pedido in pedidos:
        pedido["_id"] = str(pedido["_id"])

    pendientes = [
        pedido for pedido in pedidos
        if pedido.get("estado") in ["pendiente_pago", "pago_no_aprobado", "stock_insuficiente_post_pago"]
    ]

    entregados = [
        pedido for pedido in pedidos
        if pedido.get("estado") not in ["pendiente_pago", "pago_no_aprobado", "stock_insuficiente_post_pago"]
    ]

    return {
        "pendientes": pendientes,
        "entregados": entregados,
        "todos": pedidos
    }


@app.get("/admin/pedidos")
def obtener_pedidos_admin():

    pedidos = list(
        pedidos_collection
        .find()
        .sort("fecha_creacion", -1)
    )

    for pedido in pedidos:
        pedido["_id"] = str(pedido["_id"])

        if "fecha_creacion" in pedido:
            pedido["fecha_creacion"] = pedido["fecha_creacion"].isoformat()

        if "fecha_actualizacion" in pedido:
            pedido["fecha_actualizacion"] = pedido["fecha_actualizacion"].isoformat()

    return pedidos

# =================================================
# HISTORIAL ADMIN GLOBAL
# =================================================

@app.get("/admin/historial")
def historial_admin():

    pedidos = list(
        pedidos_collection.find().sort("fecha_creacion", -1)
    )

    for pedido in pedidos:
        pedido["_id"] = str(pedido["_id"])

    return pedidos


@app.post("/admin/cambiar_estado")
def cambiar_estado(data: dict = Body(...)):

    pedido_id = str(data["id"])
    nuevo_estado = data["estado"]

    resultado = pedidos_collection.update_one(
        {"_id": pedido_id},
        {
            "$set": {
                "estado": nuevo_estado
            }
        }
    )

    if resultado.matched_count == 0:
        raise HTTPException(
            status_code=404,
            detail="Pedido no encontrado"
        )

    return {"mensaje": "Estado actualizado"}


# =================================================
# ADMIN: ACTUALIZAR STOCK
# =================================================

@app.post("/admin/stock")
def actualizar_stock(data: dict):

    try:
        stub_inventario.ActualizarStock(
            inventario_pb2.ActualizarStockRequest(
                id=data["id"],
                stock=data["stock"]
            )
        )

        return {"mensaje": "Stock actualizado"}

    except grpc.RpcError as e:
        raise HTTPException(status_code=500, detail=str(e))


# =================================================
# ADMIN: ACTUALIZAR PRECIO
# =================================================

@app.post("/admin/precio")
def actualizar_precio(data: dict):

    try:
        stub_inventario.ActualizarPrecio(
            inventario_pb2.ActualizarPrecioRequest(
                id=data["id"],
                precio=data["precio"]
            )
        )

        return {"mensaje": "Precio actualizado"}

    except grpc.RpcError as e:
        raise HTTPException(status_code=500, detail=str(e))


# =================================================
# ADMIN: AGREGAR PRODUCTO
# =================================================

@app.post("/admin/agregar")
async def agregar_producto(

    nombre: str = Form(...),
    precio: float = Form(...),
    stock: int = Form(...),
    categoria: str = Form(...),
    imagen: UploadFile = File(...),
    descripcion: str = Form(...)

):

    ruta = os.path.join(IMAGES_DIR, imagen.filename)

    with open(ruta, "wb") as buffer:
        shutil.copyfileobj(imagen.file, buffer)

    stub_inventario.AgregarProducto(
        inventario_pb2.NuevoProducto(
            nombre=nombre,
            precio=precio,
            stock=stock,
            imagen=imagen.filename,
            categoria=categoria,
            descripcion=descripcion
        )
    )

    return {"mensaje": "Producto agregado"}


# =================================================
# ADMIN: ELIMINAR PRODUCTO
# =================================================

@app.delete("/admin/eliminar/{id}")
def eliminar_producto(id: int):

    try:
        stub_inventario.EliminarProducto(
            inventario_pb2.EliminarProductoRequest(
                id=id
            )
        )

        return {"mensaje": "Producto eliminado"}

    except grpc.RpcError as e:
        raise HTTPException(status_code=500, detail=str(e))


# =================================================
# ADMIN: CAMBIAR NOMBRE
# =================================================

@app.post("/admin/cambiar_nombre")
async def cambiar_nombre(id: int = Form(...), nombre: str = Form(...)):

    with grpc.insecure_channel(GRPC_SERVER) as channel:
        stub = inventario_pb2_grpc.InventarioServiceStub(channel)

        stub.ActualizarNombre(
            inventario_pb2.ActualizarNombreRequest(
                id=id,
                nombre=nombre
            )
        )

    return {"mensaje": "Nombre actualizado"}


# =================================================
# ADMIN: CAMBIAR IMAGEN
# =================================================

@app.post("/admin/cambiar_imagen")
async def cambiar_imagen(id: int = Form(...), imagen: UploadFile = File(...)):

    ruta = os.path.join(IMAGES_DIR, imagen.filename)

    with open(ruta, "wb") as buffer:
        shutil.copyfileobj(imagen.file, buffer)

    with grpc.insecure_channel(GRPC_SERVER) as channel:
        stub = inventario_pb2_grpc.InventarioServiceStub(channel)

        stub.ActualizarImagen(
            inventario_pb2.ActualizarImagenRequest(
                id=id,
                imagen=imagen.filename
            )
        )

    return {"mensaje": "Imagen actualizada"}


class ActualizarEstadoPedidoRequest(BaseModel):
    estado: str
    motivo_rechazo: Optional[str] = None


@app.put("/admin/pedidos/{pedido_id}/estado")
def actualizar_estado_pedido(pedido_id: str, data: ActualizarEstadoPedidoRequest):

    estados_validos = [
        "En preparación",
        "En camino",
        "Entregado",
        "Rechazado"
    ]

    if data.estado not in estados_validos:
        raise HTTPException(
            status_code=400,
            detail="Estado no válido"
        )

    actualizacion = {
        "estado": data.estado,
        "fecha_actualizacion": datetime.now()
    }

    if data.estado == "Rechazado":
        actualizacion["rechazado"] = True
        actualizacion["motivo_rechazo"] = data.motivo_rechazo or "Compra rechazada por administración"
    else:
        actualizacion["rechazado"] = False
        actualizacion["motivo_rechazo"] = None

    resultado = pedidos_collection.update_one(
        {"_id": pedido_id},
        {"$set": actualizacion}
    )

    if resultado.matched_count == 0:
        raise HTTPException(
            status_code=404,
            detail="Pedido no encontrado"
        )

    return {
        "mensaje": "Estado actualizado correctamente",
        "pedido_id": pedido_id,
        "estado": data.estado
    }