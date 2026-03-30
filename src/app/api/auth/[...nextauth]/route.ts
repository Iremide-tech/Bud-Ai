import NextAuth from "next-auth";
import { getAuthOptions } from "@/lib/auth";

export async function GET(request: Request) {
    return NextAuth(getAuthOptions())(request);
}

export async function POST(request: Request) {
    return NextAuth(getAuthOptions())(request);
}
