import { Router } from "express";
import { authMiddleware } from "../middlewares/auth.middleware";
import { MessagesService } from "../services/messages.service";
import { getPendingMessagesOfAgent } from "../controllers/messages.controller";

const router = Router();

// Aplicar middleware de autenticación a todas las rutas en este router
router.use(authMiddleware);

// Ruta para obtener el historial de chat
router.get("/chats/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    const messages = await MessagesService.getChatHistory(userId);
    res.json({ messages });
  } catch (error) {
    res.status(500).json({ message: "Error al obtener el historial de chat" });
  }
});

router.get("/pending/:userId", getPendingMessagesOfAgent);

export default router;
