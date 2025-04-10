const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
require('dotenv').config();
const connectDB = require('./config/db');
const router = require('./routes');
const axios = require('axios');
const moment = require('moment');
const twilio = require('twilio');


const app = express();

// Middleware setup
// In index.js
const corsOptions = {
  origin: 'http://localhost:3000', // Replace with your frontend URL
  credentials: true,
};
app.use(cors(corsOptions));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));
app.use(cookieParser());
app.use('/api', router);

const PORT = process.env.PORT || 8080;

// M-Pesa Integration Variables
const consumerKey = process.env.MPESA_CONSUMER_KEY;
const consumerSecret = process.env.MPESA_CONSUMER_SECRET;
const shortCode = process.env.MPESA_SHORTCODE;
const passKey = process.env.MPESA_PASSKEY;
const callbackURL = process.env.MPESA_CALLBACK_URL;

// Check if all required environment variables are set
if (!consumerKey || !consumerSecret || !shortCode || !passKey || !callbackURL) {
  console.error('Missing M-Pesa configuration in .env file. Please verify.');
  process.exit(1);
}

// Generate M-Pesa access token
const generateAccessToken = async () => {
  const auth = Buffer.from(`${consumerKey}:${consumerSecret}`).toString('base64');
  const response = await axios.get(
    'https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials',
    {
      headers: {
        Authorization: `Basic ${auth}`,
      },
    }
  );
  return response.data.access_token;
};

// STK Push Endpoint
app.post('/api/mpesa/stkpush', async (req, res) => {
  const { phone, amount } = req.body;

  // Validate request body
  if (!phone || !/^254\d{9}$/.test(phone)) {
    return res.status(400).json({
      success: false,
      message: 'Phone number is required and must be in 254XXXXXXXXX format.',
    });
  }
  if (!amount || amount <= 0) {
    return res.status(400).json({
      success: false,
      message: 'Amount is required and must be greater than zero.',
    });
  }

  try {
    const accessToken = await generateAccessToken();
    const timestamp = moment().format('YYYYMMDDHHmmss');
    const password = Buffer.from(`${shortCode}${passKey}${timestamp}`).toString('base64');

    const response = await axios.post(
      'https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest',
      {
        BusinessShortCode: shortCode,
        Password: password,
        Timestamp: timestamp,
        TransactionType: 'CustomerPayBillOnline',
        Amount: amount,
        PartyA: phone,
        PartyB: shortCode,
        PhoneNumber: phone,
        CallBackURL: callbackURL,
        AccountReference: 'MobiMall',
        TransactionDesc: 'Payment for goods',
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    res.status(200).json({
      success: true,
      message: 'STK Push sent to your phone. Please enter your PIN to complete the transaction.',
      data: response.data,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to initiate STK Push',
      error: error.response ? error.response.data : error.message,
    });
  }
});

// Callback Endpoint
app.post('/api/mpesa/callback', (req, res) => {
  console.log('M-Pesa Callback Response:', JSON.stringify(req.body, null, 2));

  const callbackData = req.body;
  if (callbackData.Body?.stkCallback) {
    const { ResultCode, ResultDesc } = callbackData.Body.stkCallback;
    if (ResultCode === 0) {
      console.log('Payment Successful:', callbackData.Body.stkCallback);
    } else {
      console.log('Payment Failed:', ResultDesc);
    }
  }

  res.status(200).send('Callback received');
});
const { TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER } = process.env;
const client = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);

// Temporary store for OTPs (Use database in production)
const otpStore = {};

// Endpoint for sending OTP
app.post('/api/forgot-password', async (req, res) => {
  const { phoneNumber } = req.body;
  
  if (!phoneNumber) {
    return res.status(400).json({ success: false, message: 'Phone number is required' });
  }

  const otp = Math.floor(100000 + Math.random() * 900000); // Generate a random 6-digit OTP
  
  otpStore[phoneNumber] = otp; // Store OTP temporarily (use DB in production)

  try {
    // Send OTP via Twilio SMS
    await client.messages.create({
      body: `Your OTP is ${otp}`,
      from: TWILIO_PHONE_NUMBER,
      to: phoneNumber
    });
    
    return res.status(200).json({ success: true, message: 'OTP sent to your phone!' });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: 'Failed to send OTP. Please try again.' });
  }
});

// Endpoint for resetting password
app.post('/api/reset-password', async (req, res) => {
  const { phoneNumber, otp, newPassword } = req.body;

  if (!phoneNumber || !otp || !newPassword) {
    return res.status(400).json({ success: false, message: 'All fields are required' });
  }

  if (otpStore[phoneNumber] !== parseInt(otp)) {
    return res.status(400).json({ success: false, message: 'Invalid OTP' });
  }

  // Here you would update the user's password in your database
  // Assuming the password reset is successful, delete OTP from store
  delete otpStore[phoneNumber];

  // This is just a placeholder for actual password update logic
  console.log(`Password for ${phoneNumber} has been reset to ${newPassword}`);

  return res.status(200).json({ success: true, message: 'Password reset successfully!' });
});

// Start the server after connecting to the database
connectDB().then(() => {
  app.listen(PORT, () => {
    console.log('Connected to DB');
    console.log(`Server is running on port ${PORT}`);
  });
});
