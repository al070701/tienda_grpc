from fastapi import FastAPI, HTTPException, UploadFile, File, Form, Body, Query, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

import shutil
import os
import grpc

from datetime import datetime
from pydantic import BaseModel
from typing import List, Optional
from uuid import uuid4
from pymongo import MongoClient

import inventario_pb2
import inventario_pb2_grpc


# =================================================
# CONFIGURACIÓN GENERAL
# =================================================

GRPC_SERVER = "inventario:50051"

MONGO_URI = os.getenv("MONGO_URI", "mongodb://mongo:27017/rellenitos")

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
                "precio": float(respuesta.precio)
            }
        ],
        "total": float(respuesta.precio) * data.cantidad,
        "estado": "pagado",
        "metodo_pago": "simulado",
        "fecha_creacion": datetime.now(),
        "fecha_pago": datetime.now(),
        "mercado_pago": None
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