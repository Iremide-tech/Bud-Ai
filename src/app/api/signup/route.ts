import { NextResponse } from "next/server";
import { registerUser } from "@/lib/auth";

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { username, password, age, gender, occupation } = body || {};

        if (!username || !password || age === undefined) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        if (typeof username !== "string" || username.trim().length < 3 || username.trim().length > 32) {
            return NextResponse.json({ error: "Invalid username" }, { status: 400 });
        }

        if (typeof password !== "string" || password.length < 6 || password.length > 128) {
            return NextResponse.json({ error: "Invalid password" }, { status: 400 });
        }

        const parsedAge = Number(age);
        if (!Number.isFinite(parsedAge) || parsedAge < 1 || parsedAge > 120) {
            return NextResponse.json({ error: "Invalid age" }, { status: 400 });
        }

        if (gender !== undefined && typeof gender !== "string") {
            return NextResponse.json({ error: "Invalid gender" }, { status: 400 });
        }

        if (occupation !== undefined && typeof occupation !== "string") {
            return NextResponse.json({ error: "Invalid occupation" }, { status: 400 });
        }

        const safeGender = typeof gender === "string" && gender.trim().length > 0 ? gender.trim() : "Rather not say";
        const safeOccupation = typeof occupation === "string" && occupation.trim().length > 0 ? occupation.trim() : "Explorer";

        const user = registerUser({
            ...body,
            username: username.trim(),
            password,
            age: parsedAge,
            gender: safeGender,
            occupation: safeOccupation,
        });
        return NextResponse.json({ message: "User created", user: { id: user.id, username: user.username } });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 400 });
    }
}
