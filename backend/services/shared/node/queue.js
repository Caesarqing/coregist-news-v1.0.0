const amqp = require('amqplib');
const config = require('./config');

const QUEUE_NEWS_CRAWL_TRIGGER = 'news_crawl_trigger_queue';
const QUEUE_KEYWORD_SEARCH = 'keyword_search_queue';

let connectionPromise = null;
let channelPromise = null;

function resetQueueState() {
  connectionPromise = null;
  channelPromise = null;
}

function attachConnectionHandlers(connection) {
  connection.on('error', (error) => {
    console.error('❌ RabbitMQ 连接错误:', error?.message || error);
    resetQueueState();
  });
  connection.on('close', () => {
    console.warn('⚠️ RabbitMQ 连接已关闭');
    resetQueueState();
  });
}

function attachChannelHandlers(channel) {
  channel.on('error', (error) => {
    console.error('❌ RabbitMQ Channel 错误:', error?.message || error);
    channelPromise = null;
  });
  channel.on('close', () => {
    console.warn('⚠️ RabbitMQ Channel 已关闭');
    channelPromise = null;
  });
}

async function getChannel() {
  if (!channelPromise) {
    channelPromise = (async () => {
      if (!connectionPromise) {
        connectionPromise = amqp.connect(config.rabbitmqUrl).then((connection) => {
          attachConnectionHandlers(connection);
          return connection;
        });
      }
      const connection = await connectionPromise;
      const channel = await connection.createChannel();
      attachChannelHandlers(channel);
      await channel.assertQueue(QUEUE_NEWS_CRAWL_TRIGGER, { durable: true });
      await channel.assertQueue(QUEUE_KEYWORD_SEARCH, { durable: true });
      return channel;
    })().catch((error) => {
      resetQueueState();
      throw error;
    });
  }
  return channelPromise;
}

async function publish(queueName, payload) {
  const channel = await getChannel();
  channel.sendToQueue(queueName, Buffer.from(JSON.stringify(payload || {}), 'utf8'), {
    persistent: true,
    contentType: 'application/json',
  });
}

module.exports = {
  QUEUE_NEWS_CRAWL_TRIGGER,
  QUEUE_KEYWORD_SEARCH,
  publish,
};
