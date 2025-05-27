import mongoose from "mongoose";
import bcrypt from "bcrypt";

export interface IAgent extends Document {
  userId: string;
  available: boolean;
  agentName: string;
  agentDescription: string;
  area: mongoose.Types.ObjectId;
  phoneNumber: string;
  email: string;
  password: string;
  createdAt: Date;
  comparePassword(candidatePassword: string): Promise<boolean>;
}

const agentSchema = new mongoose.Schema<IAgent>({
  userId: { type: String, required: true },
  available: { type: Boolean, default: true },
  agentName: { type: String, required: true },
  agentDescription: { type: String, required: true },
  area: { type: mongoose.Schema.Types.ObjectId, ref: "Area", required: true },
  phoneNumber: { type: String, required: true, minlength: 11, maxlength: 11 },
  email: { type: String, required: true, unique: true, lowercase: true },
  password: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});
agentSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

agentSchema.methods.comparePassword = async function (
  candidatePassword: string
) {
  return await bcrypt.compare(candidatePassword, this.password);
};

export const Agent = mongoose.model("Agent", agentSchema);
