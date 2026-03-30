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

function requireNextAuthSecret() {
    const secret = process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET;

    if (!secret && process.env.NODE_ENV !== "development") {
        throw new Error("NEXTAUTH_SECRET or AUTH_SECRET is required in non-development environments.");
    }

    return secret;
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
    return users.findOne({ username });
}

export async function updateUserByUsername(
    username: string,
    updates: Partial<Pick<StoredUser, "age" | "gender" | "occupation" | "budName">>
): Promise<boolean> {
    const users = await getUsersCollection();
    const result = await users.updateOne({ username }, { $set: updates });
    return result.matchedCount > 0;
}

export function getAuthOptions(): NextAuthOptions {
    return {
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

                    const user = await findUserByUsername(credentials.username);

                    if (user && bcrypt.compareSync(credentials.password, user.password)) {
                        const sessionUser: SessionUser = {
                            id: user.id,
                            username: user.username,
                            age: user.age,
                            gender: user.gender,
                            occupation: user.occupation,
                            budName: user.budName || "Bud",
                        };
                        return {
                            ...sessionUser,
                            name: user.username,
                        };
                    }
                    return null;
                }
            })
        ],
        callbacks: {
            async jwt({ token, user }) {
                if (user) {
                    const sessionUser = user as typeof user & SessionUser;
                    token.id = user.id;
                    token.username = sessionUser.username;
                    token.age = sessionUser.age;
                    token.gender = sessionUser.gender;
                    token.occupation = sessionUser.occupation;
                    token.budName = sessionUser.budName || "Bud";
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
                        budName: token.budName,
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
}

// Also export helper for user registration
export function registerUser(userData: RegisterUserInput) {
    const username = typeof userData.username === "string" ? userData.username.trim() : "";
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

    const hashedPassword = bcrypt.hashSync(userData.password, 10);
    const newUser: StoredUser = {
        ...userData,
        id: Date.now().toString(),
        password: hashedPassword,
        budName: userData.budName || "Bud",
    };

    const users = await getUsersCollection();
    await users.insertOne(newUser);

    return newUser;
}
