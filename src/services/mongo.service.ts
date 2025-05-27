import mongoose from "mongoose";
import { envConfig } from "../config/envConfig";
const { MONGO_URI } = envConfig;
export class MongoService {
  static async connectToDatabase(): Promise<void> {
    if (!MONGO_URI) {
      throw new Error("MONGO_URI no está definida en las variables de entorno");
    }
    try {
      await mongoose.connect(MONGO_URI);
      console.log("MongoDB conectado exitosamente");
    } catch (error) {
      console.error("Error conectando a MongoDB:", error);
      throw error;
    }
  }
}
