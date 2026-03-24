import grpc
from concurrent import futures
import time

import pago_pb2
import pago_pb2_grpc


class PagoService(pago_pb2_grpc.PagoServiceServicer):

    def ProcesarPago(self, request, context):
        # Simulación simple de validación
        if request.nip == "1234":
            return pago_pb2.PagoResponse(
                aprobado=True,
                mensaje="Pago aprobado"
            )
        else:
            return pago_pb2.PagoResponse(
                aprobado=False,
                mensaje="NIP incorrecto"
            )


def serve():
    server = grpc.server(futures.ThreadPoolExecutor(max_workers=10))

    pago_pb2_grpc.add_PagoServiceServicer_to_server(
        PagoService(), server
    )

    server.add_insecure_port('[::]:50053')

    server.start()
    print("Servidor de Pago corriendo en puerto 50053...")
    server.wait_for_termination()


if __name__ == '__main__':
    serve()