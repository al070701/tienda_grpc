from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi import UploadFile, File, Form
import shutil
import os
from fastapi.staticfiles import StaticFiles
from datetime import datetime
import grpc
from pydantic import BaseModel
from fastapi import Body
import carrito_pb2
import carrito_pb2_grpc

import inventario_pb2
import inventario_pb2_grpc

historial_compras = []
id_compra = 1

GRPC_SERVER = "26.145.132.10:50051"

app = FastAPI()

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
IMAGES_DIR = os.path.join(BASE_DIR, "images")
os.makedirs(IMAGES_DIR, exist_ok=True)

app.mount("/frontend", StaticFiles(directory="frontend"), name="frontend")
app.mount("/images", StaticFiles(directory=IMAGES_DIR), name="images")

class CompraRequest(BaseModel):
    id:int
    cantidad:int
    usuario:str
# ==============================
# CORS (MUY IMPORTANTE para frontend)
# ==============================
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ==============================
# Conexión con Carrito
# ==============================
channel_carrito = grpc.insecure_channel('26.145.132.10:50055')
stub_carrito = carrito_pb2_grpc.CarritoServiceStub(channel_carrito)

# ==============================
# Conexión con Inventario
# ==============================
channel_inventario = grpc.insecure_channel('26.145.132.10:50051')
stub_inventario = inventario_pb2_grpc.InventarioServiceStub(channel_inventario)


# ==============================
# HOME
# ==============================
@app.get("/")
def home():
    return {"mensaje": "Backend Web funcionando correctamente 🚀"}


# ==============================
# LISTAR PRODUCTOS
# ==============================
@app.get("/productos")
def listar_productos():

    try:
        response = stub_carrito.ListarProductos(carrito_pb2.Empty())

        productos = []

        for p in response.productos:
            productos.append({
                "id": p.id,
                "nombre": p.nombre,
                "precio": p.precio,
                "stock": p.stock,
                "imagen": p.imagen
            })

        return productos

    except grpc.RpcError as e:
        raise HTTPException(status_code=500, detail=str(e))


# ==============================
# COMPRAR PRODUCTO
# ==============================
@app.post("/comprar")
def comprar_producto(data: CompraRequest):

    global id_compra

    with grpc.insecure_channel(GRPC_SERVER) as channel:
        stub = inventario_pb2_grpc.InventarioServiceStub(channel)

        respuesta = stub.DescontarStock(
            inventario_pb2.ProductoRequest(
                id=data.id,
                cantidad=data.cantidad
            )
        )

    if respuesta.stock < 0:
        return {
            "stock": respuesta.stock
        }

    historial_compras.append({
        "id": id_compra,
        "usuario": data.usuario,
        "producto_id": data.id,
        "cantidad": data.cantidad,
        "estado": "pendiente",
        "fecha": datetime.now().strftime("%Y-%m-%d")
    })

    id_compra += 1

    return {
        "stock":respuesta.stock,
        "precio":respuesta.precio
    }

# =================================================
# ================= ADMIN ==========================
# =================================================


# ==============================
# ACTUALIZAR STOCK
# ==============================
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


# ==============================
# ACTUALIZAR PRECIO
# ==============================
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


# ==============================
# AGREGAR PRODUCTO
# ==============================
@app.post("/admin/agregar")
async def agregar_producto(

    nombre: str = Form(...),
    precio: float = Form(...),
    stock: int = Form(...),
    imagen: UploadFile = File(...)

):

    ruta = os.path.join(IMAGES_DIR, imagen.filename)

    with open(ruta,"wb") as buffer:
        shutil.copyfileobj(imagen.file,buffer)

    stub_inventario.AgregarProducto(

        inventario_pb2.NuevoProducto(
            nombre=nombre,
            precio=precio,
            stock=stock,
            imagen=imagen.filename
        )

    )
    
    return {"mensaje":"Producto agregado"}

# ==============================
# ELIMINAR PRODUCTO
# ==============================
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

@app.get("/historial/{usuario}")
def historial_usuario(usuario:str):

    pendientes = []
    entregados = []

    for compra in historial_compras:

        if compra["usuario"] == usuario:

            if compra["estado"] == "pendiente":
                pendientes.append(compra)

            else:
                entregados.append(compra)

    return {
        "pendientes":pendientes,
        "entregados":entregados
    }

@app.get("/admin/historial")
def historial_admin():
    return historial_compras

@app.post("/admin/cambiar_estado")
def cambiar_estado(data: dict = Body(...)):

    for compra in historial_compras:

        if compra["id"] == data["id"]:
            compra["estado"] = data["estado"]

    return {"mensaje":"Estado actualizado"}

