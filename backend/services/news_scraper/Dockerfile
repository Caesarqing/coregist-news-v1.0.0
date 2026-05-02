FROM python:3.11-slim

WORKDIR /app

COPY services/news_scraper/requirements.txt /tmp/requirements.txt
RUN pip install --no-cache-dir -r /tmp/requirements.txt

COPY . .

CMD ["python", "services/news_scraper/app.py"]
