import httpStatus from "http-status";
import UserRole from "../models/userRole.model.js";
import RolePermission from "../models/rolePermission.model.js";
import UserPermission from "../models/userPermission.model.js";
import APIError from "../utils/APIError.js";

// Resolution order: super admin bypasses everything; an explicit per-user
// "deny" always wins over any role; an explicit per-user "grant" allows even
// without a role; otherwise fall back to the permissions granted by roles.
export const authorize = (permission) => async (req, res, next) => {
  try {
    if (req.user.is_super_admin) {
      return next();
    }

    const override = await UserPermission.findOne({
      where: { user_id: req.user.id, permission },
    });

    if (override?.effect === "deny") {
      throw new APIError({ message: "Forbidden", status: httpStatus.FORBIDDEN });
    }

    if (override?.effect === "grant") {
      return next();
    }

    const userRoles = await UserRole.findAll({ where: { user_id: req.user.id } });
    const roleIds = userRoles.map((userRole) => userRole.role_id);

    const grant = roleIds.length
      ? await RolePermission.findOne({ where: { role_id: roleIds, permission } })
      : null;

    if (!grant) {
      throw new APIError({ message: "Forbidden", status: httpStatus.FORBIDDEN });
    }

    next();
  } catch (error) {
    next(error);
  }
};
