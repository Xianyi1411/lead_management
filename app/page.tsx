import { redirect } from "next/navigation";

// Middleware routes unauthenticated users to /login; everyone else lands on the dashboard.
export default function Home() {
  redirect("/dashboard");
}
