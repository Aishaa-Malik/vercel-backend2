const Razorpay = require('razorpay');
const crypto = require('crypto');
const config = require('../config');
const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabase = createClient(
  config.supabase.url,
  config.supabase.serviceKey
);

// Initialize Razorpay client
const razorpay = new Razorpay({
  key_id: config.razorpay.keyId,
  key_secret: config.razorpay.keySecret
});

/**
 * Verify Razorpay payment and update user role in Supabase
 */
exports.verifyPayment = async (req, res) => {
  try {
    const {
      razorpay_payment_id,
      razorpay_order_id,
      razorpay_signature,
      email
    } = req.body;

    // Validate required fields
    if (!razorpay_payment_id || !razorpay_signature || !email) {
      return res.status(400).json({
        success: false,
        message: 'Missing required payment verification parameters'
      });
    }

    // Verify payment signature
    const generated_signature = crypto
      .createHmac('sha256', config.razorpay.keySecret)
      .update(razorpay_order_id + '|' + razorpay_payment_id)
      .digest('hex');

    // Check if signature matches
    const isSignatureValid = generated_signature === razorpay_signature;

    if (!isSignatureValid) {
      return res.status(400).json({
        success: false,
        message: 'Invalid payment signature'
      });
    }

    // Get payment details from Razorpay
    const payment = await razorpay.payments.fetch(razorpay_payment_id);

    if (payment.status !== 'captured') {
      return res.status(400).json({
        success: false,
        message: `Payment not completed. Status: ${payment.status}`
      });
    }

    // Check if user exists in Supabase
    const { data: existingUser, error: userError } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('email', email)
      .single();

    let userId;

    if (userError) {
      // If user doesn't exist, create a new user
      const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
        email,
        password: crypto.randomBytes(8).toString('hex'), // Generate a random password
        email_confirm: true
      });

      if (authError) {
        console.error('Error creating user:', authError);
        return res.status(500).json({
          success: false,
          message: 'Failed to create user account'
        });
      }

      userId = authUser.user.id;

      // Create user profile
      await supabase.from('user_profiles').insert([
        {
          id: userId,
          email,
          full_name: email.split('@')[0], // Use part of email as name
          created_at: new Date().toISOString()
        }
      ]);
    } else {
      userId = existingUser.id;
    }
    
    // Add user to approved_users table
    await supabase.from('approved_users').upsert([
      {
        email: email,
        role: 'BUSINESS_ADMIN',
        updated_at: new Date().toISOString()
      }
    ], { onConflict: 'email' });

    // Set user role as business_admin
    await supabase.from('user_roles').upsert([
      {
        user_id: userId,
        role: 'BUSINESS_ADMIN',
        updated_at: new Date().toISOString()
      }
    ], { onConflict: 'user_id' });

    // Create a tenant for the business admin if needed
    const { data: existingTenant } = await supabase
      .from('user_tenants')
      .select('tenant_id')
      .eq('user_id', userId)
      .single();

    if (!existingTenant) {
      // Create a new tenant
      const { data: newTenant } = await supabase
        .from('tenants')
        .insert([
          {
            name: `${email.split('@')[0]}'s Organization`,
            created_by: userId,
            created_at: new Date().toISOString()
          }
        ])
        .select();

      if (newTenant && newTenant.length > 0) {
        // Associate user with tenant
        await supabase.from('user_tenants').insert([
          {
            user_id: userId,
            tenant_id: newTenant[0].id
          }
        ]);
      }
    }

    // Record the payment
    await supabase.from('payments').insert([
      {
        payment_id: razorpay_payment_id,
        order_id: razorpay_order_id || '',
        user_id: userId,
        amount: payment.amount / 100, // Convert from paise to rupees
        status: 'completed',
        payment_date: new Date().toISOString()
      }
    ]);

    // Return success response
    return res.status(200).json({
      success: true,
      message: 'Payment verified and user role updated successfully',
      userId
    });

  } catch (error) {
    console.error('Payment verification error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error during payment verification',
      error: error.message
    });
  }
};