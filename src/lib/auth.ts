import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import bcrypt from "bcryptjs";
import { Collection } from "mongodb";
import { getDatabase } from "@/lib/mongodb";

export type StoredUser = {
    id: string;
    username: string;
    password?: string;
    email?: string;
    image?: string;
    provider?: "credentials" | "google";
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
    email?: string;
    image?: string;
};

type RegisterUserInput = Omit<StoredUser, "id" | "password" | "provider"> & {
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
        email: user.email,
        image: user.image,
    };
}

async function getUsersCollection(): Promise<Collection<StoredUser>> {
    if (!usersCollectionPromise) {
        usersCollectionPromise = (async () => {
            const db = await getDatabase();
            const collection = db.collection<StoredUser>("users");
            await collection.createIndex({ username: 1 }, { unique: true });
            await collection.createIndex(
                { email: 1 },
                { unique: true, sparse: true }
            );
            return collection;
        })();
    }

    return usersCollectionPromise;
}

export async function findUserByUsername(username: string): Promise<StoredUser | null> {
    const users = await getUsersCollection();
    return users.findOne({ username: normalizeUsername(username) });
}

export async function findUserByEmail(email: string): Promise<StoredUser | null> {
    const users = await getUsersCollection();
    return users.findOne({ email: email.trim().toLowerCase() });
}

function buildUsernameFromGoogle(name?: string | null, email?: string | null) {
    const fromName = (name || "")
        .toLowerCase()
        .replace(/[^a-z0-9_]+/g, "_")
        .replace(/^_+|_+$/g, "")
        .slice(0, 24);

    if (fromName.length >= 3) return fromName;

    const fromEmail = (email || "user")
        .split("@")[0]
        .toLowerCase()
        .replace(/[^a-z0-9_]+/g, "_")
        .slice(0, 24);

    return fromEmail || `user_${Date.now().toString().slice(-6)}`;
}

async function ensureUniqueUsername(base: string) {
    let candidate = normalizeUsername(base) || `user_${Date.now().toString().slice(-6)}`;
    let suffix = 0;

    while (await findUserByUsername(candidate)) {
        suffix += 1;
        candidate = `${base.slice(0, 20)}_${suffix}`;
    }

    return candidate;
}

export async function upsertGoogleUser(input: {
    email: string;
    name?: string | null;
    image?: string | null;
}): Promise<StoredUser> {
    const email = input.email.trim().toLowerCase();
    const existing = await findUserByEmail(email);

    if (existing) {
        const users = await getUsersCollection();
        const updates: Partial<StoredUser> = {
            provider: "google",
            image: input.image || existing.image,
        };

        await users.updateOne({ email }, { $set: updates });
        return { ...existing, ...updates };
    }

    const username = await ensureUniqueUsername(
        buildUsernameFromGoogle(input.name, email)
    );

    const newUser: StoredUser = {
        id: Date.now().toString(),
        username,
        email,
        image: input.image || undefined,
        provider: "google",
        age: 18,
        gender: "Rather not say",
        occupation: "Explorer",
        budName: "Bud",
    };

    const users = await getUsersCollection();
    await users.insertOne(newUser);
    return newUser;
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

    const providers: NextAuthOptions["providers"] = [
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
                if (!user || !user.password) return null;

                const passwordMatches = await bcrypt.compare(credentials.password, user.password);
                if (!passwordMatches) return null;

                const sessionUser = toSessionUser(user);
                return {
                    ...sessionUser,
                    name: sessionUser.username,
                    email: sessionUser.email,
                    image: sessionUser.image,
                };
            }
        })
    ];

    if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
        providers.unshift(
            GoogleProvider({
                clientId: process.env.GOOGLE_CLIENT_ID,
                clientSecret: process.env.GOOGLE_CLIENT_SECRET,
                authorization: {
                    params: {
                        prompt: "consent",
                        access_type: "offline",
                        response_type: "code",
                    },
                },
            })
        );
    }

    cachedAuthOptions = {
        providers,
        callbacks: {
            async signIn({ user, account }) {
                if (account?.provider === "google") {
                    if (!user.email) return false;
                    try {
                        await upsertGoogleUser({
                            email: user.email,
                            name: user.name,
                            image: user.image,
                        });
                        return true;
                    } catch (error) {
                        console.error("Google sign-in upsert failed:", error);
                        return false;
                    }
                }
                return true;
            },
            async jwt({ token, user, account, trigger }) {
                if (account?.provider === "google" && user?.email) {
                    try {
                        const dbUser = await findUserByEmail(user.email);
                        if (dbUser) {
                            const sessionUser = toSessionUser(dbUser);
                            token.id = sessionUser.id;
                            token.username = sessionUser.username;
                            token.age = sessionUser.age;
                            token.gender = sessionUser.gender;
                            token.occupation = sessionUser.occupation;
                            token.budName = sessionUser.budName;
                            token.email = sessionUser.email;
                            token.picture = sessionUser.image;
                        }
                    } catch (error) {
                        console.error("Failed to load Google user into token:", error);
                    }
                    return token;
                }

                if (user) {
                    const sessionUser = user as typeof user & SessionUser;
                    token.id = sessionUser.id;
                    token.username = sessionUser.username;
                    token.age = sessionUser.age;
                    token.gender = sessionUser.gender;
                    token.occupation = sessionUser.occupation;
                    token.budName = sessionUser.budName || "Bud";
                    token.email = sessionUser.email;
                    token.picture = sessionUser.image;
                    return token;
                }

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
                            token.email = sessionUser.email;
                            token.picture = sessionUser.image;
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
                        email: token.email,
                        image: token.picture,
                    });
                }
                return session;
            }
        },
        pages: {
            signIn: "/",
            error: "/",
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
        provider: "credentials",
        email: userData.email,
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
