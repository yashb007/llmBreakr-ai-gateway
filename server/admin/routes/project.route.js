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
 * List all projects.
 * requires: projects:read
 */
router.get("/", authorize(PERMISSIONS.PROJECTS_READ), projectController.listProjects);

/**
 * GET /api/admin/projects/:id
 * Get a single project.
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
 * body: { name: string }
 */
router.post(
  "/",
  authorize(PERMISSIONS.PROJECTS_MANAGE),
  validate(projectValidation.createProject),
  projectController.createProject
);

/**
 * PATCH /api/admin/projects/:id
 * Update a project's name.
 * requires: projects:manage
 * params: { id: number }
 * body: { name: string }
 */
router.patch(
  "/:id",
  authorize(PERMISSIONS.PROJECTS_MANAGE),
  validate(projectValidation.updateProject),
  projectController.updateProject
);

/**
 * DELETE /api/admin/projects/:id
 * Delete a project.
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
