import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { Collection } from "mongodb";
import { getDatabase } from "@/lib/mongodb";

export type StoredUser = {
    id: string;
    username: string;
    password: string;
    age: number;
    gender: string;
    occupation: string;
    budName?: string;
};

type SessionUser = {
    id: string;
    username: string;
    age: number;
    gender: string;
    occupation: string;
    budName: string;
};

type RegisterUserInput = Omit<StoredUser, "id" | "password"> & {
    password: string;
};

let usersCollectionPromise: Promise<Collection<StoredUser>> | null = null;
let cachedAuthOptions: NextAuthOptions | null = null;

function requireNextAuthSecret() {
    const secret = process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET;

    if (!secret && process.env.NODE_ENV !== "development") {
        throw new Error("NEXTAUTH_SECRET or AUTH_SECRET is required in non-development environments.");
    }

    return secret;
}

function normalizeUsername(username: string) {
    return username.trim();
}

function toSessionUser(user: StoredUser): SessionUser {
    return {
        id: user.id,
        username: user.username,
        age: user.age,
        gender: user.gender,
        occupation: user.occupation,
        budName: user.budName || "Bud",
    };
}

async function getUsersCollection(): Promise<Collection<StoredUser>> {
    if (!usersCollectionPromise) {
        usersCollectionPromise = (async () => {
            const db = await getDatabase();
            const collection = db.collection<StoredUser>("users");
            await collection.createIndex({ username: 1 }, { unique: true });
            return collection;
        })();
    }

    return usersCollectionPromise;
}

export async function findUserByUsername(username: string): Promise<StoredUser | null> {
    const users = await getUsersCollection();
    return users.findOne({ username: normalizeUsername(username) });
}

export async function updateUserByUsername(
    username: string,
    updates: Partial<Pick<StoredUser, "age" | "gender" | "occupation" | "budName">>
): Promise<boolean> {
    const users = await getUsersCollection();
    const result = await users.updateOne({ username: normalizeUsername(username) }, { $set: updates });
    return result.matchedCount > 0;
}

export function getAuthOptions(): NextAuthOptions {
    if (cachedAuthOptions) {
        return cachedAuthOptions;
    }

    cachedAuthOptions = {
        providers: [
            CredentialsProvider({
                name: "Credentials",
                credentials: {
                    username: { label: "Username", type: "text" },
                    password: { label: "Password", type: "password" },
                },
                async authorize(credentials) {
                    if (!credentials?.username || !credentials?.password) return null;

                    const username = normalizeUsername(credentials.username);
                    if (!username) return null;

                    const user = await findUserByUsername(username);
                    if (!user) return null;

                    const passwordMatches = await bcrypt.compare(credentials.password, user.password);
                    if (!passwordMatches) return null;

                    const sessionUser = toSessionUser(user);
                    return {
                        ...sessionUser,
                        name: sessionUser.username,
                    };
                }
            })
        ],
        callbacks: {
            async jwt({ token, user, trigger }) {
                if (user) {
                    const sessionUser = user as typeof user & SessionUser;
                    token.id = sessionUser.id;
                    token.username = sessionUser.username;
                    token.age = sessionUser.age;
                    token.gender = sessionUser.gender;
                    token.occupation = sessionUser.occupation;
                    token.budName = sessionUser.budName || "Bud";
                    return token;
                }

                // Keep JWT in sync with MongoDB after profile / bud-name updates.
                if (trigger === "update" && token.username) {
                    try {
                        const freshUser = await findUserByUsername(String(token.username));
                        if (freshUser) {
                            const sessionUser = toSessionUser(freshUser);
                            token.id = sessionUser.id;
                            token.username = sessionUser.username;
                            token.age = sessionUser.age;
                            token.gender = sessionUser.gender;
                            token.occupation = sessionUser.occupation;
                            token.budName = sessionUser.budName;
                        }
                    } catch (error) {
                        console.error("Failed to refresh auth token from database:", error);
                    }
                }

                return token;
            },
            async session({ session, token }) {
                if (token && session.user) {
                    Object.assign(session.user, {
                        id: token.id,
                        username: token.username,
                        age: token.age,
                        gender: token.gender,
                        occupation: token.occupation,
                        budName: token.budName || "Bud",
                    });
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
        secret: requireNextAuthSecret(),
    };

    return cachedAuthOptions;
}

export function registerUser(userData: RegisterUserInput) {
    const username = typeof userData.username === "string" ? normalizeUsername(userData.username) : "";
    return createUser({
        ...userData,
        username,
    });
}

async function createUser(userData: RegisterUserInput & { username: string }) {
    const existingUser = await findUserByUsername(userData.username);

    if (existingUser) {
        throw new Error("User already exists");
    }

    const hashedPassword = await bcrypt.hash(userData.password, 10);
    const newUser: StoredUser = {
        username: userData.username,
        password: hashedPassword,
        age: userData.age,
        gender: userData.gender,
        occupation: userData.occupation,
        id: Date.now().toString(),
        budName: userData.budName || "Bud",
    };

    const users = await getUsersCollection();
    try {
        await users.insertOne(newUser);
    } catch (error: unknown) {
        const mongoError = error as { code?: number };
        if (mongoError.code === 11000) {
            throw new Error("User already exists");
        }
        throw error;
    }

    return newUser;
}
