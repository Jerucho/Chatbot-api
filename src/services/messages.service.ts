import OpenAI from "openai";
import { Chat } from "../interfaces/ChatMessage";
import mongoose from "mongoose";
import { envConfig } from "../config/envConfig";
const { MONGO_URI, OPENAI_API_KEY } = envConfig;

export class MessagesService {
  private static readonly openai = new OpenAI({
    baseURL: "https://openrouter.ai/api/v1",
    apiKey: OPENAI_API_KEY,
  });

  static async connectToDatabase(): Promise<void> {
    if (!MONGO_URI) {
      throw new Error("MONGO_URI no está definida en las variables de entorno");
    }
    try {
      await mongoose.connect(MONGO_URI);
      console.log("MongoDB conectado exitosamente");
    } catch (error) {
      console.error("Error conectando a MongoDB:", error);
      throw error;
    }
  }

  static async postMessage(
    userId: string,
    role: "user" | "assistant",
    content: string
  ) {
    const chat = await Chat.findOne({ userId });

    const newMessage = {
      role,
      content,
      timestamp: new Date(),
    };

    if (chat) {
      chat.messages.push(newMessage);
      await chat.save();
    } else {
      await Chat.create({
        userId,
        messages: [newMessage],
      });
    }
  }

  static async getChatHistory(userId: string) {
    const chat = await Chat.findOne({ userId });
    return chat?.messages || [];
  }

  static async responseOfAI(userId: string, prompt: string) {
    const history = await this.getChatHistory(userId);
    const messages = history.map((m: any) => ({
      role: m.role,
      content: m.content,
    }));

    messages.push({
      role: "user",
      content: prompt,
    });

    const completion = await this.openai.chat.completions.create({
      model: "deepseek/deepseek-chat:free",
      messages: [
        {
          role: "system",
          content:
            `Sos un chatbot de WhatsApp llamado CobranzaBot, que representa a la empresa ficticia CobranzaExpress S.A., especializada en servicios de cobranza para empresas de distintos sectores (retail, telecomunicaciones, servicios financieros).

        Tu función principal es atender consultas de clientes empresariales y contactos interesados, brindando información clara, profesional y amigable sobre los servicios que ofrece CobranzaExpress.

        Si detectás que el usuario tiene intención de hablar con un área específica, respondé confirmando esa intención mencionando explícitamente el nombre del área y preguntando si quiere hablar con un asesor de esa área.

Ejemplo: "¿Querés que te pase con un asesor del área de telecomunicaciones?"

Respondé siempre de manera concisa, clara y amigable, incluyendo el nombre del área en la confirmación para que el sistema pueda identificarlo y tomar acciones posteriores.

      `.trim(),
        },
        ...messages,
      ],
      temperature: 0.7,
      max_tokens: 150,
    });

    return completion.choices[0].message.content;
  }
}
