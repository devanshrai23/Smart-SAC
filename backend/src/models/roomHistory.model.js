import mongoose, { Schema } from "mongoose";

const roomHistorySchema = new mongoose.Schema({
  room: { 
    type: Schema.Types.ObjectId, 
    ref: "Room", 
    required: true 
  },
  status: { 
    type: String, 
    required: true 
  },
  user: {
    type: Schema.Types.ObjectId, 
    ref: "User", 
    default: null 
  },
  roll_no: { 
    type: String 
  },
  duration: { 
    type: String,
    default: null
  },
  guestName: {
    type: String,
    default: null
  },
  guestPhone: {
    type: String,
    default: null
  },
  changedAt: { 
    type: Date, 
    default: Date.now 
  },
  expireAt: {
    type: Date,
    default: function () {
      const now = new Date();
      now.setMonth(now.getMonth() + 3); // 3 months from creation
      return now;
    },
  },
}, { timestamps: true });

// TTL index — automatically deletes document when expireAt is reached
roomHistorySchema.index({ expireAt: 1 }, { expireAfterSeconds: 0 });

export const RoomHistory = mongoose.model("RoomHistory", roomHistorySchema);
