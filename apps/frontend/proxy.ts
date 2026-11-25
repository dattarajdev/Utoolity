import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function proxy(request: NextRequest) {
  if (request.nextUrl.pathname.startsWith("/tools/augmentation")) {
    return NextResponse.next();
  }
  return NextResponse.redirect(new URL("/", request.url));
}

export const config = {
  matcher: ["/settings/:path*", "/files/:path*", "/tools/:path*"],
};
