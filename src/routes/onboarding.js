const express = require('express');
const router = express.Router();
const onboardingController = require('../controllers/onboardingController');

// Check if a user needs onboarding
router.get('/check-onboarding', onboardingController.checkOnboardingStatus);

// Save onboarding data
router.post('/save-onboarding', onboardingController.saveOnboardingData);

// Get onboarding data
router.get('/get-onboarding', onboardingController.getOnboardingData);

module.exports = router;
