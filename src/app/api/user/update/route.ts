import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions, getUsers, saveUsers } from "@/lib/auth";

export async function POST(request: Request) {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const body = await request.json();
        const { age, gender, occupation } = body;

        const users = getUsers();
        const userIndex = users.findIndex((u: any) => u.username === (session.user as any).username);

        if (userIndex === -1) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        // Update user data
        users[userIndex] = {
            ...users[userIndex],
            age: age !== undefined ? parseInt(age) : users[userIndex].age,
            gender: gender || users[userIndex].gender,
            occupation: occupation || users[userIndex].occupation,
        };

        saveUsers(users);

        return NextResponse.json({ message: "Profile updated successfully" });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 400 });
    }
}
