import { Role } from "@/lib/domain";
import { logout } from "@/app/actions";

const SCOPE_PILL: Record<Role, string> = {
  ADMIN: "System view",
  MANAGER: "Team view",
  SALES_REP: "My leads",
};

// Sticky page header. The search is a plain GET form to /leads, so it works from any
// page without JS. `action` is an optional right-aligned control (e.g. New lead).
export default function Topbar({
  title,
  role,
  action,
  defaultQuery,
}: {
  title: string;
  role: Role;
  action?: React.ReactNode;
  defaultQuery?: string;
}) {
  return (
    <header className="topbar">
      <div className="page-title">{title}</div>
      <form className="search" action="/leads" method="get" role="search">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
          <circle cx="11" cy="11" r="7" />
          <path d="m21 21-4-4" />
        </svg>
        <input
          name="q"
          placeholder="Search leads by name, phone, or company"
          aria-label="Search leads"
          defaultValue={defaultQuery}
        />
      </form>
      <div className="spacer" />
      <span className="scope-pill">
        <i />
        {SCOPE_PILL[role]}
      </span>
      {action}
      <form action={logout}>
        <button type="submit" className="btn btn-ghost" title="Sign out of Leadway">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <path d="M15 12H4m0 0 4-4m-4 4 4 4" />
            <path d="M11 4h6a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-6" />
          </svg>
          Log out
        </button>
      </form>
    </header>
  );
}
