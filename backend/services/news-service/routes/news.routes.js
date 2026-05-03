const express = require('express');
const controller = require('../controllers/news.controller');

const router = express.Router();

router.get('/', controller.authRequired, controller.listNews);
router.get('/search', controller.authRequired, controller.searchNews);
router.get('/:id', controller.authRequired, controller.getNewsDetail);
router.post('/:id/state', controller.authRequired, controller.updateNewsState);
router.post('/', controller.authRequired, controller.createNews);

module.exports = router;
