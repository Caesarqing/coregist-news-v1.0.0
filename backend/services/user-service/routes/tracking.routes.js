const express = require('express');
const controller = require('../controllers/tracking.controller');

const router = express.Router();

router.get('/topics', controller.authRequired, controller.listTopics);
router.post('/topics', controller.authRequired, controller.createTopic);
router.post('/topics/:id/run', controller.authRequired, controller.runTopic);
router.get('/topics/:id/status', controller.authRequired, controller.getTopicStatus);
router.delete('/topics/:id', controller.authRequired, controller.deleteTopic);
router.get('/topics/:id/news', controller.authRequired, controller.getTopicNews);
router.get('/analytics', controller.authRequired, controller.getAnalytics);

module.exports = router;
