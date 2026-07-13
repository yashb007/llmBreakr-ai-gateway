import User from "./user.model.js";
import Role from "./role.model.js";
import RolePermission from "./rolePermission.model.js";
import UserRole from "./userRole.model.js";
import UserPermission from "./userPermission.model.js";
import Session from "./session.model.js";
import AuditLog from "./auditLog.model.js";
import Project from "./project.model.js";
import ProviderCredential from "./providerCredential.model.js";
import VirtualKey from "./virtualKey.model.js";
import RequestLog from "./requestLog.model.js";
import ProxyModel from "./proxyModel.model.js";

// users.created_by -> users.id (self-reference)
User.belongsTo(User, { as: "creator", foreignKey: "created_by" });

// role_permissions.role_id -> roles.id, cascade delete
Role.hasMany(RolePermission, { foreignKey: "role_id", onDelete: "CASCADE" });
RolePermission.belongsTo(Role, { foreignKey: "role_id" });

// user_roles.user_id -> users.id, cascade delete
User.hasMany(UserRole, { foreignKey: "user_id", onDelete: "CASCADE" });
UserRole.belongsTo(User, { foreignKey: "user_id" });

// user_roles.role_id -> roles.id, cascade delete
Role.hasMany(UserRole, { foreignKey: "role_id", onDelete: "CASCADE" });
UserRole.belongsTo(Role, { foreignKey: "role_id" });

// user_roles.granted_by -> users.id
UserRole.belongsTo(User, { as: "grantedBy", foreignKey: "granted_by" });

// user_permissions.user_id -> users.id, cascade delete
User.hasMany(UserPermission, { foreignKey: "user_id", onDelete: "CASCADE" });
UserPermission.belongsTo(User, { foreignKey: "user_id" });

// user_permissions.granted_by -> users.id
UserPermission.belongsTo(User, { as: "grantedBy", foreignKey: "granted_by" });

// sessions.user_id -> users.id, cascade delete
User.hasMany(Session, { foreignKey: "user_id", onDelete: "CASCADE" });
Session.belongsTo(User, { foreignKey: "user_id" });

// projects.created_by -> users.id
Project.belongsTo(User, { as: "creator", foreignKey: "created_by" });

// provider_credentials.created_by -> users.id
ProviderCredential.belongsTo(User, { as: "creator", foreignKey: "created_by" });

// virtual_keys.project_id -> projects.id
Project.hasMany(VirtualKey, { foreignKey: "project_id" });
VirtualKey.belongsTo(Project, { foreignKey: "project_id" });

// virtual_keys.created_by -> users.id
VirtualKey.belongsTo(User, { as: "creator", foreignKey: "created_by" });

// models.created_by -> users.id
ProxyModel.belongsTo(User, { as: "creator", foreignKey: "created_by" });

// request_logs.project_id -> projects.id
Project.hasMany(RequestLog, { foreignKey: "project_id" });
RequestLog.belongsTo(Project, { foreignKey: "project_id" });

// request_logs.virtual_key_id -> virtual_keys.id
VirtualKey.hasMany(RequestLog, { foreignKey: "virtual_key_id" });
RequestLog.belongsTo(VirtualKey, { foreignKey: "virtual_key_id" });

export {
  User,
  Role,
  RolePermission,
  UserRole,
  UserPermission,
  Session,
  AuditLog,
  Project,
  ProviderCredential,
  VirtualKey,
  RequestLog,
  ProxyModel,
};
