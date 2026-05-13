FROM python:3.11-slim

WORKDIR /app

# Instalar certificados necesarios para conectarse a MongoDB Atlas por TLS/SSL
RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
    openssl \
    && update-ca-certificates \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .

RUN pip install --no-cache-dir -r requirements.txt

COPY . .

ENV PYTHONUNBUFFERED=1
ENV PYTHONPATH=/app

CMD ["python", "-c", "print('Imagen base creada correctamente')"]