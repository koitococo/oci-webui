import { log } from "./logger";

export type AuditAction = "auth.login" | "auth.logout";

interface AuditEntry {
  action: AuditAction;
  user?: string;
  registry?: string;
  resource?: string;
  status: "success" | "failure";
  detail?: string;
}

export function audit(entry: AuditEntry) {
  log
    .withMetadata({ audit: true, ...entry })
    .info(`[AUDIT] ${entry.action} ${entry.status}: ${entry.resource ?? ""}`);
}
