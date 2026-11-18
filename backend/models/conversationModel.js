import mongoose from "mongoose";

const conversationSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
    index: true,
  },
  title: {
    type: String,
    default: "New Chat",
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

// sidebar query: newest conversations of one user
conversationSchema.index({ userId: 1, updatedAt: -1 });

const conversationModel =
  mongoose.models.conversation ||
  mongoose.model("conversation", conversationSchema);

export default conversationModel;
