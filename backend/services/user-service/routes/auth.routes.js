const express = require('express');
const controller = require('../controllers/auth.controller');

const router = express.Router();

router.get('/check-username', controller.checkUsername);
router.post('/register', controller.register);
router.post('/login', controller.login);
router.post('/refresh', controller.refresh);
router.post('/send-reset-code', controller.sendResetCode);
router.post('/reset-password', controller.resetPassword);
router.post('/google', controller.googleLogin);
router.get('/me', controller.authRequired, controller.me);
router.post('/change-password', controller.authRequired, controller.changePassword);

module.exports = router;
