import express from "express";
import authRoutes from "./auth.route.js";
import userRoutes from "./user.route.js";
import projectRoutes from "./project.route.js";
import roleRoutes from "./role.route.js";
import permissionRoutes from "./permission.route.js";
import modelRoutes from "./model.route.js";
import providerCredentialRoutes from "./providerCredential.route.js";

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

export default router;
