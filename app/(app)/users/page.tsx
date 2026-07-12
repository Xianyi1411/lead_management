import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { ROLES, ROLE_LABELS, type Role } from "@/lib/domain";
import { relativeTime } from "@/lib/format";
import Topbar from "@/components/Topbar";
import AddUserDialog from "@/components/AddUserDialog";
import Dropdown from "@/components/Dropdown";
import { setUserRole, toggleUserActive } from "./actions";

// Admin-only (Blueprint §3): create users, set roles, deactivate/reactivate.
// No hard delete — deactivation preserves the audit trail (Blueprint §9).
export default async function UsersPage() {
  const user = (await getCurrentUser())!;
  if (user.role !== "ADMIN") redirect("/dashboard");

  const users = await prisma.user.findMany({
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      isActive: true,
      createdAt: true,
      _count: { select: { assignedLeads: true } },
    },
  });

  return (
    <>
      <Topbar title="Users" role={user.role} action={<AddUserDialog />} />
      <div className="content screen-in">
        <div className="tbl-wrap">
          <table className="leads">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th className="r">Assigned leads</th>
                <th>Status</th>
                <th>Added</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => {
                const isSelf = u.id === user.id;
                return (
                  <tr key={u.id}>
                    <td className="lead-name">
                      {u.name}
                      {isSelf && <span style={{ color: "var(--slate)", fontWeight: 500 }}> (you)</span>}
                    </td>
                    <td className="tnum" style={{ fontSize: 13 }}>{u.email}</td>
                    <td>
                      {isSelf ? (
                        ROLE_LABELS[u.role as Role]
                      ) : (
                        <form action={setUserRole.bind(null, u.id)} className="assign-row">
                          <Dropdown
                            name="role"
                            compact
                            ariaLabel={`Role for ${u.name}`}
                            defaultValue={u.role}
                            options={ROLES.map((r) => ({ value: r, label: ROLE_LABELS[r] }))}
                          />
                          <button type="submit" className="step-btn reopen" style={{ height: 34 }}>
                            Set
                          </button>
                        </form>
                      )}
                    </td>
                    <td className="r tnum">{u._count.assignedLeads}</td>
                    <td>
                      {u.isActive ? (
                        <span className="pill" style={{ background: "var(--won-t)", color: "#0f7147" }}>
                          <i style={{ background: "var(--won)" }} />Active
                        </span>
                      ) : (
                        <span className="pill" style={{ background: "var(--mist-2)", color: "var(--slate)" }}>
                          <i style={{ background: "var(--slate)" }} />Inactive
                        </span>
                      )}
                    </td>
                    <td className="muted-time">{relativeTime(u.createdAt)}</td>
                    <td>
                      {isSelf ? (
                        <span style={{ color: "var(--slate)", fontSize: 12.5 }}>—</span>
                      ) : (
                        <form action={toggleUserActive.bind(null, u.id)}>
                          <button type="submit" className={`step-btn ${u.isActive ? "lost" : "won"}`} style={{ height: 32 }}>
                            {u.isActive ? "Deactivate" : "Reactivate"}
                          </button>
                        </form>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div style={{ marginTop: 12, fontSize: 12.5, color: "var(--slate)" }}>
          Deactivated users can&apos;t sign in; their history and assigned leads are kept.
          You can&apos;t deactivate or change the role of your own account.
        </div>
      </div>
    </>
  );
}
