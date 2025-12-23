# Database Documentation

## Overview

This document provides comprehensive information about the database structure, tables, and relationships used in the HR Policy Digital Twin application.

## Database Technology Stack

- **ORM**: Sequelize (TypeScript)
- **Database Dialect**: MySQL/MariaDB
- **Connection Pool**: Configured in `src/mysql/db/seq.db.ts`
- **Model Pattern**: MVC with separate model files for each entity

## Database Tables

### Core User Management

#### 1. **users**
Stores user account information and authentication credentials.

| Field | Type | Constraints | Description |
|-------|------|-----------|-------------|
| id | INT | PRIMARY KEY, AUTO_INCREMENT | Unique user identifier |
| username | VARCHAR(255) | UNIQUE, NOT NULL | Login username |
| password | VARCHAR(255) | NOT NULL | Hashed password |
| email | VARCHAR(255) | UNIQUE | User email address |
| name | VARCHAR(255) | NOT NULL | Full name |
| department | VARCHAR(255) | | Department name |
| employee_id | VARCHAR(100) | UNIQUE | Employee ID number |
| role | ENUM | DEFAULT 'user' | User role (user, admin) |
| is_active | BOOLEAN | DEFAULT true | Account status |
| last_login | DATETIME | | Last login timestamp |
| created_at | DATETIME | DEFAULT NOW | Account creation time |
| updated_at | DATETIME | DEFAULT NOW | Last update time |

#### 2. **user_roles**
Junction table for many-to-many relationship between users and roles.

| Field | Type | Constraints | Description |
|-------|------|-----------|-------------|
| id | INT | PRIMARY KEY, AUTO_INCREMENT | Unique record ID |
| user_id | INT | FOREIGN KEY (users.id) | Reference to user |
| role_id | INT | FOREIGN KEY (roles.id) | Reference to role |
| created_at | DATETIME | DEFAULT NOW | Assignment date |

#### 3. **user_groups**
Junction table linking users to groups/departments.

| Field | Type | Constraints | Description |
|-------|------|-----------|-------------|
| id | INT | PRIMARY KEY, AUTO_INCREMENT | Unique record ID |
| user_id | INT | FOREIGN KEY (users.id) | Reference to user |
| group_id | INT | FOREIGN KEY (groups.id) | Reference to group |
| created_at | DATETIME | DEFAULT NOW | Assignment date |

#### 4. **roles**
Defines available roles and permissions in the system.

| Field | Type | Constraints | Description |
|-------|------|-----------|-------------|
| id | INT | PRIMARY KEY, AUTO_INCREMENT | Unique role ID |
| name | VARCHAR(100) | UNIQUE, NOT NULL | Role name (admin, user, viewer) |
| description | TEXT | | Role description |
| created_at | DATETIME | DEFAULT NOW | Creation time |
| updated_at | DATETIME | DEFAULT NOW | Update time |

#### 5. **groups**
Organizes users into departments or teams.

| Field | Type | Constraints | Description |
|-------|------|-----------|-------------|
| id | INT | PRIMARY KEY, AUTO_INCREMENT | Unique group ID |
| name | VARCHAR(255) | NOT NULL | Group/Department name |
| description | TEXT | | Group description |
| parent_id | INT | FOREIGN KEY (groups.id) | Parent group ID for hierarchy |
| created_at | DATETIME | DEFAULT NOW | Creation time |
| updated_at | DATETIME | DEFAULT NOW | Update time |

### Document Management

#### 6. **files**
Stores uploaded documents and file metadata.

| Field | Type | Constraints | Description |
|-------|------|-----------|-------------|
| id | INT | PRIMARY KEY, AUTO_INCREMENT | Unique file ID |
| filename | VARCHAR(255) | NOT NULL | Original file name |
| storage_key | VARCHAR(500) | NOT NULL | Cloud storage key/path |
| mime_type | VARCHAR(100) | | File MIME type |
| size | BIGINT | | File size in bytes |
| category | VARCHAR(100) | | Document category |
| create_by | INT | FOREIGN KEY (users.id) | User who uploaded |
| created_at | DATETIME | DEFAULT NOW | Upload time |
| updated_at | DATETIME | DEFAULT NOW | Update time |

#### 7. **file_roles**
Controls file access permissions by role.

| Field | Type | Constraints | Description |
|-------|------|-----------|-------------|
| id | INT | PRIMARY KEY, AUTO_INCREMENT | Unique record ID |
| file_id | INT | FOREIGN KEY (files.id) | Reference to file |
| role_id | INT | FOREIGN KEY (roles.id) | Reference to role |
| can_read | BOOLEAN | DEFAULT true | Read permission |
| can_share | BOOLEAN | DEFAULT false | Share permission |
| created_at | DATETIME | DEFAULT NOW | Assignment date |

#### 8. **file_tags**
Tags for categorizing and organizing files.

| Field | Type | Constraints | Description |
|-------|------|-----------|-------------|
| id | INT | PRIMARY KEY, AUTO_INCREMENT | Unique tag ID |
| file_id | INT | FOREIGN KEY (files.id) | Reference to file |
| tag | VARCHAR(100) | | Tag name |
| created_at | DATETIME | DEFAULT NOW | Creation time |

### Workflow & Task Management

#### 9. **flow_definitions**
Defines workflow/approval flow templates.

| Field | Type | Constraints | Description |
|-------|------|-----------|-------------|
| id | INT | PRIMARY KEY, AUTO_INCREMENT | Unique flow ID |
| name | VARCHAR(255) | NOT NULL | Flow name |
| description | TEXT | | Flow description |
| status | ENUM | DEFAULT 'active' | Flow status (active, inactive) |
| steps | JSON | | Workflow step definitions |
| created_at | DATETIME | DEFAULT NOW | Creation time |
| updated_at | DATETIME | DEFAULT NOW | Update time |

#### 10. **gen_task** (Generation Tasks)
Tracks background processing tasks.

| Field | Type | Constraints | Description |
|-------|------|-----------|-------------|
| id | INT | PRIMARY KEY, AUTO_INCREMENT | Unique task ID |
| user_id | INT | FOREIGN KEY (users.id) | User who initiated |
| task_type | VARCHAR(100) | | Type of task (document_process, etc.) |
| status | ENUM | DEFAULT 'pending' | Task status (pending, processing, completed, failed) |
| progress | INT | | Completion percentage (0-100) |
| input_data | JSON | | Input parameters |
| output_data | JSON | | Task results |
| error_message | TEXT | | Error details if failed |
| created_at | DATETIME | DEFAULT NOW | Creation time |
| updated_at | DATETIME | DEFAULT NOW | Update time |

#### 11. **gen_task_output**
Stores outputs/results from generation tasks.

| Field | Type | Constraints | Description |
|-------|------|-----------|-------------|
| id | INT | PRIMARY KEY, AUTO_INCREMENT | Unique record ID |
| task_id | INT | FOREIGN KEY (gen_task.id) | Reference to task |
| output_type | VARCHAR(100) | | Type of output |
| output_data | LONGTEXT | | Output content/data |
| created_at | DATETIME | DEFAULT NOW | Creation time |

### Support & Communication

#### 12. **support_tickets** ⭐ (Notification Related)
Tracks user support requests and admin responses.

| Field | Type | Constraints | Description |
|-------|------|-----------|-------------|
| id | INT | PRIMARY KEY, AUTO_INCREMENT | Unique ticket ID |
| user_id | INT | FOREIGN KEY (users.id) | User who created ticket |
| user_name | VARCHAR(100) | NOT NULL | User's name |
| subject | VARCHAR(255) | NOT NULL | Support request subject |
| message | TEXT | NOT NULL | Initial message/query |
| status | ENUM | DEFAULT 'open' | Status (open, in_progress, resolved, closed) |
| admin_id | INT | FOREIGN KEY (users.id) | Admin who responded |
| admin_name | VARCHAR(100) | | Admin's name |
| admin_reply | TEXT | | Admin's response |
| replied_at | DATETIME | | Response timestamp |
| created_at | DATETIME | DEFAULT NOW | Ticket creation time |
| updated_at | DATETIME | DEFAULT NOW | Last update time |

**Status Values**:
- `open`: Newly created, waiting for admin attention
- `in_progress`: Admin is working on it
- `resolved`: Issue solved by admin
- `closed`: Ticket closed by user or admin

#### 13. **notifications** ⭐ (Notification Related)
System-wide notifications for users.

| Field | Type | Constraints | Description |
|-------|------|-----------|-------------|
| id | INT | PRIMARY KEY, AUTO_INCREMENT | Unique notification ID |
| user_id | INT | FOREIGN KEY (users.id) | Recipient user |
| title | VARCHAR(255) | NOT NULL | Notification title |
| message | TEXT | NOT NULL | Notification message |
| type | ENUM | DEFAULT 'info' | Type (info, success, warning, error, admin_reply) |
| is_read | BOOLEAN | DEFAULT false | Read status |
| link | VARCHAR(500) | | Optional action link |
| related_id | INT | | Related entity ID (for context) |
| created_at | DATETIME | DEFAULT NOW | Creation time |
| updated_at | DATETIME | DEFAULT NOW | Update time |

**Type Values**:
- `info`: Informational notification
- `success`: Success message
- `warning`: Warning notification
- `error`: Error notification
- `admin_reply`: Admin response to support ticket

### Menu & Navigation

#### 14. **menus**
Defines navigation menu items and structure.

| Field | Type | Constraints | Description |
|-------|------|-----------|-------------|
| id | INT | PRIMARY KEY, AUTO_INCREMENT | Unique menu ID |
| name | VARCHAR(255) | NOT NULL | Menu item name |
| path | VARCHAR(500) | | Route path |
| icon | VARCHAR(100) | | Icon name/identifier |
| parent_id | INT | FOREIGN KEY (menus.id) | Parent menu (for hierarchy) |
| order | INT | | Display order |
| is_active | BOOLEAN | DEFAULT true | Visibility status |
| created_at | DATETIME | DEFAULT NOW | Creation time |

#### 15. **role_menus**
Links menus to roles to control access.

| Field | Type | Constraints | Description |
|-------|------|-----------|-------------|
| id | INT | PRIMARY KEY, AUTO_INCREMENT | Unique record ID |
| role_id | INT | FOREIGN KEY (roles.id) | Reference to role |
| menu_id | INT | FOREIGN KEY (menus.id) | Reference to menu |
| created_at | DATETIME | DEFAULT NOW | Assignment date |

### Authentication & SSO

#### 16. **sso_user_bind**
Links SSO accounts (Azure AD, etc.) to local users.

| Field | Type | Constraints | Description |
|-------|------|-----------|-------------|
| id | INT | PRIMARY KEY, AUTO_INCREMENT | Unique binding ID |
| user_id | INT | FOREIGN KEY (users.id) | Local user |
| sso_provider | VARCHAR(100) | | SSO provider (azure_ad, etc.) |
| sso_id | VARCHAR(500) | | SSO provider user ID |
| sso_email | VARCHAR(255) | | SSO email |
| created_at | DATETIME | DEFAULT NOW | Binding date |

## Key Relationships

```
users (1) ──→ (many) user_roles ←── (many) roles
users (1) ──→ (many) user_groups ←── (many) groups
users (1) ──→ (many) files
users (1) ──→ (many) support_tickets
users (1) ──→ (many) notifications
users (1) ──→ (many) gen_task

files (1) ──→ (many) file_roles ←── (many) roles
files (1) ──→ (many) file_tags

roles (1) ──→ (many) role_menus ←── (many) menus

support_tickets (many) → notifications (via admin_reply type)

groups (1) ──→ (many) groups (self-referential for hierarchy)
menus (1) ──→ (many) menus (self-referential for hierarchy)
```

## Notification System Details

### How Notifications Work

1. **Support Tickets → Notifications**: When an admin replies to a support ticket, a notification is automatically created with type `admin_reply`
2. **Message Broadcasting**: When admin sends a message to all users via the notification system, individual notifications are created for each user
3. **User Queries**: User support queries are stored in `support_tickets` and admins can view them in the notification center

### Notification Flow

```
User submits query
    ↓
Creates support_ticket
    ↓
Admin gets alerted (notification)
    ↓
Admin replies to ticket (admin_reply column)
    ↓
Notification created with type='admin_reply'
    ↓
User sees notification in bell icon
```

## API Endpoints for Notifications

### Support Tickets
- `POST /api/support/ticket` - Create support ticket
- `GET /api/support/tickets` - List tickets (filtered by role)
- `POST /api/support/ticket/:ticketId/reply` - Admin reply to ticket

### Notifications
- `GET /api/support/notifications` - Get user notifications
- `POST /api/support/notifications/:id/read` - Mark notification as read
- `GET /api/support/notifications/unread/count` - Get unread count

## Database Initialization

The database is initialized through Sequelize models in:
- `/api/src/mysql/model/` - All model definitions
- `/api/src/mysql/db/seq.db.ts` - Database connection and initialization

## Important Notes

### Tables Related to Notifications
1. **support_tickets** - User queries and support requests
2. **notifications** - System notifications and admin messages
3. **users** - User information (referenced in both tables)

Both tables work together to provide complete notification functionality:
- `support_tickets` stores the original query and admin response
- `notifications` broadcasts the admin reply to the user

### Data Retention
- Support tickets are kept indefinitely for audit purposes
- Notifications can be marked as read/unread
- Both tables use soft-delete patterns (is_read flag) rather than hard deletes

## Best Practices

1. Always include pagination for list endpoints
2. Use appropriate indexes on frequently queried columns
3. Archive old support tickets after 1 year
4. Implement proper access control using roles
5. Log all admin actions for compliance
6. Use transactions for multi-table updates
7. Maintain referential integrity with foreign keys

## Future Enhancements

- [ ] Add attachment support to support_tickets
- [ ] Implement notification scheduling
- [ ] Add notification templates
- [ ] Create notification preferences per user
- [ ] Add read receipts with timestamps
- [ ] Implement notification analytics
