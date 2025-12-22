import axios from "axios";

const API_BASE_URL =
  import.meta.env.VITE_API_URL ||
  (typeof window !== "undefined" &&
  window.location.origin === "http://localhost:5173"
    ? "http://localhost:3000/api"
    : "/api");

const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

api.interceptors.request.use(
  (config) => {
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const isAuthCheck = error.config?.url?.includes('/auth/me');
    
    if (error.response?.status === 401) {
      if (
        !isAuthCheck &&
        window.location.pathname !== "/login" &&
        window.location.pathname !== "/register" &&
        window.location.pathname !== "/forgot-password" &&
        window.location.pathname !== "/reset-password"
      ) {
        window.location.href = "/login";
      }
    }
    
    if (!isAuthCheck && error.response?.status !== 401) {
      console.error('API Error:', error.response?.data || error.message);
    }
    
    return Promise.reject(error);
  }
);

export const config = { runtime: "nodejs" };

import connectDB from "../../lib/db.js";
import Chat from "../../models/Chat.js";
import { getUserIdFromRequest } from "../../lib/auth.js";
import { getJsonBody } from "../../lib/body.js";
import { handleCors } from "../../lib/cors.js";
import mongoose from "mongoose";
import crypto from "crypto";

export default async function handler(req, res) {
  if (handleCors(req, res)) return;

  console.log("API /chat/[id] called:", req.method, req.url);

  const parts = req.url.split("/").filter(Boolean);
  const chatId = parts[parts.length - 1];
  if (!mongoose.Types.ObjectId.isValid(chatId)) {
    return res.status(400).json({ error: "Invalid chat ID" });
  }

  const userId = getUserIdFromRequest(req);
  if (!userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  await connectDB();

  if (req.method === "GET") {
    const chat = await Chat.findOne({ _id: chatId, userId }).lean();
    if (!chat) return res.status(404).json({ error: "Chat not found" });

    return res.status(200).json({
      chat: {
        id: String(chat._id),
        title: chat.title,
        messages: chat.messages,
        isStarred: chat.isStarred || false,
        isPublic: chat.isPublic || false,
      },
    });
  }

  if (req.method === "PATCH") {
    try {
      const updates = await getJsonBody(req);
      const chat = await Chat.findOneAndUpdate(
        { _id: chatId, userId },
        updates,
        { new: true }
      ).lean();

      if (!chat) return res.status(404).json({ error: "Chat not found" });

      return res.status(200).json({
        chat: {
          id: String(chat._id),
          title: chat.title,
          messages: chat.messages,
          isStarred: chat.isStarred || false,
          isPublic: chat.isPublic || false,
        },
      });
    } catch (err) {
      console.error("PATCH chat error:", err);
      return res.status(500).json({ error: "Failed to update chat" });
    }
  }

  if (req.method === "DELETE") {
    console.log("DELETE method reached for chatId:", chatId);
    try {
      const chat = await Chat.findOneAndDelete({ _id: chatId, userId });
      if (!chat) return res.status(404).json({ error: "Chat not found" });

      return res
        .status(200)
        .json({ message: "Chat deleted", id: String(chat._id) });
    } catch (err) {
      console.error("DELETE chat error:", err);
      return res.status(500).json({ error: "Failed to delete chat" });
    }
  }

  return res.status(405).json({ error: "Method not allowed" });
}

<button onClick={() => dispatch(deleteChat(chat.id))}>
  Delete
</button>