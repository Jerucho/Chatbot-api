import { Request, Response } from "express";
import { MessagesService } from "../services/messages.service";
import axios from "axios";
import { envConfig } from "../config/envConfig";
import { AgentsService } from "../services/agents.service";
const { VERIFY_TOKEN, PHONE_NUMBER_ID, TOKEN } = envConfig;

// Set para almacenar IDs de mensajes procesados
const processedMessageIds = new Set<string>();

// Funciones auxiliares para el manejo de WhatsApp
export const sendWhatsAppMessage = async (to: string, message: string) => {
  if (!message?.trim()) {
    console.log("⚠️ Intento de enviar mensaje vacío");
    return;
  }

  await axios.post(
    `https://graph.facebook.com/v22.0/${PHONE_NUMBER_ID}/messages`,
    {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: to,
      type: "text",
      text: { body: message },
    },
    {
      headers: {
        Authorization: `Bearer ${TOKEN}`,
        "Content-Type": "application/json",
      },
    }
  );
};

const sendInteractiveMenu = async (to: string) => {
  await axios.post(
    `https://graph.facebook.com/v22.0/${PHONE_NUMBER_ID}/messages`,
    {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: to,
      type: "interactive",
      interactive: {
        type: "list",
        header: { type: "text", text: "Selección de Servicio" },
        body: {
          text: "Por favor, selecciona el área con la que deseas contactar:",
        },
        footer: { text: "Selecciona una opción para continuar" },
        action: {
          button: "Ver Servicios",
          sections: [
            {
              title: "Áreas de Servicio",
              rows: [
                {
                  id: "retail",
                  title: "Retail",
                  description: "Servicios relacionados con ventas y comercio",
                },
                {
                  id: "telecomunicaciones",
                  title: "Telecomunicaciones",
                  description: "Servicios de telecomunicaciones y conectividad",
                },
                {
                  id: "financiero",
                  title: "Financiero",
                  description: "Servicios financieros y bancarios",
                },
              ],
            },
          ],
        },
      },
    },
    {
      headers: {
        Authorization: `Bearer ${TOKEN}`,
        "Content-Type": "application/json",
      },
    }
  );
};

// Controladores principales
export const getWebhook = async (req: Request, res: Response) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode && token === VERIFY_TOKEN) {
    console.log("✅ Webhook verificado");
    res.status(200).send(challenge);
    return;
  }
  res.sendStatus(403);
};

export const postWebhookMessage = async (req: Request, res: Response) => {
  try {
    const { body } = req;
    if (!body.object) {
      console.log("❌ Objeto no válido en la solicitud");
      res.sendStatus(404);
      return;
    }

    const change = body.entry?.[0]?.changes?.[0];

    // Verificar si es una actualización de estado
    if (change?.value?.statuses) {
      res.sendStatus(200);
      return;
    }

    const message = change?.value?.messages?.[0];

    const contact = change?.value?.contacts?.[0];
    const userName = contact?.profile?.name || "Desconocido";
    console.log(`👤 Nombre del usuario: ${userName}`);

    if (!message?.from) {
      console.log("❌ Mensaje no válido o sin remitente");
      res.sendStatus(200);
      return;
    }

    // Verificar si el mensaje ya fue procesado
    const messageId = message.id;
    console.log("🔑 ID del mensaje:", messageId);

    // Agregar el ID del mensaje al conjunto de procesados
    if (messageId) {
      processedMessageIds.add(messageId);
      console.log("✅ ID agregado al conjunto de procesados");
    }

    // Limpiar IDs antiguos (mantener solo los últimos 1000)
    if (processedMessageIds.size > 1000) {
      const oldestIds = Array.from(processedMessageIds).slice(
        0,
        processedMessageIds.size - 1000
      );
      oldestIds.forEach((id) => processedMessageIds.delete(id));
    }

    const from = message.from;
    const msg = message.text?.body || message.interactive?.list_reply?.id || "";

    // Validar que el mensaje no esté vacío
    if (!msg.trim()) {
      console.log("⚠️ Mensaje vacío recibido");
      res.sendStatus(200);
      return;
    }

    console.log(`📩 Mensaje recibido de ${from}: ${msg}`);

    // Guardar mensaje del usuario
    await MessagesService.postMessage(from, "user", msg, userName);

    // Obtener y enviar respuesta del AI
    const responseOfAI = await MessagesService.responseOfAI(
      from,
      msg,
      userName
    );

    // Validar respuesta del AI
    if (!responseOfAI?.trim()) {
      console.log("⚠️ Respuesta vacía del AI");
      res.sendStatus(200);
      return;
    }

    await MessagesService.postMessage(from, "assistant", responseOfAI);
    await sendWhatsAppMessage(from, responseOfAI);

    console.log("✅ Respuesta enviada correctamente");
    res.sendStatus(200);
    return;
  } catch (error: any) {
    console.error("❌ Error al procesar el mensaje:", {
      message: error.message,
      response: error.response?.data,
    });
    res.sendStatus(200);
  }
};

export const getPendingMessagesOfAgent = async (
  req: Request,
  res: Response
) => {
  try {
    // Se envia el userId del agente de la base de datos
    const { userId } = req.params;
    const pendingMessages = await AgentsService.getPendingMessagesOfAgent(
      userId
    );

    console.log("🔍 Mensajes pendientes del agente:", pendingMessages);

    if (!pendingMessages) {
      res.status(404).json({ message: "No hay mensajes pendientes" });
      return;
    }

    res.json({ pendingMessages });
  } catch (error) {
    res.status(500).json({ message: "Error al obtener mensajes pendientes" });
  }
};
