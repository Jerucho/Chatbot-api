import express from "express";
import bodyParser from "body-parser";
import messagesRoutes from "./routes/messages.routes";
import protectedMessagesRoutes from "./routes/protected.messages.routes";
import { envConfig } from "./config/envConfig";
import { MongoService } from "./services/mongo.service";
import { Server } from "socket.io";
import { createServer } from "http";
import cors from "cors";
import { MessagesService } from "./services/messages.service";
import cookieParser from "cookie-parser";
import authRoutes from "./routes/auth.routes";
import { socketAuthMiddleware } from "./middlewares/socket.auth.middleware";
import { Agent } from "./interfaces/Agents";

const app = express();
const PORT = envConfig.PORT || 3000;

const httpServer = createServer(app);

// IMPORTANTE: cookieParser debe ir ANTES de las rutas
app.use(cookieParser());

// Configuración CORS más específica
app.use(
  cors({
    origin: envConfig.FRONTEND_URL || "http://localhost:4200", // URL exacta de Angular
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "Cookie"],
    credentials: true, // Muy importante para cookies
    optionsSuccessStatus: 200, // Para navegadores legacy
  })
);

// Middleware para debugging de cookies
// app.use((req, res, next) => {
//   console.log("🍪 Cookies recibidas:", req.cookies);
//   console.log("📝 Headers:", req.headers);
//   next();
// });

app.use(bodyParser.json());

const io = new Server(httpServer, {
  cors: {
    origin: envConfig.FRONTEND_URL || "http://localhost:4200",
    methods: ["GET", "POST"],
    credentials: true,
  },
});

// Aplicar middleware de autenticación a Socket.IO
io.use(socketAuthMiddleware);

io.on("connection", (socket) => {
  const user = socket.data.user;

  if (user) {
    socket.join(user.userId);
    console.log(`✅ Usuario ${user.agentName} conectado a sala ${user.userId}`);
  } else {
    console.warn("⚠️ Usuario no autenticado intentando conectar.");
    socket.disconnect();
  }
});

MessagesService.ioInstance = io;

MongoService.connectToDatabase();

// Rutas públicas
app.use(messagesRoutes);
app.use("/auth", authRoutes);

// Rutas protegidas
app.use("/api/messages", protectedMessagesRoutes);

httpServer.listen(PORT, () => {
  console.log(`🚀 Servidor HTTP escuchando en http://localhost:${PORT}`);
  console.log(
    `🌐 CORS configurado para: ${
      envConfig.FRONTEND_URL || "http://localhost:4200"
    }`
  );
});
