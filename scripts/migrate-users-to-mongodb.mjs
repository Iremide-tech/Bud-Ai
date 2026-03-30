import fs from "fs/promises";
import path from "path";
import { MongoClient } from "mongodb";
import nextEnv from "@next/env";

const { loadEnvConfig } = nextEnv;
loadEnvConfig(process.cwd());

const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB || "ai-bud";
const usersFile = path.join(process.cwd(), "src", "lib", "users.json");

if (!uri) {
    throw new Error("MONGODB_URI is required to run this migration.");
}

const raw = await fs.readFile(usersFile, "utf-8");
const users = JSON.parse(raw);

if (!Array.isArray(users)) {
    throw new Error("users.json must contain an array.");
}

const client = new MongoClient(uri);

try {
    await client.connect();
    const collection = client.db(dbName).collection("users");
    await collection.createIndex({ username: 1 }, { unique: true });

    let inserted = 0;
    let skipped = 0;

    for (const user of users) {
        if (!user?.username) {
            skipped += 1;
            continue;
        }

        const existing = await collection.findOne({ username: user.username });
        if (existing) {
            skipped += 1;
            continue;
        }

        await collection.insertOne(user);
        inserted += 1;
    }

    console.log(`Migration complete. Inserted ${inserted}, skipped ${skipped}.`);
} finally {
    await client.close();
}
