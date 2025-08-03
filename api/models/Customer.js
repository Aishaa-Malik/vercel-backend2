import mongoose from "mongoose";

const customerSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  phone_number: {
    type: String,
    required: true
  },
  email: {
    type: String,
    trim: true,
    lowercase: true
  },
  tenant_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Tenant",
    required: true
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

// Create a compound index for tenant_id and phone_number
customerSchema.index({ tenant_id: 1, phone_number: 1 }, { unique: true });

// Update the timestamp before saving
customerSchema.pre("save", function(next) {
  this.updated_at = Date.now();
  next();
});

const Customer = mongoose.model("Customer", customerSchema);

export default Customer; 