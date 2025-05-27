import OpenAI from "openai";
import { Chat } from "../interfaces/ChatMessage";
import { envConfig } from "../config/envConfig";
import { DateUtils } from "../utils/DateUtils";
import { ChatCompletionTool } from "openai/resources/chat";
import { ChatCompletionMessageParam } from "openai/resources/chat/completions";
import { Server as SocketIOServer } from "socket.io";
import { Agent } from "../interfaces/Agents";

const content = `
Eres un asistente de CONAFOVICER, profesional y cordial. Tu idioma es exclusivamente el español.

Tu tarea es responder preguntas sobre CONAFOVICER de forma clara, útil y concisa, siguiendo estas normas:

1. Si es el primer mensaje de la conversación, debes saludar de manera amigable y ofrecer las siguientes opciones al usuario:
   - Consultar sobre fiscalización
   - Información sobre aportes
   - Estado de cuenta
   - Proceso de documentación
   - Derivar a un asesor especializado
   - Otra consulta

2. Comienza siempre con un saludo cordial y breve presentación.
3. Responde solo en español. Nunca uses otro idioma.
4. No generes código, símbolos extraños ni texto incomprensible. Solo texto conversacional.
5. Usa únicamente la información proporcionada. No inventes ni modifiques datos.
6. Si la consulta es sobre deudas, cobranzas o procesos judiciales, indica que será derivado al área de cobranzas y solicita RUC y número de ACTA.
7. Finaliza con una despedida amable cuando sea necesario.

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

  public static ioInstance: SocketIOServer;

  // Guardar mensajes en DB
  public static async postMessage(
    userId: string,
    role: "user" | "assistant" | "tool",
    content: string,
    tool_call_id?: string,
    name?: string
  ) {
    try {
      const chat = await Chat.findOne({ userId });

      if (chat && chat.messages.length > 0) {
        const lastMessage = chat.messages[chat.messages.length - 1];
        if (
          lastMessage.role === role &&
          lastMessage.content?.trim() === content.trim()
        ) {
          return;
        }
      }

      // Crear nuevo mensaje con tipo adecuado
      const newMessage: Partial<
        ChatCompletionMessageParam & {
          timestamp: Date;
          tool_call_id?: string;
          name?: string;
        }
      > = {
        role,
        content,
        timestamp: new Date(),
      };

      if (role === "tool") {
        newMessage.tool_call_id = tool_call_id;
        if (name) newMessage.name = name;
      }

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

  public static async getChatHistory(userId: string) {
    const chat = await Chat.findOne({ userId });
    return chat?.messages || [];
  }

  // Función para manejar solicitud a área
  public static async handleAdvisorRequest(
    area: string,
    ruc?: string,
    acta_number?: string
  ) {
    console.log(
      `Solicitud de asesor recibida - Área: ${area}, RUC: ${
        ruc || "N/A"
      }, Número de ACTA: ${acta_number || "N/A"}`
    );

    let responseMessage = `Un asesor de ${area} se pondrá en contacto contigo pronto.`;
    if (ruc) responseMessage += ` Hemos registrado tu RUC: ${ruc}.`;
    if (acta_number) responseMessage += ` Y el número de Acta: ${acta_number}.`;
    responseMessage += ` Por favor, espera su comunicación.`;

    return responseMessage;
  }

  // Helper function to build valid message sequence
  private static buildMessagesForApi(
    history: any[]
  ): ChatCompletionMessageParam[] {
    const validMessages: ChatCompletionMessageParam[] = [];

    for (let i = 0; i < history.length; i++) {
      const message = history[i];

      if (message.role === "user") {
        validMessages.push({
          role: "user",
          content: message.content || "",
        });
      } else if (message.role === "assistant") {
        // Check if this assistant message has tool_calls
        if (message.tool_calls && message.tool_calls.length > 0) {
          validMessages.push({
            role: "assistant",
            content: message.content || "",
            tool_calls: message.tool_calls,
          });

          // Look for corresponding tool responses
          for (let j = i + 1; j < history.length; j++) {
            const nextMessage = history[j];
            if (nextMessage.role === "tool" && nextMessage.tool_call_id) {
              // Find if this tool message corresponds to any tool_call in the assistant message
              const matchingToolCall = message.tool_calls.find(
                (tc: any) => tc.id === nextMessage.tool_call_id
              );
              if (matchingToolCall) {
                validMessages.push({
                  role: "tool",
                  content: nextMessage.content || "",
                  tool_call_id: nextMessage.tool_call_id,
                });
              }
            } else if (nextMessage.role !== "tool") {
              // Stop looking when we hit a non-tool message
              break;
            }
          }
        } else {
          // Regular assistant message without tool calls
          validMessages.push({
            role: "assistant",
            content: message.content || "",
          });
        }
      }
      // Skip standalone tool messages that don't have proper pairing
    }

    return validMessages;
  }

  private static async getAvailableAgents() {
    const agents = await Agent.find({ available: true });
    return agents;
  }

  private static async assignAdvisor(userId: string): Promise<string | null> {
    const agents = await this.getAvailableAgents();
    const chat = await Chat.findOne({ userId });

    if (agents.length === 0 || !chat) {
      return null;
    } else {
      const randomAgent = agents[Math.floor(Math.random() * agents.length)];
      chat.assignedAdvisor = randomAgent._id;
      await chat.save();
      return randomAgent.userId;
    }
  }

  // Función principal para enviar mensaje al modelo y manejar respuesta
  public static async responseOfAI(userId: string, prompt: string) {
    try {
      // Guardar el prompt del usuario
      await this.postMessage(userId, "user", prompt);

      const chatDocument = await Chat.findOne({ userId });
      const history = chatDocument?.messages || [];
      const lastContactTime = chatDocument?.lastContactAt;

      // Limitar el historial a los últimos 3 mensajes
      const limitedHistory = history.slice(-3);

      const aiContextString = DateUtils.generateAiContext(lastContactTime);

      // Build valid message sequence for API
      const messagesForApi = this.buildMessagesForApi(limitedHistory);

      // Agregar mensaje system con contexto
      messagesForApi.unshift({
        role: "system",
        content: `${content} ${aiContextString}`,
      });

      // Definir herramienta para llamadas de función
      const tools: ChatCompletionTool[] = [
        {
          type: "function",
          function: {
            name: "handleAdvisorRequest",
            description:
              "Contacta con un área específica de CONAFOVICER (ej. cobranzas) para que un asesor atienda la solicitud del usuario.",
            parameters: {
              type: "object",
              properties: {
                area: {
                  type: "string",
                  description:
                    "El área de negocio con la que el usuario desea hablar, por ejemplo 'cobranzas', 'legal', etc.",
                  enum: [
                    "cobranzas",
                    "legal",
                    "fiscalizacion",
                    "administracion",
                    "general",
                  ],
                },
                ruc: {
                  type: "string",
                  description:
                    "El número de RUC proporcionado por el usuario, si está disponible.",
                },
                acta_number: {
                  type: "string",
                  description:
                    "El número de ACTA proporcionado por el usuario, si está disponible y relevante.",
                },
              },
              required: ["area"],
            },
          },
        },
      ];

      // Primera llamada al modelo
      const response = await this.openai.chat.completions.create({
        model: "deepseek-chat",
        messages: messagesForApi,
        tools,
        tool_choice: "auto",
        max_tokens: 500,
        max_completion_tokens: 500,
        temperature: 0.5,
      });

      if (!response || !response.choices || response.choices.length === 0) {
        throw new Error("La respuesta de la API no tiene el formato esperado");
      }

      const message = response.choices[0].message;

      if (message.tool_calls && message.tool_calls.length > 0) {
        const toolCall = message.tool_calls[0];
        const functionName = toolCall.function.name;

        // Parsear argumentos con try-catch para evitar crash
        let functionArgs: any = {};
        try {
          functionArgs = JSON.parse(toolCall.function.arguments);
        } catch (e) {
          console.error("Error parseando argumentos de función:", e);
          throw new Error("Argumentos de función inválidos");
        }

        if (functionName === "handleAdvisorRequest") {
          const { area, ruc, acta_number } = functionArgs;

          const functionOutput = await this.handleAdvisorRequest(
            area,
            ruc,
            acta_number
          );

          const assignedAdvisor = await this.assignAdvisor(userId);

          // Emitir notificación vía Socket.IO
          if (this.ioInstance) {
            this.ioInstance
              .to(assignedAdvisor || "33333333333")
              .emit("advisorNotification", {
                area,
                message: functionOutput,
                ruc,
                acta_number,
                numeroTel: userId,
                timestamp: new Date().toISOString(),
              });
            console.log(
              `✔️ Notificación 'advisorNotification' emitida a la sala ${userId}`
            );
          } else {
            console.warn("⚠️ Socket.IO instance no está disponible.");
          }

          // Guardar mensajes: respuesta con llamada a función y resultado
          await this.postMessage(
            userId,
            "assistant",
            message.content || "",
            undefined // Don't pass tool_call_id for assistant messages
          );

          // Save the assistant message with tool_calls to DB
          const chat = await Chat.findOne({ userId });
          if (chat && chat.messages.length > 0) {
            const lastMessage = chat.messages[chat.messages.length - 1];
            if (lastMessage.role === "assistant") {
              // Add tool_calls to the last assistant message
              (lastMessage as any).tool_calls = message.tool_calls;
              await chat.save();
            }
          }

          await this.postMessage(userId, "tool", functionOutput, toolCall.id);

          // Preparar mensajes para segunda llamada con resultado de función
          const messagesForSecondCall: ChatCompletionMessageParam[] = [
            {
              role: "system",
              content: `${content} ${aiContextString}`,
            },
            ...messagesForApi.slice(1), // Remove duplicate system message
            {
              role: "assistant",
              content: message.content || "",
              tool_calls: message.tool_calls,
            },
            {
              role: "tool",
              content: functionOutput,
              tool_call_id: toolCall.id,
            },
          ];

          const secondResponse = await this.openai.chat.completions.create({
            model: "deepseek-chat",
            messages: messagesForSecondCall,
            max_tokens: 500,
            max_completion_tokens: 500,
            temperature: 0.5,
          });

          if (
            !secondResponse ||
            !secondResponse.choices ||
            secondResponse.choices.length === 0
          ) {
            throw new Error(
              "La respuesta de la segunda llamada no tiene el formato esperado"
            );
          }

          const finalMessage = secondResponse.choices[0].message;

          // Guardar respuesta final
          await this.postMessage(
            userId,
            "assistant",
            finalMessage.content || ""
          );

          return finalMessage.content || "";
        }
      } else {
        // No hay llamada a función, respuesta directa del AI
        await this.postMessage(userId, "assistant", message.content || "");
        return message.content || "";
      }
    } catch (error) {
      console.error("❌ Error en responseOfAI:", error);
      throw error;
    }
  }
}
