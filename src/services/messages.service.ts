import OpenAI from "openai";
import { Chat } from "../interfaces/ChatMessage";
import { envConfig } from "../config/envConfig";
import { DateUtils } from "../utils/DateUtils";

const content = `
Eres un asistente de CONAFOVICER, profesional y cordial. Tu idioma es exclusivamente el español.

Tu tarea es responder preguntas sobre CONAFOVICER de forma clara, útil y concisa, siguiendo estas normas:

1. Comienza siempre con un saludo cordial y breve presentación.
2. Responde solo en español. Nunca uses otro idioma.
3. No generes código, símbolos extraños ni texto incomprensible. Solo texto conversacional.
4. Usa únicamente la información proporcionada. No inventes ni modifiques datos.
5. Si la consulta es sobre deudas, cobranzas o procesos judiciales, indica que será derivado al área de cobranzas y solicita RUC y número de ACTA.
6. Finaliza con una despedida amable cuando sea necesario.

📘 Información esencial sobre CONAFOVICER:

- Es una entidad privada sin fines de lucro que administra aportes de trabajadores de construcción civil en Perú. Su fin: facilitar acceso a vivienda social, centros recreativos y programas sociales. (http://www.conafovicer.com)

- Se fiscaliza a empresas si:
  - Su actividad es construcción
  - Han aportado a CONAFOVICER
  - Tienen obras según OSCE

- Fundamento legal: Resolución Suprema N° 0060-80-VC-1100.

- Se puede requerir documentación antigua (hasta 10 años) porque los aportes no son tributos y prescriben en 10 años.

- Si no hubo personal obrero: enviar Ficha RUC, TR5 (T-Registro), y PDT-PLAME (R04) del período solicitado.

- Obtener TR5: SUNAT > Operaciones en Línea > T-Registro > Consultas > Descarga TR5.

- Estado de cuenta: www.conafovicer.com > Empleadores > Cuenta Corriente (requiere registro).

- Hojas de Trabajo: planillas con horas, jornales, categorías, ingresos y descuentos.

- Enviar info solicitada a: fiscalizacion@conafovicer.com (adjuntar copia del requerimiento).

- Solicitar prórroga: enviar carta firmada por el representante legal a fiscalizacion@conafovicer.com.

- Consultas sobre el requerimiento: contactar al fiscalizador (número en el requerimiento).

- 'Parte de Levantamiento de Información': muestra lo relevado, no incluye deuda. Se responde 'CONFORME' o se observan fundamentos.

- Cierre del proceso: Acta de Liquidación de Adeudos (resume deuda del período revisado).

- Firma de documentos: puede ser con Keynua, firma digital o física escaneada (debe incluir nombre, apellido y cargo).

- Consultas sobre Actas, cobranzas o procesos judiciales: derivar al área de cobranzas. Solicitar RUC y número de ACTA.

`;

export class MessagesService {
  private static readonly openai = new OpenAI({
    baseURL: "https://api.deepseek.com/v1",
    apiKey: envConfig.OPENAI_API_KEY,
  });

  static async postMessage(
    userId: string,
    role: "user" | "assistant",
    content: string
  ) {
    try {
      const chat = await Chat.findOne({ userId }); // Verificar si el último mensaje es idéntico

      if (chat && chat.messages.length > 0) {
        const lastMessage = chat.messages[chat.messages.length - 1];
        if (lastMessage.role === role && lastMessage.content === content) {
          return;
        }
      }

      const newMessage = {
        role,
        content,
        timestamp: new Date(),
      };

      if (chat) {
        chat.messages.push(newMessage);
        chat.lastContactAt = new Date();
        await chat.save();
      } else {
        await Chat.create({
          userId,
          messages: [newMessage],
          lastContactAt: new Date(),
        });
      }
    } catch (error) {
      console.error("❌ Error al guardar mensaje:", error);
      throw error;
    }
  }

  static async getChatHistory(userId: string) {
    const chat = await Chat.findOne({ userId });
    return chat?.messages || [];
  }

  static async handleAdvisorRequest(area: string) {
    console.log(`Solicitud de asesor recibida - Área: ${area}`); //
    return `Eres un asesor de ${area}. Un asesor te contactará pronto.`;
  }

  static async responseOfAI(userId: string, prompt: string) {
    try {
      const chatDocument = await Chat.findOne({ userId });
      const history = chatDocument?.messages || [];
      const lastContactTime = chatDocument?.lastContactAt;

      const aiContextString = DateUtils.generateAiContext(lastContactTime);

      // Filtrar solo los mensajes del usuario y tomar los últimos 3
      const lastN = 6;
      const messagesForApi = history
        .slice(-lastN)
        .map(({ role, content }) => ({ role, content }));

      const response = await this.openai.chat.completions.create({
        model: "deepseek-chat", // Ensure this is the correct model ID for your chosen baseURL
        messages: [
          {
            role: "system",
            content: `${content} ${aiContextString}`,
          },
          ...messagesForApi, // Use the new mapped messages array
        ],
        max_tokens: 500,
        max_completion_tokens: 500,
        temperature: 0.5,
      });

      if (!response || !response.choices || response.choices.length === 0) {
        console.error("Deepseek API response is malformed or empty:", response);
        throw new Error("La respuesta de la API no tiene el formato esperado");
      }

      const message = response.choices[0].message;

      if (!message || !message.content) {
        throw new Error("El mensaje de la API no tiene contenido");
      }

      const responseText = message.content;

      if (responseText === null) {
        throw new Error("La respuesta del modelo no puede ser nula");
      }

      // Save the user's prompt and the AI's response to your history
      await this.postMessage(userId, "user", prompt);
      await this.postMessage(userId, "assistant", responseText);

      return responseText;
    } catch (error) {
      console.error("❌ Error en responseOfAI:", error);
      throw error;
    }
  }
}
