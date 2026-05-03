const express = require('express');

const { connectToMongo } = require('../shared/node/db');
const { healthCheck } = require('./controllers/health.controller');
const { authRequired, legacyAiSearch, legacyNewsSearch } = require('./controllers/search.controller');
const searchRouter = require('./routes/search.routes');

const app = express();
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));

app.get('/health', healthCheck);
app.get('/news/search', authRequired, legacyNewsSearch);
app.post('/news/search', authRequired, legacyNewsSearch);
app.get('/ai-search', authRequired, legacyAiSearch);
app.post('/ai-search', authRequired, legacyAiSearch);
app.use('/search', searchRouter);

async function start() {
  await connectToMongo();
  const port = Number(process.env.SEARCH_SERVICE_PORT) || 3005;
  app.listen(port, () => {
    console.log(`🔎 Search service running on port ${port}`);
  });
}

start().catch((error) => {
  console.error('❌ Search service 启动失败:', error);
  process.exit(1);
});
