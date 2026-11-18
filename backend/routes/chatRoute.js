import express from "express";
import {
  chatWithBot,
  getConversations,
  getMessagesByConversation,
  deleteConversation,
  deleteAllConversations,
} from "../controllers/chatController.js";
import authUser from "../middlewares/authUser.js";

const chatRouter = express.Router();

// Send Message (Create new chat or add to existing)
chatRouter.post("/", authUser, chatWithBot);

// Get Sidebar List (All conversations for user)
chatRouter.get("/conversations", authUser, getConversations);

// Get Specific Chat History (When clicking a sidebar item)
chatRouter.get("/:conversationId", authUser, getMessagesByConversation);

// Delete all of my conversations
chatRouter.delete("/", authUser, deleteAllConversations);

// Delete one conversation (owner only)
chatRouter.delete("/:conversationId", authUser, deleteConversation);

export default chatRouter;
