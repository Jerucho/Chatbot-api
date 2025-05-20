import express from "express";
import bodyParser from "body-parser";
import messagesRoutes from "./routes/messages.routes";
import { MessagesService } from "./services/messages.service";
import { envConfig } from "./config/envConfig";

const app = express();
const PORT = envConfig.PORT || 3000;

app.use(bodyParser.json());

MessagesService.connectToDatabase();
app.use(messagesRoutes);

app.listen(PORT, () => {
  console.log(`🚀 Servidor escuchando en http://localhost:${PORT}`);
});
