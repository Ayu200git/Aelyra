import express from 'express';
import {
  createChat,
  getChatHistory,
  getChat,
  sendMessage,
  updateChat,
  deleteChat,
  shareChat,
  getSharedChat,
  cleanupExpiredChats,
} from '../controllers/chatController.js';
import { protect, authorize } from '../middleware/authMiddleware.js';
import { chatLimiter } from '../lib/rateLimit.js';

const router = express.Router();

router.post('/create', protect, createChat);
router.get('/history', protect, getChatHistory);
router.post('/send', protect, chatLimiter, sendMessage);
router.get('/shared/:token', getSharedChat);
router.post('/cleanup', cleanupExpiredChats);
router.get('/:chatId', protect, getChat);
router.patch('/:chatId', protect, updateChat);
router.delete('/:chatId', protect, deleteChat);
router.post('/:chatId/share', protect, shareChat);

export default router;