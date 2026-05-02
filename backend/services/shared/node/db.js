const mongoose = require('mongoose');
const config = require('./config');

const mongoOptions = {
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
  connectTimeoutMS: 10000,
  maxPoolSize: 10,
  minPoolSize: 1,
  retryWrites: true,
};

let connectionPromise = null;

async function connectToMongo() {
  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  if (!config.mongoUri) {
    throw new Error('MONGODB_URI 环境变量未设置');
  }

  if (!connectionPromise) {
    connectionPromise = mongoose.connect(config.mongoUri, mongoOptions);
    mongoose.connection.on('error', (err) => {
      console.error('❌ MongoDB 连接错误:', err);
    });
    mongoose.connection.on('disconnected', () => {
      console.warn('⚠️ MongoDB 连接断开');
    });
  }

  await connectionPromise;
  return mongoose.connection;
}

module.exports = { connectToMongo };
