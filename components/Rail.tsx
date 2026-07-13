"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import Mark from "./Mark";
import { Role, ROLE_LABELS } from "@/lib/domain";

const SCOPE_TEXT: Record<Role, { word: string; note: string }> = {
  ADMIN: { word: "system-wide", note: "You manage users, leads, and assignments." },
  MANAGER: { word: "team-wide", note: "You manage all leads and assignments." },
  SALES_REP: { word: "your assigned", note: "You see and work only your leads." },
};

function initialsOf(name: string) {
  return name.split(" ").filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase();
}

export default function Rail({ user }: { user: { name: string; role: Role } }) {
  const path = usePathname();
  const isActive = (href: string) => path === href || path.startsWith(href + "/");
  const scope = SCOPE_TEXT[user.role];

  return (
    <aside className="rail">
      {/* Same horizontal lockup as the login page: mark + wordmark on one line. */}
      <div className="brand">
        <Mark />
        <b>Leadway</b>
      </div>

      <nav className="rail-nav">
        <Link href="/dashboard" className={`navitem${isActive("/dashboard") ? " active" : ""}`}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <rect x="3" y="3" width="7" height="9" rx="1.5" />
            <rect x="14" y="3" width="7" height="5" rx="1.5" />
            <rect x="14" y="12" width="7" height="9" rx="1.5" />
            <rect x="3" y="16" width="7" height="5" rx="1.5" />
          </svg>
          <span>Dashboard</span>
        </Link>
        <Link href="/leads" className={`navitem${isActive("/leads") ? " active" : ""}`}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path d="M4 6h16M4 12h16M4 18h10" />
          </svg>
          <span>Leads</span>
        </Link>
        {(user.role === "MANAGER" || user.role === "ADMIN") && (
          <>
            <Link href="/reports" className={`navitem${isActive("/reports") ? " active" : ""}`}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path d="M4 20V10M10 20V4M16 20v-8M21 20H3" />
              </svg>
              <span>Reports</span>
            </Link>
            <Link href="/templates" className={`navitem${isActive("/templates") ? " active" : ""}`}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path d="M21 11.5a8.5 8.5 0 0 1-8.5 8.5c-1.5 0-3-.4-4.2-1.1L3 20l1.1-5.3A8.4 8.4 0 0 1 3 11.5 8.5 8.5 0 0 1 11.5 3 8.5 8.5 0 0 1 21 11.5Z" />
                <path d="M8 10.5h8M8 13.5h5" />
              </svg>
              <span>Templates</span>
            </Link>
          </>
        )}
        {user.role === "ADMIN" && (
          <Link href="/users" className={`navitem${isActive("/users") ? " active" : ""}`}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <circle cx="9" cy="8" r="3.2" />
              <path d="M4 20c0-3 2.2-5 5-5s5 2 5 5" />
              <circle cx="17.5" cy="9" r="2.4" />
              <path d="M15 20c0-2.4 1.3-4 3-4.3" />
            </svg>
            <span>Users</span>
          </Link>
        )}
      </nav>

      <div className="rail-scope">
        Viewing <b>{scope.word}</b> pipeline. {scope.note}
      </div>

      <div className="rail-foot">
        <div className="userchip">
          <span className="avatar" style={{ background: "#4A45E0" }}>{initialsOf(user.name)}</span>
          <div className="meta">
            <b>{user.name}</b>
            <span className="rolebadge">{ROLE_LABELS[user.role]}</span>
          </div>
        </div>
      </div>
    </aside>
  );
}
