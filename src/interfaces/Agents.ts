import mongoose from "mongoose";

const agentSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  available: { type: Boolean, default: true },
  agentName: { type: String, required: true },
  agentDescription: { type: String, required: true },
  area: { type: mongoose.Schema.Types.ObjectId, ref: "Area", required: true },
  phoneNumber: { type: String, required: true, minlength: 11, maxlength: 11 },
  createdAt: { type: Date, default: Date.now },
});

export const Agent = mongoose.model("Agent", agentSchema);
