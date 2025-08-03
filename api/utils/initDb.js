import Role from "../models/Role.js";
import Permission from "../models/Permission.js";
import RolePermission from "../models/RolePermission.js";
import User from "../models/User.js";
import bcrypt from "bcrypt";

// Initialize default roles
export const initRoles = async () => {
  try {
    // Define default roles
    const roles = [
      {
        role_name: "super_admin",
        role_description: "Platform administrator with full access to all features",
        is_platform_role: true
      },
      {
        role_name: "business_admin",
        role_description: "Business owner or manager with administrative access to their tenant",
        is_platform_role: false
      },
      {
        role_name: "employee",
        role_description: "Staff member who can manage appointments and customers",
        is_platform_role: false
      },
      {
        role_name: "customer",
        role_description: "End user who can book and manage their own appointments",
        is_platform_role: false
      }
    ];

    // Insert roles if they don't exist
    for (const role of roles) {
      const existingRole = await Role.findOne({ role_name: role.role_name });
      if (!existingRole) {
        await Role.create(role);
        console.log(`Role created: ${role.role_name}`);
      }
    }

    console.log("Default roles initialized successfully");
  } catch (error) {
    console.error("Error initializing roles:", error);
  }
};

// Initialize default permissions
export const initPermissions = async () => {
  try {
    // Define resources
    const resources = [
      "users",
      "roles",
      "permissions",
      "tenants",
      "appointments",
      "customers"
    ];

    // Define action types
    const actionTypes = ["create", "read", "update", "delete"];

    // Create permissions for each resource and action type
    const permissions = [];

    resources.forEach(resource => {
      actionTypes.forEach(actionType => {
        permissions.push({
          permission_name: `${actionType}_${resource}`,
          action_type: actionType,
          resource: resource
        });
      });
    });

    // Insert permissions if they don't exist
    for (const permission of permissions) {
      const existingPermission = await Permission.findOne({ 
        permission_name: permission.permission_name 
      });
      
      if (!existingPermission) {
        await Permission.create(permission);
        console.log(`Permission created: ${permission.permission_name}`);
      }
    }

    console.log("Default permissions initialized successfully");
  } catch (error) {
    console.error("Error initializing permissions:", error);
  }
};

// Assign permissions to roles
export const assignRolePermissions = async () => {
  try {
    // Get all roles
    const superAdminRole = await Role.findOne({ role_name: "super_admin" });
    const businessAdminRole = await Role.findOne({ role_name: "business_admin" });
    const employeeRole = await Role.findOne({ role_name: "employee" });
    const customerRole = await Role.findOne({ role_name: "customer" });

    // Get all permissions
    const allPermissions = await Permission.find({});

    // Super admin gets all permissions
    for (const permission of allPermissions) {
      const existingRolePermission = await RolePermission.findOne({
        role_id: superAdminRole._id,
        permission_id: permission._id
      });

      if (!existingRolePermission) {
        await RolePermission.create({
          role_id: superAdminRole._id,
          permission_id: permission._id
        });
      }
    }

    // Business admin permissions
    const businessAdminPermissions = allPermissions.filter(p => 
      (p.resource !== "tenants" || p.action_type !== "delete") &&
      (p.resource !== "roles" || p.action_type === "read") &&
      (p.resource !== "permissions" || p.action_type === "read")
    );

    for (const permission of businessAdminPermissions) {
      const existingRolePermission = await RolePermission.findOne({
        role_id: businessAdminRole._id,
        permission_id: permission._id
      });

      if (!existingRolePermission) {
        await RolePermission.create({
          role_id: businessAdminRole._id,
          permission_id: permission._id
        });
      }
    }

    // Employee permissions
    const employeePermissions = allPermissions.filter(p => 
      (p.resource === "appointments" || p.resource === "customers") &&
      (p.action_type !== "delete")
    );

    for (const permission of employeePermissions) {
      const existingRolePermission = await RolePermission.findOne({
        role_id: employeeRole._id,
        permission_id: permission._id
      });

      if (!existingRolePermission) {
        await RolePermission.create({
          role_id: employeeRole._id,
          permission_id: permission._id
        });
      }
    }

    // Customer permissions
    const customerPermissions = allPermissions.filter(p => 
      (p.resource === "appointments" && 
       (p.action_type === "read" || p.action_type === "create" || p.action_type === "update"))
    );

    for (const permission of customerPermissions) {
      const existingRolePermission = await RolePermission.findOne({
        role_id: customerRole._id,
        permission_id: permission._id
      });

      if (!existingRolePermission) {
        await RolePermission.create({
          role_id: customerRole._id,
          permission_id: permission._id
        });
      }
    }

    console.log("Role permissions assigned successfully");
  } catch (error) {
    console.error("Error assigning role permissions:", error);
  }
};

// Create default super admin user
export const createSuperAdmin = async () => {
  try {
    // Check if super admin already exists
    const existingSuperAdmin = await User.findOne({
      email: "admin@whatsappbooking.com"
    });

    if (existingSuperAdmin) {
      console.log("Super admin already exists");
      return;
    }

    // Get super admin role
    const superAdminRole = await Role.findOne({ role_name: "super_admin" });
    if (!superAdminRole) {
      console.error("Super admin role not found");
      return;
    }

    // Create super admin user
    const hashedPassword = await bcrypt.hash("admin123", 10);
    
    await User.create({
      email: "admin@whatsappbooking.com",
      password_hash: hashedPassword,
      full_name: "System Administrator",
      phone_number: "1234567890",
      role_id: superAdminRole._id,
      is_email_verified: true
    });

    console.log("Super admin user created successfully");
  } catch (error) {
    console.error("Error creating super admin:", error);
  }
};

// Main initialization function
export const initializeDatabase = async () => {
  try {
    await initRoles();
    await initPermissions();
    await assignRolePermissions();
    await createSuperAdmin();
    console.log("Database initialization completed successfully");
  } catch (error) {
    console.error("Database initialization failed:", error);
  }
};

export default initializeDatabase; 