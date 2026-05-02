import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pkg from "pg";
const { Pool } = pkg;

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const connectDB = async () => {
    try {
        await prisma.$connect();
        console.log(`✅ PostgreSQL connected !!`);
    } catch (error) {
        console.error("❌ database initial connection failed", error);
        process.exit(1);
    }
};

export { prisma };
export default connectDB;