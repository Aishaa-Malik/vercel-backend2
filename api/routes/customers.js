import express from "express";
import Customer from "../models/Customer.js";
import Appointment from "../models/Appointment.js";
import { authenticateToken, authorizeRole, checkPermission, tenantScope } from "../middleware/auth.js";

const router = express.Router();

// Get all customers (tenant-scoped)
router.get("/", authenticateToken, tenantScope, async (req, res) => {
  try {
    let query = {};
    
    // Apply tenant scope
    if (req.tenantId) {
      query.tenant_id = req.tenantId;
    }
    
    // Search by name or phone if provided
    if (req.query.search) {
      const searchRegex = new RegExp(req.query.search, "i");
      query.$or = [
        { name: searchRegex },
        { phone_number: searchRegex },
        { email: searchRegex }
      ];
    }
    
    const customers = await Customer.find(query).sort({ name: 1 });
    
    res.status(200).json(customers);
  } catch (error) {
    console.error("Get customers error:", error);
    res.status(500).json({ message: "Error retrieving customers" });
  }
});

// Get customer by ID
router.get("/:id", authenticateToken, tenantScope, async (req, res) => {
  try {
    const customerId = req.params.id;
    
    const customer = await Customer.findById(customerId);
    
    if (!customer) {
      return res.status(404).json({ message: "Customer not found" });
    }
    
    // Check tenant access
    if (req.tenantId && customer.tenant_id.toString() !== req.tenantId.toString()) {
      return res.status(403).json({ message: "You don't have permission to access this customer" });
    }
    
    res.status(200).json(customer);
  } catch (error) {
    console.error("Get customer error:", error);
    res.status(500).json({ message: "Error retrieving customer" });
  }
});

// Create new customer
router.post("/", authenticateToken, tenantScope, async (req, res) => {
  try {
    const { name, phone_number, email, notes } = req.body;
    
    // Check if customer already exists with this phone number for this tenant
    const existingCustomer = await Customer.findOne({
      phone_number,
      tenant_id: req.tenantId
    });
    
    if (existingCustomer) {
      return res.status(409).json({ 
        message: "A customer with this phone number already exists",
        customer: existingCustomer
      });
    }
    
    // Create new customer
    const newCustomer = new Customer({
      name,
      phone_number,
      email,
      notes,
      tenant_id: req.tenantId
    });
    
    await newCustomer.save();
    
    res.status(201).json({ 
      message: "Customer created successfully", 
      customer: newCustomer 
    });
  } catch (error) {
    console.error("Create customer error:", error);
    res.status(500).json({ message: "Error creating customer" });
  }
});

// Update customer
router.put("/:id", authenticateToken, tenantScope, async (req, res) => {
  try {
    const customerId = req.params.id;
    const { name, phone_number, email, notes } = req.body;
    
    // Find customer
    const customer = await Customer.findById(customerId);
    
    if (!customer) {
      return res.status(404).json({ message: "Customer not found" });
    }
    
    // Check tenant access
    if (req.tenantId && customer.tenant_id.toString() !== req.tenantId.toString()) {
      return res.status(403).json({ message: "You don't have permission to update this customer" });
    }
    
    // If phone number is changed, check for duplicates
    if (phone_number && phone_number !== customer.phone_number) {
      const existingCustomer = await Customer.findOne({
        phone_number,
        tenant_id: req.tenantId,
        _id: { $ne: customerId }
      });
      
      if (existingCustomer) {
        return res.status(409).json({ 
          message: "A customer with this phone number already exists" 
        });
      }
    }
    
    // Update fields
    if (name) customer.name = name;
    if (phone_number) customer.phone_number = phone_number;
    if (email !== undefined) customer.email = email;
    if (notes !== undefined) customer.notes = notes;
    
    await customer.save();
    
    res.status(200).json({ 
      message: "Customer updated successfully", 
      customer 
    });
  } catch (error) {
    console.error("Update customer error:", error);
    res.status(500).json({ message: "Error updating customer" });
  }
});

// Get customer appointments
router.get("/:id/appointments", authenticateToken, tenantScope, async (req, res) => {
  try {
    const customerId = req.params.id;
    
    // Find customer to verify tenant access
    const customer = await Customer.findById(customerId);
    
    if (!customer) {
      return res.status(404).json({ message: "Customer not found" });
    }
    
    // Check tenant access
    if (req.tenantId && customer.tenant_id.toString() !== req.tenantId.toString()) {
      return res.status(403).json({ message: "You don't have permission to access this customer's data" });
    }
    
    // Get appointments
    const appointments = await Appointment.find({ customer_id: customerId })
      .populate("staff_id", "full_name")
      .sort({ appointment_date: -1, start_time: -1 });
    
    res.status(200).json(appointments);
  } catch (error) {
    console.error("Get customer appointments error:", error);
    res.status(500).json({ message: "Error retrieving customer appointments" });
  }
});

export default router; 