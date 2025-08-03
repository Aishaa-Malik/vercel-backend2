import jwt from "jsonwebtoken";
import User from "../models/User.js";
import Role from "../models/Role.js";
import RolePermission from "../models/RolePermission.js";
import Permission from "../models/Permission.js";

// Middleware to verify JWT token
export const authenticateToken = async (req, res, next) => {
  try {
    // Get token from Authorization header
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1]; // Bearer TOKEN
    
    if (!token) {
      return res.status(401).json({ message: "Access denied. No token provided." });
    }
    
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Find user
    const user = await User.findById(decoded.userId).populate("role_id");
    
    if (!user) {
      return res.status(401).json({ message: "Invalid token. User not found." });
    }
    
    // Attach user to request object
    req.user = user;
    next();
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      return res.status(401).json({ message: "Token expired. Please login again." });
    }
    
    return res.status(401).json({ message: "Invalid token." });
  }
};

// Middleware to check user role
export const authorizeRole = (roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized. User not authenticated." });
    }
    
    const userRole = req.user.role_id.role_name;
    
    if (!roles.includes(userRole)) {
      return res.status(403).json({ 
        message: "Access denied. You don't have permission to access this resource." 
      });
    }
    
    next();
  };
};

// Middleware to check specific permissions
export const checkPermission = (requiredPermission) => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Unauthorized. User not authenticated." });
      }
      
      const roleId = req.user.role_id._id;
      
      // Find permission by name
      const permission = await Permission.findOne({ permission_name: requiredPermission });
      
      if (!permission) {
        return res.status(403).json({ message: "Permission not found in system." });
      }
      
      // Check if role has this permission
      const rolePermission = await RolePermission.findOne({
        role_id: roleId,
        permission_id: permission._id
      });
      
      if (!rolePermission) {
        return res.status(403).json({ 
          message: "Access denied. You don't have the required permission." 
        });
      }
      
      next();
    } catch (error) {
      console.error("Permission check error:", error);
      return res.status(500).json({ message: "Internal server error during permission check." });
    }
  };
};

// Middleware to ensure tenant data isolation
export const tenantScope = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized. User not authenticated." });
    }
    
    // Super admin can access all tenants
    if (req.user.role_id.role_name === "super_admin") {
      return next();
    }
    
    // Check if user has tenant_id
    if (!req.user.tenant_id) {
      return res.status(403).json({ 
        message: "Access denied. User not associated with any tenant." 
      });
    }
    
    // Add tenant_id to request query for automatic filtering
    req.tenantId = req.user.tenant_id;
    next();
  } catch (error) {
    console.error("Tenant scope error:", error);
    return res.status(500).json({ message: "Internal server error during tenant scope check." });
  }
};

// Rate limiter middleware
export const rateLimiter = {
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: "Too many requests from this IP, please try again after 15 minutes"
}; 