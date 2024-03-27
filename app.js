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
const stripe = require('stripe')(process.env.STRIPE_KEY)
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
    const sig = request.headers['stripe-signature'];

    let event;

    try {
        event = stripe.webhooks.constructEvent(request.body, sig, endpointSecret);
    } catch (err) {
        response.status(400).send(`Webhook Error: ${err.message}`);
        return;
    }
    console.log('whook!')

    // Handle the event
    switch (event.type) {
        case 'account.updated':
            const accountUpdated = event.data.object;
            // Then define and call a function to handle the event account.updated
            break;
        case 'account.external_account.created':
            const accountExternalAccountCreated = event.data.object;
            // Then define and call a function to handle the event account.external_account.created
            break;
        case 'account.external_account.deleted':
            const accountExternalAccountDeleted = event.data.object;
            // Then define and call a function to handle the event account.external_account.deleted
            break;
        case 'account.external_account.updated':
            const accountExternalAccountUpdated = event.data.object;
            // Then define and call a function to handle the event account.external_account.updated
            break;
        case 'balance.available':
            const balanceAvailable = event.data.object;
            // Then define and call a function to handle the event balance.available
            break;
        case 'billing_portal.configuration.created':
            const billingPortalConfigurationCreated = event.data.object;
            // Then define and call a function to handle the event billing_portal.configuration.created
            break;
        case 'billing_portal.configuration.updated':
            const billingPortalConfigurationUpdated = event.data.object;
            // Then define and call a function to handle the event billing_portal.configuration.updated
            break;
        case 'billing_portal.session.created':
            const billingPortalSessionCreated = event.data.object;
            // Then define and call a function to handle the event billing_portal.session.created
            break;
        case 'capability.updated':
            const capabilityUpdated = event.data.object;
            // Then define and call a function to handle the event capability.updated
            break;
        case 'cash_balance.funds_available':
            const cashBalanceFundsAvailable = event.data.object;
            // Then define and call a function to handle the event cash_balance.funds_available
            break;
        case 'charge.captured':
            const chargeCaptured = event.data.object;
            // Then define and call a function to handle the event charge.captured
            break;
        case 'charge.expired':
            const chargeExpired = event.data.object;
            // Then define and call a function to handle the event charge.expired
            break;
        case 'charge.failed':
            const chargeFailed = event.data.object;
            // Then define and call a function to handle the event charge.failed
            break;
        case 'charge.pending':
            const chargePending = event.data.object;
            // Then define and call a function to handle the event charge.pending
            break;
        case 'charge.refunded':
            const chargeRefunded = event.data.object;
            // Then define and call a function to handle the event charge.refunded
            break;
        case 'charge.succeeded':
            const chargeSucceeded = event.data.object;
            // Then define and call a function to handle the event charge.succeeded
            break;
        case 'charge.updated':
            const chargeUpdated = event.data.object;
            // Then define and call a function to handle the event charge.updated
            break;
        case 'charge.dispute.closed':
            const chargeDisputeClosed = event.data.object;
            // Then define and call a function to handle the event charge.dispute.closed
            break;
        case 'charge.dispute.created':
            const chargeDisputeCreated = event.data.object;
            // Then define and call a function to handle the event charge.dispute.created
            break;
        case 'charge.dispute.funds_reinstated':
            const chargeDisputeFundsReinstated = event.data.object;
            // Then define and call a function to handle the event charge.dispute.funds_reinstated
            break;
        case 'charge.dispute.funds_withdrawn':
            const chargeDisputeFundsWithdrawn = event.data.object;
            // Then define and call a function to handle the event charge.dispute.funds_withdrawn
            break;
        case 'charge.dispute.updated':
            const chargeDisputeUpdated = event.data.object;
            // Then define and call a function to handle the event charge.dispute.updated
            break;
        case 'charge.refund.updated':
            const chargeRefundUpdated = event.data.object;
            // Then define and call a function to handle the event charge.refund.updated
            break;
        case 'checkout.session.async_payment_failed':
            const checkoutSessionAsyncPaymentFailed = event.data.object;
            // Then define and call a function to handle the event checkout.session.async_payment_failed
            break;
        case 'checkout.session.async_payment_succeeded':
            const checkoutSessionAsyncPaymentSucceeded = event.data.object;
            // Then define and call a function to handle the event checkout.session.async_payment_succeeded
            break;
        case 'checkout.session.completed':
            const checkoutSessionCompleted = event.data.object;
            // Then define and call a function to handle the event checkout.session.completed
            break;
        case 'checkout.session.expired':
            const checkoutSessionExpired = event.data.object;
            // Then define and call a function to handle the event checkout.session.expired
            break;
        case 'climate.order.canceled':
            const climateOrderCanceled = event.data.object;
            // Then define and call a function to handle the event climate.order.canceled
            break;
        case 'climate.order.created':
            const climateOrderCreated = event.data.object;
            // Then define and call a function to handle the event climate.order.created
            break;
        case 'climate.order.delayed':
            const climateOrderDelayed = event.data.object;
            // Then define and call a function to handle the event climate.order.delayed
            break;
        case 'climate.order.delivered':
            const climateOrderDelivered = event.data.object;
            // Then define and call a function to handle the event climate.order.delivered
            break;
        case 'climate.order.product_substituted':
            const climateOrderProductSubstituted = event.data.object;
            // Then define and call a function to handle the event climate.order.product_substituted
            break;
        case 'climate.product.created':
            const climateProductCreated = event.data.object;
            // Then define and call a function to handle the event climate.product.created
            break;
        case 'climate.product.pricing_updated':
            const climateProductPricingUpdated = event.data.object;
            // Then define and call a function to handle the event climate.product.pricing_updated
            break;
        case 'coupon.created':
            const couponCreated = event.data.object;
            // Then define and call a function to handle the event coupon.created
            break;
        case 'coupon.deleted':
            const couponDeleted = event.data.object;
            // Then define and call a function to handle the event coupon.deleted
            break;
        case 'coupon.updated':
            const couponUpdated = event.data.object;
            // Then define and call a function to handle the event coupon.updated
            break;
        case 'credit_note.created':
            const creditNoteCreated = event.data.object;
            // Then define and call a function to handle the event credit_note.created
            break;
        case 'credit_note.updated':
            const creditNoteUpdated = event.data.object;
            // Then define and call a function to handle the event credit_note.updated
            break;
        case 'credit_note.voided':
            const creditNoteVoided = event.data.object;
            // Then define and call a function to handle the event credit_note.voided
            break;
        case 'customer.created':
            const customerCreated = event.data.object;
            // Then define and call a function to handle the event customer.created
            break;
        case 'customer.deleted':
            const customerDeleted = event.data.object;
            // Then define and call a function to handle the event customer.deleted
            break;
        case 'customer.updated':
            const customerUpdated = event.data.object;
            // Then define and call a function to handle the event customer.updated
            break;
        case 'customer.discount.created':
            const customerDiscountCreated = event.data.object;
            // Then define and call a function to handle the event customer.discount.created
            break;
        case 'customer.discount.deleted':
            const customerDiscountDeleted = event.data.object;
            // Then define and call a function to handle the event customer.discount.deleted
            break;
        case 'customer.discount.updated':
            const customerDiscountUpdated = event.data.object;
            // Then define and call a function to handle the event customer.discount.updated
            break;
        case 'customer.source.created':
            const customerSourceCreated = event.data.object;
            // Then define and call a function to handle the event customer.source.created
            break;
        case 'customer.source.deleted':
            const customerSourceDeleted = event.data.object;
            // Then define and call a function to handle the event customer.source.deleted
            break;
        case 'customer.source.expiring':
            const customerSourceExpiring = event.data.object;
            // Then define and call a function to handle the event customer.source.expiring
            break;
        case 'customer.source.updated':
            const customerSourceUpdated = event.data.object;
            // Then define and call a function to handle the event customer.source.updated
            break;
        case 'customer.subscription.created':
            const customerSubscriptionCreated = event.data.object;
            // Then define and call a function to handle the event customer.subscription.created
            break;
        case 'customer.subscription.deleted':
            const customerSubscriptionDeleted = event.data.object;
            // Then define and call a function to handle the event customer.subscription.deleted
            break;
        case 'customer.subscription.paused':
            const customerSubscriptionPaused = event.data.object;
            // Then define and call a function to handle the event customer.subscription.paused
            break;
        case 'customer.subscription.pending_update_applied':
            const customerSubscriptionPendingUpdateApplied = event.data.object;
            // Then define and call a function to handle the event customer.subscription.pending_update_applied
            break;
        case 'customer.subscription.pending_update_expired':
            const customerSubscriptionPendingUpdateExpired = event.data.object;
            // Then define and call a function to handle the event customer.subscription.pending_update_expired
            break;
        case 'customer.subscription.resumed':
            const customerSubscriptionResumed = event.data.object;
            // Then define and call a function to handle the event customer.subscription.resumed
            break;
        case 'customer.subscription.trial_will_end':
            const customerSubscriptionTrialWillEnd = event.data.object;
            // Then define and call a function to handle the event customer.subscription.trial_will_end
            break;
        case 'customer.subscription.updated':
            const customerSubscriptionUpdated = event.data.object;
            // Then define and call a function to handle the event customer.subscription.updated
            break;
        case 'customer.tax_id.created':
            const customerTaxIdCreated = event.data.object;
            // Then define and call a function to handle the event customer.tax_id.created
            break;
        case 'customer.tax_id.deleted':
            const customerTaxIdDeleted = event.data.object;
            // Then define and call a function to handle the event customer.tax_id.deleted
            break;
        case 'customer.tax_id.updated':
            const customerTaxIdUpdated = event.data.object;
            // Then define and call a function to handle the event customer.tax_id.updated
            break;
        case 'customer_cash_balance_transaction.created':
            const customerCashBalanceTransactionCreated = event.data.object;
            // Then define and call a function to handle the event customer_cash_balance_transaction.created
            break;
        case 'file.created':
            const fileCreated = event.data.object;
            // Then define and call a function to handle the event file.created
            break;
        case 'financial_connections.account.created':
            const financialConnectionsAccountCreated = event.data.object;
            // Then define and call a function to handle the event financial_connections.account.created
            break;
        case 'financial_connections.account.deactivated':
            const financialConnectionsAccountDeactivated = event.data.object;
            // Then define and call a function to handle the event financial_connections.account.deactivated
            break;
        case 'financial_connections.account.disconnected':
            const financialConnectionsAccountDisconnected = event.data.object;
            // Then define and call a function to handle the event financial_connections.account.disconnected
            break;
        case 'financial_connections.account.reactivated':
            const financialConnectionsAccountReactivated = event.data.object;
            // Then define and call a function to handle the event financial_connections.account.reactivated
            break;
        case 'financial_connections.account.refreshed_balance':
            const financialConnectionsAccountRefreshedBalance = event.data.object;
            // Then define and call a function to handle the event financial_connections.account.refreshed_balance
            break;
        case 'financial_connections.account.refreshed_ownership':
            const financialConnectionsAccountRefreshedOwnership = event.data.object;
            // Then define and call a function to handle the event financial_connections.account.refreshed_ownership
            break;
        case 'financial_connections.account.refreshed_transactions':
            const financialConnectionsAccountRefreshedTransactions = event.data.object;
            // Then define and call a function to handle the event financial_connections.account.refreshed_transactions
            break;
        case 'identity.verification_session.canceled':
            const identityVerificationSessionCanceled = event.data.object;
            // Then define and call a function to handle the event identity.verification_session.canceled
            break;
        case 'identity.verification_session.created':
            const identityVerificationSessionCreated = event.data.object;
            // Then define and call a function to handle the event identity.verification_session.created
            break;
        case 'identity.verification_session.processing':
            const identityVerificationSessionProcessing = event.data.object;
            // Then define and call a function to handle the event identity.verification_session.processing
            break;
        case 'identity.verification_session.requires_input':
            const identityVerificationSessionRequiresInput = event.data.object;
            // Then define and call a function to handle the event identity.verification_session.requires_input
            break;
        case 'identity.verification_session.verified':
            const identityVerificationSessionVerified = event.data.object;
            // Then define and call a function to handle the event identity.verification_session.verified
            break;
        case 'invoice.created':
            const invoiceCreated = event.data.object;
            // Then define and call a function to handle the event invoice.created
            break;
        case 'invoice.deleted':
            const invoiceDeleted = event.data.object;
            // Then define and call a function to handle the event invoice.deleted
            break;
        case 'invoice.finalization_failed':
            const invoiceFinalizationFailed = event.data.object;
            // Then define and call a function to handle the event invoice.finalization_failed
            break;
        case 'invoice.finalized':
            const invoiceFinalized = event.data.object;
            // Then define and call a function to handle the event invoice.finalized
            break;
        case 'invoice.marked_uncollectible':
            const invoiceMarkedUncollectible = event.data.object;
            // Then define and call a function to handle the event invoice.marked_uncollectible
            break;
        case 'invoice.overdue':
            const invoiceOverdue = event.data.object;
            // Then define and call a function to handle the event invoice.overdue
            break;
        case 'invoice.paid':
            const invoicePaid = event.data.object;
            // Then define and call a function to handle the event invoice.paid
            break;
        case 'invoice.payment_action_required':
            const invoicePaymentActionRequired = event.data.object;
            // Then define and call a function to handle the event invoice.payment_action_required
            break;
        case 'invoice.payment_failed':
            const invoicePaymentFailed = event.data.object;
            // Then define and call a function to handle the event invoice.payment_failed
            break;
        case 'invoice.payment_succeeded':
            const invoicePaymentSucceeded = event.data.object;
            // Then define and call a function to handle the event invoice.payment_succeeded
            break;
        case 'invoice.sent':
            const invoiceSent = event.data.object;
            // Then define and call a function to handle the event invoice.sent
            break;
        case 'invoice.upcoming':
            const invoiceUpcoming = event.data.object;
            // Then define and call a function to handle the event invoice.upcoming
            break;
        case 'invoice.updated':
            const invoiceUpdated = event.data.object;
            // Then define and call a function to handle the event invoice.updated
            break;
        case 'invoice.voided':
            const invoiceVoided = event.data.object;
            // Then define and call a function to handle the event invoice.voided
            break;
        case 'invoice.will_be_due':
            const invoiceWillBeDue = event.data.object;
            // Then define and call a function to handle the event invoice.will_be_due
            break;
        case 'invoiceitem.created':
            const invoiceitemCreated = event.data.object;
            // Then define and call a function to handle the event invoiceitem.created
            break;
        case 'invoiceitem.deleted':
            const invoiceitemDeleted = event.data.object;
            // Then define and call a function to handle the event invoiceitem.deleted
            break;
        case 'issuing_authorization.created':
            const issuingAuthorizationCreated = event.data.object;
            // Then define and call a function to handle the event issuing_authorization.created
            break;
        case 'issuing_authorization.updated':
            const issuingAuthorizationUpdated = event.data.object;
            // Then define and call a function to handle the event issuing_authorization.updated
            break;
        case 'issuing_card.created':
            const issuingCardCreated = event.data.object;
            // Then define and call a function to handle the event issuing_card.created
            break;
        case 'issuing_card.updated':
            const issuingCardUpdated = event.data.object;
            // Then define and call a function to handle the event issuing_card.updated
            break;
        case 'issuing_cardholder.created':
            const issuingCardholderCreated = event.data.object;
            // Then define and call a function to handle the event issuing_cardholder.created
            break;
        case 'issuing_cardholder.updated':
            const issuingCardholderUpdated = event.data.object;
            // Then define and call a function to handle the event issuing_cardholder.updated
            break;
        case 'issuing_dispute.closed':
            const issuingDisputeClosed = event.data.object;
            // Then define and call a function to handle the event issuing_dispute.closed
            break;
        case 'issuing_dispute.created':
            const issuingDisputeCreated = event.data.object;
            // Then define and call a function to handle the event issuing_dispute.created
            break;
        case 'issuing_dispute.funds_reinstated':
            const issuingDisputeFundsReinstated = event.data.object;
            // Then define and call a function to handle the event issuing_dispute.funds_reinstated
            break;
        case 'issuing_dispute.submitted':
            const issuingDisputeSubmitted = event.data.object;
            // Then define and call a function to handle the event issuing_dispute.submitted
            break;
        case 'issuing_dispute.updated':
            const issuingDisputeUpdated = event.data.object;
            // Then define and call a function to handle the event issuing_dispute.updated
            break;
        case 'issuing_token.created':
            const issuingTokenCreated = event.data.object;
            // Then define and call a function to handle the event issuing_token.created
            break;
        case 'issuing_token.updated':
            const issuingTokenUpdated = event.data.object;
            // Then define and call a function to handle the event issuing_token.updated
            break;
        case 'issuing_transaction.created':
            const issuingTransactionCreated = event.data.object;
            // Then define and call a function to handle the event issuing_transaction.created
            break;
        case 'issuing_transaction.updated':
            const issuingTransactionUpdated = event.data.object;
            // Then define and call a function to handle the event issuing_transaction.updated
            break;
        case 'mandate.updated':
            const mandateUpdated = event.data.object;
            // Then define and call a function to handle the event mandate.updated
            break;
        case 'payment_intent.amount_capturable_updated':
            const paymentIntentAmountCapturableUpdated = event.data.object;
            // Then define and call a function to handle the event payment_intent.amount_capturable_updated
            break;
        case 'payment_intent.canceled':
            const paymentIntentCanceled = event.data.object;
            // Then define and call a function to handle the event payment_intent.canceled
            break;
        case 'payment_intent.created':
            const paymentIntentCreated = event.data.object;
            // Then define and call a function to handle the event payment_intent.created
            break;
        case 'payment_intent.partially_funded':
            const paymentIntentPartiallyFunded = event.data.object;
            // Then define and call a function to handle the event payment_intent.partially_funded
            break;
        case 'payment_intent.payment_failed':
            const paymentIntentPaymentFailed = event.data.object;
            // Then define and call a function to handle the event payment_intent.payment_failed
            break;
        case 'payment_intent.processing':
            const paymentIntentProcessing = event.data.object;
            // Then define and call a function to handle the event payment_intent.processing
            break;
        case 'payment_intent.requires_action':
            const paymentIntentRequiresAction = event.data.object;
            // Then define and call a function to handle the event payment_intent.requires_action
            break;
        case 'payment_intent.succeeded':
            const paymentIntentSucceeded = event.data.object;
            // Then define and call a function to handle the event payment_intent.succeeded
            break;
        case 'payment_link.created':
            const paymentLinkCreated = event.data.object;
            // Then define and call a function to handle the event payment_link.created
            break;
        case 'payment_link.updated':
            const paymentLinkUpdated = event.data.object;
            // Then define and call a function to handle the event payment_link.updated
            break;
        case 'payment_method.attached':
            const paymentMethodAttached = event.data.object;
            // Then define and call a function to handle the event payment_method.attached
            break;
        case 'payment_method.automatically_updated':
            const paymentMethodAutomaticallyUpdated = event.data.object;
            // Then define and call a function to handle the event payment_method.automatically_updated
            break;
        case 'payment_method.detached':
            const paymentMethodDetached = event.data.object;
            // Then define and call a function to handle the event payment_method.detached
            break;
        case 'payment_method.updated':
            const paymentMethodUpdated = event.data.object;
            // Then define and call a function to handle the event payment_method.updated
            break;
        case 'payout.canceled':
            const payoutCanceled = event.data.object;
            // Then define and call a function to handle the event payout.canceled
            break;
        case 'payout.created':
            const payoutCreated = event.data.object;
            // Then define and call a function to handle the event payout.created
            break;
        case 'payout.failed':
            const payoutFailed = event.data.object;
            // Then define and call a function to handle the event payout.failed
            break;
        case 'payout.paid':
            const payoutPaid = event.data.object;
            // Then define and call a function to handle the event payout.paid
            break;
        case 'payout.reconciliation_completed':
            const payoutReconciliationCompleted = event.data.object;
            // Then define and call a function to handle the event payout.reconciliation_completed
            break;
        case 'payout.updated':
            const payoutUpdated = event.data.object;
            // Then define and call a function to handle the event payout.updated
            break;
        case 'person.created':
            const personCreated = event.data.object;
            // Then define and call a function to handle the event person.created
            break;
        case 'person.deleted':
            const personDeleted = event.data.object;
            // Then define and call a function to handle the event person.deleted
            break;
        case 'person.updated':
            const personUpdated = event.data.object;
            // Then define and call a function to handle the event person.updated
            break;
        case 'plan.created':
            const planCreated = event.data.object;
            // Then define and call a function to handle the event plan.created
            break;
        case 'plan.deleted':
            const planDeleted = event.data.object;
            // Then define and call a function to handle the event plan.deleted
            break;
        case 'plan.updated':
            const planUpdated = event.data.object;
            // Then define and call a function to handle the event plan.updated
            break;
        case 'price.created':
            const priceCreated = event.data.object;
            // Then define and call a function to handle the event price.created
            break;
        case 'price.deleted':
            const priceDeleted = event.data.object;
            // Then define and call a function to handle the event price.deleted
            break;
        case 'price.updated':
            const priceUpdated = event.data.object;
            // Then define and call a function to handle the event price.updated
            break;
        case 'product.created':
            const productCreated = event.data.object;
            // Then define and call a function to handle the event product.created
            break;
        case 'product.deleted':
            const productDeleted = event.data.object;
            // Then define and call a function to handle the event product.deleted
            break;
        case 'product.updated':
            const productUpdated = event.data.object;
            // Then define and call a function to handle the event product.updated
            break;
        case 'promotion_code.created':
            const promotionCodeCreated = event.data.object;
            // Then define and call a function to handle the event promotion_code.created
            break;
        case 'promotion_code.updated':
            const promotionCodeUpdated = event.data.object;
            // Then define and call a function to handle the event promotion_code.updated
            break;
        case 'quote.accepted':
            const quoteAccepted = event.data.object;
            // Then define and call a function to handle the event quote.accepted
            break;
        case 'quote.canceled':
            const quoteCanceled = event.data.object;
            // Then define and call a function to handle the event quote.canceled
            break;
        case 'quote.created':
            const quoteCreated = event.data.object;
            // Then define and call a function to handle the event quote.created
            break;
        case 'quote.finalized':
            const quoteFinalized = event.data.object;
            // Then define and call a function to handle the event quote.finalized
            break;
        case 'quote.will_expire':
            const quoteWillExpire = event.data.object;
            // Then define and call a function to handle the event quote.will_expire
            break;
        case 'radar.early_fraud_warning.created':
            const radarEarlyFraudWarningCreated = event.data.object;
            // Then define and call a function to handle the event radar.early_fraud_warning.created
            break;
        case 'radar.early_fraud_warning.updated':
            const radarEarlyFraudWarningUpdated = event.data.object;
            // Then define and call a function to handle the event radar.early_fraud_warning.updated
            break;
        case 'refund.created':
            const refundCreated = event.data.object;
            // Then define and call a function to handle the event refund.created
            break;
        case 'refund.updated':
            const refundUpdated = event.data.object;
            // Then define and call a function to handle the event refund.updated
            break;
        case 'reporting.report_run.failed':
            const reportingReportRunFailed = event.data.object;
            // Then define and call a function to handle the event reporting.report_run.failed
            break;
        case 'reporting.report_run.succeeded':
            const reportingReportRunSucceeded = event.data.object;
            // Then define and call a function to handle the event reporting.report_run.succeeded
            break;
        case 'review.closed':
            const reviewClosed = event.data.object;
            // Then define and call a function to handle the event review.closed
            break;
        case 'review.opened':
            const reviewOpened = event.data.object;
            // Then define and call a function to handle the event review.opened
            break;
        case 'setup_intent.canceled':
            const setupIntentCanceled = event.data.object;
            // Then define and call a function to handle the event setup_intent.canceled
            break;
        case 'setup_intent.created':
            const setupIntentCreated = event.data.object;
            // Then define and call a function to handle the event setup_intent.created
            break;
        case 'setup_intent.requires_action':
            const setupIntentRequiresAction = event.data.object;
            // Then define and call a function to handle the event setup_intent.requires_action
            break;
        case 'setup_intent.setup_failed':
            const setupIntentSetupFailed = event.data.object;
            // Then define and call a function to handle the event setup_intent.setup_failed
            break;
        case 'setup_intent.succeeded':
            const setupIntentSucceeded = event.data.object;
            // Then define and call a function to handle the event setup_intent.succeeded
            break;
        case 'sigma.scheduled_query_run.created':
            const sigmaScheduledQueryRunCreated = event.data.object;
            // Then define and call a function to handle the event sigma.scheduled_query_run.created
            break;
        case 'source.canceled':
            const sourceCanceled = event.data.object;
            // Then define and call a function to handle the event source.canceled
            break;
        case 'source.chargeable':
            const sourceChargeable = event.data.object;
            // Then define and call a function to handle the event source.chargeable
            break;
        case 'source.failed':
            const sourceFailed = event.data.object;
            // Then define and call a function to handle the event source.failed
            break;
        case 'source.mandate_notification':
            const sourceMandateNotification = event.data.object;
            // Then define and call a function to handle the event source.mandate_notification
            break;
        case 'source.refund_attributes_required':
            const sourceRefundAttributesRequired = event.data.object;
            // Then define and call a function to handle the event source.refund_attributes_required
            break;
        case 'source.transaction.created':
            const sourceTransactionCreated = event.data.object;
            // Then define and call a function to handle the event source.transaction.created
            break;
        case 'source.transaction.updated':
            const sourceTransactionUpdated = event.data.object;
            // Then define and call a function to handle the event source.transaction.updated
            break;
        case 'subscription_schedule.aborted':
            const subscriptionScheduleAborted = event.data.object;
            // Then define and call a function to handle the event subscription_schedule.aborted
            break;
        case 'subscription_schedule.canceled':
            const subscriptionScheduleCanceled = event.data.object;
            // Then define and call a function to handle the event subscription_schedule.canceled
            break;
        case 'subscription_schedule.completed':
            const subscriptionScheduleCompleted = event.data.object;
            // Then define and call a function to handle the event subscription_schedule.completed
            break;
        case 'subscription_schedule.created':
            const subscriptionScheduleCreated = event.data.object;
            // Then define and call a function to handle the event subscription_schedule.created
            break;
        case 'subscription_schedule.expiring':
            const subscriptionScheduleExpiring = event.data.object;
            // Then define and call a function to handle the event subscription_schedule.expiring
            break;
        case 'subscription_schedule.released':
            const subscriptionScheduleReleased = event.data.object;
            // Then define and call a function to handle the event subscription_schedule.released
            break;
        case 'subscription_schedule.updated':
            const subscriptionScheduleUpdated = event.data.object;
            // Then define and call a function to handle the event subscription_schedule.updated
            break;
        case 'tax.settings.updated':
            const taxSettingsUpdated = event.data.object;
            // Then define and call a function to handle the event tax.settings.updated
            break;
        case 'tax_rate.created':
            const taxRateCreated = event.data.object;
            // Then define and call a function to handle the event tax_rate.created
            break;
        case 'tax_rate.updated':
            const taxRateUpdated = event.data.object;
            // Then define and call a function to handle the event tax_rate.updated
            break;
        case 'terminal.reader.action_failed':
            const terminalReaderActionFailed = event.data.object;
            // Then define and call a function to handle the event terminal.reader.action_failed
            break;
        case 'terminal.reader.action_succeeded':
            const terminalReaderActionSucceeded = event.data.object;
            // Then define and call a function to handle the event terminal.reader.action_succeeded
            break;
        case 'test_helpers.test_clock.advancing':
            const testHelpersTestClockAdvancing = event.data.object;
            // Then define and call a function to handle the event test_helpers.test_clock.advancing
            break;
        case 'test_helpers.test_clock.created':
            const testHelpersTestClockCreated = event.data.object;
            // Then define and call a function to handle the event test_helpers.test_clock.created
            break;
        case 'test_helpers.test_clock.deleted':
            const testHelpersTestClockDeleted = event.data.object;
            // Then define and call a function to handle the event test_helpers.test_clock.deleted
            break;
        case 'test_helpers.test_clock.internal_failure':
            const testHelpersTestClockInternalFailure = event.data.object;
            // Then define and call a function to handle the event test_helpers.test_clock.internal_failure
            break;
        case 'test_helpers.test_clock.ready':
            const testHelpersTestClockReady = event.data.object;
            // Then define and call a function to handle the event test_helpers.test_clock.ready
            break;
        case 'topup.canceled':
            const topupCanceled = event.data.object;
            // Then define and call a function to handle the event topup.canceled
            break;
        case 'topup.created':
            const topupCreated = event.data.object;
            // Then define and call a function to handle the event topup.created
            break;
        case 'topup.failed':
            const topupFailed = event.data.object;
            // Then define and call a function to handle the event topup.failed
            break;
        case 'topup.reversed':
            const topupReversed = event.data.object;
            // Then define and call a function to handle the event topup.reversed
            break;
        case 'topup.succeeded':
            const topupSucceeded = event.data.object;
            // Then define and call a function to handle the event topup.succeeded
            break;
        case 'transfer.created':
            const transferCreated = event.data.object;
            // Then define and call a function to handle the event transfer.created
            break;
        case 'transfer.reversed':
            const transferReversed = event.data.object;
            // Then define and call a function to handle the event transfer.reversed
            break;
        case 'transfer.updated':
            const transferUpdated = event.data.object;
            // Then define and call a function to handle the event transfer.updated
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
