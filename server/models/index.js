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
import ProviderModel from "./providerModel.model.js";
import ProjectProviderCredential from "./projectProviderCredential.model.js";
import ProjectModel from "./projectModel.model.js";
import ProjectModelFallback from "./projectModelFallback.model.js";

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
VirtualKey.belongsTo(Project, { as: "project", foreignKey: "project_id" });

// virtual_keys.created_by -> users.id
VirtualKey.belongsTo(User, { as: "creator", foreignKey: "created_by" });

// project_provider_credentials.project_id -> projects.id, cascade delete
Project.hasMany(ProjectProviderCredential, { foreignKey: "project_id", onDelete: "CASCADE" });
ProjectProviderCredential.belongsTo(Project, { foreignKey: "project_id" });

// project_provider_credentials.provider_credential_id -> provider_credentials.id
// RESTRICT: a credential still assigned to a project can't be deleted out from under it
// (see providerCredential.service.js's in-use guard).
ProviderCredential.hasMany(ProjectProviderCredential, { foreignKey: "provider_credential_id", onDelete: "RESTRICT" });
ProjectProviderCredential.belongsTo(ProviderCredential, { as: "credential", foreignKey: "provider_credential_id" });

// project_provider_credentials.created_by -> users.id
ProjectProviderCredential.belongsTo(User, { as: "creator", foreignKey: "created_by" });

// project_models.project_id -> projects.id, cascade delete
Project.hasMany(ProjectModel, { foreignKey: "project_id", onDelete: "CASCADE" });
ProjectModel.belongsTo(Project, { foreignKey: "project_id" });

// project_models.provider_model_id -> provider_models.id
ProviderModel.hasMany(ProjectModel, { foreignKey: "provider_model_id", onDelete: "RESTRICT" });
ProjectModel.belongsTo(ProviderModel, { as: "providerModel", foreignKey: "provider_model_id" });

// project_models.created_by -> users.id
ProjectModel.belongsTo(User, { as: "creator", foreignKey: "created_by" });

// project_model_fallbacks.project_id -> projects.id, cascade delete
Project.hasMany(ProjectModelFallback, { foreignKey: "project_id", onDelete: "CASCADE" });
ProjectModelFallback.belongsTo(Project, { foreignKey: "project_id" });

// project_model_fallbacks.primary_project_model_id -> project_models.id, cascade delete —
// two FKs point at project_models, so each direction needs its own alias.
ProjectModel.hasMany(ProjectModelFallback, {
  as: "fallbacksAsPrimary",
  foreignKey: "primary_project_model_id",
  onDelete: "CASCADE",
});
ProjectModelFallback.belongsTo(ProjectModel, { as: "primaryModel", foreignKey: "primary_project_model_id" });

// project_model_fallbacks.fallback_project_model_id -> project_models.id, cascade delete
ProjectModel.hasMany(ProjectModelFallback, {
  as: "fallbacksAsTarget",
  foreignKey: "fallback_project_model_id",
  onDelete: "CASCADE",
});
ProjectModelFallback.belongsTo(ProjectModel, { as: "fallbackModel", foreignKey: "fallback_project_model_id" });

// project_model_fallbacks.created_by -> users.id
ProjectModelFallback.belongsTo(User, { as: "creator", foreignKey: "created_by" });

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
  ProviderModel,
  ProjectProviderCredential,
  ProjectModel,
  ProjectModelFallback,
};
