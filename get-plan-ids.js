const { supabase } = require('./src/config');

/**
 * Utility script to get plan IDs from your plans table
 * Run this to get the actual UUIDs to use in the payment controller
 */
async function getPlanIds() {
  try {
    console.log('🔍 Fetching plan IDs from your plans table...\n');
    
    const { data: plans, error } = await supabase
      .from('plans')
      .select('*');
    
    if (error) {
      console.error('❌ Error fetching plans:', error);
      return;
    }
    
    if (!plans || plans.length === 0) {
      console.log('⚠️  No plans found in your plans table');
      console.log('You need to create plans first. Here are the suggested plans:');
      console.log('\n1. Basic Plan');
      console.log('2. Professional Plan'); 
      console.log('3. Enterprise Plan');
      return;
    }
    
    console.log('✅ Found plans in your database:');
    console.log('=====================================');
    
    plans.forEach((plan, index) => {
      console.log(`\n${index + 1}. Plan: ${plan.name || 'Unnamed'}`);
      console.log(`   ID: ${plan.id}`);
      console.log(`   Price: ${plan.price || 'N/A'}`);
      console.log(`   Features: ${plan.features ? JSON.stringify(plan.features) : 'N/A'}`);
      console.log(`   Created: ${plan.created_at || 'N/A'}`);
    });
    
    console.log('\n📝 Update your payment controller with these IDs:');
    console.log('=====================================');
    console.log('const PLAN_NAME_TO_ID = {');
    
    plans.forEach(plan => {
      const planName = plan.name?.toLowerCase() || 'unknown';
      console.log(`  '${planName}': '${plan.id}',`);
    });
    
    console.log('};');
    
    console.log('\n💡 If you need to create plans, you can run:');
    console.log('INSERT INTO plans (name, price, features) VALUES');
    console.log("  ('Basic', 1, '[\"WhatsApp booking\", \"Basic dashboard\"]'),");
    console.log("  ('Professional', 1, '[\"Advanced analytics\", \"Custom branding\"]'),");
    console.log("  ('Enterprise', 1, '[\"Unlimited appointments\", \"API access\"]');");
    
  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

/**
 * Create default plans if they don't exist
 */
async function createDefaultPlans() {
  try {
    console.log('🔧 Creating default plans...\n');
    
    const defaultPlans = [
      {
        name: 'Basic',
        price: 1,
        features: ['WhatsApp appointment booking', 'Basic dashboard', 'Up to 100 appointments/month', 'Email support']
      },
      {
        name: 'Professional', 
        price: 1,
        features: ['All Basic features', 'Advanced analytics', 'Up to 500 appointments/month', 'Priority email support', 'Custom branding']
      },
      {
        name: 'Enterprise',
        price: 1,
        features: ['All Professional features', 'Unlimited appointments', '24/7 phone support', 'Dedicated account manager', 'API access', 'Custom integrations']
      }
    ];
    
    for (const plan of defaultPlans) {
      console.log(`Creating plan: ${plan.name}`);
      
      const { data, error } = await supabase
        .from('plans')
        .insert([plan])
        .select();
      
      if (error) {
        if (error.code === '23505') {
          console.log(`✅ Plan '${plan.name}' already exists`);
        } else {
          console.error(`❌ Error creating plan '${plan.name}':`, error);
        }
      } else {
        console.log(`✅ Created plan '${plan.name}' with ID: ${data[0].id}`);
      }
    }
    
    console.log('\n🎉 Default plans created/verified!');
    
  } catch (error) {
    console.error('❌ Error creating default plans:', error);
  }
}

// Run the script
if (require.main === module) {
  console.log('🚀 Plan Management Utility\n');
  
  const args = process.argv.slice(2);
  
  if (args.includes('--create')) {
    createDefaultPlans().then(() => {
      console.log('\n✅ Done!');
      process.exit(0);
    });
  } else {
    getPlanIds().then(() => {
      console.log('\n✅ Done!');
      process.exit(0);
    });
  }
}

module.exports = {
  getPlanIds,
  createDefaultPlans
};
