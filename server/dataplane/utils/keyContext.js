import redisClient from "../../config/redis.js";
import VirtualKey from "../../models/virtualKey.model.js";
import Project from "../../models/project.model.js";
import ProjectModel from "../../models/projectModel.model.js";
import ProviderModel from "../../models/providerModel.model.js";
import ProjectProviderCredential from "../../models/projectProviderCredential.model.js";
import ProviderCredential from "../../models/providerCredential.model.js";
import ProjectModelFallback from "../../models/projectModelFallback.model.js";

const CACHE_TTL_SECONDS = 30;
// Invalid/unknown key hashes are cached too, but briefly — long enough that
// a client hammering a bad key doesn't hit MySQL every request, short enough
// that it doesn't matter if that key becomes valid moments later.
const MISS_TTL_SECONDS = 5;

const cacheKey = (keyHash) => `vkctx:${keyHash}`;

// Single consolidated query replacing what used to be 3 sequential ones
// (virtualKeyAuth's VirtualKey+Project lookup, resolveModel's ProjectModel
// lookup, chat.service.js's credential lookup): the virtual key, its
// project, every model the project is allowed to call, and every provider
// credential configured for the project — fetched together, then cached so
// repeat requests from the same key skip MySQL entirely for CACHE_TTL_SECONDS.
// Admin changes (revoke, approve, update, delete) bypass the TTL by calling
// invalidateKeyContext directly — see admin/services/virtualKey.service.js.
export const resolveKeyContext = async (keyHash) => {
  const cached = await redisClient.get(cacheKey(keyHash));
  if (cached !== null) return JSON.parse(cached);

  const virtualKey = await VirtualKey.findOne({
    where: { key_hash: keyHash },
    include: [
      {
        model: Project,
        as: "project",
        include: [
          {
            model: ProjectModel,
            include: [
              { model: ProviderModel, as: "providerModel" },
              // Ordered fallback chain for this model, if any — resolveModel.js
              // and chat.service.js's fallback walk both read this straight off
              // the cached context, no separate query.
              {
                model: ProjectModelFallback,
                as: "fallbacksAsPrimary",
                include: [
                  { model: ProjectModel, as: "fallbackModel", include: [{ model: ProviderModel, as: "providerModel" }] },
                ],
              },
            ],
          },
          { model: ProjectProviderCredential, include: [{ model: ProviderCredential, as: "credential" }] },
        ],
      },
    ],
  });

  const context = virtualKey ? virtualKey.toJSON() : null;

  // Don't make this request wait on the cache write — populate it in the
  // background so the NEXT request from this key is fast, not this one.
  redisClient
    .set(cacheKey(keyHash), JSON.stringify(context), { EX: context ? CACHE_TTL_SECONDS : MISS_TTL_SECONDS })
    .catch((err) => console.error("key-context cache write failed", err));

  return context;
};

export const invalidateKeyContext = async (keyHash) => {
  await redisClient.del(cacheKey(keyHash));
};
