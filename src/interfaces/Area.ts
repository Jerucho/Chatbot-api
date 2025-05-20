import mongoose from "mongoose";

const areaSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String },
});

export const Area = mongoose.model("Area", areaSchema);
