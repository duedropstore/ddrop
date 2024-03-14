const express = require('express');
const router = express.Router();
const passport = require('passport');
const catchAsync = require('../utils/catchAsync');
const User = require('../models/user');

// const { isLoggedIn, isAuthor, validatePlace, hasCart } = require('../middleware');

const products = require('../controllers/products')
const users = require('../controllers/users')

router.route('/login')
    .get(users.renderLogin)
    .post(passport.authenticate('local', { failureFlash: true, failureRedirect: '/login' }), users.login)

router.route('/register')
    .get(users.renderRegister)
    .post(users.register);

router.get('/success', users.renderSuccess)

module.exports = router;