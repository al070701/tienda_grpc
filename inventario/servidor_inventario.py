from multiprocessing import context
from urllib import request

import grpc
from concurrent import futures
from threading import Lock
from pymongo import ReturnDocument

import inventario_pb2
import inventario_pb2_grpc

from basedatos.db import productos_collection


lock = Lock()


class InventarioService(inventario_pb2_grpc.InventarioServiceServicer):

    # ===============================
    # LISTAR PRODUCTOS
    # ===============================
    def ListarProductos(self, request, context):

        lista_productos = []

        for producto in productos_collection.find():

            producto_pb2 = inventario_pb2.Producto(
                id=int(producto.get("_id", 0)),
                nombre=str(producto.get("nombre", "")),
                precio=float(producto.get("precio", 0)),
                stock=int(producto.get("stock", 0)),
                imagen=str(producto.get("imagen", "")),
                categoria=str(producto.get("categoria", "todos")),
                descripcion=str(producto.get("descripcion", ""))
            )

            lista_productos.append(producto_pb2)

        return inventario_pb2.ListaProductos(
            productos=lista_productos
        )

    # ===============================
    # VERIFICAR STOCK
    # ===============================
    def VerificarStock(self, request, context):

        producto = productos_collection.find_one({
            "_id": request.id
        })

        if not producto:
            return inventario_pb2.StockResponse(
                stock=0,
                precio=0
            )

        return inventario_pb2.StockResponse(
            stock=int(producto.get("stock", 0)),
            precio=float(producto.get("precio", 0))
        )

    # ===============================
    # DESCONTAR STOCK
    # ===============================
    def DescontarStock(self, request, context):

        cantidad = int(request.cantidad)
        producto_id = int(request.id)

        if cantidad <= 0:
            context.abort(
                grpc.StatusCode.INVALID_ARGUMENT,
                "La cantidad debe ser mayor a 0"
            )

        with lock:

            producto_actualizado = productos_collection.find_one_and_update(
                {
                    "_id": producto_id,
                    "stock": {
                        "$gte": cantidad
                    }
                },
                {
                    "$inc": {
                        "stock": -cantidad
                    }
                },
                return_document=ReturnDocument.AFTER
            )

            if not producto_actualizado:

                producto = productos_collection.find_one({
                    "_id": producto_id
                })

                if not producto:
                    context.abort(
                        grpc.StatusCode.NOT_FOUND,
                        "Producto no encontrado"
                    )

                context.abort(
                    grpc.StatusCode.FAILED_PRECONDITION,
                    "Stock insuficiente"
                )

            return inventario_pb2.StockResponse(
                stock=int(producto_actualizado.get("stock", 0)),
                precio=float(producto_actualizado.get("precio", 0))
            )
        
    # ===============================
    # ADMIN: ACTUALIZAR STOCK
    # ===============================
    def ActualizarStock(self, request, context):

        producto = productos_collection.find_one({
            "_id": request.id
        })

        if not producto:
            context.abort(
                grpc.StatusCode.NOT_FOUND,
                "Producto no encontrado"
            )

        productos_collection.update_one(
            {"_id": request.id},
            {
                "$set": {
                    "stock": request.stock
                }
            }
        )

        producto_actualizado = productos_collection.find_one({
            "_id": request.id
        })

        return self.crear_producto_pb2(producto_actualizado)

    # ===============================
    # ADMIN: ACTUALIZAR PRECIO
    # ===============================
    def ActualizarPrecio(self, request, context):

        producto = productos_collection.find_one({
            "_id": request.id
        })

        if not producto:
            context.abort(
                grpc.StatusCode.NOT_FOUND,
                "Producto no encontrado"
            )

        productos_collection.update_one(
            {"_id": request.id},
            {
                "$set": {
                    "precio": request.precio
                }
            }
        )

        producto_actualizado = productos_collection.find_one({
            "_id": request.id
        })

        return self.crear_producto_pb2(producto_actualizado)

    # ===============================
    # ADMIN: ACTUALIZAR NOMBRE
    # ===============================
    def ActualizarNombre(self, request, context):

        producto = productos_collection.find_one({
            "_id": request.id
        })

        if not producto:
            context.abort(
                grpc.StatusCode.NOT_FOUND,
                "Producto no encontrado"
            )

        productos_collection.update_one(
            {"_id": request.id},
            {
                "$set": {
                    "nombre": request.nombre
                }
            }
        )

        producto_actualizado = productos_collection.find_one({
            "_id": request.id
        })

        return self.crear_producto_pb2(producto_actualizado)

    # ===============================
    # ADMIN: ACTUALIZAR IMAGEN
    # ===============================
    def ActualizarImagen(self, request, context):

        producto = productos_collection.find_one({
            "_id": request.id
        })

        if not producto:
            context.abort(
                grpc.StatusCode.NOT_FOUND,
                "Producto no encontrado"
            )

        productos_collection.update_one(
            {"_id": request.id},
            {
                "$set": {
                    "imagen": request.imagen
                }
            }
        )

        producto_actualizado = productos_collection.find_one({
            "_id": request.id
        })

        return self.crear_producto_pb2(producto_actualizado)

    # ===============================
    # ADMIN: ACTUALIZAR CATEGORIA
    # ===============================
    def ActualizarCategoria(self, request, context):

        producto = productos_collection.find_one({
            "_id": request.id
        })

        if not producto:
            context.abort(
                grpc.StatusCode.NOT_FOUND,
                "Producto no encontrado"
            )

        productos_collection.update_one(
            {"_id": request.id},
            {
                "$set": {
                    "categoria": request.categoria
                }
            }
        )

        producto_actualizado = productos_collection.find_one({
            "_id": request.id
        })

        return self.crear_producto_pb2(producto_actualizado)

    # ===============================
    # ADMIN: ACTUALIZAR DESCRIPCION
    # ===============================
    def ActualizarDescripcion(self, request, context):

        producto = productos_collection.find_one({
            "_id": request.id
        })

        if not producto:
            context.abort(
                grpc.StatusCode.NOT_FOUND,
                "Producto no encontrado"
            )

        productos_collection.update_one(
            {"_id": request.id},
            {
                "$set": {
                    "descripcion": request.descripcion
                }
            }
        )

        producto_actualizado = productos_collection.find_one({
            "_id": request.id
        })

        return self.crear_producto_pb2(producto_actualizado)

    # ===============================
    # ADMIN: AGREGAR PRODUCTO
    # ===============================
    def AgregarProducto(self, request, context):

        if productos_collection.count_documents({}) > 0:

            ultimo_producto = max(
                productos_collection.find({}, {"_id": 1}),
                key=lambda x: x["_id"]
            )

            nuevo_id = int(ultimo_producto["_id"]) + 1

        else:

            nuevo_id = 1

        nuevo_producto = {
            "_id": nuevo_id,
            "nombre": request.nombre,
            "precio": request.precio,
            "stock": request.stock,
            "imagen": request.imagen,
            "categoria": request.categoria,
            "descripcion": request.descripcion
        }

        productos_collection.insert_one(nuevo_producto)

        return inventario_pb2.Producto(
            id=nuevo_id,
            nombre=request.nombre,
            precio=float(request.precio),
            stock=int(request.stock),
            imagen=request.imagen,
            categoria=request.categoria,
            descripcion=str(request.descripcion)
        )

    # ===============================
    # ADMIN: ELIMINAR PRODUCTO
    # ===============================
    def EliminarProducto(self, request, context):

        productos_collection.delete_one({
            "_id": request.id
        })

        return inventario_pb2.Empty()

    # ===============================
    # UTILIDAD: CONVERTIR MONGO A PB2
    # ===============================
    def crear_producto_pb2(self, producto):

        return inventario_pb2.Producto(
            id=int(producto.get("_id", 0)),
            nombre=str(producto.get("nombre", "")),
            precio=float(producto.get("precio", 0)),
            stock=int(producto.get("stock", 0)),
            imagen=str(producto.get("imagen", "")),
            categoria=str(producto.get("categoria", "todos")),
            descripcion=str(producto.get("descripcion", ""))
        )


# ===============================
# SERVIDOR
# ===============================
def serve():

    server = grpc.server(
        futures.ThreadPoolExecutor(max_workers=10)
    )

    inventario_pb2_grpc.add_InventarioServiceServicer_to_server(
        InventarioService(),
        server
    )

    server.add_insecure_port("[::]:50051")

    server.start()

    print("Servidor de Inventario corriendo en puerto 50051...")

    server.wait_for_termination()


if __name__ == "__main__":
    serve()