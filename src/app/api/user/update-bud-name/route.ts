import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { getAuthOptions, updateUserByUsername } from "@/lib/auth";

export async function POST(request: Request) {
    try {
        const session = await getServerSession(getAuthOptions());
        if (!session || !session.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { budName } = await request.json();
        if (!budName) {
            return NextResponse.json({ error: "Bud name is required" }, { status: 400 });
        }

        const updated = await updateUserByUsername(session.user.username, {
            budName: String(budName).trim(),
        });

        if (!updated) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        return NextResponse.json({ message: "Bud named successfully!", budName });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Bud naming failed";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
