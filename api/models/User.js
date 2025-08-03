import mongoose from "mongoose";
import bcrypt from "bcrypt";

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  password_hash: {
    type: String,
    required: true
  },
  full_name: {
    type: String,
    required: true
  },
  phone_number: {
    type: String,
    required: true
  },
  role_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Role",
    required: true
  },
  tenant_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Tenant",
    default: null
  },
  is_email_verified: {
    type: Boolean,
    default: false
  },
  verification_token: String,
  reset_password_token: String,
  reset_password_expires: Date,
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
userSchema.pre("save", function(next) {
  this.updated_at = Date.now();
  
  // Only hash password if it's modified or new
  if (!this.isModified("password_hash")) {
    return next();
  }
  
  // Generate salt and hash the password
  bcrypt.genSalt(10, (err, salt) => {
    if (err) return next(err);
    
    bcrypt.hash(this.password_hash, salt, (err, hash) => {
      if (err) return next(err);
      
      // Replace plain text password with hash
      this.password_hash = hash;
      next();
    });
  });
});

// Method to compare password
userSchema.methods.comparePassword = function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password_hash);
};

const User = mongoose.model("User", userSchema);

export default User; 