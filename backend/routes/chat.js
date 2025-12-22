import express from 'express';
import { shareChat, getSharedChat } from '../controllers/chatController.js';

const router = express.Router();

router.post('/:id/share', shareChat);
router.get('/share/:token', getSharedChat);

export default router;