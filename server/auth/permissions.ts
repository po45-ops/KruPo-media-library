import type { Role } from "@/types/domain";
export type Permission="system.manage"|"media.review"|"complaint.manage"|"finance.manage"|"user.support"|"creator.manage_own"|"marketplace.buy"|"audit.read";
const matrix:Record<Role,readonly Permission[]>={
  owner:["system.manage","media.review","complaint.manage","finance.manage","user.support","creator.manage_own","marketplace.buy","audit.read"],
  admin:["system.manage","media.review","complaint.manage","user.support","audit.read"],
  reviewer:["media.review","audit.read"], moderator:["complaint.manage","audit.read"], finance:["finance.manage","audit.read"], support:["user.support","audit.read"], creator:["creator.manage_own","marketplace.buy"], user:["marketplace.buy"]
};
export function roleCan(role:Role,permission:Permission){return matrix[role].includes(permission)}
export function anyRoleCan(roles:Role[],permission:Permission){return roles.some(r=>roleCan(r,permission))}
