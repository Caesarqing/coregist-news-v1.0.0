const express = require('express');
const {
  authRequired,
  optionalAuth,
  publicContentHealth,
  getJob,
  querySearch,
  retryJob,
} = require('../controllers/search.controller');

const router = express.Router();

router.get('/public-health', publicContentHealth);
router.get('/query', optionalAuth, querySearch);
router.post('/query', optionalAuth, querySearch);
router.get('/jobs/:jobId', authRequired, getJob);
router.post('/jobs/:jobId/retry', authRequired, retryJob);

module.exports = router;
