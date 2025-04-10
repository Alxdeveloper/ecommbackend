const express = require("express");
const { subscribeVendor } = require("../controllers/subscription");

const router = express.Router();

// Vendor subscribes to a plan
router.post("/subscribe", subscribeVendor);

module.exports = router;
