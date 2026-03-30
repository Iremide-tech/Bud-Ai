import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { getAuthOptions, findUserByUsername, updateUserByUsername } from "@/lib/auth";

export async function POST(request: Request) {
    const session = await getServerSession(getAuthOptions());

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

        const existingUser = await findUserByUsername(session.user.username);
        if (!existingUser) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        const safeGender = typeof gender === "string" && gender.trim().length > 0 ? gender.trim() : existingUser.gender;
        const safeOccupation = typeof occupation === "string" && occupation.trim().length > 0 ? occupation.trim() : existingUser.occupation;

        const updated = await updateUserByUsername(session.user.username, {
            age: parsedAge !== undefined ? parsedAge : existingUser.age,
            gender: safeGender,
            occupation: safeOccupation,
        });

        if (!updated) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        return NextResponse.json({ message: "Profile updated successfully" });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Profile update failed";
        return NextResponse.json({ error: message }, { status: 400 });
    }
}
