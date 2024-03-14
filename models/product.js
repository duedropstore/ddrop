const mongoose = require('mongoose');
const Schema = mongoose.Schema;

// https://res.cloudinary.com/douqbebwk/image/upload/w_300/v1600113904/YelpCamp/gxgle1ovzd2f3dgcpass.png

const ImageSchema = new Schema({
    url: String,
    filename: String
});

ImageSchema.virtual('thumbnail').get(function () {
    return this.url.replace('/upload', '/upload/w_200');
});

const opts = { toJSON: { virtuals: true } };

const productSchema = new Schema({

    title: String,
    link: String,
    images: [ImageSchema],
    date: Date,
    price: Number,
    size: String,
    description: String,
    content: String,
    is_weighted: Boolean,
    unit: String,
    weight_unit: String,
    vendor: String,
    category: [String],
    img_link: String,
    sub_category: [String],
    Tag: [String],
    quantity: Number,
    zip_code: String

});



// Define text index for title and description
productSchema.index({ title: 'text', description: 'text' });
module.exports = mongoose.model('Product', productSchema);