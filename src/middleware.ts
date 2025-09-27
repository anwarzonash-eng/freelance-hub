import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const SESSION_COOKIE_NAME = 'app-session';
const publicPaths = ['/login'];

export const config = {
    matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};

export function middleware(request: NextRequest) {
    // console.log('middleware called');

    const { pathname } = request.nextUrl;

    const isPublicPath = publicPaths.includes(pathname);

    // 🔍 Middleware reads the HTTP-only cookie
    const isAuthenticated = request.cookies.get("authenticated")?.value === "true";


    // 🛡️ Redirect to login if unauthenticated and accessing a protected route
    if (!isAuthenticated && !isPublicPath) {
        return NextResponse.redirect(new URL('/login', request.url));
    }

    // 🚪 Redirect from login to dashboard if already authenticated
    if (isAuthenticated && pathname === '/login') {
        return NextResponse.redirect(new URL('/', request.url));
    }

    return NextResponse.next();
}