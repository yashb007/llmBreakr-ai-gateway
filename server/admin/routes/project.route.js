import { Router } from "express";
import { validate } from "express-validation";
import * as projectController from "../controllers/project.controller.js";
import * as projectValidation from "../validations/project.validation.js";
import { authenticate } from "../../middlewares/auth.js";
import { authorize } from "../../middlewares/authorize.js";
import { PERMISSIONS } from "../../config/permissions.js";

const router = Router();

router.use(authenticate);

/**
 * GET /api/admin/projects
 * List projects. Super admins see all; everyone else only sees projects
 * created by themselves or by another user who shares at least one role
 * with them (team-scoped by role).
 * requires: projects:read
 */
router.get("/", authorize(PERMISSIONS.PROJECTS_READ), projectController.listProjects);

/**
 * GET /api/admin/projects/options
 * Lightweight { id, name } list of every project, unscoped by role and not
 * gated by projects:read — lets anyone who can create a virtual key pick a
 * target project even if they can't otherwise see project details. Must stay
 * ahead of GET /:id so "options" is never matched as an id param.
 */
router.get("/options", projectController.listProjectOptions);

/**
 * GET /api/admin/projects/:id
 * Get a single project. 404s (not 403) if it's outside the caller's
 * role-scoped access — see GET / above.
 * requires: projects:read
 * params: { id: number }
 */
router.get(
  "/:id",
  authorize(PERMISSIONS.PROJECTS_READ),
  validate(projectValidation.getProject),
  projectController.getProject
);

/**
 * POST /api/admin/projects
 * Create a project.
 * requires: projects:manage
 * body: { name: string, description: string }
 */
router.post(
  "/",
  authorize(PERMISSIONS.PROJECTS_MANAGE),
  validate(projectValidation.createProject),
  projectController.createProject
);

/**
 * PATCH /api/admin/projects/:id
 * Update a project's name/description. 404s if outside the caller's
 * role-scoped access (see GET / above).
 * requires: projects:manage
 * params: { id: number }
 * body: { name?: string, description?: string }
 */
router.patch(
  "/:id",
  authorize(PERMISSIONS.PROJECTS_MANAGE),
  validate(projectValidation.updateProject),
  projectController.updateProject
);

/**
 * DELETE /api/admin/projects/:id
 * Delete a project. 404s if outside the caller's role-scoped access (see GET / above).
 * requires: projects:manage
 * params: { id: number }
 */
router.delete(
  "/:id",
  authorize(PERMISSIONS.PROJECTS_MANAGE),
  validate(projectValidation.getProject),
  projectController.deleteProject
);

export default router;
