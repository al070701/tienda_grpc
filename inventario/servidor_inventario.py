import grpc
from concurrent import futures

import inventario_pb2
import inventario_pb2_grpc
from threading import Lock
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

        return inventario_pb2.ListaProductos(productos=lista_productos)


    # ===============================
    # VERIFICAR STOCK
    # ===============================
    def VerificarStock(self, request, context):

        producto = productos_collection.find_one({"_id": request.id})

        if not producto:
            return inventario_pb2.StockResponse(
                stock=0,
                precio=0
            )

        return inventario_pb2.StockResponse(
            stock=producto["stock"],
            precio=producto["precio"]
        )

    # ===============================
    # DESCONTAR STOCK (CONCURRENCIA)
    # ===============================
    def DescontarStock(self, request, context):
        
        with lock:
            
            producto = productos_collection.find_one({
                "_id": request.id
            })

            if not producto:
                context.abort(
                    grpc.StatusCode.NOT_FOUND,
                    "Producto no encontrado"
                )

            if producto["stock"] < request.cantidad:

                return inventario_pb2.StockResponse(
                    stock=producto["stock"],
                    precio=producto["precio"]
                )

            nuevo_stock = producto["stock"] - request.cantidad

            productos_collection.update_one(
                {"_id": request.id},
                {
                    "$set": {
                        "stock": nuevo_stock
                    }
                }
            )

            return inventario_pb2.StockResponse(
                stock=nuevo_stock,
                precio=producto["precio"]
            )

    # ===============================
    # ADMIN: ACTUALIZAR STOCK
    # ===============================
    def ActualizarStock(self, request, context):

        producto = productos_collection.find_one({"_id": request.id})

        if not producto:
            context.abort(grpc.StatusCode.NOT_FOUND, "Producto no encontrado")

        productos_collection.update_one(
            {"_id": request.id},
            {
                "$set": {
                    "stock": request.stock
                    }
                    })
        
        producto_actualizado = productos_collection.find_one({
        "_id": request.id
        })

        return inventario_pb2.Producto(
            id=request.id,
            nombre=producto_actualizado["nombre"],
            precio=producto_actualizado["precio"],
            stock=producto_actualizado["stock"],
            imagen=producto_actualizado["imagen"],
            categoria=producto_actualizado["categoria"],
            descripcion=str(producto_actualizado.get("descripcion",""))
        )


    # ===============================
    # ADMIN: ACTUALIZAR PRECIO
    # ===============================
    def ActualizarPrecio(self, request, context):

        producto = productos_collection.find_one({"_id": request.id})

        if not producto:
            context.abort(grpc.StatusCode.NOT_FOUND, "Producto no encontrado")
            
        productos_collection.update_one(
           {"_id": request.id},
           {
               "$set": {
                   "precio": request.precio
                   }
                   })
            
        producto_actualizado = productos_collection.find_one({
                "_id": request.id
                })
            
        return inventario_pb2.Producto(
            id=request.id,
            nombre=producto_actualizado["nombre"],
            precio=producto_actualizado["precio"],
            stock=producto_actualizado["stock"],
            imagen=producto_actualizado["imagen"],
            categoria=producto_actualizado["categoria"],
            descripcion=str(producto_actualizado.get("descripcion",""))
        )


    # ===============================
    # ADMIN: ACTUALIZAR NOMBRE
    # ===============================
    def ActualizarNombre(self, request, context):

        producto = productos_collection.find_one({"_id": request.id})

        if not producto:
            context.abort(grpc.StatusCode.NOT_FOUND, "Producto no encontrado")

        productos_collection.update_one(
            {"_id": request.id},
            {
                "$set": {
                "nombre": request.nombre
                }
                })
        
        producto_actualizado = productos_collection.find_one({
            "_id": request.id
            })
        
        return inventario_pb2.Producto(
            id=request.id,
            nombre=producto_actualizado["nombre"],
            precio=producto_actualizado["precio"],
            stock=producto_actualizado["stock"],
            imagen=producto_actualizado["imagen"],
            categoria=producto_actualizado["categoria"],
            descripcion=str(producto_actualizado.get("descripcion",""))
        )


    # ===============================
    # ADMIN: ACTUALIZAR IMAGEN
    # ===============================
    def ActualizarImagen(self, request, context):

        producto = productos_collection.find_one({"_id": request.id})

        if not producto:
            context.abort(grpc.StatusCode.NOT_FOUND, "Producto no encontrado")

        productos_collection.update_one(
            {"_id": request.id},
            {
                "$set": {
                "imagen": request.imagen
                }
                })
        
        producto_actualizado = productos_collection.find_one({
            "_id": request.id
            })

        return inventario_pb2.Producto(
            id=request.id,
            nombre=producto_actualizado["nombre"],
            precio=producto_actualizado["precio"],
            stock=producto_actualizado["stock"],
            imagen=producto_actualizado["imagen"],
            categoria=producto_actualizado["categoria"],
            descripcion=str(producto_actualizado.get("descripcion",""))
        )
    
    # ===============================
    # ADMIN: ACTUALIZAR IMAGEN
    # ===============================
    
    def ActualizarCategoria(self, request, context):
        producto = productos_collection.find_one({"_id": request.id})
        
        if not producto:
            context.abort(grpc.StatusCode.NOT_FOUND, "Producto no encontrado")
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
            return inventario_pb2.Producto(
                id=request.id,
                nombre=producto_actualizado["nombre"],
                precio=producto_actualizado["precio"],
                stock=producto_actualizado["stock"],
                imagen=producto_actualizado["imagen"],
                categoria=producto_actualizado["categoria"],
                descripcion=str(producto_actualizado.get("descripcion",""))
                )
        
    # ===============================
    # ADMIN: AGREGAR PRODUCTO
    # ===============================
    def ActualizarDescripcion(self, request, context):
        producto = productos_collection.find_one({"_id": request.id})
        
        if not producto:
            context.abort(grpc.StatusCode.NOT_FOUND, "Producto no encontrado")
            productos_collection.update_one(
                {"_id": request.id},
                {
                    "$set": {
                        "descripcion": request.descripcion
                        }
                        })
            producto_actualizado = productos_collection.find_one({
                "_id": request.id
                })
            return inventario_pb2.Producto(
                id=request.id,
                nombre=producto_actualizado["nombre"],
                precio=producto_actualizado["precio"],
                stock=producto_actualizado["stock"],
                imagen=producto_actualizado["imagen"],
                categoria=producto_actualizado["categoria"],
                descripcion=str(producto_actualizado.get("descripcion",""))
                )

    # ===============================
    # ADMIN: AGREGAR PRODUCTO
    # ===============================
    def AgregarProducto(self, request, context):

        nuevo_id = (max(productos_collection.find({}, {"_id": 1}),key=lambda x: x["_id"]
        )["_id"] + 1 if productos_collection.count_documents({}) > 0 else 1)
        
        productos_collection.insert_one({
            "_id": nuevo_id,
            "nombre": request.nombre,
            "precio": request.precio,
            "stock": request.stock,
            "imagen": request.imagen,
            "categoria": request.categoria,
            "descripcion": request.descripcion
        })

        return inventario_pb2.Producto(
            id=nuevo_id,
            nombre=request.nombre,
            precio=request.precio,
            stock=request.stock,
            imagen=request.imagen,
            categoria=request.categoria,
            descripcion=str(request.descripcion)
        )


    # ===============================
    # ADMIN: ELIMINAR PRODUCTO
    # ===============================
    def EliminarProducto(self, request, context):

        productos_collection.delete_one({"_id": request.id})

        return inventario_pb2.Empty()


# ===============================
# SERVIDOR
# ===============================
def serve():

    server = grpc.server(futures.ThreadPoolExecutor(max_workers=10))

    inventario_pb2_grpc.add_InventarioServiceServicer_to_server(
        InventarioService(), server
    )

    server.add_insecure_port('[::]:50051')

    server.start()
    print("Servidor de Inventario corriendo en puerto 50051...")

    server.wait_for_termination()


if __name__ == '__main__':
    serve()