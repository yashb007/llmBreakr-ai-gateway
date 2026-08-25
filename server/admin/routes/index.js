import express from "express";
import authRoutes from "./auth.route.js";
import userRoutes from "./user.route.js";
import projectRoutes from "./project.route.js";
import roleRoutes from "./role.route.js";
import permissionRoutes from "./permission.route.js";
import modelRoutes from "./model.route.js";
import providerCredentialRoutes from "./providerCredential.route.js";
import projectCredentialRoutes from "./projectCredential.route.js";
import projectModelRoutes from "./projectModel.route.js";
import projectModelFallbackRoutes from "./projectModelFallback.route.js";
import virtualKeyRoutes from "./virtualKey.route.js";
import logRoutes from "./log.route.js";
import usageRoutes from "./usage.route.js";
import auditLogRoutes from "./auditLog.route.js";

const router = express.Router();

/**
 * GET v1/status
 */
router.get("/status", (req, res) => res.send("OK"));

router.use("/auth", authRoutes);
router.use("/users", userRoutes);
router.use("/projects", projectRoutes);
router.use("/roles", roleRoutes);
router.use("/permissions", permissionRoutes);
router.use("/models", modelRoutes);
router.use("/provider-creds", providerCredentialRoutes);
router.use("/project-credentials", projectCredentialRoutes);
router.use("/project-models", projectModelRoutes);
router.use("/project-model-fallbacks", projectModelFallbackRoutes);
router.use("/virtual-keys", virtualKeyRoutes);
router.use("/logs", logRoutes);
router.use("/usage", usageRoutes);
router.use("/audit-logs", auditLogRoutes);

export default router;
