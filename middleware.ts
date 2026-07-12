import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, verifySession } from "@/lib/session";

// Route guard: unauthenticated users are sent to /login; signed-in users hitting
// /login are bounced to the dashboard. API routes enforce their own auth.
export async function middleware(req: NextRequest) {
  const uid = await verifySession(req.cookies.get(SESSION_COOKIE)?.value);
  const { pathname } = req.nextUrl;
  const isLogin = pathname === "/login";

  if (!uid && !isLogin) {
    return NextResponse.redirect(new URL("/login", req.url));
  }
  if (uid && isLogin) {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
