const express = require('express');
const router = express.Router();
const searchController = require('../controllers/searchController');
const { authenticateSuperAdmin } = require('../middleware/auth');

router.use(authenticateSuperAdmin);

router.get('/', searchController.globalSearch);

module.exports = router;
