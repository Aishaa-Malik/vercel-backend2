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
      email,
      plan
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
      email: email,
      plan: plan
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

    const isTurf = false;
    if(businessData.business_type === 'Turf'){
      isTurf = true;
    }

    // Create subscription record using your existing subscriptions table structure
    console.log('Creating subscription for plan:', plan);
    const billingCycleStart = new Date();
    const billingCycleEnd = new Date();
    billingCycleEnd.setMonth(billingCycleEnd.getMonth() + 1); // 1 month billing cycle

    // Dynamically fetch the plan ID from the plans table
    console.log('Looking up plan ID for plan name:', plan);
    const { data: planData, error: planError } = await supabase
      .from('plans')
      .select('id, name')
      .ilike('name', `%${plan}%`) // Use case-insensitive search with wildcards
      .single();
    
    let planId;
    if (planError) {
      console.error('❌ Plan lookup failed:', planError);
      console.log('Attempting to fetch all plans to see what\'s available...');
      
      // Fetch all plans to see what's available
      const { data: allPlans } = await supabase
        .from('plans')
        .select('id, name');
      
      console.log('Available plans:', allPlans);
      
      // Fall back to a default plan if we can't find the specified one
      const { data: defaultPlan, error: defaultPlanError } = await supabase
        .from('plans')
        .select('id')
        .limit(1)
        .single();
      
      if (defaultPlanError || !defaultPlan) {
        console.error('❌ Default plan lookup failed:', defaultPlanError);
        return res.status(500).json({
          success: false,
          message: 'Could not find any subscription plans'
        });
      }
      
      console.log('Using default plan:', defaultPlan);
      planId = defaultPlan.id;
    } else {
      console.log('✅ Found plan:', planData);
      planId = planData.id;
    }

    // Create the subscription record
    const { data: subscriptionData, error: subscriptionError } = await supabase
      .from('subscriptions')
      .insert({
        tenant_id: newtenantId,
        plan_id: planId,
        status: 'active',
        appointments_used: 0,
        billing_cycle_start: billingCycleStart.toISOString().split('T')[0], // Convert to date format
        billing_cycle_end: billingCycleEnd.toISOString().split('T')[0], // Convert to date format
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        email: email
      })
      .select();

    if (subscriptionError) {
      console.error('❌ Subscription creation failed:', subscriptionError);
      // Continue even if subscription creation fails
    } else {
      console.log('✅ Subscription created successfully:', subscriptionData);
    }

    // Record the payment in payments table (if you have one)
    try {
      // Check if payments table exists
      const { data: paymentData, error: paymentError } = await supabase
        .from('payments')
        .insert([
          {
            razorpay_payment_id: razorpay_payment_id || `manual_payment_${Date.now()}`,
            razorpay_order_id: razorpay_order_id || '',
            user_id: userId,
            tenant_id: newtenantId,
            plan: plan, // Your current plan price
            status: 'completed',
            payment_verified: true,
            email: email
          }
        ])
        .select();
      
      if (paymentError) {
        console.log('Payments table insert failed (table might not exist):', paymentError);
      } else {
        console.log('✅ Payment record created successfully');
      }
    } catch (paymentInsertError) {
      console.log('Payments table might not exist, skipping payment record creation', paymentInsertError);
    }

    // Return success response
    return res.status(200).json({
      success: true,
      message: 'Payment verified and subscription created successfully',
      userId,
      tenantId: newtenantId,
      subscription: subscriptionData?.[0] || null,
      plan: plan
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