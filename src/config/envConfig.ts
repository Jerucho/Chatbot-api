import dotenv from "dotenv";

dotenv.config();

export const envConfig = {
  MONGO_URI: process.env.MONGO_URI,
  OPENAI_API_KEY: process.env.OPENAI_API_KEY,
  VERIFY_TOKEN: process.env.VERIFY_TOKEN,
  PHONE_NUMBER_ID: process.env.PHONE_NUMBER_ID,
  TOKEN: process.env.TOKEN,
  PORT: process.env.PORT,
};
