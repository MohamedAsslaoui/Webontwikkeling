import { MongoClient, Collection } from "mongodb";
import dotenv from "dotenv";
import { Movie, Studio, User } from "./interfaces";
import bcrypt from "bcrypt";

dotenv.config();

const uri: string = process.env.MONGODB_URI || "";

const client: MongoClient = new MongoClient(uri);

export const moviesCollection: Collection<Movie> =
    client.db("webontwikkeling").collection<Movie>("movies");

export const studiosCollection: Collection<Studio> =
    client.db("webontwikkeling").collection<Studio>("studios");

export const usersCollection: Collection<User> =
    client.db("webontwikkeling").collection<User>("users");

export async function connectDatabase(): Promise<void> {
    await client.connect();

    console.log("Connected to MongoDB");
}

export async function createDefaultUsers(): Promise<void> {
    const admin: User | null = await usersCollection.findOne({ username: "admin" });
    const user: User | null = await usersCollection.findOne({ username: "user" });

    if (!admin) {
        const hashedPassword: string = await bcrypt.hash("admin123", 10);

        await usersCollection.insertOne({
            username: "admin",
            password: hashedPassword,
            role: "ADMIN"
        });
    }

    if (!user) {
        const hashedPassword: string = await bcrypt.hash("user123", 10);

        await usersCollection.insertOne({
            username: "user",
            password: hashedPassword,
            role: "USER"
        });
    }
}