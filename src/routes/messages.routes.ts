import { Router } from "express";
import {
  getWebhook,
  postWebhookMessage,
} from "../controllers/messages.controller";

const router = Router();

router.get("/webhook", getWebhook);

router.post("/webhook", postWebhookMessage);

export default router;
