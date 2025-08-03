import mongoose from "mongoose";

const rolePermissionSchema = new mongoose.Schema({
  role_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Role",
    required: true
  },
  permission_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Permission",
    required: true
  },
  created_at: {
    type: Date,
    default: Date.now
  }
});

// Create a compound index to ensure uniqueness of role-permission pairs
rolePermissionSchema.index({ role_id: 1, permission_id: 1 }, { unique: true });

const RolePermission = mongoose.model("RolePermission", rolePermissionSchema);

export default RolePermission; 