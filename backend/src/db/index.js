import mongoose from "mongoose";

const connectDB = async () => {
    try {
        const connectionInstance = await mongoose.connect(process.env.MONGO_URI);

        console.log(`✅ MongoDB connected !! DB Host: ${connectionInstance.connection.host}`);
    } catch (error) {
        console.error("❌ database initial connection failed", error);
        process.exit(1);
    }
};

export default connectDB;