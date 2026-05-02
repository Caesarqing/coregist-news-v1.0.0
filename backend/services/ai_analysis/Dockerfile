FROM python:3.11-slim

WORKDIR /app

COPY services/ai_analysis/requirements.txt /tmp/requirements.txt
RUN pip install --no-cache-dir -r /tmp/requirements.txt

COPY . .

CMD ["python", "services/ai_analysis/app.py"]
