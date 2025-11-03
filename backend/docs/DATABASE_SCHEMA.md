# Work Shelf Database Schema

## Overview

Multi-tenant PostgreSQL database with Row-Level Security (RLS) for complete tenant isolation.

## Schema Diagram

```
┌──────────────────────────────────────────────────────────────────────┐
│                         MULTI-TENANT ARCHITECTURE                     │
└──────────────────────────────────────────────────────────────────────┘

┌─────────────┐
│   TENANTS   │  (Top-level isolation)
├─────────────┤
│ id          │───┐
│ name        │   │
│ slug        │   │
│ type        │   │
│ plan        │   │
│ is_active   │   │
└─────────────┘   │
                  │
      ┌───────────┴──────────────┬──────────────┬──────────────┐
      │                          │              │              │
      ▼                          ▼              ▼              ▼
┌──────────────┐        ┌──────────────┐  ┌─────────┐  ┌──────────────┐
│    USERS     │        │   STUDIOS    │  │  ROLES  │  │  DOCUMENTS   │
├──────────────┤        ├──────────────┤  ├─────────┤  ├──────────────┤
│ id           │        │ id           │  │ id      │  │ id           │
│ tenant_id    │───┐    │ tenant_id    │  │ tenant  │  │ tenant_id    │
│ keycloak_id  │   │    │ name         │  │ name    │  │ owner_id     │
│ email        │   │    │ slug         │  │ descrip │  │ studio_id    │
│ username     │   │    │ is_public    │  │ is_syst │  │ title        │
│ is_active    │   │    └──────────────┘  └─────────┘  │ content      │
└──────────────┘   │           │                │       │ status       │
       │           │           │                │       │ visibility   │
       │           │           │                │       └──────────────┘
       │           │           │                │              │
       ▼           │           ▼                ▼              │
┌──────────────┐   │    ┌──────────────┐  ┌──────────────┐   │
│USER_PROFILES │   │    │STUDIO_MEMBERS│  │  USER_ROLES  │   │
├──────────────┤   │    ├──────────────┤  ├──────────────┤   │
│ id           │   │    │ id           │  │ id           │   │
│ user_id      │◄──┘    │ studio_id    │  │ user_id      │   │
│ bio          │        │ user_id      │  │ role_id      │   │
│ avatar_url   │        │ role         │  │ scope_type   │   │
│ timezone     │        │ is_active    │  │ scope_id     │   │
└──────────────┘        └──────────────┘  └──────────────┘   │
                                                              │
                        ┌─────────────────────────────────────┘
                        │
                        ▼
              ┌───────────────────────┐
              │  DOCUMENT_VERSIONS    │
              ├───────────────────────┤
              │ id                    │
              │ document_id           │
              │ version               │
              │ content               │
              │ created_by_id         │
              │ change_summary        │
              └───────────────────────┘

              ┌───────────────────────┐
              │DOCUMENT_COLLABORATORS │
              ├───────────────────────┤
              │ id                    │
              │ document_id           │
              │ user_id               │
              │ role                  │
              │ can_edit              │
              │ can_comment           │
              └───────────────────────┘

┌──────────────────────────────────────────────────────────────────────┐
│                      RBAC (Authorization)                             │
└──────────────────────────────────────────────────────────────────────┘

┌────────────────┐         ┌────────────────────┐         ┌──────────────┐
│  PERMISSIONS   │◄────────│  ROLE_PERMISSIONS  │────────►│    ROLES     │
├────────────────┤         ├────────────────────┤         ├──────────────┤
│ id             │         │ id                 │         │ id           │
│ name           │         │ role_id            │         │ tenant_id    │
│ code           │         │ permission_id      │         │ name         │
│ category       │         └────────────────────┘         │ is_system    │
│ (system-wide)  │                                        └──────────────┘
└────────────────┘                                               │
                                                                 ▼
                                                         ┌──────────────┐
                                                         │  USER_ROLES  │
                                                         ├──────────────┤
                                                         │ user_id      │
                                                         │ role_id      │
                                                         │ scope_type   │
                                                         │ scope_id     │
                                                         └──────────────┘
```

## Table Descriptions

### Core Entities

#### **tenants**
- Top-level isolation boundary
- Every tenant is completely isolated
- Contains: name, slug, plan type, resource limits
- Relationships: users, studios, documents, settings

#### **tenant_settings**
- Tenant-specific customization
- Branding, features, custom domains
- One-to-one with tenant

#### **users**
- User accounts within a tenant
- Integrated with Keycloak for authentication
- Unique email per tenant
- Relationships: profile, roles, documents, studio memberships

#### **user_profiles**
- Extended user information
- Bio, avatar, social links, preferences
- One-to-one with user

### Authorization (RBAC)

#### **permissions**
- System-wide permission definitions
- Examples: `document.create`, `studio.admin`, `user.manage`
- Organized by category
- Not tenant-specific

#### **roles**
- Tenant-specific roles
- Can be system roles (admin, member) or custom
- Contains set of permissions
- Assigned to users

#### **role_permissions**
- Many-to-many: roles ↔ permissions
- Defines what each role can do

#### **user_roles**
- Many-to-many: users ↔ roles
- Optional scope (tenant-wide, studio-specific, document-specific)
- Example: User can be "admin" for whole tenant or "editor" for specific studio

### Content

#### **documents**
- Core content entity
- Supports full version control
- Workflow: draft → beta → published
- Visibility: private, tenant, studio, public
- Belongs to owner, optionally in a studio
- Stores current version (denormalized for performance)

#### **document_versions**
- Complete version history
- Every change creates a new version
- Stores who made the change and why
- Can restore any previous version

#### **document_collaborators**
- Who can access a document
- Roles: owner, editor, commenter, viewer, beta_reader
- Granular permissions per collaborator

### Studios

#### **studios**
- Branded creative spaces within a tenant
- Can have custom domain/subdomain
- Public or private
- Contains multiple members and documents

#### **studio_members**
- Many-to-many: studios ↔ users
- Roles: owner, admin, member, contributor, viewer
- Can require approval to join

## Key Design Decisions

### 1. Multi-Tenancy
- Tenant ID on every tenant-scoped table
- Will use PostgreSQL Row-Level Security (RLS) for enforcement
- Complete data isolation between tenants

### 2. Version Control
- Document versions stored separately
- Current version denormalized in `documents` table
- Full history preserved forever (configurable retention)

### 3. Flexible RBAC
- Permissions defined at system level
- Roles defined per tenant
- User roles can be scoped (tenant, studio, document)
- Example: User can be "editor" only for specific studio

### 4. Keycloak Integration
- Users identified by `keycloak_id`
- Email/username stored for convenience
- All authentication through Keycloak

### 5. Soft Deletes
- Will add `deleted_at` column in future
- For now, using CASCADE for simplicity
- Phase 1 will add audit trail

## Indexes

All foreign keys are indexed automatically. Additional indexes:
- `users.email` (tenant-scoped search)
- `users.username` (tenant-scoped search)
- `documents.status` (filtering)
- `documents.visibility` (access control)
- `documents.slug` (URL lookup)
- `studios.slug` (URL lookup)
- Tenant ID on all tenant-scoped tables

## Constraints

### Unique Constraints
- `tenants.slug` - globally unique
- `users(tenant_id, email)` - unique within tenant
- `users(tenant_id, username)` - unique within tenant
- `studios(tenant_id, slug)` - unique within tenant
- `roles(tenant_id, name)` - unique within tenant
- `studio_members(studio_id, user_id)` - one membership per user/studio
- `document_versions(document_id, version)` - version numbers unique per document

### Foreign Key Cascades
- User deleted → profile, roles, documents deleted
- Tenant deleted → all user data deleted (complete cleanup)
- Document deleted → versions and collaborators deleted
- Studio deleted → memberships deleted (documents stay, studio_id → NULL)

## Row-Level Security (Future - Phase 0.5)

Will implement PostgreSQL RLS policies:

```sql
-- Example policy for documents table
CREATE POLICY tenant_isolation ON documents
    USING (tenant_id = current_setting('app.current_tenant_id')::integer);

-- Example policy for visibility
CREATE POLICY document_visibility ON documents
    FOR SELECT
    USING (
        visibility = 'public' 
        OR (visibility = 'tenant' AND tenant_id = current_setting('app.current_tenant_id')::integer)
        OR owner_id = current_setting('app.current_user_id')::integer
    );
```

## Migration Strategy

1. **Phase 0**: Create all tables with Alembic
2. **Phase 0.5**: Add RLS policies
3. **Phase 1**: Add audit tables, soft deletes
4. **Phase 2**: Add social features (following, feeds, comments)

## Next Steps

1. ✅ Models defined (SQLAlchemy ORM)
2. 🔲 Initialize Alembic
3. 🔲 Create initial migration
4. 🔲 Seed default permissions and roles
5. 🔲 Test against local PostgreSQL
6. 🔲 Add RLS policies

## Sample Permissions

```python
# System permissions to seed
permissions = [
    # Documents
    ("document.create", "Create documents", "documents"),
    ("document.read", "Read documents", "documents"),
    ("document.update", "Update documents", "documents"),
    ("document.delete", "Delete documents", "documents"),
    ("document.publish", "Publish documents", "documents"),
    
    # Studios
    ("studio.create", "Create studios", "studios"),
    ("studio.read", "View studios", "studios"),
    ("studio.update", "Update studios", "studios"),
    ("studio.delete", "Delete studios", "studios"),
    ("studio.manage_members", "Manage studio members", "studios"),
    
    # Users
    ("user.read", "View users", "users"),
    ("user.update", "Update users", "users"),
    ("user.delete", "Delete users", "users"),
    ("user.manage_roles", "Manage user roles", "users"),
    
    # System
    ("system.admin", "Full system access", "system"),
]
```

## Sample Roles

```python
# Default roles per tenant
roles = [
    {
        "name": "Admin",
        "is_system_role": True,
        "permissions": ["system.admin"]  # Has all permissions
    },
    {
        "name": "Member",
        "is_system_role": True,
        "is_default": True,  # Assigned to new users
        "permissions": [
            "document.create", "document.read", "document.update",
            "studio.create", "studio.read",
            "user.read"
        ]
    },
    {
        "name": "Guest",
        "is_system_role": True,
        "permissions": ["document.read", "studio.read", "user.read"]
    }
]
```
