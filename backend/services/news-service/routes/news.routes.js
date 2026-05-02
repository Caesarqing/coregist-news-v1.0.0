const express = require('express');
const controller = require('../controllers/news.controller');

const router = express.Router();

router.get('/', controller.listNews);
router.get('/search', controller.searchNews);
router.get('/:id', controller.getNewsDetail);
router.post('/:id/state', controller.authRequired, controller.updateNewsState);
router.post('/', controller.createNews);

module.exports = router;
