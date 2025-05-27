import { OpenAI } from "openai";
import { Agent } from "../interfaces/Agents";
import { Area } from "../interfaces/Area";
import { sendWhatsAppMessage } from "../controllers/messages.controller";

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

  static async sendNotificationToAvailableAgents(areaName: string) {
    const agents = await this.getAvailableAgents(areaName);
    if (agents.length === 0) {
      throw new Error("No hay agentes disponibles");
    }
    const agent = agents[0];
    const message = `Hola, ${agent.agentName}, tienes una nueva solicitud de contacto.`;
    console.log(message);
    await sendWhatsAppMessage(agent.phoneNumber, message);
  }
}
