import { Request, Response } from "express";
import { AuthService } from "../services/auth.service";
import jwt from "jsonwebtoken";
import { envConfig } from "../config/envConfig";
import { Agent } from "../interfaces/Agents";
import { Area } from "../interfaces/Area";

export const login = async (req: Request, res: Response) => {
  const { email, password } = req.body;

  try {
    const agent = await AuthService.login(email, password);
    if (!agent) {
      res.status(401).json({ message: "Invalid credentials" });
      return;
    }

    const token = jwt.sign(
      { id: agent._id, area: agent.area },
      envConfig.JWT_SECRET || ""
    );

    // Configuración de cookie ajustada para desarrollo local
    res.cookie("token", token, {
      httpOnly: true,
      secure: envConfig.NODE_ENV === "production", // false en desarrollo
      maxAge: 3600000 * 8, // 8 horas
      sameSite: envConfig.NODE_ENV === "production" ? "none" : "lax", // lax para desarrollo local
      path: "/", // Asegurar que la cookie sea válida para toda la aplicación
    });

    console.log("🍪 Cookie establecida para usuario:", agent.agentName);

    res.status(200).json({ message: "Logged in successfully" });
  } catch (error) {
    console.error("❌ Error en login:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

interface CustomJwtPayload extends jwt.JwtPayload {
  id: string;
  area: string;
}

export const me = async (req: Request, res: Response) => {
  try {
    console.log("🔍 Verificando token en /auth/me");
    console.log("🍪 Cookies disponibles:", req.cookies);

    const token = req.cookies.token;

    if (!token) {
      console.log("❌ No se encontró token en cookies");
      res.status(401).json({ message: "Unauthorized: No token found" });
      return;
    }

    console.log("🔑 Token encontrado:", token.substring(0, 20) + "...");

    const decoded = jwt.verify(
      token,
      envConfig.JWT_SECRET || ""
    ) as CustomJwtPayload;

    console.log("✅ Token decodificado:", {
      id: decoded.id,
      area: decoded.area,
    });

    const agent = await Agent.findById(decoded.id).select("userId agentName");

    if (!agent) {
      console.log("❌ Agente no encontrado en BD");
      res.status(404).json({ message: "Agent not found" });
      return;
    }

    console.log("✅ Agente encontrado:", {
      userId: agent.userId,
      agentName: agent.agentName,
    });

    console.log("🔍 Área del agente:", agent.area);

    const area = await Area.findById(agent.area);

    res.status(200).json({
      id_user: agent.userId,
      agentName: agent.agentName,
      idUserDB: agent._id,
      area: area?.name || "Sin área asignada",
    });
  } catch (error) {
    console.error("❌ Error in /auth/me:", error);
    res.status(401).json({ message: "Invalid or expired token" });
    return;
  }
};
