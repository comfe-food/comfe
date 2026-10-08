import { NextResponse, type NextRequest } from "next/server";

// Nome dos cookies de sessão criados por @supabase/ssr: sb-<project-ref>-auth-token
const SESSION_COOKIE_RE = /^sb-.+-auth-token(-code-verifier)?$/;

/**
 * Verificação otimista do painel (não é autorização): redireciona para o
 * login quando não existe cookie de sessão. A autorização real acontece no
 * servidor (requireAdmin) em cada página/ação.
 */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (!pathname.startsWith("/admin")) {
    return NextResponse.next();
  }

  const hasSessionCookie = request.cookies
    .getAll()
    .some((cookie) => SESSION_COOKIE_RE.test(cookie.name));

  if (pathname === "/admin/login") {
    // Sessão válida? Vai direto para o painel em vez do login.
    if (hasSessionCookie) {
      const url = request.nextUrl.clone();
      url.pathname = "/admin";
      url.search = "";
      return NextResponse.redirect(url);
    }
    return NextResponse.next();
  }

  if (!hasSessionCookie) {
    const url = request.nextUrl.clone();
    url.pathname = "/admin/login";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};