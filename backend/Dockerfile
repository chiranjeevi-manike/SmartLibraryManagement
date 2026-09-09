FROM python:3.13-slim

WORKDIR /app

COPY requirements.txt requirements-dev.txt ./

RUN pip install --no-cache-dir -r requirements-dev.txt

COPY . .

EXPOSE 8000

CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}"]