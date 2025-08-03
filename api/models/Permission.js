import mongoose from "mongoose";

const permissionSchema = new mongoose.Schema({
  permission_name: {
    type: String,
    required: true,
    unique: true
  },
  action_type: {
    type: String,
    required: true,
    enum: ["create", "read", "update", "delete"]
  },
  resource: {
    type: String,
    required: true
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
permissionSchema.pre("save", function(next) {
  this.updated_at = Date.now();
  next();
});

const Permission = mongoose.model("Permission", permissionSchema);

export default Permission; 