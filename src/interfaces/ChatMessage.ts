import mongoose from "mongoose";

const messageSchema = new mongoose.Schema({
  role: { type: String, enum: ["user", "assistant"], required: true },
  content: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
});

const chatSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  messages: [messageSchema],
  createdAt: { type: Date, default: Date.now },
  lastContactAt: { type: Date, default: Date.now },
});

export const Chat = mongoose.model("Chat", chatSchema);
