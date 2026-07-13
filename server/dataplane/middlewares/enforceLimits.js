import httpStatus from "http-status";
import redisClient from "../../config/redis.js";
import APIError from "../../utils/APIError.js";
import { logRequest } from "../utils/requestLogger.js";

const rpmKey = (virtualKeyId) => `rl:${virtualKeyId}:${Math.floor(Date.now() / 60000)}`;
const budgetKey = (virtualKeyId) => `budget:${virtualKeyId}:${new Date().toISOString().slice(0, 10)}`;

// Called by chat.service.js once a request's real cost is known.
export const incrementBudget = async (virtualKeyId, costUsd) => {
  if (!costUsd) return;
  const key = budgetKey(virtualKeyId);
  await redisClient.incrByFloat(key, costUsd);
  await redisClient.expire(key, 60 * 60 * 24 * 2); // survive well past the UTC day boundary the key is keyed on
};

// Fixed-window rpm counter (not a true sliding window) and a same-day budget
// pre-check; both are best-effort approximations, acceptable for v1.
export const enforceLimits = async (req, res, next) => {
  try {
    const { virtualKey } = req;

    if (virtualKey.rpm_limit) {
      const key = rpmKey(virtualKey.id);
      const count = await redisClient.incr(key);
      if (count === 1) await redisClient.expire(key, 60);
      if (count > virtualKey.rpm_limit) {
        await logRequest({
          virtualKeyId: virtualKey.id,
          projectId: req.project?.id,
          model: req.proxyModel?.model_name,
          status: httpStatus.TOO_MANY_REQUESTS,
          blockedBy: "rate_limit",
        });
        throw new APIError({ message: "Rate limit exceeded", status: httpStatus.TOO_MANY_REQUESTS });
      }
    }

    if (virtualKey.daily_budget_usd) {
      const spent = parseFloat((await redisClient.get(budgetKey(virtualKey.id))) || "0");
      if (spent >= virtualKey.daily_budget_usd) {
        await logRequest({
          virtualKeyId: virtualKey.id,
          projectId: req.project?.id,
          model: req.proxyModel?.model_name,
          status: httpStatus.TOO_MANY_REQUESTS,
          blockedBy: "budget",
        });
        throw new APIError({ message: "Daily budget exceeded", status: httpStatus.TOO_MANY_REQUESTS });
      }
    }

    next();
  } catch (error) {
    next(error);
  }
};
