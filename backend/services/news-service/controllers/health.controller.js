const { connectToMongo } = require('../../shared/node/db');

async function healthCheck(req, res) {
  try {
    await connectToMongo();
    res.json({ status: 'ok', service: 'news-service', time: new Date().toISOString() });
  } catch (error) {
    res.status(500).json({ status: 'error', service: 'news-service', error: error.message });
  }
}

module.exports = { healthCheck };
