import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { cookies } from 'next/headers';

const publicPaths = ['/login', '/404', '/leads', '/tmp'];

export const config = {
    // Exclude static files, API routes, and the like
    matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};


export async function middleware(request: NextRequest) {
    const path = request.nextUrl.pathname;
    const query = request.nextUrl.search;
    const pathname = `${path}${query}`;

    const isPublicPath = publicPaths.includes(pathname);

    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('authSession');
    let userData: { authenticated?: boolean, roles?: string[] } = {};
    let isAuthenticated = false;

    if (sessionCookie) {
        try {
            userData = JSON.parse(sessionCookie.value);
            isAuthenticated = userData.authenticated === true;
            // console.log({ userData: userData, current_url: request.url });
        } catch (e) {
            // console.log("Failed to parse authSession cookie. Error:", e);
        }
    }

    // 1. Handle unauthenticated users trying to access protected paths
    if (!isAuthenticated && !isPublicPath) {
        const url = new URL('/login', request.url);
        // url.searchParams.set('from', pathname);
        // console.log(pathname)
        return NextResponse.redirect(url);
    }

    // 2. Handle authenticated users trying to access the login page
    if (isAuthenticated && pathname === '/login') {
        return NextResponse.redirect(new URL('/', request.url));
    }

    // --- Path/Role-Based Authorization Check ---

    // Get roles, defaulting to an empty array if not present
    const allowedRoutes = userData.roles || [];

    // Normalize path: trim trailing slash unless it's the root '/'

    const currentPath = pathname === '/' ? '/' : pathname.replace(/\/$/, '');


    // Check for access:
    // This grants access if the roles array contains "*" OR if the specific path is included.
    const hasAccess = allowedRoutes.includes('*') || allowedRoutes.includes(currentPath);

    // 3. Handle authenticated users trying to access unauthorized paths
    if (isAuthenticated && !isPublicPath && !hasAccess) {
        // console.log(`Access denied for ${currentPath}. User roles: ${allowedRoutes.join(', ')}`);
        return NextResponse.redirect(new URL('/404', request.url));
    }

    // 4. Proceed to the requested page
    return NextResponse.next();
}