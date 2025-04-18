const mongoose = require('mongoose')

const productSchema = mongoose.Schema({
    productName: { type: String, required: true },
    brandName: { type: String, required: true },
    category: { type: String, required: true },
    productImage: { type: [String], required: true },  // Array of image URLs
    description: { type: String, required: true },
    price: { type: Number, required: true },
    sellingPrice: { type: Number, required: true }
}, {
    timestamps: true
})

const productModel = mongoose.model("product", productSchema)

module.exports = productModel
