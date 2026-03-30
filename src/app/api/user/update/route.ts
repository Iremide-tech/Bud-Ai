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

        const parsedAge = age !== undefined ? Number(age) : undefined;
        if (parsedAge !== undefined && (!Number.isFinite(parsedAge) || parsedAge < 1 || parsedAge > 120)) {
            return NextResponse.json({ error: "Invalid age" }, { status: 400 });
        }

        if (gender !== undefined && typeof gender !== "string") {
            return NextResponse.json({ error: "Invalid gender" }, { status: 400 });
        }

        if (occupation !== undefined && typeof occupation !== "string") {
            return NextResponse.json({ error: "Invalid occupation" }, { status: 400 });
        }

        const users = getUsers();
        const userIndex = users.findIndex((u: any) => u.username === (session.user as any).username);

        if (userIndex === -1) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        // Update user data
        const safeGender = typeof gender === "string" && gender.trim().length > 0 ? gender.trim() : users[userIndex].gender;
        const safeOccupation = typeof occupation === "string" && occupation.trim().length > 0 ? occupation.trim() : users[userIndex].occupation;

        users[userIndex] = {
            ...users[userIndex],
            age: parsedAge !== undefined ? parsedAge : users[userIndex].age,
            gender: safeGender,
            occupation: safeOccupation,
        };

        saveUsers(users);

        return NextResponse.json({ message: "Profile updated successfully" });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 400 });
    }
}
