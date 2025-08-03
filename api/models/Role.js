import mongoose from "mongoose";

const roleSchema = new mongoose.Schema({
  role_name: {
    type: String,
    required: true,
    enum: ["super_admin", "business_admin", "employee", "customer"],
    unique: true
  },
  role_description: {
    type: String,
    required: true
  },
  is_platform_role: {
    type: Boolean,
    default: false
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
roleSchema.pre("save", function(next) {
  this.updated_at = Date.now();
  next();
});

const Role = mongoose.model("Role", roleSchema);

export default Role; 