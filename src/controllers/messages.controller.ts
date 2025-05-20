import { Request, Response } from "express";
import { MessagesService } from "../services/messages.service";
import axios from "axios";
import { envConfig } from "../config/envConfig";
import { AgentsService } from "../services/agents.service";
const { VERIFY_TOKEN, PHONE_NUMBER_ID, TOKEN } = envConfig;

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
      return res.sendStatus(404);
    }

    const message = body.entry?.[0]?.changes?.[0]?.value?.messages?.[0];
    if (!message?.from) {
      console.log("❌ Mensaje no válido o sin remitente");
      return res.sendStatus(200);
    }

    const from = message.from;
    const msg = message.text?.body || message.interactive?.list_reply?.id || "";

    // Validar que el mensaje no esté vacío
    if (!msg.trim()) {
      console.log("⚠️ Mensaje vacío recibido");
      return res.sendStatus(200);
    }

    console.log(`📩 Mensaje recibido de ${from}: ${msg}`);

    // Guardar mensaje del usuario
    await MessagesService.postMessage(from, "user", msg);

    // Manejar respuesta de lista interactiva
    if (message.interactive?.list_reply) {
      const selectedOption = message.interactive.list_reply.id;
      const confirmationMessage = `Has seleccionado el área de ${selectedOption}. Un asesor se pondrá en contacto contigo pronto.`;

      await AgentsService.sendNotificationToAvailableAgents(selectedOption);
      await sendWhatsAppMessage(from, confirmationMessage);
      await MessagesService.postMessage(from, "assistant", confirmationMessage);
      return res.sendStatus(200);
    }

    // Manejar solicitud de contacto o menú
    if (
      msg.toLowerCase().includes("contactar") ||
      msg.toLowerCase().includes("área") ||
      msg.toLowerCase().includes("area")
    ) {
      await sendInteractiveMenu(from);
      return res.sendStatus(200);
    }

    // Obtener y enviar respuesta del AI
    const responseOfAI = await MessagesService.responseOfAI(from, msg);

    // Validar respuesta del AI
    if (!responseOfAI?.trim()) {
      console.log("⚠️ Respuesta vacía del AI");
      return res.sendStatus(200);
    }

    await MessagesService.postMessage(from, "assistant", responseOfAI);
    await sendWhatsAppMessage(from, responseOfAI);

    console.log("✅ Respuesta enviada correctamente");
    res.sendStatus(200);
  } catch (error: any) {
    console.error("❌ Error al procesar el mensaje:", {
      message: error.message,
      response: error.response?.data,
    });
    res.sendStatus(200);
  }
};
