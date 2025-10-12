// app/api/login/route.ts
import { NextResponse } from "next/server";

export async function POST(req: Request) {
    const { userName, password } = await req.json();

    // console.log('path', `${process.env.NEXT_PUBLIC_API_PATH}/auth/login`);
    // Call your external API
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_PATH}auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userid: userName, password }),
    });

    if (!response.ok) {

        return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    const data = await response.json();
    // console.log('login', data);

    // 1. Build the object containing all necessary session data
    const userData = {
        id: data.data.user.id,
        authenticated: true,
        roles: data.data.user.roles
    };
    // const userData = {}

    // 2. 🔑 Serialize the object into a JSON string
    const serializedUserData = JSON.stringify(userData);

    // 3. Build a response object and set the cookie on it
    const res = NextResponse.json({ success: true, data });

    // 4. Set the cookie using the stringified value
    res.cookies.set('authSession', serializedUserData, { // 'authSession' is the key (name), serializedUserData is the string value
        // The options object only contains configuration properties
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        path: "/",
        maxAge: 60 * 60, // 1 hour
    });

    return res;
}
