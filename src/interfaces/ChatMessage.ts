import mongoose from "mongoose";
import { Area } from "./Area";
import { Agent } from "./Agents";

const messageSchema = new mongoose.Schema({
  role: {
    type: String,
    enum: ["user", "assistant", "tool"],
    required: true,
  },
  content: { type: String, required: false }, // Content can be null for assistant messages with tool_calls
  timestamp: { type: Date, default: Date.now },
  // Campos específicos para mensajes de rol 'tool'
  tool_call_id: {
    type: String,
    required: false, // Solo para role: "tool"
  },
  // Campos específicos para mensajes de rol 'assistant' que llaman a herramientas
  tool_calls: [
    // Array de tool_call objects
    {
      id: { type: String, required: true }, // El ID de la llamada a la herramienta generada por el modelo
      type: { type: String, enum: ["function"], required: true },
      function: {
        name: { type: String, required: true },
        arguments: { type: String, required: true }, // Los argumentos como string JSON
      },
    },
  ],
});

const chatSchema = new mongoose.Schema({
  userId: { type: String, required: true, unique: true },
  messages: [messageSchema],
  createdAt: { type: Date, default: Date.now },
  lastContactAt: { type: Date, default: Date.now },
  needsHumanResponse: { type: Boolean, default: false },
  assignedArea: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Area",
    required: false,
  },
  assignedAdvisor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Agent",
    required: false,
  },
});

export const Chat = mongoose.model("Chat", chatSchema);
