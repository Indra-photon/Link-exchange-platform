import mongoose from 'mongoose'
import { DB_NAME } from '../../src/utils/constants.js'
import dotenv from "dotenv"

dotenv.config()

const connectDB = async () => {
    try {
        const mongoURL = process.env.MONGODB_URL
        
        if (!mongoURL) {
            console.error("MONGODB_URL is not defined in environment variables");
            process.exit(1);
        }
        
        console.log("Connecting to MongoDB...");
        const connectionInstance = await mongoose.connect(`${mongoURL}/${DB_NAME}`)
        console.log(`MongoDB connected! DB Host: ${connectionInstance.connection.host}`);
        
    } catch (error) {
        console.error("MongoDB connection error:", error);
        process.exit(1);
    }
}

export default connectDB