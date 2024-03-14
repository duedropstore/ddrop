const express = require('express');
const router = express.Router();
const catchAsync = require('../utils/catchAsync');
const multer = require('multer');
const { storage } = require('../cloudinary');
const upload = multer({ storage });
const products = require('../controllers/products')


router.get('/new_product', products.populate_db)

router.post('/new', upload.array('image'), products.createProduct)

router.get('/', products.renderProducts)

router.get('/render_cat', products.renderCat)

router.get('/scrape_price', products.scrapePrice)


module.exports = router;  