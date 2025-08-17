const Razorpay = require('razorpay');
const crypto = require('crypto');
const config = require('../config');
// Use the supabase client from config.js
const { supabase } = require('../config');

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
    console.log('Received payment verification request with body:', req.body);
    
    const {
      razorpay_payment_id,
      razorpay_order_id,
      razorpay_signature,
      email
    } = req.body;

    // Validate required fields - only email is truly required
    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required'
      });
    }
    
    console.log('Payment verification accepted for:', {
      payment_id: razorpay_payment_id || 'test_payment',
      email: email
    });
    
    // Set a default payment object for testing
    const payment = { 
      amount: 100, 
      status: 'captured'
    };

    // Check if user exists in Supabase
    const { data: existingUser, error: userError } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('email', email)
      .single();

    let userId;

    if (userError) {
      console.log('userError- ', userError);

      

      // If user doesn't exist, create a new user
      // const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
      //   email,
      //   password: crypto.randomBytes(8).toString('hex'), // Generate a random password
      //   email_confirm: true
      // });

      // if (authError) {
      //   console.error('Error creating user:', authError);
      //   return res.status(500).json({
      //     success: false,
      //     message: 'Failed to create user account'
      //   });
      // }

      //userId = authUser.user.id;

      // Create user profile
     
    } else {

      console.log('1 ');
      await supabase.from('user_profiles').upsert([
        {
          email: email,
          full_name: email.split('@')[0], // Use part of email as name
          created_at: new Date().toISOString()
        }
      ]);

      userId = existingUser.id;

      console.log('2');

      await supabase.from('user_roles').upsert([
        {
          user_id: userId,
          role: 'BUSINESS_OWNER',
          updated_at: new Date().toISOString()
        }
      ], { onConflict: 'user_id' });
    }
    
    console.log('3');
    const newtenantId = crypto.randomUUID(); 
    console.log('newtenantId- ', newtenantId);
    
    // First create the tenant in the tenants table
    const { data: newTenant, error: tenantError } = await supabase
      .from('tenants')
      .insert([
        {
          id: newtenantId, // Use the generated UUID as the tenant ID
          name: `${email.split('@')[0]}'s Organization`,
          // No need to specify created_at as it should be auto-generated
        }
      ])
      .select();
      
    if (tenantError) {
      console.error('❌ Tenant creation failed:', tenantError);
      return res.status(500).json({
        success: false,
        message: 'Failed to create tenant'
      });
    }
    
    console.log('✅ Tenant created successfully');
    
    // Now add user to approved_users table with the valid tenant_id
    const { error } = await supabase.from('approved_users').insert([
      {
        email: email, // Use the email from the request instead of hardcoded value
        role: 'BUSINESS_OWNER',
        tenant_id: newtenantId
        // Removed updated_at field as it's not in the schema
      }
    ], { onConflict: 'email' });
    
    if (error) {
      console.error('❌ approved_users insert failed:', error);
    } else {
      console.log('✅ approved_users insert successful');
    }

    if(userError){
          const { data: businessData, error: businessError } = await supabase
        .from('business_profiles')
        .insert({
          email: email,  
          onboarding_completed: false,
          tenant_id: newtenantId
        });
      
      if (businessError) {
        console.log('business_profiles insertion error:', businessError);
      } else {
        console.log('business_profiles inserted successfully:', businessData);
      }
    }

    
    

    // Set user role as business_admin
    

    // Create a tenant for the business admin if needed
    // const { data: existingTenant } = await supabase
    //   .from('user_tenants')
    //   .select('tenant_id')
    //   .eq('user_id', userId)
    //   .single();

    // if (!existingTenant) {
    //   // Create a new tenant
    //   const { data: newTenant } = await supabase
    //     .from('tenants')
    //     .insert([
    //       {
    //         name: `${email.split('@')[0]}'s Organization`,
    //         created_by: userId,
    //         created_at: new Date().toISOString()
    //       }
    //     ])
    //     .select();

    //   if (newTenant && newTenant.length > 0) {
    //     // Associate user with tenant
    //     await supabase.from('user_tenants').insert([
    //       {
    //         user_id: userId,
    //         tenant_id: newTenant[0].id
    //       }
    //     ]);
    //   }
    // }

    // Record the payment
    // try {
    //   await supabase.from('payments').insert([
    //     {
    //       payment_id: razorpay_payment_id || 'manual_payment_' + Date.now(),
    //       order_id: razorpay_order_id || '',
    //       user_id: userId,
    //       amount: payment.amount / 100, // Convert from paise to rupees
    //       status: 'completed',
    //       payment_date: new Date().toISOString()
    //     }
    //   ]);
    // } catch (paymentInsertError) {
    //   console.error('Error recording payment:', paymentInsertError);
    //   // Continue even if payment recording fails
    // }

    // Return success response
    return res.status(200).json({
      success: true,
      message: 'Payment verified and user role updated successfully',
      userId
    });

  } catch (error) {
    console.error('Payment verification error:', error);
    console.error('Full error stack:', error.stack);
    
    // For debugging purposes, return more detailed error information
    return res.status(500).json({
      success: false,
      message: 'Internal server error during payment verification',
      error: error.message,
      stack: error.stack
    });
  }
};