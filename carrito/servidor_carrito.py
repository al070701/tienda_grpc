import grpc
from concurrent import futures
import inventario_pb2
import inventario_pb2_grpc
import pago_pb2
import pago_pb2_grpc
import carrito_pb2
import carrito_pb2_grpc


class CarritoService(carrito_pb2_grpc.CarritoServiceServicer):

    # ===============================
    # LISTAR PRODUCTOS
    # ===============================
    def ListarProductos(self, request, context):
        try:
            canal_inventario = grpc.insecure_channel('inventario:50051')
            stub_inventario = inventario_pb2_grpc.InventarioServiceStub(canal_inventario)

            respuesta = stub_inventario.ListarProductos(
                inventario_pb2.Empty()
            )

            productos = []

            for p in respuesta.productos:
                productos.append(
                    carrito_pb2.Producto(
                        id=p.id,
                        nombre=p.nombre,
                        precio=p.precio,
                        imagen=p.imagen,
                        stock=getattr(p, "stock", 0),
                        categoria=getattr(p, "categoria", "todos"),
                        descripcion=getattr(p, "descripcion", "")
                        
                    )
                )

            return carrito_pb2.ListaProductos(productos=productos)

        except grpc.RpcError:
            context.set_details("Error al conectar con Inventario")
            context.set_code(grpc.StatusCode.INTERNAL)
            return carrito_pb2.ListaProductos()


    # ===============================
    # COMPRAR
    # ===============================
    def Comprar(self, request, context):

        try:
            # 🔹 Conectar con Inventario
            canal_inventario = grpc.insecure_channel('inventario:50051')
            stub_inventario = inventario_pb2_grpc.InventarioServiceStub(canal_inventario)

            # 1️⃣ Verificar stock (NO descuenta)
            respuesta_inv = stub_inventario.VerificarStock(
                inventario_pb2.ProductoRequest(
                    id=request.producto_id,
                    cantidad=request.cantidad
                )
            )

            if respuesta_inv.stock < request.cantidad:
                return carrito_pb2.CompraResponse(
                    exito=False,
                    mensaje="Stock insuficiente"
                )

            total = respuesta_inv.precio * request.cantidad

            # 🔹 Conectar con Pago
            canal_pago = grpc.insecure_channel('pago:50053')
            stub_pago = pago_pb2_grpc.PagoServiceStub(canal_pago)

            # 2️⃣ Procesar pago
            respuesta_pago = stub_pago.ProcesarPago(
                pago_pb2.PagoRequest(
                    total=total,
                    tarjeta=request.tarjeta,
                    nip=request.nip
                )
            )

            if not respuesta_pago.aprobado:
                return carrito_pb2.CompraResponse(
                    exito=False,
                    mensaje="Pago rechazado"
                )

            # 3️⃣ Si el pago fue aprobado → descontar stock
            stub_inventario.DescontarStock(
                inventario_pb2.ProductoRequest(
                    id=request.producto_id,
                    cantidad=request.cantidad
                )
            )

            return carrito_pb2.CompraResponse(
                exito=True,
                mensaje="Compra realizada con éxito"
            )

        except grpc.RpcError:
            context.set_details("Error interno en Carrito")
            context.set_code(grpc.StatusCode.INTERNAL)
            return carrito_pb2.CompraResponse(
                exito=False,
                mensaje="Error interno del servidor"
            )


def serve():
    server = grpc.server(futures.ThreadPoolExecutor(max_workers=10))

    carrito_pb2_grpc.add_CarritoServiceServicer_to_server(
        CarritoService(), server
    )

    server.add_insecure_port('[::]:50055')
    server.start()

    print("Servidor de Carrito corriendo en puerto 50055...")
    server.wait_for_termination()


if __name__ == '__main__':
    serve()