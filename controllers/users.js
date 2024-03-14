const stripe = require('stripe')(process.env.STRIPE_KEY)
const { UserBindingPage } = require('twilio/lib/rest/chat/v2/service/user/userBinding');
const accountSid = process.env.TW_ID;
const authToken = process.env.TW_AUTH;
const client = require('twilio')(accountSid, authToken);
// const async = require("async")
// const nodemailer = require('nodemailer')
// const crypto = require('crypto') 
const { cloudinary } = require("../cloudinary");
const axios = require('axios')
const jsdom = require('jsdom');
const Product = require('../models/product')
const { JSDOM } = jsdom;
const OpenAI = require("openai");
const cheerio = require('cheerio')
const Post = require('../models/product')
const XLSX = require('xlsx');
const puppeteer = require('puppeteer');
const Cart = require('../models/cart')
const User = require('../models/user')

module.exports.renderLogin = (req, res) => {
    res.render('users/login');
}

module.exports.login = async (req, res) => {
    req.flash('success', 'welcome back!');
    const redirectUrl = req.session.returnTo || '/home';
    delete req.session.returnTo;
    const products = await Product.find()
    const categorizedProducts = {};

    // Iterate over each product
    products.forEach(product => {
        // Assuming each product has only one category for simplicity
        const category = product.category[0];

        // Check if the category already exists in the categorizedProducts object
        if (!categorizedProducts[category]) {
            // If not, create a new array for this category
            categorizedProducts[category] = [];
        }

        // Add the product to the appropriate category array
        categorizedProducts[category].push(product);
    });
    const post = categorizedProducts['Bakery'][0]

    res.render('products/render', { categorizedProducts, post })
}

module.exports.register = async (req, res, next) => {
    try {
        const { email, username, password, phone, countryCode, address } = req.body;
        const cart = new Cart()
        const user = new User({ email, username });
        const final_phone = (countryCode + phone).replace(/[^0-9]/g, '')
        user.phone = '+' + final_phone
        user.cart = cart
        user.address = address
        const day = new Date()
        user.date = day.getTime()
        user.weekly_cart = new Cart()
        user.one_time_cart = new Cart()
        user.by_weekly_cart = new Cart()
        user.monthly_cart = new Cart()
        await user.monthly_cart.save()
        await user.weekly_cart.save()
        await user.by_weekly_cart.save()
        await user.one_time_cart.save()
        const registeredUser = await User.register(user, password);

        const products = await Product.find()
        req.login(registeredUser, err => {
            if (err) return next(err);
            req.flash('success', 'Welcome to Cargi!');
            const categorizedProducts = {};

            // Iterate over each product
            products.forEach(product => {
                // Assuming each product has only one category for simplicity
                const category = product.category[0];

                // Check if the category already exists in the categorizedProducts object
                if (!categorizedProducts[category]) {
                    // If not, create a new array for this category
                    categorizedProducts[category] = [];
                }

                // Add the product to the appropriate category array
                categorizedProducts[category].push(product);
            });
            const post = categorizedProducts['Bakery'][0]
            res.render('products/render', { categorizedProducts, post })

        })
    } catch (e) {
        console.log(e)
        req.flash('error', e.message);
        const products = await Product.find()
        const categorizedProducts = {};

        // Iterate over each product
        products.forEach(product => {
            // Assuming each product has only one category for simplicity
            const category = product.category[0];

            // Check if the category already exists in the categorizedProducts object
            if (!categorizedProducts[category]) {
                // If not, create a new array for this category
                categorizedProducts[category] = [];
            }

            // Add the product to the appropriate category array
            categorizedProducts[category].push(product);
        });
        const post = categorizedProducts['Bakery'][0]
        res.render('products/render', { categorizedProducts, post })
    }
}

module.exports.renderRegister = (req, res) => {
    res.render('users/register');
}


module.exports.renderSuccess = async (req, res) => {
    console.log(req.user)
    if (req.user) {
        console.log('renderCart')
        const { id } = req.user._id
        const user = await User.findById(id.toString('hex'))
        console.log(user)
        weekly_cart = await Cart.findById(user.weekly_cart.id.toString('hex')).populate({
            path: 'pre_orders',
            populate: {
                path: 'product'
            }
        })
        monthly_cart = await Cart.findById(user.monthly_cart.id.toString('hex')).populate({
            path: 'pre_orders',
            populate: {
                path: 'product'
            }
        })
        by_weekly_cart = await Cart.findById(user.by_weekly_cart.id.toString('hex')).populate({
            path: 'pre_orders',
            populate: {
                path: 'product'
            }
        })
        one_time_cart = await Cart.findById(user.by_weekly_cart.id.toString('hex')).populate({
            path: 'pre_orders',
            populate: {
                path: 'product'
            }
        })
        if (weekly_cart || monthly_cart || one_time_cart || by_weekly_cart > 0) {
            const cart_message = false
            const delete_message = false
            console.log('weekly', weekly_cart)
            console.log('monthly', monthly_cart)
            console.log('by_weekly', by_weekly_cart)
            console.log('one_time', one_time_cart)
            const user_id = id.toString('hex')
            const success_message = 'success'
            res.render('users/render_cart', { success_message, delete_message, cart_message, weekly_cart, monthly_cart, one_time_cart, by_weekly_cart, user_id })
        } else {

            req.session.cart = []
            res.render('users/cart_no_items')
        }
    }
}