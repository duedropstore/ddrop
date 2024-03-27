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
const Pre_order = require('../models/pre_order')
const User = require('../models/user')
const Cart = require('../models/cart')

module.exports.addToCart = async (req, res) => {
    console.log('addToCart')
    console.log(req.body)
    console.log(req.query)
    if (req.user) {
        console.log(req.user)
        const { id } = req.user._id
        console.log(id)
        const user = await User.findById(id.toString('hex'))
        const pre_order = new Pre_order()
        const product = await Product.findById(req.query.id.toString('hex'))
        const time_frame = req.query.time_frame
        pre_order.product = product
        pre_order.is_delivered = false

        pre_order.price = product.price * parseInt(req.query.how_many)

        pre_order.user = req.query.user
        pre_order.quantity = parseInt(req.query.how_many)
        if (time_frame == 'Weekly') {
            console.log("WEEKLY")
            const save_weekly = await Cart.findById(user.weekly_cart._id.toString('hex'))
            console.log(save_weekly)
            save_weekly.pre_orders.push(pre_order)
            console.log(user.weekly_cart)
            await save_weekly.save()
        }
        if (time_frame == 'By Weekly') {

            const save_by_weekly = await Cart.findById(user.by_weekly_cart._id.toString('hex'))
            console.log(user.by_weekly_cart._id.toString('hex'))
            save_by_weekly.pre_orders.push(pre_order)
            await save_by_weekly.save()
        }
        if (time_frame == 'Monthly') {

            const save_monthly = await Cart.findById(user.monthly_cart._id.toString('hex'))
            save_monthly.pre_orders.push(pre_order)
            await save_monthly.save()
        }
        if (time_frame == 'one Time') {

            const save_one_time = await Cart.findById(user.one_time_cart._id.toString('hex'))
            save_one_time.pre_orders.push(pre_order)
            await save_one_time.save()
        }
        await pre_order.save()
        await user.save()

        console.log(product)

        console.log(req.params)
        console.log('renderProducts')
        const products = await Product.find()
        const categorizedProducts = {};

        // Iterate over each product
        products.forEach(product => {

            if (product.title.includes('Central Market') || product.title.includes('Mi Tienda')) {
                // Assuming each product has only one category for simplicity
                const category = product.category[0];

                // Check if the category already exists in the categorizedProducts object
                if (!categorizedProducts[category]) {
                    // If not, create a new array for this category
                    categorizedProducts[category] = [];
                }

                // Add the product to the appropriate category array
                categorizedProducts[category].push(product);
            }
        });
        res.render('products/render', { categorizedProducts })
    } else {
        console.log('renderProducts')
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

        req.flash('You must be signed in to add items into cart')
        res.render('products/render', { categorizedProducts, post })
    }
}

module.exports.renderCart = async (req, res) => {
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
            res.render('users/render_cart', { delete_message, cart_message, weekly_cart, monthly_cart, one_time_cart, by_weekly_cart, user_id })
        } else {

            req.session.cart = []
            res.render('users/cart_no_items')
        }
    }
}

// module.exports.activateWeekly = async (req, res) => {
//     console.log('activateWeekly')
//     const { id } = req.params
//     const user = await User.findById(id)
//     console.log(user)
//     console.log(user.weekly_cart)
//     const cart = await Cart.findById(user.weekly_cart).populate({
//         path: 'pre_orders',
//         populate: {
//             path: 'product'
//         }
//     })
//     const orderDetails = cart.pre_orders.map(order => ({
//         price: order.price,
//         quantity: order.quantity,
//         productTitle: order.product.title,
//         pricePer: order.product.price
//     }));

//     console.log(orderDetails);
// }

module.exports.activateWeekly = async (req, res) => {
    console.log('activateWeekly');
    const { id } = req.params;
    const user = await User.findById(id);
    console.log(user);
    console.log(user.weekly_cart);
    const cart = await Cart.findById(user.weekly_cart).populate({
        path: 'pre_orders',
        populate: {
            path: 'product'
        }
    });

    const lineItems = cart.pre_orders.map(order => ({
        price_data: {
            currency: 'usd', // Adjust currency as needed
            product_data: {
                name: order.product.title,
                // description: "Optional description here", // Uncomment if you want to include a description
            },
            unit_amount: Math.round(order.price * 100), // Stripe expects the amount in the smallest currency unit (e.g., cents for USD)
            recurring: {
                interval: "week", // Adjust according to your subscription interval
            },
        },
        quantity: order.quantity,
    }));

    console.log(lineItems);

    try {
        const session = await stripe.checkout.sessions.create({
            success_url: `http://localhost:3000/complete_order_weekly/${cart.id}`, // Adjust URLs as necessary
            cancel_url: "http://localhost:3000/cancel",
            payment_method_types: ["card"],
            mode: "subscription",
            billing_address_collection: "auto",
            line_items: lineItems,
            metadata: {
                userId: id,
                cart: cart.id // or any other metadata you need
            },
            // customer_email: user.email, // Uncomment if you want to specify the customer email
            // Assuming `customer` is a Stripe Customer ID stored in your user model
            customer: user.stripeCustomerId, // Use the stored Stripe Customer ID here if available
        });

        res.redirect(303, session.url); // Redirect to the Stripe Checkout page
    } catch (error) {
        console.error("Error creating Stripe checkout session:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
};

module.exports.activateByWeekly = async (req, res) => {
    console.log('activateByWeekly');
    const { id } = req.params;
    const user = await User.findById(id);
    console.log(user);
    console.log(user.weekly_cart);
    const cart = await Cart.findById(user.by_weekly_cart).populate({
        path: 'pre_orders',
        populate: {
            path: 'product'
        }
    });

    const lineItems = cart.pre_orders.map(order => ({
        price_data: {
            currency: 'usd', // Adjust currency as needed
            product_data: {
                name: order.product.title,
                // description: "Optional description here", // Uncomment if you want to include a description
            },
            unit_amount: Math.round(order.price * 100), // Stripe expects the amount in the smallest currency unit (e.g., cents for USD)
            recurring: {
                interval: "week",
                interval_count: 2, // Adjust according to your subscription interval
            },
        },
        quantity: order.quantity,
    }));

    console.log(lineItems);

    try {
        const session = await stripe.checkout.sessions.create({
            success_url: `http://localhost:3000/complete_order_by_weekly/${cart.id}`, // Adjust URLs as necessary
            cancel_url: "http://localhost:3000/cancel",
            payment_method_types: ["card"],
            mode: "subscription",
            billing_address_collection: "auto",
            line_items: lineItems,
            metadata: {
                userId: id, // or any other metadata you need
            },
            // customer_email: user.email, // Uncomment if you want to specify the customer email
            // Assuming `customer` is a Stripe Customer ID stored in your user model
            customer: user.stripeCustomerId, // Use the stored Stripe Customer ID here if available
        });

        res.redirect(303, session.url); // Redirect to the Stripe Checkout page
    } catch (error) {
        console.error("Error creating Stripe checkout session:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
};


module.exports.activateMonthly = async (req, res) => {
    console.log('activateMonthy');
    const { id } = req.params;
    const user = await User.findById(id);
    console.log(user);
    console.log(user.weekly_cart);
    const cart = await Cart.findById(user.monthly_cart).populate({
        path: 'pre_orders',
        populate: {
            path: 'product'
        }
    });

    const lineItems = cart.pre_orders.map(order => ({
        price_data: {
            currency: 'usd', // Adjust currency as needed
            product_data: {
                name: order.product.title,
                // description: "Optional description here", // Uncomment if you want to include a description
            },
            unit_amount: Math.round(order.price * 100),// Stripe expects the amount in the smallest currency unit (e.g., cents for USD)
            recurring: {
                interval: "month"  // Adjust according to your subscription interval
            },
        },
        quantity: order.quantity,
    }));

    console.log(lineItems);

    try {
        const session = await stripe.checkout.sessions.create({
            success_url: `http://localhost:3000/complete_order_monthly/${cart.id}`, // Adjust URLs as necessary
            cancel_url: "http://localhost:3000/cancel",
            payment_method_types: ["card"],
            mode: "subscription",
            billing_address_collection: "auto",
            line_items: lineItems,
            metadata: {
                userId: id, // or any other metadata you need
            },
            // customer_email: user.email, // Uncomment if you want to specify the customer email
            // Assuming `customer` is a Stripe Customer ID stored in your user model
            customer: user.stripeCustomerId, // Use the stored Stripe Customer ID here if available
        });

        res.redirect(303, session.url); // Redirect to the Stripe Checkout page
    } catch (error) {
        console.error("Error creating Stripe checkout session:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
};



module.exports.activateOneTime = async (req, res) => {
    console.log('activateOne');
    const { id } = req.params;
    const user = await User.findById(id);
    console.log(user);
    console.log(user.weekly_cart);
    const cart = await Cart.findById(user.one_time_cart).populate({
        path: 'pre_orders',
        populate: {
            path: 'product'
        }
    });

    const lineItems = cart.pre_orders.map(order => ({
        price_data: {
            currency: 'usd', // Adjust currency as needed
            product_data: {
                name: order.product.title,
                // description: "Optional description here", // Uncomment if you want to include a description
            },
            unit_amount: Math.round(order.price * 100), // Stripe expects the amount in the smallest currency unit (e.g., cents for USD)

        },
        quantity: order.quantity,
    }));

    console.log(lineItems);

    try {
        const session = await stripe.checkout.sessions.create({
            success_url: `http://localhost:3000/complete_order_one_time/${cart.id}`, // Adjust URLs as necessary
            cancel_url: "http://localhost:3000/cancel",
            payment_method_types: ["card"],
            mode: "subscription",
            billing_address_collection: "auto",
            line_items: lineItems,
            metadata: {
                userId: id, // or any other metadata you need
            },
            // customer_email: user.email, // Uncomment if you want to specify the customer email
            // Assuming `customer` is a Stripe Customer ID stored in your user model
            customer: user.stripeCustomerId, // Use the stored Stripe Customer ID here if available
        });

        res.redirect(303, session.url); // Redirect to the Stripe Checkout page
    } catch (error) {
        console.error("Error creating Stripe checkout session:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
};
