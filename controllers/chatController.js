import Chat from '../models/Chat.js';
import { generateResponse, generateTitle } from '../lib/openai.js';
import { StatusCodes } from 'http-status-codes';
import { logger } from '../utils/logger.js';
import crypto from 'crypto';

export const createChat = async (req, res) => {
  try {
    const { title } = req.body;
    const userId = req.user.id || req.user._id;

    const chat = new Chat({
      user: userId,
      title: title || 'New Chat',
      messages: [],
    });

    await chat.save();
    res.status(StatusCodes.CREATED).json({
      success: true,
      data: {
        chat,
      },
    });
  } catch (error) {
    logger.error(`Create chat error: ${error.message}`);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      error: 'Failed to create chat',
    });
  }
};

//chat history
export const getChatHistory = async (req, res) => {
  try {
    const userId = req.user.id || req.user._id;
    const { q, page = 1, limit = 20 } = req.query;
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    let query = { user: userId };
    if (q && q.trim()) {
      query.$text = { $search: q.trim() };
    }

    const totalCount = await Chat.countDocuments(query);
    const chats = await Chat.find(query)
      .sort(q ? { score: { $meta: 'textScore' } } : { updatedAt: -1 })
      .select('title messages updatedAt createdAt isStarred isShared shareToken')
      .skip(skip)
      .limit(limitNum)
      .lean();

    const chatsWithPreview = chats.map(chat => {
      const lastMessage = chat.messages && chat.messages.length > 0
        ? chat.messages[chat.messages.length - 1]
        : null;

      return {
        _id: chat._id,
        title: chat.title,
        updatedAt: chat.updatedAt,
        createdAt: chat.createdAt,
        isStarred: chat.isStarred || false,
        isShared: chat.isShared || false,
        shareToken: chat.shareToken,
        preview: lastMessage ? lastMessage.content?.substring(0, 100) : null,
      };
    });

    const hasMore = skip + chatsWithPreview.length < totalCount;

    res.status(StatusCodes.OK).json({
      success: true,
      data: {
        chats: chatsWithPreview,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total: totalCount,
          hasMore,
        },
      },
    });
  } catch (error) {
    logger.error(`Get chat history error: ${error.message}`);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      error: 'Failed to retrieve chat history',
    });
  }
};

export const getChat = async (req, res) => {
  try {
    const { chatId } = req.params;
    const userId = req.user.id || req.user._id;

    const chat = await Chat.findOne({ _id: chatId, user: userId });
    if (!chat) {
      return res.status(StatusCodes.NOT_FOUND).json({
        success: false,
        error: 'Chat not found',
      });
    }

    res.status(StatusCodes.OK).json({
      success: true,
      data: {
        chat,
      },
    });
  } catch (error) {
    logger.error(`Get chat error: ${error.message}`);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      error: 'Failed to retrieve chat',
    });
  }
};

export const sendMessage = async (req, res) => {
  try {
    const { chatId, message, image } = req.body;
    const userId = req.user.id || req.user._id;

    if (!message || !message.trim()) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        error: 'Message is required',
      });
    }

    let chat = null;

    if (chatId) {
      chat = await Chat.findOne({ _id: chatId, user: userId });
      if (!chat) {
        return res.status(StatusCodes.NOT_FOUND).json({
          success: false,
          error: 'Chat not found',
        });
      }
    } else {
      chat = new Chat({
        user: userId,
        title: 'New Chat',
        messages: [],
      });
    }

    // user message
    chat.messages.push({
      role: 'user',
      content: message.trim(),
      ...(image ? { images: [{ url: image }] } : {}),
    });

    // AI response
    const aiResponseResult = await generateResponse(chat.messages);

    let aiMessage =
      typeof aiResponseResult === 'string'
        ? aiResponseResult
        : aiResponseResult?.message ||
        aiResponseResult?.choices?.[0]?.message?.content;

    if (!aiMessage) {
      throw new Error('Invalid AI response');
    }

    chat.messages.push({
      role: 'assistant',
      content: aiMessage,
    });
    if (chat.messages.length === 2 && chat.title === 'New Chat') {
      try {
        const titleResult = await generateTitle(chat.messages);
        if (titleResult?.title) {
          chat.title = titleResult.title;
        } else {
          chat.title = message.trim().split(/\s+/).slice(0, 4).join(' ');
        }
      } catch (err) {
        logger.error(`Title generation failed: ${err.message}`);
        chat.title = message.trim().split(/\s+/).slice(0, 4).join(' ');
      }
    }

    await chat.save();

    return res.status(StatusCodes.OK).json({
      success: true,
      data: {
        reply: aiMessage,
        chat,
      },
    });

  } catch (error) {
    logger.error(`Send message error: ${error.message}`);

    if (error?.status === 429 || error?.message?.includes('429')) {
      return res.status(429).json({
        success: false,
        error: 'AI quota exceeded. Please wait and try again.',
        retryAfter: 25,
      });
    }

    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      error: 'Failed to send message',
    });
  }
};


export const updateChat = async (req, res) => {
  try {
    const { chatId } = req.params;
    const userId = req.user.id || req.user._id;
    const updates = req.body;

    const chat = await Chat.findOne({ _id: chatId, user: userId });
    if (!chat) {
      return res.status(StatusCodes.NOT_FOUND).json({
        success: false,
        error: 'Chat not found',
      });
    }

    const allowedUpdates = ['title', 'isStarred', 'tags', 'isShared'];

    const hasValidUpdates = allowedUpdates.some(field => updates[field] !== undefined);

    if (!hasValidUpdates) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        error: 'No valid fields to update',
      });
    }

    allowedUpdates.forEach(field => {
      if (updates[field] !== undefined) {
        chat[field] = updates[field];
      }
    });

    await chat.save();

    res.status(StatusCodes.OK).json({
      success: true,
      data: {
        chat,
      },
    });
  } catch (error) {
    logger.error(`Update chat error: ${error.message}`);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      error: 'Failed to update chat',
    });
  }
};

export const deleteChat = async (req, res) => {
  try {
    const { chatId } = req.params;
    const userId = req.user.id || req.user._id;

    const chat = await Chat.findOneAndDelete({ _id: chatId, user: userId });
    if (!chat) {
      return res.status(StatusCodes.NOT_FOUND).json({
        success: false,
        error: 'Chat not found',
      });
    }

    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Chat deleted successfully',
    });
  } catch (error) {
    logger.error(`Delete chat error: ${error.message}`);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      error: 'Failed to delete chat',
    });
  }
};

export const shareChat = async (req, res) => {
  try {
    const chatId = req.params.chatId;
    const shareToken = crypto.randomBytes(16).toString('hex');
    const chat = await Chat.findByIdAndUpdate(
      chatId,
      { shareToken },
      { new: true }
    );
    if (!chat) {
      return res.status(404).json({ message: 'Chat not found' });
    }
    res.json({
      link: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/share/${shareToken}`,
    });
  } catch (error) {
    console.error('Share chat error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const getSharedChat = async (req, res) => {
  try {
    const { token } = req.params;
    const chat = await Chat.findOne({ shareToken: token });
    if (!chat) {
      return res.status(404).json({ message: 'Shared chat not found' });
    }
    res.json(chat);
  } catch (error) {
    console.error('Get shared chat error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const cleanupExpiredChats = async (req, res) => {
  try {
    const result = await Chat.deleteMany({
      isShared: true,
      shareExpires: { $lt: Date.now() },
    });

    res.status(StatusCodes.OK).json({
      success: true,
      data: {
        deletedCount: result.deletedCount,
      },
    });
  } catch (error) {
    logger.error(`Cleanup expired chats error: ${error.message}`);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      error: 'Failed to cleanup expired chats',
    });
  }
};