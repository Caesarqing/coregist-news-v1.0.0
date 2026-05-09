const express = require('express');

const { connectToMongo } = require('../shared/node/db');
const authRouter = require('./routes/auth.routes');
const notificationRouter = require('./routes/notification.routes');
const userRouter = require('./routes/user.routes');
const trackingRouter = require('./routes/tracking.routes');
const { healthCheck } = require('./controllers/health.controller');

const app = express();
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));

app.get('/health', healthCheck);
app.use('/auth', authRouter);
app.use('/notifications', notificationRouter);
app.use('/user', userRouter);
app.use('/tracking', trackingRouter);

async function start() {
  await connectToMongo();
  const port = Number(process.env.USER_SERVICE_PORT || process.env.PORT) || 3001;
  app.listen(port, () => {
    console.log(`👤 User service running on port ${port}`);
  });
}

start().catch((error) => {
  console.error('❌ User service 启动失败:', error);
  process.exit(1);
});
