import httpStatus from "http-status";
import { hasEntitlement } from "../config/license.js";
import APIError from "../utils/APIError.js";

// Gate for enterprise-only routes/features. Checked after auth/authorize —
// a user can be perfectly permitted by RBAC and still be blocked here if the
// deployment itself isn't licensed for the feature.
export const requireEntitlement = (name) => (req, res, next) => {
  if (!hasEntitlement(name)) {
    return next(
      new APIError({
        message: `This feature ("${name}") requires an enterprise license that isn't active on this deployment.`,
        status: httpStatus.FORBIDDEN,
      })
    );
  }

  next();
};
