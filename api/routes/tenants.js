import express from "express";
import Tenant from "../models/Tenant.js";
import User from "../models/User.js";
import Role from "../models/Role.js";
import { authenticateToken, authorizeRole, checkPermission } from "../middleware/auth.js";
import crypto from "crypto";

const router = express.Router();

// Get all tenants (super_admin only)
router.get("/", 
  authenticateToken, 
  authorizeRole(["super_admin"]), 
  async (req, res) => {
    try {
      const tenants = await Tenant.find().sort({ created_at: -1 });
      res.status(200).json(tenants);
    } catch (error) {
      console.error("Get tenants error:", error);
      res.status(500).json({ message: "Error retrieving tenants" });
    }
  }
);

// Get tenant by ID (super_admin or business_admin of that tenant)
router.get("/:id", 
  authenticateToken, 
  async (req, res) => {
    try {
      const tenantId = req.params.id;
      
      // Find tenant
      const tenant = await Tenant.findById(tenantId);
      
      if (!tenant) {
        return res.status(404).json({ message: "Tenant not found" });
      }
      
      // Check access permission
      if (req.user.role_id.role_name !== "super_admin" && 
          (!req.user.tenant_id || req.user.tenant_id.toString() !== tenantId)) {
        return res.status(403).json({ message: "You don't have permission to access this tenant" });
      }
      
      res.status(200).json(tenant);
    } catch (error) {
      console.error("Get tenant error:", error);
      res.status(500).json({ message: "Error retrieving tenant" });
    }
  }
);

// Create new tenant (super_admin only)
router.post("/", 
  authenticateToken, 
  authorizeRole(["super_admin"]), 
  async (req, res) => {
    try {
      const { 
        name, 
        business_name, 
        business_email, 
        business_phone, 
        address,
        admin_email,
        admin_name,
        admin_phone,
        subscription_plan = "free"
      } = req.body;
      
      // Check if tenant already exists with this email
      const existingTenant = await Tenant.findOne({ business_email });
      if (existingTenant) {
        return res.status(409).json({ message: "A tenant with this email already exists" });
      }
      
      // Check if admin user already exists
      const existingAdmin = await User.findOne({ email: admin_email });
      if (existingAdmin) {
        return res.status(409).json({ message: "A user with this email already exists" });
      }
      
      // Create new tenant
      const newTenant = new Tenant({
        name,
        business_name,
        business_email,
        business_phone,
        address,
        subscription_plan
      });
      
      await newTenant.save();
      
      // Find business_admin role
      const adminRole = await Role.findOne({ role_name: "business_admin" });
      if (!adminRole) {
        return res.status(500).json({ message: "Business admin role not found" });
      }
      
      // Generate temporary password and verification token
      const tempPassword = crypto.randomBytes(8).toString("hex");
      const verificationToken = crypto.randomBytes(32).toString("hex");
      
      // Create admin user for this tenant
      const adminUser = new User({
        email: admin_email,
        password_hash: tempPassword, // Will be hashed in pre-save hook
        full_name: admin_name,
        phone_number: admin_phone,
        role_id: adminRole._id,
        tenant_id: newTenant._id,
        verification_token: verificationToken
      });
      
      await adminUser.save();
      
      // TODO: Send invitation email with verification link and temp password
      
      res.status(201).json({ 
        message: "Tenant created successfully with admin user", 
        tenant: newTenant,
        admin: {
          email: adminUser.email,
          full_name: adminUser.full_name,
          temp_password: tempPassword // Only for development, remove in production
        }
      });
    } catch (error) {
      console.error("Create tenant error:", error);
      res.status(500).json({ message: "Error creating tenant" });
    }
  }
);

// Update tenant
router.put("/:id", 
  authenticateToken, 
  async (req, res) => {
    try {
      const tenantId = req.params.id;
      const { 
        name, 
        business_name, 
        business_email, 
        business_phone, 
        address,
        subscription_plan,
        subscription_status
      } = req.body;
      
      // Find tenant
      const tenant = await Tenant.findById(tenantId);
      
      if (!tenant) {
        return res.status(404).json({ message: "Tenant not found" });
      }
      
      // Check access permission
      const isSuperAdmin = req.user.role_id.role_name === "super_admin";
      const isBusinessAdmin = req.user.role_id.role_name === "business_admin" && 
                            req.user.tenant_id && 
                            req.user.tenant_id.toString() === tenantId;
      
      if (!isSuperAdmin && !isBusinessAdmin) {
        return res.status(403).json({ message: "You don't have permission to update this tenant" });
      }
      
      // Business admin can only update certain fields
      if (isBusinessAdmin) {
        if (name) tenant.name = name;
        if (business_name) tenant.business_name = business_name;
        if (business_phone) tenant.business_phone = business_phone;
        if (address) tenant.address = address;
      } else if (isSuperAdmin) {
        // Super admin can update all fields
        if (name) tenant.name = name;
        if (business_name) tenant.business_name = business_name;
        if (business_email && business_email !== tenant.business_email) {
          // Check if email is already in use
          const existingTenant = await Tenant.findOne({ 
            business_email, 
            _id: { $ne: tenantId } 
          });
          
          if (existingTenant) {
            return res.status(409).json({ message: "A tenant with this email already exists" });
          }
          
          tenant.business_email = business_email;
        }
        if (business_phone) tenant.business_phone = business_phone;
        if (address) tenant.address = address;
        if (subscription_plan) tenant.subscription_plan = subscription_plan;
        if (subscription_status) tenant.subscription_status = subscription_status;
      }
      
      await tenant.save();
      
      res.status(200).json({ 
        message: "Tenant updated successfully", 
        tenant 
      });
    } catch (error) {
      console.error("Update tenant error:", error);
      res.status(500).json({ message: "Error updating tenant" });
    }
  }
);

// Delete tenant (super_admin only)
router.delete("/:id", 
  authenticateToken, 
  authorizeRole(["super_admin"]), 
  async (req, res) => {
    try {
      const tenantId = req.params.id;
      
      // Find tenant
      const tenant = await Tenant.findById(tenantId);
      
      if (!tenant) {
        return res.status(404).json({ message: "Tenant not found" });
      }
      
      // In a real application, you might want to:
      // 1. Archive the tenant instead of deleting
      // 2. Delete or archive all associated data (users, appointments, etc.)
      // 3. Implement a soft delete mechanism
      
      await Tenant.findByIdAndDelete(tenantId);
      
      res.status(200).json({ message: "Tenant deleted successfully" });
    } catch (error) {
      console.error("Delete tenant error:", error);
      res.status(500).json({ message: "Error deleting tenant" });
    }
  }
);

export default router; 