import express from "express";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import crypto from "crypto";
import User from "../models/User.js";
import Role from "../models/Role.js";
import { authenticateToken } from "../middleware/auth.js";

const router = express.Router();

// Register a new user
router.post("/register", async (req, res) => {
  try {
    const { email, password, full_name, phone_number, role_name = "business_admin" } = req.body;
    
    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "User with this email already exists" });
    }
    
    // Find the role
    const role = await Role.findOne({ role_name });
    if (!role) {
      return res.status(400).json({ message: "Invalid role" });
    }
    
    // Generate verification token
    const verificationToken = crypto.randomBytes(32).toString("hex");
    
    // Create new user
    const newUser = new User({
      email,
      password_hash: password, // Will be hashed in the pre-save hook
      full_name,
      phone_number,
      role_id: role._id,
      verification_token: verificationToken
    });
    
    await newUser.save();
    
    // TODO: Send verification email
    
    res.status(201).json({ 
      message: "User registered successfully. Please check your email for verification." 
    });
  } catch (error) {
    console.error("Registration error:", error);
    res.status(500).json({ message: "Error registering user" });
  }
});

// Login
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Find user
    const user = await User.findOne({ email }).populate("role_id");
    if (!user) {
      return res.status(401).json({ message: "Invalid email or password" });
    }
    
    // Check password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: "Invalid email or password" });
    }
    
    // Check if email is verified
    if (!user.is_email_verified) {
      return res.status(401).json({ 
        message: "Please verify your email before logging in",
        needsVerification: true
      });
    }
    
    // Generate JWT token
    const token = jwt.sign(
      { userId: user._id, role: user.role_id.role_name },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN }
    );
    
    res.status(200).json({
      message: "Login successful",
      token,
      user: {
        id: user._id,
        email: user.email,
        full_name: user.full_name,
        role: user.role_id.role_name,
        tenant_id: user.tenant_id
      }
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ message: "Error during login" });
  }
});

// Verify email
router.post("/verify-email", async (req, res) => {
  try {
    const { token } = req.body;
    
    // Find user with this verification token
    const user = await User.findOne({ verification_token: token });
    if (!user) {
      return res.status(400).json({ message: "Invalid or expired verification token" });
    }
    
    // Update user
    user.is_email_verified = true;
    user.verification_token = undefined;
    await user.save();
    
    res.status(200).json({ message: "Email verified successfully. You can now log in." });
  } catch (error) {
    console.error("Email verification error:", error);
    res.status(500).json({ message: "Error verifying email" });
  }
});

// Forgot password
router.post("/forgot-password", async (req, res) => {
  try {
    const { email } = req.body;
    
    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      // For security reasons, don't reveal if user exists
      return res.status(200).json({ 
        message: "If your email is registered, you will receive a password reset link" 
      });
    }
    
    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString("hex");
    
    // Set token and expiry
    user.reset_password_token = resetToken;
    user.reset_password_expires = Date.now() + 3600000; // 1 hour
    await user.save();
    
    // TODO: Send password reset email
    
    res.status(200).json({ 
      message: "If your email is registered, you will receive a password reset link" 
    });
  } catch (error) {
    console.error("Forgot password error:", error);
    res.status(500).json({ message: "Error processing forgot password request" });
  }
});

// Reset password
router.post("/reset-password", async (req, res) => {
  try {
    const { token, newPassword } = req.body;
    
    // Find user with this reset token and check if token is still valid
    const user = await User.findOne({
      reset_password_token: token,
      reset_password_expires: { $gt: Date.now() }
    });
    
    if (!user) {
      return res.status(400).json({ message: "Invalid or expired reset token" });
    }
    
    // Update password
    user.password_hash = newPassword; // Will be hashed in pre-save hook
    user.reset_password_token = undefined;
    user.reset_password_expires = undefined;
    await user.save();
    
    res.status(200).json({ message: "Password reset successful. You can now log in with your new password." });
  } catch (error) {
    console.error("Reset password error:", error);
    res.status(500).json({ message: "Error resetting password" });
  }
});

// Logout (client-side only, just for API completeness)
router.post("/logout", authenticateToken, (req, res) => {
  res.status(200).json({ message: "Logout successful" });
});

export default router; 