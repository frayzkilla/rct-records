FROM postgres:15-bookworm AS postgres-client

FROM python:3.13-slim-bookworm
COPY --from=postgres-client /usr/lib/postgresql/15 /usr/lib/postgresql/15
RUN apt-get update && apt-get install -y --no-install-recommends libpq5 libssl3 liblz4-1 libzstd1 libgssapi-krb5-2 && rm -rf /var/lib/apt/lists/*
ENV PATH="/usr/lib/postgresql/15/bin:${PATH}" PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY backup.py .
CMD ["python", "backup.py", "serve"]
