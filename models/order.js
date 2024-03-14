const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const Order = require('./order')
const Product = require('./product')
const User = require('./user')

// https://res.cloudinary.com/douqbebwk/image/upload/w_300/v1600113904/YelpCamp/gxgle1ovzd2f3dgcpass.png



const OrderSchema = new Schema({
    price: Number,
    price_final: Number,
    timeframe: String,
    name: String,
    is_delivered: Boolean,
    is_reported: Boolean,
    products: {
        type: Schema.Types.ObjectId,
        ref: 'Product'
    },
    multiple_orders: [{
        type: Schema.Types.ObjectId,
        ref: 'Order'
    }],
    fee: Number,
    is_multiple: Boolean,
    address: String,
    status: String,
    quantity: Number,
    customer: {
        type: Schema.Types.ObjectId,
        ref: 'User'
    },
    date: Date,
    email: String,
});




module.exports = mongoose.model('Order', OrderSchema);