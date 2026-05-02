FROM python:3.11-slim

WORKDIR /app

COPY services/notification/requirements.txt /tmp/requirements.txt
RUN pip install --no-cache-dir -r /tmp/requirements.txt

COPY . .

CMD ["python", "services/notification/app.py"]
