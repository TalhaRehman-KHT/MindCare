import axios from "axios";
import mongoose from "mongoose";
import chatModel from "../models/chatModel.js";
import conversationModel from "../models/conversationModel.js";

// Base URL of the FastAPI chatbot; trailing slashes stripped so "/chat" is never doubled
const CHATBOT_BASE = (process.env.CHATBOT_URL || "http://127.0.0.1:5000").replace(/\/+$/, "");
const CHATBOT_CHAT_URL = `${CHATBOT_BASE}/chat`;

const badId = (res) => res.status(400).json({ success: false, reply: "Invalid conversation id.", message: "Invalid conversation id" });
const notFound = (res) => res.status(404).json({ success: false, reply: "Conversation not found.", message: "Conversation not found" });

// 1. CHAT WITH BOT
export const chatWithBot = async (req, res) => {
  try {
    const { message, conversationId } = req.body; // conversationId might be null (New Chat)
    const userId = req.userId;

    if (!message?.trim())
      return res.status(400).json({ reply: "Message cannot be empty." });

    if (conversationId && !mongoose.isValidObjectId(conversationId)) return badId(res);
    let currentConversationId = conversationId;
    let isNewConversation = false;
    let newConversationTitle = "New Chat";

    // A. If no conversationId provided, create a NEW Conversation
    if (!currentConversationId) {
      // Create a title from the first 30 chars of the message
      newConversationTitle =
        message.substring(0, 30) + (message.length > 30 ? "..." : "");

      const newConv = await conversationModel.create({
        userId,
        title: newConversationTitle,
        updatedAt: Date.now(),
      });
      currentConversationId = newConv._id;
      isNewConversation = true;
    } else {
      // Only allow continuing a conversation that belongs to this user (never create/append otherwise)
      const ownedConversation = await conversationModel.findOneAndUpdate(
        { _id: currentConversationId, userId },
        { updatedAt: Date.now() }
      );
      if (!ownedConversation) return notFound(res);
    }

    // B. Save USER message linked to this Conversation
    await chatModel.create({
      userId,
      conversationId: currentConversationId,
      role: "user",
      content: message,
    });

    // C. Fetch Context (Immediate + Long-Term Memory)

    // 1. Get the immediate context of the CURRENT conversation
    const currentChats = await chatModel
      .find({ userId, conversationId: currentConversationId })
      .sort({ timestamp: -1 })
      .limit(10);

    // 2. Get long-term memory from PAST conversations (e.g., remembering conditions across chats)
    const pastChats = await chatModel
      .find({
        userId: userId,
        conversationId: { $ne: currentConversationId }, // Everything EXCEPT the current chat
      })
      .sort({ timestamp: -1 })
      .limit(20); // Grabs the last 20 messages from previous days/chats

    // 3. Combine them chronologically (Oldest past chats -> Newest current chats)
    const combinedChats = [...pastChats.reverse(), ...currentChats.reverse()];

    const historyForAi = combinedChats.map((chat) => ({
      role: chat.role === "user" ? "user" : "assistant",
      content: chat.content,
    }));

    // D. Send to the FastAPI chatbot (backend/chatbot/main.py)
    let response;
    try {
      response = await axios.post(
        CHATBOT_CHAT_URL,
        { message, history: historyForAi },
        { timeout: 60000 }
      );
    } catch (error) {
      // chatbot down / timed out / LLM error: log the real cause, answer politely
      console.error(
        "Chatbot request failed:",
        error.code || "",
        error.response?.status ?? "no-response",
        JSON.stringify(error.response?.data ?? error.message)
      );
      return res.status(502).json({
        reply:
          error.response?.data?.reply ||
          "MindAI is unavailable right now. Please try again in a moment.",
        conversationId: currentConversationId,
        isNew: isNewConversation,
        title: newConversationTitle,
      });
    }

    const botReply = response.data?.reply || "No response from MindAI.";

    // E. Save BOT response
    await chatModel.create({
      userId,
      conversationId: currentConversationId,
      role: "model",
      content: botReply,
    });

    // F. Return the reply AND the conversationId (so frontend knows which chat we are in)
    res.json({
      reply: botReply,
      conversationId: currentConversationId,
      isNew: isNewConversation,
      title: newConversationTitle,
    });
  } catch (error) {
    console.error("Chat Error:", error.message, error.response?.status ?? "", error.response?.data ?? "");
    res.status(500).json({ reply: "Error processing chat." });
  }
};

// 2. GET SIDEBAR (All Conversations)
export const getConversations = async (req, res) => {
  try {
    const userId = req.userId;
    const conversations = await conversationModel
      .find({ userId })
      .sort({ updatedAt: -1 });
    res.json({ success: true, conversations });
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
};

// 3. GET MESSAGES (For a specific chat)
export const getMessagesByConversation = async (req, res) => {
  try {
    const userId = req.userId;
    const { conversationId } = req.params;
    if (!mongoose.isValidObjectId(conversationId)) return badId(res);
    if (!(await conversationModel.exists({ _id: conversationId, userId }))) return notFound(res);

    const messages = await chatModel
      .find({ userId, conversationId })
      .sort({ timestamp: 1 });
    res.json({ success: true, messages });
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
};

// 4. DELETE one conversation (+ its messages) — only if it belongs to the caller
export const deleteConversation = async (req, res) => {
  try {
    const userId = req.userId;
    const { conversationId } = req.params;
    if (!mongoose.isValidObjectId(conversationId)) return badId(res);
    const deleted = await conversationModel.findOneAndDelete({ _id: conversationId, userId });
    if (!deleted) return notFound(res);
    await chatModel.deleteMany({ conversationId: deleted._id, userId });
    res.json({ success: true });
  } catch (error) {
    console.error("delete conversation:", error.message);
    res.status(500).json({ success: false, message: "Could not delete conversation" });
  }
};

// 5. DELETE all of the caller's conversations
export const deleteAllConversations = async (req, res) => {
  try {
    const userId = req.userId;
    await Promise.all([conversationModel.deleteMany({ userId }), chatModel.deleteMany({ userId })]);
    res.json({ success: true });
  } catch (error) {
    console.error("delete all conversations:", error.message);
    res.status(500).json({ success: false, message: "Could not delete conversations" });
  }
};
