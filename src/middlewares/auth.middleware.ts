import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { envConfig } from "../config/envConfig";
import { Agent } from "../interfaces/Agents";

interface CustomJwtPayload extends jwt.JwtPayload {
  id: string;
  area: string;
}

export const authMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const token = req.cookies.token;
    if (!token) {
      res.status(401).json({ message: "No autorizado" });
      return;
    }

    const decoded = jwt.verify(
      token,
      envConfig.JWT_SECRET || ""
    ) as CustomJwtPayload;

    const agent = await Agent.findById(decoded.id);
    if (!agent) {
      res.status(401).json({ message: "Usuario no encontrado" });
      return;
    }

    // Agregamos el agente al objeto request para uso posterior
    req.user = agent;
    next();
  } catch (error) {
    res.status(401).json({ message: "Token inválido" });
    return;
  }
};
