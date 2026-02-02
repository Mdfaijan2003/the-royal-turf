import AuditLog from "../models/auditLog.js";

export const logAdminAction = async ({
  adminId,
  action,
  entityType,
  entityId,
  meta = {},
}) => {
  try {
    await AuditLog.create({
      admin: adminId,
      action,
      entityType,
      entityId,
      meta,
    });
  } catch (err) {
    console.error("AUDIT LOG FAILED:", err);
    // ❗ Never throw — audit must not break core flow
  }
};
