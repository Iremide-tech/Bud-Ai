import { NextResponse } from "next/server";
import { registerUser } from "@/lib/auth";

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const user = registerUser(body);
        return NextResponse.json({ message: "User created", user: { id: user.id, username: user.username } });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 400 });
    }
}
