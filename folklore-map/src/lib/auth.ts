import type { Session, User } from "@supabase/supabase-js";

export const USER_ROLES = ["viewer", "editor", "reviewer", "admin"] as const;
export type UserRole = (typeof USER_ROLES)[number];

export const ROLE_PRIORITY: Record<UserRole, number> = {
  viewer: 0,
  editor: 1,
  reviewer: 2,
  admin: 3,
};

type RoleClaims =
  | {
      role?: unknown;
      roles?: unknown;
    }
  | null
  | undefined;

/**
 * Supabase の JWT クレームやメタデータから最も強いロールを取得する。
 */
export function resolveRoleFromClaims(claims: RoleClaims): UserRole {
  if (!claims) return "viewer";

  const rawRole = claims.role;
  const rawRoles = claims.roles;

  if (typeof rawRole === "string" && isUserRole(rawRole)) {
    return rawRole;
  }

  if (Array.isArray(rawRoles)) {
    const matched = rawRoles
      .filter((r): r is UserRole => typeof r === "string" && isUserRole(r))
      .sort((a, b) => ROLE_PRIORITY[b] - ROLE_PRIORITY[a]);
    if (matched.length > 0) {
      return matched[0];
    }
  }

  return "viewer";
}

/**
 * Supabase User / Session オブジェクトからロールを解決するヘルパー。
 */
export function getUserRole(userOrSession: User | Session | null | undefined): UserRole {
  if (!userOrSession) return "viewer";

  if ("user" in userOrSession) {
    const session = userOrSession as Session;
    const roleFromApp = resolveRoleFromClaims(session.user.app_metadata as RoleClaims);
    if (roleFromApp !== "viewer") return roleFromApp;
    return resolveRoleFromClaims(session.user.user_metadata as RoleClaims);
  }

  const user = userOrSession as User;
  const roleFromApp = resolveRoleFromClaims(user.app_metadata as RoleClaims);
  if (roleFromApp !== "viewer") return roleFromApp;
  return resolveRoleFromClaims(user.user_metadata as RoleClaims);
}

/**
 * 必要なロール権限を満たしているか判定する。
 */
export function hasRole(required: UserRole, current: UserRole | null): boolean {
  if (!current) return false;
  return ROLE_PRIORITY[current] >= ROLE_PRIORITY[required];
}

export function isUserRole(value: unknown): value is UserRole {
  return typeof value === "string" && USER_ROLES.includes(value as UserRole);
}

export function describeRole(role: UserRole): string {
  switch (role) {
    case "admin":
      return "管理者（全権）";
    case "reviewer":
      return "レビュワー（公開・非公開・通報対応）";
    case "editor":
      return "編集者（下書き投稿・修正）";
    default:
      return "閲覧者（公開データのみ表示）";
  }
}
