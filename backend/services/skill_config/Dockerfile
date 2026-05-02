FROM python:3.11-slim

WORKDIR /app

COPY services/skill_config/requirements.txt /tmp/requirements.txt
RUN pip install --no-cache-dir -r /tmp/requirements.txt

COPY . .

CMD ["python", "services/skill_config/app.py"]
