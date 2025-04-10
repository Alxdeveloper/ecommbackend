const Vendor = require("../models/Vendor");
const SubscriptionPlan = require("../models/subscription");

exports.subscribeVendor = async (req, res) => {
  try {
    const { vendorId, planId } = req.body;

    // Fetch plan details
    const plan = await SubscriptionPlan.findById(planId);
    if (!plan) return res.status(404).json({ message: "Subscription plan not found" });

    // Calculate end date
    const durationInMonths = plan.duration === "monthly" ? 1 : plan.duration === "semi-annual" ? 6 : 12;
    const endDate = new Date();
    endDate.setMonth(endDate.getMonth() + durationInMonths);

    // Update vendor subscription
    await Vendor.findByIdAndUpdate(vendorId, {
      subscription: {
        planId,
        startDate: new Date(),
        endDate,
        isActive: true,
      },
    });

    return res.status(200).json({ message: "Subscription successful", endDate });
  } catch (error) {
    return res.status(500).json({ message: "Server error", error });
  }
};

