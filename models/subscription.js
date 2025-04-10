const mongoose = require("mongoose");

const subscriptionPlanSchema = new mongoose.Schema({
  name: { type: String, required: true }, // Plan name
  duration: { type: String, enum: ["monthly", "semi-annual", "annual"], required: true },
  price: { type: Number, required: true },
  maxProducts: { type: Number, required: true },
  features: { type: [String], required: true },
});

module.exports = mongoose.model("SubscriptionPlan", subscriptionPlanSchema);
