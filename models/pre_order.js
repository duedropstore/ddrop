const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const Pre_order = require('./pre_order')
const Order = require('./order')
const Product = require('./product')
const User = require('./user')

// https://res.cloudinary.com/douqbebwk/image/upload/w_300/v1600113904/YelpCamp/gxgle1ovzd2f3dgcpass.png



const Pre_orderSchema = new Schema({
    price: Number,
    price_total: Number,
    is_delivered: Boolean,
    time_frame: String,
    product: {
        type: Schema.Types.ObjectId,
        ref: 'Product'
    },
    ready: String,
    address: String,
    quantity: Number,
    user: {
        type: Schema.Types.ObjectId,
        ref: 'User'
    },
});




module.exports = mongoose.model('Pre_order', Pre_orderSchema);