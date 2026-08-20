import { DefaultSession, DefaultUser } from "next-auth";
import "next-auth";
import "next-auth/jwt";

declare module "next-auth" {
    interface Session {
        user: DefaultSession["user"] & {
            id: string;
            username: string;
            age: number;
            gender: string;
            occupation: string;
            budName: string;
            email?: string;
            image?: string;
        };
    }

    interface User extends DefaultUser {
        id: string;
        username: string;
        age: number;
        gender: string;
        occupation: string;
        budName: string;
        email?: string;
        image?: string;
    }
}

declare module "next-auth/jwt" {
    interface JWT {
        id?: string;
        username?: string;
        age?: number;
        gender?: string;
        occupation?: string;
        budName?: string;
        email?: string;
        picture?: string;
    }
}
