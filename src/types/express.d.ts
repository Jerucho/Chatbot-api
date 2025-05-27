import { IAgent } from "../interfaces/Agents";

declare global {
  namespace Express {
    interface Request {
      user?: IAgent;
    }
  }
}
