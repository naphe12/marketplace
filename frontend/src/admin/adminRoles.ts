export const adminRoles = [
  "SUPER_ADMIN",
  "MODERATOR",
  "VERIFICATION_AGENT",
  "FINANCE_ADMIN",
  "SUPPORT",
] as const;

export const adminPermissions = [
  "users.read",
  "users.suspend",
  "listings.read",
  "listings.moderate",
  "verifications.review",
  "billing.read",
  "billing.manage",
  "settings.manage",
  "admins.manage",
] as const;
