// import { User, Role, Permission, AdminPermissionOverride } from "../models/index.js";
import { User, Role, Permission } from "../models/index.js";

// ── In-memory permission cache ────────────────────────────────────
// Avoids a DB round-trip on every authenticated request.
// TTL: 5 minutes. Call invalidate(userId) after any role/permission change.
const cache  = new Map();
const TTL_MS = 5 * 60 * 1000;

const permCache = {
  get(userId) {
    const entry = cache.get(userId);
    if (!entry || Date.now() > entry.expiresAt) {
      cache.delete(userId);
      return null;
    }
    return entry.keys; // Set<"module:action">
  },
  set(userId, keysArray) {
    cache.set(userId, { keys: new Set(keysArray), expiresAt: Date.now() + TTL_MS });
  },
  invalidate(userId)  { cache.delete(userId); },
  invalidateAll()     { cache.clear(); },
};

export { permCache as PermissionCache };

// ── Resolve effective permissions for a user ──────────────────────
// 1. Start with all active permissions from the user's role
// 2. Add 'grant' overrides  (extends beyond role)
// 3. Remove 'revoke' overrides (restricts below role)
export const getEffectivePermissions = async (userId) => {
  // 1. Cache hit
  const cached = permCache.get(userId);
  if (cached) return cached;

  // 2. Fetch role permissions via associations (models/index.js must define these)
  const user = await User.findByPk(userId, {
    include: [
      {
        model: Role,
        as:    "role",
        include: [
          {
            model:      Permission,
            as:         "permissions",
            attributes: ["id", "key", "is_active"],
            through:    { attributes: [] },
          },
        ],
      },
    ],
  });

  if (!user?.role) return new Set();

  // Base set: active permissions from role
  const effective = new Set(
    user.role.permissions
      .filter((p) => p.is_active)
      .map((p) => p.key)
  );

  // 3. Fetch per-admin overrides (if AdminPermissionOverride model exists)
  try {
    const overrides = await AdminPermissionOverride.findAll({
      where: { user_id: userId },
      include: [{ model: Permission, as: "permission", attributes: ["key", "is_active"] }],
    });

    for (const o of overrides) {
      if (!o.permission?.is_active) continue;
      if (o.type === "grant")  effective.add(o.permission.key);
      if (o.type === "revoke") effective.delete(o.permission.key);
    }
  } catch {
    // AdminPermissionOverride table may not exist yet — skip silently
  }

  // 4. Cache and return
  permCache.set(userId, [...effective]);
  return effective;
};