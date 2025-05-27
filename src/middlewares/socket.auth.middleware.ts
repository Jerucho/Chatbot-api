import { Socket } from "socket.io";
import jwt from "jsonwebtoken";
import { envConfig } from "../config/envConfig";
import { Agent } from "../interfaces/Agents";

interface CustomJwtPayload extends jwt.JwtPayload {
  id: string;
  area: string;
}

export const socketAuthMiddleware = async (
  socket: Socket,
  next: (err?: Error) => void
) => {
  try {
    // Obtener token de las cookies
    const cookies = socket.handshake.headers.cookie;

    if (!cookies) {
      console.log("❌ No hay cookies en la conexión socket");
      return next(new Error("No authentication token"));
    }

    // Parsear cookies manualmente
    const tokenMatch = cookies.match(/token=([^;]+)/);
    const token = tokenMatch ? tokenMatch[1] : null;

    if (!token) {
      console.log("❌ No se encontró token en cookies del socket");
      return next(new Error("No token found"));
    }

    // console.log(
    //   "🔑 Token encontrado en socket:",
    //   token.substring(0, 20) + "..."
    // );

    // Verificar el token
    const decoded = jwt.verify(
      token,
      envConfig.JWT_SECRET || ""
    ) as CustomJwtPayload;
    // console.log("✅ Token decodificado en socket:", {
    //   id: decoded.id,
    //   area: decoded.area,
    // });

    // Buscar el usuario en la base de datos
    const user = await Agent.findById(decoded.id).select(
      "userId agentName area"
    );

    if (!user) {
      console.log("❌ Usuario no encontrado en socket middleware");
      return next(new Error("User not found"));
    }

    // console.log("✅ Usuario autenticado en socket:", {
    //   id: user._id,
    //   userId: user.userId,
    //   agentName: user.agentName,
    // });

    // Guardar la información del usuario en el socket
    socket.data.user = user;

    next();
  } catch (error) {
    console.error("❌ Error en socket auth middleware:", error);
    next(new Error("Authentication failed"));
  }
};
