import NextAuth, { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import fs from "fs";
import path from "path";

const USERS_FILE = path.join(process.cwd(), "src/lib/users.json");

if (!process.env.NEXTAUTH_SECRET && process.env.NODE_ENV !== "development") {
    throw new Error("NEXTAUTH_SECRET is required in non-development environments.");
}

export function getUsers() {
    if (!fs.existsSync(USERS_FILE)) return [];
    try {
        const data = fs.readFileSync(USERS_FILE, "utf-8");
        const parsed = JSON.parse(data);
        return Array.isArray(parsed) ? parsed : [];
    } catch {
        return [];
    }
}

export function saveUsers(users: any[]) {
    const dir = path.dirname(USERS_FILE);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
    const tempFile = `${USERS_FILE}.tmp`;
    fs.writeFileSync(tempFile, JSON.stringify(users, null, 2));
    fs.renameSync(tempFile, USERS_FILE);
}

export const authOptions: NextAuthOptions = {
    providers: [
        CredentialsProvider({
            name: "Credentials",
            credentials: {
                username: { label: "Username", type: "text" },
                password: { label: "Password", type: "password" },
                // Extra fields for signup (handled in a separate logic usually, 
                // but we can piggyback or use an API route)
            },
            async authorize(credentials) {
                if (!credentials?.username || !credentials?.password) return null;

                const users = getUsers();
                const user = users.find((u: any) => u.username === credentials.username);

                if (user && bcrypt.compareSync(credentials.password, user.password)) {
                    return {
                        id: user.id,
                        name: user.username,
                        username: user.username,
                        age: user.age,
                        gender: user.gender,
                        occupation: user.occupation,
                        budName: user.budName || 'Bud',
                    };
                }
                return null;
            }
        })
    ],
    callbacks: {
        async jwt({ token, user }) {
            if (user) {
                token.id = user.id;
                token.username = (user as any).username;
                token.age = (user as any).age;
                token.gender = (user as any).gender;
                token.occupation = (user as any).occupation;
                token.budName = (user as any).budName || 'Bud';
            }
            return token;
        },
        async session({ session, token }) {
            if (token) {
                (session.user as any).id = token.id;
                (session.user as any).username = token.username;
                (session.user as any).age = token.age;
                (session.user as any).gender = token.gender;
                (session.user as any).occupation = token.occupation;
                (session.user as any).budName = token.budName;
            }
            return session;
        }
    },
    pages: {
        signIn: "/",
    },
    session: {
        strategy: "jwt",
    },
    secret: process.env.NEXTAUTH_SECRET,
};

// Also export helper for user registration
export function registerUser(userData: any) {
    const users = getUsers();
    const username = typeof userData.username === "string" ? userData.username.trim() : "";
    if (users.find((u: any) => u.username === username)) {
        throw new Error("User already exists");
    }
    const hashedPassword = bcrypt.hashSync(userData.password, 10);
    const newUser = {
        ...userData,
        username,
        id: Date.now().toString(),
        password: hashedPassword,
        budName: userData.budName || 'Bud',
    };
    users.push(newUser);
    saveUsers(users);
    return newUser;
}
