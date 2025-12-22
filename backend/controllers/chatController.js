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

export const getChatHistory = async (req, res) => {
  try {
    const userId = req.user.id || req.user._id;
    const { q, page = 1, limit = 20 } = req.query; // Pagination params
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;
    
    let query = { user: userId };
    
    // If search query provided, use text search
    if (q && q.trim()) {
      query.$text = { $search: q.trim() };
    }
    
    // Get total count for pagination
    const totalCount = await Chat.countDocuments(query);
    
    // Fetch chats with pagination
    const chats = await Chat.find(query)
      .sort(q ? { score: { $meta: 'textScore' } } : { updatedAt: -1 })
      .select('title messages updatedAt createdAt isStarred isShared shareToken')
      .skip(skip)
      .limit(limitNum)
      .lean(); // Use lean() for better performance

    // Get preview from last message and format response
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
        // Don't include messages array to reduce payload size
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
    // Handle both JSON and FormData (FormData will be parsed by express.json or multer)
    const { chatId, message, image } = req.body;
    const userId = req.user.id || req.user._id;

    if (!message || !message.trim()) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        error: 'Message is required',
      });
    }

    let chat = await Chat.findOne({ _id: chatId, user: userId });
    
    // Create new chat if chatId not provided or not found
    if (!chat) {
      if (chatId) {
        return res.status(StatusCodes.NOT_FOUND).json({
          success: false,
          error: 'Chat not found',
        });
      }
      chat = new Chat({
        user: userId,
        title: message.substring(0, 50) || 'New Chat',
        messages: [],
      });
    }

    // Add user message
    const userMessage = {
      role: 'user',
      content: message.trim(),
    };
    
    // Handle image if provided (URL or base64)
    if (image) {
      userMessage.images = [{ url: image }];
    }
    
    chat.messages.push(userMessage);

    // Generate AI response
    try {
      const aiResponseResult = await generateResponse(chat.messages);
      
      if (!aiResponseResult.success) {
        logger.error(`AI response error: ${aiResponseResult.error}`);
        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
          success: false,
          error: aiResponseResult.message || 'Failed to generate response',
        });
      }

      chat.messages.push({
        role: 'assistant',
        content: aiResponseResult.message,
      });
    } catch (error) {
      logger.error(`AI generation error: ${error.message}`);
      return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        error: 'Failed to generate AI response',
      });
    }

    // Generate title if this is the first exchange (2 messages: user + assistant)
    if (chat.messages.length === 2 && (!chat.title || chat.title === 'New Chat')) {
      try {
        const titleResult = await generateTitle(message);
        if (titleResult.success && titleResult.title) {
          chat.title = titleResult.title;
          logger.info(`Generated title: ${titleResult.title} for chat ${chat._id}`);
        } else {
          // Fallback to first few words
          const words = message.trim().split(/\s+/).slice(0, 4).join(' ');
          chat.title = words || 'New Chat';
        }
      } catch (error) {
        logger.error(`Title generation failed: ${error.message}`);
        // Fallback to first few words
        const words = message.trim().split(/\s+/).slice(0, 4).join(' ');
        chat.title = words || 'New Chat';
      }
    }

    await chat.save();

    res.status(StatusCodes.OK).json({
      success: true,
      data: {
        chat,
        reply: chat.messages[chat.messages.length - 1].content,
      },
    });
  } catch (error) {
    logger.error(`Send message error: ${error.message}`);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
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

    // Find the chat and verify ownership
    const chat = await Chat.findOne({ _id: chatId, user: userId });
    if (!chat) {
      return res.status(StatusCodes.NOT_FOUND).json({
        success: false,
        error: 'Chat not found',
      });
    }

    // Allowed fields to update
    const allowedUpdates = ['title', 'isStarred', 'tags', 'isShared'];
    const updateFields = {};

    // Only update allowed fields
    allowedUpdates.forEach(field => {
      if (updates[field] !== undefined) {
        updateFields[field] = updates[field];
      }
    });

    // If no valid updates, return error
    if (Object.keys(updateFields).length === 0) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        error: 'No valid fields to update',
      });
    }

    // Update the chat
    Object.assign(chat, updateFields);
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
    const { chatId } = req.params;
    const userId = req.user.id || req.user._id;

    const chat = await Chat.findOne({ _id: chatId, user: userId });
    if (!chat) {
      return res.status(StatusCodes.NOT_FOUND).json({
        success: false,
        error: 'Chat not found',
      });
    }

    // Generate share token using model method
    const shareToken = chat.generateShareToken();
    await chat.save();

    const shareUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/shared/${shareToken}`;

    res.status(StatusCodes.OK).json({
      success: true,
      data: {
        shareToken,
        shareUrl,
        shareLink: shareUrl, // Alias for compatibility
      },
    });
  } catch (error) {
    logger.error(`Share chat error: ${error.message}`);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      error: 'Failed to share chat',
    });
  }
};

export const unshareChat = async (req, res) => {
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

    // Remove share token using model method
    chat.removeShareToken();
    await chat.save();

    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Chat unshared successfully',
    });
  } catch (error) {
    logger.error(`Unshare chat error: ${error.message}`);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      error: 'Failed to unshare chat',
    });
  }
};

export const getSharedChat = async (req, res) => {
  try {
    const { token } = req.params;

    const chat = await Chat.findOne({
      shareToken: token,
      isShared: true,
      shareExpires: { $gt: Date.now() },
    }).populate('user', 'name email');

    if (!chat) {
      return res.status(StatusCodes.NOT_FOUND).json({
        success: false,
        error: 'Shared chat not found or expired',
      });
    }

    res.status(StatusCodes.OK).json({
      success: true,
      data: {
        chat,
      },
    });
  } catch (error) {
    logger.error(`Get shared chat error: ${error.message}`);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      error: 'Failed to retrieve shared chat',
    });
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