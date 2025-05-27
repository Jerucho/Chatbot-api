import express from "express";
import bodyParser from "body-parser";
import messagesRoutes from "./routes/messages.routes";
import { envConfig } from "./config/envConfig";
import { MongoService } from "./services/mongo.service";
import { Server } from "socket.io";
import { createServer } from "http";
import cors from "cors"; // <--- ¡Importa el paquete CORS!
import { MessagesService } from "./services/messages.service";
const app = express();
const PORT = envConfig.PORT || 3000;

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: envConfig.FRONTEND_URL, // Asegúrate que esto apunte a tu Angular (ej. 'http://localhost:4200')
    methods: ["GET", "POST"],
  },
});

io.on("connection", (socket) => {
  const userId = socket.handshake.query.userId as string;

  if (userId) {
    socket.join(userId);
    console.log(`✅ Usuario conectado a sala ${userId}`);
  } else {
    console.warn("⚠️ userId no recibido en la conexión.");
  }
});

// --- ¡Añade el middleware CORS para las solicitudes HTTP! ---
app.use(
  cors({
    origin: envConfig.FRONTEND_URL, // También debe coincidir con la URL de tu Angular
    methods: ["GET", "POST", "PUT", "DELETE"], // Permite los métodos HTTP que uses
    credentials: true, // Si necesitas enviar cookies/headers de autenticación
  })
);
MessagesService.ioInstance = io;

app.use(bodyParser.json());

MongoService.connectToDatabase();
app.use(messagesRoutes);

httpServer.listen(PORT, () => {
  console.log(`🚀 Servidor HTTP escuchando en http://localhost:${PORT}`);
});
