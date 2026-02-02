import AuditLog from "../models/auditLog.js";

export const adminGetAuditLogs = async (req, res) => {
  try {
    const { action, entityType, adminId } = req.query;

    const query = {};

    if (action) query.action = action;
    if (entityType) query.entityType = entityType;
    if (adminId) query.admin = adminId;

    const logs = await AuditLog.find(query)
      .populate("admin", "name email")
      .sort({ createdAt: -1 })
      .limit(200)
      .lean();

    return res.json({
      total: logs.length,
      data: logs,
    });
  } catch (err) {
    console.error("adminGetAuditLogs error:", err);
    res.status(500).json({ error: "Failed to fetch audit logs" });
  }
};
