import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import Rail from "@/components/Rail";

// Authenticated shell. Middleware already gates routes; this also guarantees a user
// object for the rail and passes the role down for scoping.
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return (
    <div className="app">
      <Rail user={user} />
      <div className="main">{children}</div>
    </div>
  );
}
