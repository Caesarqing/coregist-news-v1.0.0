const express = require('express');
const controller = require('../controllers/notification.controller');

const router = express.Router();

router.get('/', controller.authRequired, controller.listNotifications);
router.get('/unread-count', controller.authRequired, controller.unreadCount);
router.post('/push-token', controller.authRequired, controller.registerPushToken);
router.patch('/read-all', controller.authRequired, controller.markAllRead);
router.patch('/:id/read', controller.authRequired, controller.markRead);

module.exports = router;
