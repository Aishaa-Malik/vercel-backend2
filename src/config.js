require('dotenv').config();

module.exports = {
  port: process.env.PORT || 5001,
  razorpay: {
    keyId: process.env.RAZORPAY_KEY_ID || 'rzp_test_YourTestKey',
    keySecret: process.env.RAZORPAY_KEY_SECRET || 'YourRazorpaySecretKey'
  },
  supabase: {
    url: process.env.SUPABASE_URL || 'https://znxzqsmyzzuwlzwgapdk.supabase.co',
    serviceKey: process.env.SUPABASE_SERVICE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpueHpxc215enp1d2x6d2dhcGRrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MjY4MzUyMSwiZXhwIjoyMDY4MjU5NTIxfQ.BdzzD-YNRDXmwppCvHlIOl4cKH0uoMcFG4e5wwcsY0I'
  }
};