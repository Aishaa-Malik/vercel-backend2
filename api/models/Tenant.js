import mongoose from "mongoose";

const tenantSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  business_name: {
    type: String,
    required: true
  },
  business_email: {
    type: String,
    required: true,
    unique: true
  },
  business_phone: {
    type: String,
    required: true
  },
  address: {
    type: String,
    required: true
  },
  subscription_plan: {
    type: String,
    enum: ["free", "basic", "premium"],
    default: "free"
  },
  subscription_status: {
    type: String,
    enum: ["active", "inactive", "trial"],
    default: "trial"
  },
  trial_ends_at: {
    type: Date,
    default: () => new Date(+new Date() + 14 * 24 * 60 * 60 * 1000) // 14 days trial
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

// Update the timestamp before saving
tenantSchema.pre("save", function(next) {
  this.updated_at = Date.now();
  next();
});

const Tenant = mongoose.model("Tenant", tenantSchema);

export default Tenant; 