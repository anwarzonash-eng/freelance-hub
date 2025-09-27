// app/api/logout/route.ts
import { NextResponse } from "next/server";

export async function POST() {
    const res = NextResponse.json({ success: true });

    res.cookies.set({
        name: "authenticated",
        value: "",
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        path: "/",
        expires: new Date(0), // Expire immediately
    });

    return res;
}
