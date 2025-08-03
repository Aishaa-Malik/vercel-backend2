import express from "express";
import User from "../models/User.js";
import Role from "../models/Role.js";
import { authenticateToken, authorizeRole, checkPermission, tenantScope } from "../middleware/auth.js";
import crypto from "crypto";

const router = express.Router();

// Get all users (with role-based filtering)
router.get("/", authenticateToken, tenantScope, async (req, res) => {
  try {
    let query = {};
    
    // If not super_admin, filter by tenant
    if (req.user.role_id.role_name !== "super_admin") {
      query.tenant_id = req.tenantId;
    }
    
    // Apply role filter if provided
    if (req.query.role) {
      const role = await Role.findOne({ role_name: req.query.role });
      if (role) {
        query.role_id = role._id;
      }
    }
    
    const users = await User.find(query)
      .select("-password_hash -verification_token -reset_password_token -reset_password_expires")
      .populate("role_id", "role_name role_description");
    
    res.status(200).json(users);
  } catch (error) {
    console.error("Get users error:", error);
    res.status(500).json({ message: "Error retrieving users" });
  }
});

// Get current user profile
router.get("/me", authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .select("-password_hash -verification_token -reset_password_token -reset_password_expires")
      .populate("role_id", "role_name role_description");
    
    res.status(200).json(user);
  } catch (error) {
    console.error("Get profile error:", error);
    res.status(500).json({ message: "Error retrieving user profile" });
  }
});

// Invite a new user (business admin only)
router.post("/invite", 
  authenticateToken, 
  authorizeRole(["super_admin", "business_admin"]), 
  tenantScope,
  async (req, res) => {
    try {
      const { email, full_name, phone_number, role_name } = req.body;
      
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
      
      // Super admin can create any role, business admin can only create employee or customer
      if (req.user.role_id.role_name === "business_admin" && 
          !["employee", "customer"].includes(role_name)) {
        return res.status(403).json({ 
          message: "You don't have permission to create users with this role" 
        });
      }
      
      // Generate temporary password and verification token
      const tempPassword = crypto.randomBytes(8).toString("hex");
      const verificationToken = crypto.randomBytes(32).toString("hex");
      
      // Create new user
      const newUser = new User({
        email,
        password_hash: tempPassword, // Will be hashed in pre-save hook
        full_name,
        phone_number,
        role_id: role._id,
        tenant_id: req.user.tenant_id, // Assign to same tenant as inviter
        verification_token: verificationToken
      });
      
      await newUser.save();
      
      // TODO: Send invitation email with verification link and temp password
      
      res.status(201).json({ 
        message: "User invited successfully. An email has been sent to the user." 
      });
    } catch (error) {
      console.error("User invitation error:", error);
      res.status(500).json({ message: "Error inviting user" });
    }
  }
);

// Update user
router.put("/:id", 
  authenticateToken, 
  authorizeRole(["super_admin", "business_admin"]), 
  tenantScope,
  async (req, res) => {
    try {
      const userId = req.params.id;
      const { full_name, phone_number, role_name } = req.body;
      
      // Find user
      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Check if user belongs to same tenant (except for super_admin)
      if (req.user.role_id.role_name !== "super_admin" && 
          user.tenant_id.toString() !== req.tenantId.toString()) {
        return res.status(403).json({ message: "You don't have permission to update this user" });
      }
      
      // Update fields
      if (full_name) user.full_name = full_name;
      if (phone_number) user.phone_number = phone_number;
      
      // Update role if provided
      if (role_name) {
        // Find the role
        const role = await Role.findOne({ role_name });
        if (!role) {
          return res.status(400).json({ message: "Invalid role" });
        }
        
        // Business admin can only assign employee or customer roles
        if (req.user.role_id.role_name === "business_admin" && 
            !["employee", "customer"].includes(role_name)) {
          return res.status(403).json({ 
            message: "You don't have permission to assign this role" 
          });
        }
        
        user.role_id = role._id;
      }
      
      await user.save();
      
      res.status(200).json({ 
        message: "User updated successfully",
        user: {
          id: user._id,
          email: user.email,
          full_name: user.full_name,
          phone_number: user.phone_number,
          role: role_name || user.role_id
        }
      });
    } catch (error) {
      console.error("Update user error:", error);
      res.status(500).json({ message: "Error updating user" });
    }
  }
);

// Delete user (admin only)
router.delete("/:id", 
  authenticateToken, 
  authorizeRole(["super_admin", "business_admin"]), 
  tenantScope,
  async (req, res) => {
    try {
      const userId = req.params.id;
      
      // Find user
      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Check if user belongs to same tenant (except for super_admin)
      if (req.user.role_id.role_name !== "super_admin" && 
          user.tenant_id.toString() !== req.tenantId.toString()) {
        return res.status(403).json({ message: "You don't have permission to delete this user" });
      }
      
      // Prevent deleting yourself
      if (user._id.toString() === req.user._id.toString()) {
        return res.status(400).json({ message: "You cannot delete your own account" });
      }
      
      // Business admin can only delete employee or customer
      if (req.user.role_id.role_name === "business_admin") {
        const userRole = await Role.findById(user.role_id);
        if (!["employee", "customer"].includes(userRole.role_name)) {
          return res.status(403).json({ 
            message: "You don't have permission to delete users with this role" 
          });
        }
      }
      
      await User.findByIdAndDelete(userId);
      
      res.status(200).json({ message: "User deleted successfully" });
    } catch (error) {
      console.error("Delete user error:", error);
      res.status(500).json({ message: "Error deleting user" });
    }
  }
);

export default router; 