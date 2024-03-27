if (process.env.NODE_ENV !== "production") {
    require('dotenv').config();
}
const express = require('express');
const path = require('path');
const mongoose = require('mongoose');
const ejsMate = require('ejs-mate');
const session = require('express-session');
const flash = require('connect-flash');
const ExpressError = require('./utils/ExpressError');
const methodOverride = require('method-override');
const passport = require('passport');
const LocalStrategy = require('passport-local');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const productRoutes = require('./routes/products')
const cartsRoutes = require('./routes/carts')
const MongoDBStore = require("connect-mongo")(session);
const usersRoutes = require('./routes/users')
const Cart = require('./models/cart')
const User = require('./models/user');
const dbUrl = process.env.DB_URL || 'mongodb://localhost:27017/yelp-camp';
const stripe = require('stripe')('sk_test_51Ojs7rEnfB1QEXtGFGG4ccnTtIEZg6BNTP332QLOglgFFB5k6gqJQ1QBw8ullAoiKG2xaGokPfFIQzn9CBvp0rmE00F2b3gSLZ');
mongoose.connect(dbUrl, {
    useNewUrlParser: true,
    useCreateIndex: true,
    useUnifiedTopology: true,
    useFindAndModify: false
});

const db = mongoose.connection;
db.on("error", console.error.bind(console, "connection error:"));
db.once("open", () => {
    console.log("Database connected");
});

const app = express();

app.engine('ejs', ejsMate)
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'))

app.use(express.urlencoded({ extended: true }));
app.use(methodOverride('_method'));
app.use(express.static(path.join(__dirname, 'public')))
app.use(mongoSanitize({
    replaceWith: '_'
}))
const secret = process.env.SECRET || 'thisshouldbeabettersecret!';

const store = new MongoDBStore({
    url: dbUrl,
    secret,
    touchAfter: 24 * 60 * 60
});

store.on("error", function (e) {
    console.log("SESSION STORE ERROR", e)
})

const sessionConfig = {
    store,
    name: 'session',
    secret,
    resave: false,
    saveUninitialized: true,
    cookie: {
        httpOnly: true,
        // secure: true,
        expires: Date.now() + 1000 * 60 * 60 * 24 * 7,
        maxAge: 1000 * 60 * 60 * 24 * 7
    }
}

app.use(session(sessionConfig));
app.use(flash());
app.use(helmet());


const scriptSrcUrls = [
    "https://stackpath.bootstrapcdn.com",
    "https://api.tiles.mapbox.com",
    "https://api.mapbox.com",
    "https://kit.fontawesome.com",
    "https://cdnjs.cloudflare.com",
    "https://cdn.jsdelivr.net",
];
const styleSrcUrls = [
    "https://kit-free.fontawesome.com",
    "https://stackpath.bootstrapcdn.com",
    "https://api.mapbox.com",
    "https://api.tiles.mapbox.com",
    "https://fonts.googleapis.com",
    "https://use.fontawesome.com",
];
const connectSrcUrls = [
    "https://api.mapbox.com",
    "https://*.tiles.mapbox.com",
    "https://events.mapbox.com",
];
const fontSrcUrls = [];
app.use(
    helmet.contentSecurityPolicy({
        directives: {
            defaultSrc: [],
            connectSrc: ["'self'", ...connectSrcUrls],
            scriptSrc: ["'unsafe-inline'", "'self'", ...scriptSrcUrls],
            styleSrc: ["'self'", "'unsafe-inline'", ...styleSrcUrls],
            workerSrc: ["'self'", "blob:"],
            childSrc: ["blob:"],
            objectSrc: [],
            imgSrc: [
                "'self'",
                "blob:",
                "data:",
                "https://res.cloudinary.com/squr/", //SHOULD MATCH YOUR CLOUDINARY ACCOUNT! 
                "https://images.unsplash.com",
            ],
            fontSrc: ["'self'", ...fontSrcUrls],
        },
    })
);


app.use(passport.initialize());
app.use(passport.session());
passport.use(new LocalStrategy(User.authenticate()));

passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

app.use((req, res, next) => {
    res.locals.currentUser = req.user;
    res.locals.success = req.flash('success');
    res.locals.error = req.flash('error');
    next();
})


app.use('/products', productRoutes)
app.use('/carts', cartsRoutes)
app.use('/', usersRoutes)


app.get('/', (req, res) => {
    res.render('home')
});

app.all('*', (req, res, next) => {
    next(new ExpressError('Page Not Found', 404))
})

app.use((err, req, res, next) => {
    const { statusCode = 500 } = err;
    if (!err.message) err.message = 'Oh No, Something Went Wrong!'
    res.status(statusCode).render('error', { err })
})

// app.post('/webhook', express.raw({ type: 'application/json' }), async (request, response) => {
//     // Handle the event
//     console.log('handling')
//     const endpointSecret = process.env.WHOOK
//     const sig = request.headers['stripe-signature'];
//     let event;
//     try {
//         event = stripe.webhooks.constructEvent(request.body, sig, endpointSecret);

//     } catch (err) {
//         response.status(400).send(`Webhook Error: ${err.message}`);
//         return;
//     }

//     if (event.type == 'payment_intent.succeeded') {
//         const cart = await Cart.findById(event.data.object.cart);
//         if (typeof payment === "object" && payment !== null && Object.keys(payment).length > 0) {
//             cart.is_paid = true
//             await cart.save()
//         }
//     }


// Return a 200 response to acknowledge receipt of the event
//     response.send(); // The payment was successful, send an email to the customer

// })

const endpointSecret = "whsec_3c72d3179c5066e16b1ebd439efe7a2076efc580b6442734e4437ca308d8f71c";

app.post('/webhook', express.raw({ type: 'application/json' }), (request, response) => {
    console.log('webhook')
    const sig = request.headers['stripe-signature'];

    let event;

    try {
        event = stripe.webhooks.constructEvent(request.body, sig, endpointSecret);
    } catch (err) {
        response.status(400).send(`Webhook Error: ${err.message}`);
        return;
    }

    // Handle the event
    switch (event.type) {
        case 'payment_intent.succeeded':
            const paymentIntentSucceeded = event.data.object;
            // Then define and call a function to handle the event payment_intent.succeeded
            break;
        // ... handle other event types
        default:
            console.log(`Unhandled event type ${event.type}`);
    }

    // Return a 200 response to acknowledge receipt of the event
    response.send();
});

app.get('/webhook', express.raw({ type: 'application/json' }), (request, response) => {
    console.log('webhook')
    const sig = request.headers['stripe-signature'];

    let event;

    try {
        event = stripe.webhooks.constructEvent(request.body, sig, endpointSecret);
    } catch (err) {
        response.status(400).send(`Webhook Error: ${err.message}`);
        return;
    }

    // Handle the event
    switch (event.type) {
        case 'payment_intent.succeeded':
            const paymentIntentSucceeded = event.data.object;
            // Then define and call a function to handle the event payment_intent.succeeded
            break;
        // ... handle other event types
        default:
            console.log(`Unhandled event type ${event.type}`);
    }

    // Return a 200 response to acknowledge receipt of the event
    response.send();
});


app.get('/complete_order_weekly/:id', async (req, res) => {
    const { id } = req.params
    const cart = await Cart.findById(id).populate('place')
    cart.is_paid = true
    req.session.cart = []
    const post_author = await User.findById(order.place.author)
    post_author.orders_to_complete.push(order)
    req.session.orders.push(order)
    const orders = req.session.orders
    const order_message = 'true'
    await cart.save()
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
            res.render('users/render_cart', { order_message, delete_message, cart_message, weekly_cart, monthly_cart, one_time_cart, by_weekly_cart, user_id })

        };
    }
})


app.get('/complete_order_monthly/:id', async (req, res) => {
    const { id } = req.params
    const cart = await Cart.findById(id).populate('place')
    cart.is_paid = true
    const orders = req.session.orders
    const order_message = 'true'
    await cart.save()

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
            res.render('users/render_cart', { order_message, delete_message, cart_message, weekly_cart, monthly_cart, one_time_cart, by_weekly_cart, user_id })

        };
    }
})
app.get('/complete_order_by_weekly/:id', async (req, res) => {
    const { id } = req.params
    const cart = await Cart.findById(id).populate('place')
    cart.is_paid = true
    const orders = req.session.orders
    const order_message = 'true'
    await cart.save()
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
            res.render('users/render_cart', { order_message, delete_message, cart_message, weekly_cart, monthly_cart, one_time_cart, by_weekly_cart, user_id })

        };
    }
})

app.get('/complete_order_one_time/:id', async (req, res) => {
    const { id } = req.params
    constcartr = await Cart.findById(id).populate('place')
    cart.is_paid = true
    const order_message = 'true'
    await cart.save()
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
            res.render('users/render_cart', { order_message, delete_message, cart_message, weekly_cart, monthly_cart, one_time_cart, by_weekly_cart, user_id })

        };
    }
})


const port = process.env.PORT || 4242;
app.listen(port, () => {
    console.log(`Serving on port ${port}`)
})
app.use((req, res, next) => {
    res.locals.currentUser = req.user;
    res.locals.success = req.flash('success');
    res.locals.error = req.flash('error');
    next();
})
