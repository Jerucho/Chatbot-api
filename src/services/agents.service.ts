import { OpenAI } from "openai";
import { Agent } from "../interfaces/Agents";
import { Area } from "../interfaces/Area";
import { sendWhatsAppMessage } from "../controllers/messages.controller";
import { Chat } from "../interfaces/ChatMessage";

export class AgentsService {
  static async getAvailableAgents(areaName: string) {
    // Primero buscamos el área por nombre
    const area = await Area.findOne({ name: areaName });
    if (!area) {
      throw new Error(`No se encontró el área: ${areaName}`);
    }

    // Luego buscamos los agentes usando el ObjectId del área
    const agents = await Agent.find({ available: true, area: area._id });
    return agents;
  }

  static async getPendingMessagesOfAgent(userId: string) {
    const agent = await Agent.findById(userId).populate("area");
    if (!agent) {
      throw new Error("No se encontró el agente");
    }
    const pendingMessages = await Chat.find({
      assignedAdvisor: agent._id,
      needsHumanResponse: true,
    });

    return pendingMessages;
  }
}
