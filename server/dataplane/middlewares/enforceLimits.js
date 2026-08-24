import httpStatus from "http-status";
import redisClient from "../../config/redis.js";
import APIError from "../../utils/APIError.js";
import { logRequest } from "../utils/requestLogger.js";
import { mark } from "../utils/timing.js";

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
  // None of these operations depend on each other's results, so they're
  // pipelined into a single MULTI/EXEC round trip instead of up to 8
  // sequential ones.
  const multi = redisClient.multi();
  let hasOps = false;

  if (costUsd) {
    multi.incrByFloat(keyBudgetKey(virtualKeyId), costUsd);
    multi.expire(keyBudgetKey(virtualKeyId), TWO_DAYS_SECONDS);
    hasOps = true;
    if (projectId) {
      multi.incrByFloat(projectBudgetKey(projectId), costUsd);
      multi.expire(projectBudgetKey(projectId), TWO_DAYS_SECONDS);
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
    multi.incrBy(keyDailyTokenKey(virtualKeyId), totalTokens);
    multi.expire(keyDailyTokenKey(virtualKeyId), TWO_DAYS_SECONDS);
    multi.incrBy(keyMonthlyTokenKey(virtualKeyId), totalTokens);
    multi.expire(keyMonthlyTokenKey(virtualKeyId), FIVE_WEEKS_SECONDS);
    hasOps = true;
    if (projectId) {
      multi.incrBy(projectDailyTokenKey(projectId), totalTokens);
      multi.expire(projectDailyTokenKey(projectId), TWO_DAYS_SECONDS);
      multi.incrBy(projectMonthlyTokenKey(projectId), totalTokens);
      multi.expire(projectMonthlyTokenKey(projectId), FIVE_WEEKS_SECONDS);
    }
  }

  if (hasOps) await multi.exec();
};

// Checks every accumulated-usage cap (budget, daily tokens, monthly tokens —
// each keyed on a counter already incremented for prior requests by
// incrementUsage above) with a single MGET instead of up to 6 sequential
// GETs, since none of these reads depend on each other. Blocks and logs the
// request as denied on the first entry (in the given order) at or past its
// limit — same priority order the old sequential version checked in.
const blockIfOverAnyLimit = async (checks, { virtualKeyId, projectId, model }) => {
  const applicable = checks.filter((c) => c.limit);
  if (!applicable.length) return;

  const values = await redisClient.mGet(applicable.map((c) => c.redisKey));
  for (let i = 0; i < applicable.length; i++) {
    const used = Number(values[i] || 0);
    if (used < applicable[i].limit) continue;
    await logRequest({ virtualKeyId, projectId, model, status: httpStatus.TOO_MANY_REQUESTS, blockedBy: applicable[i].blockedBy });
    throw new APIError({ message: applicable[i].message, status: httpStatus.TOO_MANY_REQUESTS });
  }
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

    await blockIfOverAnyLimit(
      [
        {
          redisKey: keyBudgetKey(virtualKey.id),
          limit: virtualKey.daily_budget_usd,
          blockedBy: "budget",
          message: "Daily budget exceeded",
        },
        project && {
          redisKey: projectBudgetKey(project.id),
          limit: project.daily_budget_usd,
          blockedBy: "project_budget",
          message: "Project daily budget exceeded",
        },
        {
          redisKey: keyDailyTokenKey(virtualKey.id),
          limit: virtualKey.daily_token_limit,
          blockedBy: "token_limit",
          message: "Daily token limit exceeded",
        },
        {
          redisKey: keyMonthlyTokenKey(virtualKey.id),
          limit: virtualKey.monthly_token_limit,
          blockedBy: "monthly_token_limit",
          message: "Monthly token limit exceeded",
        },
        project && {
          redisKey: projectDailyTokenKey(project.id),
          limit: project.daily_token_limit,
          blockedBy: "project_token_limit",
          message: "Project daily token limit exceeded",
        },
        project && {
          redisKey: projectMonthlyTokenKey(project.id),
          limit: project.monthly_token_limit,
          blockedBy: "project_monthly_token_limit",
          message: "Project monthly token limit exceeded",
        },
      ].filter(Boolean),
      { virtualKeyId: virtualKey.id, projectId: project?.id, model }
    );

    mark(req, "enforceLimits");
    next();
  } catch (error) {
    next(error);
  }
};
