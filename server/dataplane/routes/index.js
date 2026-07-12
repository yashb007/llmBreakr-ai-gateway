import express from "express";
import { virtualKeyAuth } from "../middlewares/virtualKeyAuth.js";
import { resolveModel } from "../middlewares/resolveModel.js";
import { enforceLimits } from "../middlewares/enforceLimits.js";
import * as chatController from "../controllers/chat.controller.js";

const router = express.Router();

/**
 * GET v1/status
 */
router.get("/status", (req, res) => res.send("OK"));

/**
 * POST v1/chat/completions
 * Forwards an OpenAI-style chat completion request through a virtual key.
 * requires: Authorization: Bearer <virtual key>
 * body: OpenAI chat completion request (model must match a configured ProxyModel)
 */
router.post(
  "/v1/chat/completions",
  virtualKeyAuth,
  resolveModel,
  enforceLimits,
  chatController.createChatCompletion
);

export default router;
