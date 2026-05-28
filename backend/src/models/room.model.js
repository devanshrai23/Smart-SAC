import mongoose, { Schema } from "mongoose";

const roomSchema = new mongoose.Schema({
    name:{
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true,
    },
    status:{
        type: String,
        required: true,
        enum: ["available", "in-use" , "broken"],
        default :"available",
    },
    user:{
        type:Schema.Types.ObjectId,
        ref:"User",
    },
    roll_no:{
        type: String,
    },
    duration:{
        type: String
    },
    guestName: {
        type: String
    },
    guestPhone: {
        type: String
    }
},{timestamps:true}
)

export const Room = mongoose.model("Room",roomSchema);