import * as chatService from "../services/chat.service.js";

/**
 * Forward an OpenAI-style chat completion request through the caller's virtual key.
 * @param {import("express").Request} req - req.virtualKey/req.project/req.proxyModel set by upstream middleware, req.body: OpenAI chat completion request
 * @param {import("express").Response} res
 * @returns {Promise<void>} 200 - the provider's chat completion response (JSON, or an SSE stream if body.stream is true)
 */
export const createChatCompletion = async (req, res, next) => {
  try {
    await chatService.handleChatCompletion({
      virtualKey: req.virtualKey,
      project: req.project,
      proxyModel: req.proxyModel,
      body: req.body,
      res,
    });
  } catch (error) {
    next(error);
  }
};
