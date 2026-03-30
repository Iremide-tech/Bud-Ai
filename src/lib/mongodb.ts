import { MongoClient, Db } from "mongodb";

const dbName = process.env.MONGODB_DB || "ai-bud";

declare global {
    var _mongoClientPromise: Promise<MongoClient> | undefined;
}

export async function getDatabase(): Promise<Db> {
    const uri = process.env.MONGODB_URI;

    if (!uri) {
        throw new Error("MONGODB_URI is required.");
    }

    if (!global._mongoClientPromise) {
        const client = new MongoClient(uri);
        global._mongoClientPromise = client.connect();
    }

    const clientPromise = global._mongoClientPromise;
    const connectedClient = await clientPromise;
    return connectedClient.db(dbName);
}
