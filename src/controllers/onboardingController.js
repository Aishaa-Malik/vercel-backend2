const { supabase } = require('../config');

// Check if a user needs onboarding
exports.checkOnboardingStatus = async (req, res) => {
  console.log("INSIDE checkOnboardingStatus CONTROLLER");
  const { userId } = req.query;
  const { email } = req.query;
  
  if (!userId) {
    return res.status(400).json({ error: 'User ID is required' });
  }
  
  try {
    console.log("INSIDE ONBOARDING TRY");
    console.log("userId", userId);
    console.log("email", email);
    console.log("Supabase client:", typeof supabase, Object.keys(supabase));

    // Check if user has completed onboarding
    const { data, error } = await supabase
      .from('business_profiles')
      .select('onboarding_completed')
      .eq('email', email)
      .single();
    
    if (error) throw error;
    console.log("checkOnboardingStatus onboarding_completed data", data);
    
    // If no profile exists or onboarding not completed, user needs onboarding
    const needsOnboarding = !data || !data.onboarding_completed;
    
    return res.status(200).json({ 
      data: { needsOnboarding },
      success: true 
    });
    
  } catch (error) {
    console.error('Error checking onboarding status:', error);
    return res.status(500).json({ 
      error: 'Failed to check onboarding status',
      details: error.message
    });
  }
};

// Save onboarding data
exports.saveOnboardingData = async (req, res) => {

  console.log("INSIDE saveOnboardingData CONTROLLER");
  
  const { 
    email, 
    tenantId, 
    businessType, 
    businessName, 
    timeSlots, 
    operatingDays 
  } = req.body;
  
  if (!userId || !tenantId || !businessType) {
    return res.status(400).json({ error: 'Required fields are missing' });
  }
  
  try {
    // Save business profile
    const { data, error } = await supabase
      .from('business_profiles')
      .upsert({
        email: email,
        tenant_id: tenantId,
        business_type: businessType,
        business_name: businessName,
        time_slots: timeSlots,
        operating_days: operatingDays,
        onboarding_completed: true
      }, { 
        onConflict: 'email'  // Specify which column to check for conflicts
      });
    
    if (error) throw error;
    console.log("data", data);
    console.log("Onboarding data saved successfully");
    
    return res.status(200).json({
      data,
      success: true,
      message: 'Onboarding data saved successfully'
    });
    
  } catch (error) {
    console.error('Error saving onboarding data:', error);
    return res.status(500).json({ 
      error: 'Failed to save onboarding data',
      details: error.message
    });
  }
};

// Get onboarding data
exports.getOnboardingData = async (req, res) => {
  const { userId } = req.query;
  
  if (!userId) {
    return res.status(400).json({ error: 'User ID is required' });
  }
  
  try {
    // Get business profile
    const { data, error } = await supabase
      .from('business_profiles')
      .select('*')
      .eq('email', email)
      .single();
    
    if (error && error.code !== 'PGRST116') { // PGRST116 is "no rows returned" error
      throw error;
    }
    
    return res.status(200).json({
      data: data || null,
      success: true
    });
    
  } catch (error) {
    console.error('Error getting onboarding data:', error);
    return res.status(500).json({ 
      error: 'Failed to get onboarding data',
      details: error.message
    });
  }
};
