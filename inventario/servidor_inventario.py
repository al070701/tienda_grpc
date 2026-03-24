from urllib import request

import grpc
from concurrent import futures

import inventario_pb2
import inventario_pb2_grpc
from threading import Lock

lock = Lock()

# ===============================
# PRODUCTOS EN MEMORIA
# ===============================
productos = {
    1: {"nombre": "Laptop", "precio": 10000, "stock": 5, "imagen": "laptop.jpg"},
    2: {"nombre": "Mouse", "precio": 300, "stock": 10, "imagen": "mouse.jpg"},
    3: {"nombre": "Teclado", "precio": 300, "stock": 16, "imagen": "teclado.jpg"},
    4: {"nombre": "Audifonos", "precio": 300, "stock": 30, "imagen": "audifonos.jpg"},
    5: {"nombre": "Adaptador usb", "precio": 300, "stock": 10, "imagen": "adaptador_usb.jpg"},
    6: {"nombre": "Memoria usb", "precio": 300, "stock": 10, "imagen": "memoria_usb.jpg"},
    7: {"nombre": "Bocinas", "precio": 300, "stock": 70, "imagen": "bocinas.jpg"},
    8: {"nombre": "CableHDMI", "precio": 300, "stock": 10, "imagen": "cable_hdmi.jpg"},
    9: {"nombre": "Disco duro", "precio": 300, "stock": 150, "imagen": "disco_duro.jpg"},
    10: {"nombre": "Memoria RAM", "precio": 300, "stock": 10, "imagen": "ram.jpg"},
    11: {"nombre": "Pantalla", "precio": 3000, "stock": 100, "imagen": "pantalla.jpg"}
}


class InventarioService(inventario_pb2_grpc.InventarioServiceServicer):

    # ===============================
    # LISTAR PRODUCTOS
    # ===============================
    def ListarProductos(self, request, context):

        lista_productos = []

        for id, data in productos.items():

            producto = inventario_pb2.Producto(
                id=id,
                nombre=data["nombre"],
                precio=data["precio"],
                stock=data["stock"],
                imagen=data["imagen"]
            )

            lista_productos.append(producto)

        return inventario_pb2.ListaProductos(productos=lista_productos)


    # ===============================
    # VERIFICAR STOCK
    # ===============================
    def VerificarStock(self, request, context):

        producto = productos.get(request.id)

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

            producto = productos.get(request.id)

            if not producto:
                context.abort(grpc.StatusCode.NOT_FOUND, "Producto no encontrado")

            if producto["stock"] < request.cantidad:

                return inventario_pb2.StockResponse(
                    stock=producto["stock"],
                    precio=producto["precio"]
                )

            producto["stock"] -= request.cantidad

            return inventario_pb2.StockResponse(
                stock=producto["stock"],
                precio=producto["precio"]
            )


    # ===============================
    # ADMIN: ACTUALIZAR STOCK
    # ===============================
    def ActualizarStock(self, request, context):

        producto = productos.get(request.id)

        if not producto:
            context.abort(grpc.StatusCode.NOT_FOUND, "Producto no encontrado")

        producto["stock"] = request.stock

        return inventario_pb2.Producto(
            id=request.id,
            nombre=producto["nombre"],
            precio=producto["precio"],
            stock=producto["stock"],
            imagen=producto["imagen"]
        )


    # ===============================
    # ADMIN: ACTUALIZAR PRECIO
    # ===============================
    def ActualizarPrecio(self, request, context):

        producto = productos.get(request.id)

        if not producto:
            context.abort(grpc.StatusCode.NOT_FOUND, "Producto no encontrado")

        producto["precio"] = request.precio

        return inventario_pb2.Producto(
            id=request.id,
            nombre=producto["nombre"],
            precio=producto["precio"],
            stock=producto["stock"],
            imagen=producto["imagen"]
        )


    # ===============================
    # ADMIN: ACTUALIZAR NOMBRE
    # ===============================
    def ActualizarNombre(self, request, context):

        producto = productos.get(request.id)

        if not producto:
            context.abort(grpc.StatusCode.NOT_FOUND, "Producto no encontrado")

        producto["nombre"] = request.nombre

        return inventario_pb2.Producto(
            id=request.id,
            nombre=producto["nombre"],
            precio=producto["precio"],
            stock=producto["stock"],
            imagen=producto["imagen"]
        )


    # ===============================
    # ADMIN: ACTUALIZAR IMAGEN
    # ===============================
    def ActualizarImagen(self, request, context):

        producto = productos.get(request.id)

        if not producto:
            context.abort(grpc.StatusCode.NOT_FOUND, "Producto no encontrado")

        producto["imagen"] = request.imagen

        return inventario_pb2.Producto(
            id=request.id,
            nombre=producto["nombre"],
            precio=producto["precio"],
            stock=producto["stock"],
            imagen=producto["imagen"]
        )


    # ===============================
    # ADMIN: AGREGAR PRODUCTO
    # ===============================
    def AgregarProducto(self, request, context):

        nuevo_id = max(productos.keys()) + 1

        productos[nuevo_id] = {
            "nombre": request.nombre,
            "precio": request.precio,
            "stock": request.stock,
            "imagen": request.imagen
        }

        return inventario_pb2.Producto(
            id=nuevo_id,
            nombre=request.nombre,
            precio=request.precio,
            stock=request.stock,
            imagen=request.imagen
        )


    # ===============================
    # ADMIN: ELIMINAR PRODUCTO
    # ===============================
    def EliminarProducto(self, request, context):

        if request.id in productos:
            del productos[request.id]

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