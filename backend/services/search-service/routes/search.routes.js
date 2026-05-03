const express = require('express');
const {
  authRequired,
  publicContentHealth,
  getJob,
  querySearch,
  retryJob,
} = require('../controllers/search.controller');

const router = express.Router();

router.get('/public-health', authRequired, publicContentHealth);
router.get('/query', authRequired, querySearch);
router.post('/query', authRequired, querySearch);
router.get('/jobs/:jobId', authRequired, getJob);
router.post('/jobs/:jobId/retry', authRequired, retryJob);

module.exports = router;
