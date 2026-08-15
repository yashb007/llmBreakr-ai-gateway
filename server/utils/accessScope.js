import UserRole from "../models/userRole.model.js";

// Projects and virtual keys are team-scoped by role: a non-super-admin can
// see/manage anything created by themselves or by any other user who shares
// at least one role with them. Super admins bypass this entirely — null
// signals "no filter, show everything" to callers.
export const getAccessibleUserIds = async (actor) => {
  if (actor.is_super_admin) return null;

  const ownRoles = await UserRole.findAll({ where: { user_id: actor.id } });
  const roleIds = ownRoles.map((userRole) => userRole.role_id);

  if (!roleIds.length) return [actor.id];

  const peers = await UserRole.findAll({ where: { role_id: roleIds } });
  const ids = new Set(peers.map((peer) => peer.user_id));
  ids.add(actor.id);
  return Array.from(ids);
};
