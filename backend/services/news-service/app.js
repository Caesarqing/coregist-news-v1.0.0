const express = require('express');

const { connectToMongo } = require('../shared/node/db');
const { healthCheck } = require('./controllers/health.controller');
const newsRouter = require('./routes/news.routes');

const app = express();
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));

app.get('/health', healthCheck);
app.use('/news', newsRouter);

async function start() {
  await connectToMongo();
  const port = Number(process.env.NEWS_SERVICE_PORT || process.env.PORT) || 3002;
  app.listen(port, () => {
    console.log(`📰 News service running on port ${port}`);
  });
}

start().catch((error) => {
  console.error('❌ News service 启动失败:', error);
  process.exit(1);
});
