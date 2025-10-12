// app/api/logout/route.ts
import { NextResponse } from "next/server";

export async function POST() {
    const res = NextResponse.json({ success: true });

    const userData = {
        id: null,
        authenticated: false,
        roles: []
    };
    // const userData = {}

    // 2. 🔑 Serialize the object into a JSON string
    const serializedUserData = JSON.stringify(userData);

    // 3. Build a response object and set the cookie on it


    res.cookies.set('authSession', serializedUserData, { // 'authSession' is the key (name), serializedUserData is the string value
        // The options object only contains configuration properties
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        path: "/",
        maxAge: 60 * 60, // 1 hour
    });

    return res;
}
