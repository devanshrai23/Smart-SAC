import mongoose, { Schema } from "mongoose";

const pendingUserSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true,
        trim: true,
    },
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true,
    },
    phone_number: {
        type: String, 
        required: true,
    },
    fullname: {
        type: String,
        required: true,
        trim: true,
    },
    roll_no: {
        type: String,
        required: true,
    },
    password: {
        type: String,
        required: true
    },
    emailVerificationToken: {
        type: String,
        required: true
    },
    emailVerificationExpires: {
        type: Date,
        required: true
    }
}, { timestamps: true });

export const PendingUser = mongoose.model("PendingUser", pendingUserSchema);
