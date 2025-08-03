import express from "express";
import Appointment from "../models/Appointment.js";
import Customer from "../models/Customer.js";
import { authenticateToken, authorizeRole, checkPermission, tenantScope } from "../middleware/auth.js";
import fetch from 'node-fetch';

const router = express.Router();

// Get all appointments (role-scoped)
router.get("/", authenticateToken, tenantScope, async (req, res) => {
  try {
    let query = {};
    
    // Apply tenant scope
    if (req.tenantId) {
      query.tenant_id = req.tenantId;
    }
    
    // Filter by date range if provided
    if (req.query.startDate && req.query.endDate) {
      query.appointment_date = {
        $gte: new Date(req.query.startDate),
        $lte: new Date(req.query.endDate)
      };
    }
    
    // Filter by status if provided
    if (req.query.status) {
      query.status = req.query.status;
    }
    
    // If employee role, only show their appointments
    if (req.user.role_id.role_name === "employee") {
      query.staff_id = req.user._id;
    }
    
    const appointments = await Appointment.find(query)
      .populate("customer_id", "name phone_number email")
      .populate("staff_id", "full_name")
      .sort({ appointment_date: 1, start_time: 1 });
    
    res.status(200).json(appointments);
  } catch (error) {
    console.error("Get appointments error:", error);
    res.status(500).json({ message: "Error retrieving appointments" });
  }
});

// Get appointment by ID
router.get("/:id", authenticateToken, tenantScope, async (req, res) => {
  try {
    const appointmentId = req.params.id;
    
    const appointment = await Appointment.findById(appointmentId)
      .populate("customer_id", "name phone_number email")
      .populate("staff_id", "full_name");
    
    if (!appointment) {
      return res.status(404).json({ message: "Appointment not found" });
    }
    
    // Check tenant access
    if (req.tenantId && appointment.tenant_id.toString() !== req.tenantId.toString()) {
      return res.status(403).json({ message: "You don't have permission to access this appointment" });
    }
    
    // If employee, check if they are assigned to this appointment
    if (req.user.role_id.role_name === "employee" && 
        appointment.staff_id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "You don't have permission to access this appointment" });
    }
    
    res.status(200).json(appointment);
  } catch (error) {
    console.error("Get appointment error:", error);
    res.status(500).json({ message: "Error retrieving appointment" });
  }
});

// Create new appointment
router.post("/", authenticateToken, tenantScope, async (req, res) => {
  try {
    const { 
      customer_id, 
      staff_id, 
      service_type, 
      appointment_date, 
      start_time, 
      end_time, 
      notes 
    } = req.body;
    
    // Create new appointment
    const newAppointment = new Appointment({
      customer_id,
      staff_id,
      tenant_id: req.tenantId,
      service_type,
      appointment_date: new Date(appointment_date),
      start_time: new Date(start_time),
      end_time: new Date(end_time),
      notes,
      status: "pending"
    });
    
    // Check for conflicts
    const conflictingAppointment = await Appointment.findOne({
      staff_id,
      $or: [
        {
          start_time: { $lt: new Date(end_time) },
          end_time: { $gt: new Date(start_time) }
        }
      ],
      status: { $ne: "cancelled" }
    });
    
    if (conflictingAppointment) {
      return res.status(409).json({ 
        message: "There is a scheduling conflict with another appointment" 
      });
    }
    
    await newAppointment.save();
    
    // TODO: Send confirmation notification
    
    res.status(201).json({ 
      message: "Appointment created successfully", 
      appointment: newAppointment 
    });
  } catch (error) {
    console.error("Create appointment error:", error);
    res.status(500).json({ message: "Error creating appointment" });
  }
});

// Update appointment
router.put("/:id", authenticateToken, tenantScope, async (req, res) => {
  try {
    const appointmentId = req.params.id;
    const { 
      staff_id, 
      service_type, 
      appointment_date, 
      start_time, 
      end_time, 
      status,
      notes 
    } = req.body;
    
    // Find appointment
    const appointment = await Appointment.findById(appointmentId);
    
    if (!appointment) {
      return res.status(404).json({ message: "Appointment not found" });
    }
    
    // Check tenant access
    if (req.tenantId && appointment.tenant_id.toString() !== req.tenantId.toString()) {
      return res.status(403).json({ message: "You don't have permission to update this appointment" });
    }
    
    // If employee, check if they are assigned to this appointment
    if (req.user.role_id.role_name === "employee" && 
        appointment.staff_id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "You don't have permission to update this appointment" });
    }
    
    // Update fields
    if (staff_id) appointment.staff_id = staff_id;
    if (service_type) appointment.service_type = service_type;
    if (appointment_date) appointment.appointment_date = new Date(appointment_date);
    if (start_time) appointment.start_time = new Date(start_time);
    if (end_time) appointment.end_time = new Date(end_time);
    if (status) appointment.status = status;
    if (notes) appointment.notes = notes;
    
    // Check for conflicts if time is changed
    if (start_time || end_time) {
      const conflictingAppointment = await Appointment.findOne({
        _id: { $ne: appointmentId },
        staff_id: staff_id || appointment.staff_id,
        $or: [
          {
            start_time: { $lt: appointment.end_time },
            end_time: { $gt: appointment.start_time }
          }
        ],
        status: { $ne: "cancelled" }
      });
      
      if (conflictingAppointment) {
        return res.status(409).json({ 
          message: "There is a scheduling conflict with another appointment" 
        });
      }
    }
    
    await appointment.save();
    
    // TODO: Send update notification if status changed
    
    res.status(200).json({ 
      message: "Appointment updated successfully", 
      appointment 
    });
  } catch (error) {
    console.error("Update appointment error:", error);
    res.status(500).json({ message: "Error updating appointment" });
  }
});

// Delete appointment
router.delete("/:id", authenticateToken, tenantScope, async (req, res) => {
  try {
    const appointmentId = req.params.id;
    
    // Find appointment
    const appointment = await Appointment.findById(appointmentId);
    
    if (!appointment) {
      return res.status(404).json({ message: "Appointment not found" });
    }
    
    // Check tenant access
    if (req.tenantId && appointment.tenant_id.toString() !== req.tenantId.toString()) {
      return res.status(403).json({ message: "You don't have permission to delete this appointment" });
    }
    
    // Only admins can delete appointments
    if (!["super_admin", "business_admin"].includes(req.user.role_id.role_name)) {
      return res.status(403).json({ 
        message: "You don't have permission to delete appointments" 
      });
    }
    
    await Appointment.findByIdAndDelete(appointmentId);
    
    res.status(200).json({ message: "Appointment deleted successfully" });
  } catch (error) {
    console.error("Delete appointment error:", error);
    res.status(500).json({ message: "Error deleting appointment" });
  }
});

// Cancel appointment route
router.put('/cancel/:id', authenticateToken, async (req, res) => {
  try {
    const appointment = await Appointment.findById(req.params.id);
    
    if (!appointment) {
      return res.status(404).json({ message: 'Appointment not found' });
    }

    // Update appointment status to cancelled
    appointment.status = 'cancelled';
    appointment.updated_at = new Date();
    await appointment.save();

    // Forward cancellation to n8n
    try {
      const n8nWebhookUrl = process.env.N8N_WEBHOOK_URL;
      if (n8nWebhookUrl) {
        await fetch(n8nWebhookUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            appointment_id: appointment._id,
            appointment_date: appointment.appointment_date,
            start_time: appointment.start_time,
            end_time: appointment.end_time,
            action: 'cancel'
          }),
        });
      }
    } catch (n8nError) {
      console.error('Failed to notify n8n:', n8nError);
      // Continue since the appointment is already cancelled in our system
    }

    res.json({ message: 'Appointment cancelled successfully', appointment });
  } catch (error) {
    console.error('Error cancelling appointment:', error);
    res.status(500).json({ message: 'Error cancelling appointment', error: error.message });
  }
});

// Get calendar view of appointments
router.get("/calendar", authenticateToken, tenantScope, async (req, res) => {
  try {
    const { month, year } = req.query;
    
    // Validate month and year
    if (!month || !year) {
      return res.status(400).json({ message: "Month and year are required" });
    }
    
    // Create date range for the month
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);
    
    let query = {
      appointment_date: {
        $gte: startDate,
        $lte: endDate
      }
    };
    
    // Apply tenant scope
    if (req.tenantId) {
      query.tenant_id = req.tenantId;
    }
    
    // If employee role, only show their appointments
    if (req.user.role_id.role_name === "employee") {
      query.staff_id = req.user._id;
    }
    
    const appointments = await Appointment.find(query)
      .populate("customer_id", "name")
      .populate("staff_id", "full_name")
      .sort({ appointment_date: 1, start_time: 1 });
    
    // Group appointments by date
    const calendarData = {};
    
    appointments.forEach(appointment => {
      const dateKey = appointment.appointment_date.toISOString().split('T')[0];
      
      if (!calendarData[dateKey]) {
        calendarData[dateKey] = [];
      }
      
      calendarData[dateKey].push({
        id: appointment._id,
        customer: appointment.customer_id.name,
        staff: appointment.staff_id.full_name,
        service: appointment.service_type,
        start: appointment.start_time,
        end: appointment.end_time,
        status: appointment.status
      });
    });
    
    res.status(200).json(calendarData);
  } catch (error) {
    console.error("Calendar view error:", error);
    res.status(500).json({ message: "Error retrieving calendar data" });
  }
});

// Get appointments for a specific staff member
router.get("/staff/:staffId", authenticateToken, tenantScope, async (req, res) => {
  try {
    const { staffId } = req.params;
    const { date } = req.query;
    
    let query = {
      staff_id: staffId
    };
    
    // Apply tenant scope
    if (req.tenantId) {
      query.tenant_id = req.tenantId;
    }
    
    // Filter by date if provided
    if (date) {
      const startDate = new Date(date);
      startDate.setHours(0, 0, 0, 0);
      
      const endDate = new Date(date);
      endDate.setHours(23, 59, 59, 999);
      
      query.appointment_date = {
        $gte: startDate,
        $lte: endDate
      };
    }
    
    const appointments = await Appointment.find(query)
      .populate("customer_id", "name phone_number")
      .sort({ start_time: 1 });
    
    res.status(200).json(appointments);
  } catch (error) {
    console.error("Staff appointments error:", error);
    res.status(500).json({ message: "Error retrieving staff appointments" });
  }
});

export default router; 