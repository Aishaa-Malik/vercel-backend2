import mongoose from "mongoose";

const appointmentSchema = new mongoose.Schema({
  customer_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Customer",
    required: true
  },
  staff_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  tenant_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Tenant",
    required: true
  },
  service_type: {
    type: String,
    required: true
  },
  appointment_date: {
    type: Date,
    required: true
  },
  start_time: {
    type: Date,
    required: true
  },
  end_time: {
    type: Date,
    required: true
  },
  status: {
    type: String,
    enum: ["pending", "confirmed", "completed", "cancelled"],
    default: "pending"
  },
  notes: {
    type: String
  },
  created_at: {
    type: Date,
    default: Date.now
  },
  updated_at: {
    type: Date,
    default: Date.now
  }
});

// Create indexes for efficient querying
appointmentSchema.index({ tenant_id: 1, appointment_date: 1 });
appointmentSchema.index({ staff_id: 1, appointment_date: 1 });
appointmentSchema.index({ customer_id: 1, appointment_date: 1 });

// Update the timestamp before saving
appointmentSchema.pre("save", function(next) {
  this.updated_at = Date.now();
  next();
});

const Appointment = mongoose.model("Appointment", appointmentSchema);

export default Appointment; 