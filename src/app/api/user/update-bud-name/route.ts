import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { getAuthOptions, getUsers, saveUsers } from "@/lib/auth";

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

        const users = getUsers();
        const userIndex = users.findIndex((u: any) => u.username === (session.user as any).username);

        if (userIndex === -1) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        users[userIndex].budName = budName;
        saveUsers(users);

        return NextResponse.json({ message: "Bud named successfully!", budName });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
