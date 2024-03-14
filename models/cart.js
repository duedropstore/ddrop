const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const Pre_order = require('./pre_order')
const Order = require('./order')
const Product = require('./product')
const User = require('./user')

// https://res.cloudinary.com/douqbebwk/image/upload/w_300/v1600113904/YelpCamp/gxgle1ovzd2f3dgcpass.png



const CartSchema = new Schema({
    pre_orders: [{
        type: Schema.Types.ObjectId,
        ref: 'Pre_order'
    }],
    Slot: String,
    Reccurance: String
}
);




module.exports = mongoose.model('Cart', CartSchema);
