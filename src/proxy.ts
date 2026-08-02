import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import type { Database } from "@/lib/supabase/database.types";

import {
  ROLE_HOME,
  isAuthPage,
  isAuthRequiredPath,
  postAuthPath,
  requiredRoleForPath,
  safeNextPath,
} from "@/lib/auth/routes";

/**
 * Proxy (Next 16's middleware): refreshes the Supabase session cookie on
 * every matched request (this is what keeps sessions alive) and does
 * OPTIMISTIC role-based redirects. The authoritative checks live in the DAL
 * (`requireRole`) and in RLS — never rely on the proxy alone.
 */
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // Always call getUser() so expired access tokens are refreshed and the
  // renewed cookies land on the response, even for public pages.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname, search } = request.nextUrl;

  // Preserve any refreshed session cookies on redirect responses.
  const redirectTo = (path: string) => {
    const redirectResponse = NextResponse.redirect(new URL(path, request.url));
    response.cookies
      .getAll()
      .forEach((cookie) => redirectResponse.cookies.set(cookie));
    return redirectResponse;
  };

  if (!user) {
    if (isAuthRequiredPath(pathname)) {
      const next = encodeURIComponent(pathname + search);
      return redirectTo(`/login?next=${next}`);
    }
    return response;
  }

  // Only pay for a profile lookup on routes where it decides the redirect.
  if (isAuthRequiredPath(pathname) || isAuthPage(pathname)) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role, phone")
      .eq("id", user.id)
      .single();

    const incomplete = !profile?.phone;

    if (pathname === "/complete-profile") {
      // Render when the profile still needs completing (or is missing —
      // the page surfaces that error); bounce completed users home.
      return incomplete ? response : redirectTo(ROLE_HOME[profile!.role]);
    }

    if (incomplete) {
      return redirectTo("/complete-profile");
    }

    if (isAuthPage(pathname)) {
      const next = safeNextPath(request.nextUrl.searchParams.get("next"));
      return redirectTo(postAuthPath(profile, next));
    }

    const requiredRole = requiredRoleForPath(pathname);
    if (requiredRole && profile && profile.role !== requiredRole) {
      return redirectTo(ROLE_HOME[profile.role]);
    }
  }

  return response;
}

export const config = {
  matcher: [
    // Everything except static assets and image optimization files.
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
