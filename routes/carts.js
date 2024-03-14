const express = require('express');
const router = express.Router();
const catchAsync = require('../utils/catchAsync');
const multer = require('multer');
const { storage } = require('../cloudinary');
const upload = multer({ storage });
const products = require('../controllers/products')
const carts = require('../controllers/carts')


router.get('/add_to_cart', carts.addToCart)

router.get('/render', carts.renderCart)

router.get('/activate_by_weekly/:id', carts.activateByWeekly)
router.get('/activate_monthly/:id', carts.activateMonthly)
router.get('/activate_weekly/:id', carts.activateWeekly)
router.get('/activate_one_time/:id', carts.activateOneTime)

module.exports = router;  