import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

// Next.js 16 renamed middleware.ts to proxy.ts and moved it to the Node.js
// runtime by default, which is what makes it safe to import the full auth()
// config here (including the Prisma-backed database session lookup) instead
// of needing a separate Edge-safe config split.
export default auth((req) => {
  if (!req.auth) {
    return NextResponse.redirect(new URL("/login", req.url));
  }
});

export const config = {
  matcher: ["/dashboard/:path*", "/profile/:path*"],
};
