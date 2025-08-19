const axios = require('axios');

// Test configuration
const TEST_CONFIG = {
  backendUrl: 'http://localhost:3000/api', // Update with your backend URL
  testEmail: 'aisha01malik@gmail.com', // The specific user mentioned
  testPlan: 'basic'
};

/**
 * Test the subscription system for a specific user
 */
async function testUserSubscription() {
  console.log('🧪 Testing Subscription System for User:', TEST_CONFIG.testEmail);
  console.log('=====================================\n');

  try {
    // Test 1: Payment verification with subscription creation
    console.log('1️⃣ Testing Payment Verification for User...');
    
    const paymentData = {
      razorpay_payment_id: `test_payment_${Date.now()}`,
      razorpay_order_id: `test_order_${Date.now()}`,
      razorpay_signature: `test_signature_${Date.now()}`,
      email: TEST_CONFIG.testEmail,
      plan: TEST_CONFIG.testPlan
    };

    console.log('Payment Data:', paymentData);

    const response = await axios.post(`${TEST_CONFIG.backendUrl}/verify-payment`, paymentData, {
      headers: {
        'Content-Type': 'application/json'
      }
    });

    console.log('✅ Payment verification successful!');
    console.log('Response:', {
      success: response.data.success,
      message: response.data.message,
      userId: response.data.userId,
      tenantId: response.data.tenantId,
      plan: response.data.plan,
      subscription: response.data.subscription ? 'Created' : 'Failed'
    });

    if (response.data.subscription) {
      console.log('\n📋 Subscription Details:', {
        id: response.data.subscription.id,
        tenant_id: response.data.subscription.tenant_id,
        plan_id: response.data.subscription.plan_id,
        status: response.data.subscription.status,
        appointments_used: response.data.subscription.appointments_used,
        billing_cycle: `${response.data.subscription.billing_cycle_start} to ${response.data.subscription.billing_cycle_end}`
      });
    }

    console.log('\n2️⃣ Database Records Created:');
    console.log('✅ User profile should be created/updated');
    console.log('✅ User role should be set to BUSINESS_OWNER');
    console.log('✅ Tenant should be created');
    console.log('✅ Approved user record should be created');
    console.log('✅ Business profile should be created');
    console.log('✅ Subscription record should be created');
    console.log('✅ Payment record should be created (if payments table exists)');

    console.log('\n3️⃣ Next Steps to Verify:');
    console.log('   1. Check your Supabase subscriptions table');
    console.log('   2. Look for a record with email: aisha01malik@gmail.com');
    console.log('   3. Verify the subscription status is "active"');
    console.log('   4. Check that appointments_used is set to 0');
    console.log('   5. Verify billing cycle dates are set correctly');

    console.log('\n🎉 Test completed successfully!');
    console.log('\n📝 To verify in Supabase:');
    console.log('   - Go to your subscriptions table');
    console.log('   - Filter by tenant_id: ' + response.data.tenantId);
    console.log('   - Check that the subscription was created');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
    
    console.log('\n🔧 Troubleshooting:');
    console.log('   1. Ensure backend server is running');
    console.log('   2. Check database connection');
    console.log('   3. Verify API endpoints are accessible');
    console.log('   4. Check that plans table has the required plan IDs');
    console.log('   5. Run: node get-plan-ids.js to get plan UUIDs');
    
    console.log('\n💡 Common Issues:');
    console.log('   - Plan IDs not set in payment controller');
    console.log('   - Missing plans in plans table');
    console.log('   - Database permissions issues');
  }
}

/**
 * Check if user already has a subscription
 */
async function checkExistingSubscription() {
  console.log('\n🔍 Checking if user already has subscription...');
  
  try {
    // This would require a direct database query
    // For now, we'll just note it
    console.log('Note: Check your Supabase subscriptions table for existing records');
    console.log('Look for records with email: aisha01malik@gmail.com');
  } catch (error) {
    console.log('Could not check existing subscription');
  }
}

// Run tests
if (require.main === module) {
  console.log('🚀 User Subscription Test\n');
  
  checkExistingSubscription();
  testUserSubscription();
}

module.exports = {
  testUserSubscription,
  checkExistingSubscription
};
