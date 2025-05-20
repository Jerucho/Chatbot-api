import { OpenAI } from "openai";
import { Agent } from "../interfaces/Agents";
import { sendWhatsAppMessage } from "../controllers/messages.controller";

export class AgentsService {
  static async getAvailableAgents(area: string) {
    const agents = await Agent.find({ available: true, area });
    return agents;
  }

  static async sendNotificationToAvailableAgents(area: string) {
    const agents = await this.getAvailableAgents(area);
    if (agents.length === 0) {
      throw new Error("No agents available");
    }
    const agent = agents[0];
    const message = `Hola, ${agent.agentName}, tienes una nueva solicitud de contacto.`;
    console.log(message);
    await sendWhatsAppMessage(agent.phoneNumber, message);
  }
}
