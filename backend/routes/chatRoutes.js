import express from 'express';
import {
  createChat,
  getChatHistory,
  getChat,
  sendMessage,
  updateChat,
  deleteChat,
  shareChat,
  unshareChat,
  getSharedChat,
  cleanupExpiredChats,
} from '../controllers/chatController.js';
import { protect, authorize } from '../middleware/authMiddleware.js';
import { chatLimiter } from '../lib/rateLimit.js';

const router = express.Router();

router.post('/create', protect, createChat);
router.get('/history', protect, getChatHistory);
router.post('/send', protect, chatLimiter, sendMessage);
// Shared chat can be accessed without authentication - must come before /:chatId
router.get('/shared/:token', getSharedChat);
router.post('/cleanup', cleanupExpiredChats);
// Chat CRUD operations
router.get('/:chatId', protect, getChat);
router.patch('/:chatId', protect, updateChat);
router.delete('/:chatId', protect, deleteChat);
router.post('/:chatId/share', protect, shareChat);
router.delete('/:chatId/share', protect, unshareChat);

export default router;