const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const passportLocalMongoose = require('passport-local-mongoose');
const Product = require('./product')
const Order = require('./order')
const Cart = require('./cart')

const UserSchema = new Schema({
    date: Date,
    phone: String,
    email: { type: String, unique: true, required: true },
    resetPasswordToken: String,
    resetPasswordExpires: Date,
    email: {
        type: String,
        required: true,
        unique: true
    },
    weekly_cart: {
        type: Schema.Types.ObjectId,
        ref: 'Cart'
    },
    by_weekly_cart: {
        type: Schema.Types.ObjectId,
        ref: 'Cart'
    },
    monthly_cart: {
        type: Schema.Types.ObjectId,
        ref: 'Cart'
    },
    one_time_cart: {
        type: Schema.Types.ObjectId,
        ref: 'Cart'
    },
    username: String,

    orders: [{
        type: Schema.Types.ObjectId,
        ref: 'Order'
    }],
    address: String,

    isAdmin: { type: Boolean, default: false }
});

UserSchema.plugin(passportLocalMongoose);

module.exports = mongoose.model('User', UserSchema);