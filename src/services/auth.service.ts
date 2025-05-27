import { Agent } from "../interfaces/Agents";

export class AuthService {
  static async login(email: string, password: string) {
    const agent = await Agent.findOne({ email });

    if (!agent) {
      throw new Error("Invalid credentials");
    }

    const isMatch = await agent.comparePassword(password);

    if (!isMatch) {
      throw new Error("Invalid credentials");
    }

    return agent;
  }
}
