import express from "express";
import bodyParser from "body-parser";
import messagesRoutes from "./routes/messages.routes";
import { envConfig } from "./config/envConfig";
import { MongoService } from "./services/mongo.service";
const app = express();
const PORT = envConfig.PORT || 3000;

app.use(bodyParser.json());

MongoService.connectToDatabase();
app.use(messagesRoutes);

app.listen(PORT, () => {
  console.log(`🚀 Servidor escuchando en http://localhost:${PORT}`);
});
