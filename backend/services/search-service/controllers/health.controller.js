function healthCheck(_req, res) {
  res.json({ ok: true, service: 'search-service', time: new Date().toISOString() });
}

module.exports = { healthCheck };
