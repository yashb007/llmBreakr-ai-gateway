import httpStatus from "http-status";
import redisClient from "../../config/redis.js";
import APIError from "../../utils/APIError.js";
import { logRequest } from "../utils/requestLogger.js";

const dayStamp = () => new Date().toISOString().slice(0, 10);
const monthStamp = () => new Date().toISOString().slice(0, 7);

const rpmKey = (virtualKeyId) => `rl:key:${virtualKeyId}:${Math.floor(Date.now() / 60000)}`;
const projectRpmKey = (projectId) => `rl:project:${projectId}:${Math.floor(Date.now() / 60000)}`;
const keyBudgetKey = (virtualKeyId) => `budget:key:${virtualKeyId}:${dayStamp()}`;
const projectBudgetKey = (projectId) => `budget:project:${projectId}:${dayStamp()}`;
const keyDailyTokenKey = (virtualKeyId) => `tokens:key:d:${virtualKeyId}:${dayStamp()}`;
const keyMonthlyTokenKey = (virtualKeyId) => `tokens:key:m:${virtualKeyId}:${monthStamp()}`;
const projectDailyTokenKey = (projectId) => `tokens:project:d:${projectId}:${dayStamp()}`;
const projectMonthlyTokenKey = (projectId) => `tokens:project:m:${projectId}:${monthStamp()}`;

const TWO_DAYS_SECONDS = 60 * 60 * 24 * 2; // survive well past the UTC day boundary a daily key is stamped on
const FIVE_WEEKS_SECONDS = 60 * 60 * 24 * 35; // outlives any calendar month; the key itself rolls over monthly

// Called by chat.service.js once a request's real cost and token usage are
// known. Increments the key's own counters and, if it belongs to a project,
// that project's counters too — a project rolls up usage across every key
// inside it (so a key's tokens always sum up to its project's tokens), and
// one team can't blow past an org-level cap just by holding several keys
// under the same project. Whichever cap (key or project, daily or monthly,
// budget or tokens) is tightest is what actually blocks the next request —
// see enforceLimits below.
export const incrementUsage = async ({ virtualKeyId, projectId, costUsd, usage }) => {
  if (costUsd) {
    await redisClient.incrByFloat(keyBudgetKey(virtualKeyId), costUsd);
    await redisClient.expire(keyBudgetKey(virtualKeyId), TWO_DAYS_SECONDS);
    if (projectId) {
      await redisClient.incrByFloat(projectBudgetKey(projectId), costUsd);
      await redisClient.expire(projectBudgetKey(projectId), TWO_DAYS_SECONDS);
    }
  }

  // Every category a provider bills for — input, output, and cache
  // write/read — counts toward the token cap, not just input+output.
  const totalTokens = usage
    ? (usage.prompt_tokens || 0) +
      (usage.completion_tokens || 0) +
      (usage.cache_write_tokens || 0) +
      (usage.cache_read_tokens || 0)
    : 0;
  if (totalTokens) {
    await redisClient.incrBy(keyDailyTokenKey(virtualKeyId), totalTokens);
    await redisClient.expire(keyDailyTokenKey(virtualKeyId), TWO_DAYS_SECONDS);
    await redisClient.incrBy(keyMonthlyTokenKey(virtualKeyId), totalTokens);
    await redisClient.expire(keyMonthlyTokenKey(virtualKeyId), FIVE_WEEKS_SECONDS);
    if (projectId) {
      await redisClient.incrBy(projectDailyTokenKey(projectId), totalTokens);
      await redisClient.expire(projectDailyTokenKey(projectId), TWO_DAYS_SECONDS);
      await redisClient.incrBy(projectMonthlyTokenKey(projectId), totalTokens);
      await redisClient.expire(projectMonthlyTokenKey(projectId), FIVE_WEEKS_SECONDS);
    }
  }
};

// Shared by every accumulated-usage cap below (budget, daily tokens, monthly
// tokens — each keyed on a counter that's already been incremented for
// prior requests by incrementUsage above). Blocks and logs the request as
// denied once the counter is at or past its limit.
const blockIfOverLimit = async ({ redisKey, limit, virtualKeyId, projectId, model, blockedBy, message }) => {
  if (!limit) return;
  const used = Number((await redisClient.get(redisKey)) || 0);
  if (used < limit) return;
  await logRequest({ virtualKeyId, projectId, model, status: httpStatus.TOO_MANY_REQUESTS, blockedBy });
  throw new APIError({ message, status: httpStatus.TOO_MANY_REQUESTS });
};

// Fixed-window rpm counter (not a true sliding window) and same-day/same-month
// budget & token pre-checks; all best-effort approximations, acceptable for v1.
export const enforceLimits = async (req, res, next) => {
  try {
    const { virtualKey, project } = req;
    const model = req.providerModel?.model_id;

    if (virtualKey.rpm_limit) {
      const key = rpmKey(virtualKey.id);
      const count = await redisClient.incr(key);
      if (count === 1) await redisClient.expire(key, 60);
      if (count > virtualKey.rpm_limit) {
        await logRequest({
          virtualKeyId: virtualKey.id,
          projectId: project?.id,
          model,
          status: httpStatus.TOO_MANY_REQUESTS,
          blockedBy: "rate_limit",
        });
        throw new APIError({ message: "Rate limit exceeded", status: httpStatus.TOO_MANY_REQUESTS });
      }
    }

    if (project?.rpm_limit) {
      const key = projectRpmKey(project.id);
      const count = await redisClient.incr(key);
      if (count === 1) await redisClient.expire(key, 60);
      if (count > project.rpm_limit) {
        await logRequest({
          virtualKeyId: virtualKey.id,
          projectId: project.id,
          model,
          status: httpStatus.TOO_MANY_REQUESTS,
          blockedBy: "project_rate_limit",
        });
        throw new APIError({ message: "Project rate limit exceeded", status: httpStatus.TOO_MANY_REQUESTS });
      }
    }

    await blockIfOverLimit({
      redisKey: keyBudgetKey(virtualKey.id),
      limit: virtualKey.daily_budget_usd,
      virtualKeyId: virtualKey.id,
      projectId: project?.id,
      model,
      blockedBy: "budget",
      message: "Daily budget exceeded",
    });

    if (project) {
      await blockIfOverLimit({
        redisKey: projectBudgetKey(project.id),
        limit: project.daily_budget_usd,
        virtualKeyId: virtualKey.id,
        projectId: project.id,
        model,
        blockedBy: "project_budget",
        message: "Project daily budget exceeded",
      });
    }

    await blockIfOverLimit({
      redisKey: keyDailyTokenKey(virtualKey.id),
      limit: virtualKey.daily_token_limit,
      virtualKeyId: virtualKey.id,
      projectId: project?.id,
      model,
      blockedBy: "token_limit",
      message: "Daily token limit exceeded",
    });

    await blockIfOverLimit({
      redisKey: keyMonthlyTokenKey(virtualKey.id),
      limit: virtualKey.monthly_token_limit,
      virtualKeyId: virtualKey.id,
      projectId: project?.id,
      model,
      blockedBy: "monthly_token_limit",
      message: "Monthly token limit exceeded",
    });

    if (project) {
      await blockIfOverLimit({
        redisKey: projectDailyTokenKey(project.id),
        limit: project.daily_token_limit,
        virtualKeyId: virtualKey.id,
        projectId: project.id,
        model,
        blockedBy: "project_token_limit",
        message: "Project daily token limit exceeded",
      });

      await blockIfOverLimit({
        redisKey: projectMonthlyTokenKey(project.id),
        limit: project.monthly_token_limit,
        virtualKeyId: virtualKey.id,
        projectId: project.id,
        model,
        blockedBy: "project_monthly_token_limit",
        message: "Project monthly token limit exceeded",
      });
    }

    next();
  } catch (error) {
    next(error);
  }
};
