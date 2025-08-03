# WhatsApp Appointment Booking SaaS Backend API

A robust Node.js/Express backend API for a WhatsApp appointment booking SaaS platform with comprehensive multi-tenant architecture and role-based access control.

## Features

- Multi-tenant architecture for serving multiple clinics
- Role-based access control with granular permissions
- JWT token-based authentication
- Appointment scheduling and management
- Customer management
- User management with different roles

## Tech Stack

- Node.js & Express.js
- MongoDB with Mongoose ORM
- JWT for authentication
- bcrypt for password hashing

## Database Schema

### Users
- user_id (primary key)
- email (unique)
- password_hash
- full_name
- phone_number
- role_id (foreign key)
- tenant_id (foreign key)
- is_email_verified
- verification_token
- reset_password_token
- reset_password_expires

### Roles
- role_id (primary key)
- role_name (super_admin, business_admin, employee, customer)
- role_description
- is_platform_role (boolean)

### Permissions
- permission_id (primary key)
- permission_name
- action_type (create, read, update, delete)
- resource

### Role_Permissions
- role_id (foreign key)
- permission_id (foreign key)

### Appointments
- appointment_id (primary key)
- customer_id (foreign key)
- staff_id (foreign key)
- tenant_id (foreign key)
- service_type
- appointment_date
- start_time, end_time
- status (pending, confirmed, completed, cancelled)
- notes
- created_at, updated_at

### Customers
- customer_id (primary key)
- name
- phone_number
- email
- tenant_id (foreign key)
- notes
- created_at, updated_at

### Tenants
- tenant_id (primary key)
- name
- business_name
- business_email
- business_phone
- address
- subscription_plan
- subscription_status
- trial_ends_at
- created_at, updated_at

## API Endpoints

### Authentication Routes
- POST /api/auth/login
- POST /api/auth/register
- POST /api/auth/verify-email
- POST /api/auth/forgot-password
- POST /api/auth/reset-password
- POST /api/auth/logout

### User Management Routes
- GET /api/users (role-based filtering)
- POST /api/users/invite (business admin only)
- PUT /api/users/:id (role-based permissions)
- DELETE /api/users/:id (admin only)
- GET /api/users/me (current user profile)

### Appointment Routes
- GET /api/appointments (role-scoped)
- POST /api/appointments
- PUT /api/appointments/:id
- DELETE /api/appointments/:id
- GET /api/appointments/calendar
- GET /api/appointments/staff/:staffId

### Customer Routes
- GET /api/customers (tenant-scoped)
- POST /api/customers
- PUT /api/customers/:id
- GET /api/customers/:id/appointments

### Tenant Routes
- GET /api/tenants (super_admin only)
- POST /api/tenants (super_admin only)
- PUT /api/tenants/:id
- GET /api/tenants/:id
- DELETE /api/tenants/:id (super_admin only)

## Role-Based Access Control

### Middleware Functions
- `authenticateToken`: Verify JWT tokens
- `authorizeRole`: Check user roles
- `checkPermission`: Validate specific permissions
- `tenantScope`: Ensure tenant data isolation
- `rateLimiter`: API rate limiting

## Getting Started

### Prerequisites
- Node.js (v16+)
- MongoDB (v4+)

### Installation

1. Clone the repository
2. Install dependencies:
```bash
cd backend
npm install
```

3. Create a `.env` file with the following variables:
```
MONGODB_URI=mongodb://localhost:27017/whatsapp_appointment_saas
JWT_SECRET=your_jwt_secret_key_here
JWT_EXPIRES_IN=24h
PORT=8080
NODE_ENV=development
EMAIL_FROM=noreply@healthconnect.com
EMAIL_HOST=smtp.example.com
EMAIL_PORT=587
EMAIL_USER=your_email_username
EMAIL_PASS=your_email_password
```

4. Start the server:
```bash
npm run dev
```

## License
This project is licensed under the MIT License. 