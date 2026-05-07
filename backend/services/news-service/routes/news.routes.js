const express = require('express');
const controller = require('../controllers/news.controller');
const { optionalAuth } = require('../../shared/node/auth');

const router = express.Router();

router.get('/', optionalAuth, controller.listNews);
router.get('/search', controller.authRequired, controller.searchNews);
router.get('/:id', controller.authRequired, controller.getNewsDetail);
router.post('/:id/state', controller.authRequired, controller.updateNewsState);
router.post('/', controller.authRequired, controller.createNews);

module.exports = router;
