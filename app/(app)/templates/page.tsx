import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { can } from "@/lib/permissions";
import { ROLE_LABELS } from "@/lib/domain";
import { parseTemplateRoles } from "@/lib/whatsapp";
import { relativeTime } from "@/lib/format";
import Topbar from "@/components/Topbar";
import TemplateDialog from "@/components/TemplateDialog";
import DeleteTemplateButton from "@/components/DeleteTemplateButton";

// Manager/Admin: manage the WhatsApp message templates (Blueprint §14.9).
// Reps consume them in the lead page's WhatsApp panel — filtered to their role.
export default async function TemplatesPage() {
  const user = await requireUser();
  if (!can(user, "manage_templates")) redirect("/dashboard");

  const templates = await prisma.messageTemplate.findMany({
    orderBy: { createdAt: "asc" },
  });

  return (
    <>
      <Topbar title="Templates" role={user.role} action={<TemplateDialog />} />
      <div className="content screen-in">
        <div className="section-head">
          <h2>WhatsApp message templates</h2>
          <span className="hint">
            placeholders {"{leadName} {company} {repName}"} fill from the lead · roles control who
            can send it
          </span>
        </div>

        <div className="tbl-wrap">
          <table className="leads">
            <thead>
              <tr>
                <th>Template</th>
                <th>Message</th>
                <th>Available to</th>
                <th>Updated</th>
                <th className="r">Actions</th>
              </tr>
            </thead>
            <tbody>
              {templates.length === 0 ? (
                <tr>
                  <td colSpan={5} className="empty-cell">
                    No templates yet. Use <b>New template</b> above — reps will see them in the
                    WhatsApp panel on every lead.
                  </td>
                </tr>
              ) : (
                templates.map((t) => {
                  const roles = parseTemplateRoles(t.roles);
                  return (
                    <tr key={t.id}>
                      <td>
                        <div className="lead-name">{t.label}</div>
                      </td>
                      <td className="tpl-body-cell">{t.body}</td>
                      <td>
                        <div className="role-tags">
                          {roles.map((r) => (
                            <span className="role-tag" key={r}>
                              {ROLE_LABELS[r]}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="muted-time">{relativeTime(t.updatedAt)}</td>
                      <td className="r">
                        <div className="row-actions">
                          <TemplateDialog
                            template={{ id: t.id, label: t.label, body: t.body, roles }}
                          />
                          <DeleteTemplateButton templateId={t.id} />
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="rule-note" style={{ marginTop: 14 }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <path d="M20 6 9 17l-5-5" />
          </svg>
          Each user only sees templates their role is ticked for. Deleting a template never
          changes past activity entries — the timeline keeps the label it logged.
        </div>
      </div>
    </>
  );
}
