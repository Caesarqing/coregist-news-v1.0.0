const express = require('express');
const controller = require('../controllers/user.controller');

const router = express.Router();

router.put('/profile', controller.authRequired, controller.updateProfile);
router.get('/settings', controller.authRequired, controller.getSettings);
router.put('/settings', controller.authRequired, controller.updateSettings);

module.exports = router;
