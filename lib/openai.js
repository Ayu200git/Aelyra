import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';

dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

export const generateResponse = async (messages) => {
  try {
    if (!Array.isArray(messages) || messages.length === 0) {
      return {
        success: false,
        error: 'Messages array is empty',
      };
    }

    const validMessages = messages.filter(
      (msg) => msg?.content && msg.content.trim()
    );

    if (validMessages.length === 0) {
      return {
        success: false,
        error: 'All messages are empty',
      };
    }

    const model = genAI.getGenerativeModel({
      model: 'gemini-3-flash-preview',
    });

    const history = validMessages.slice(0, -1).map((msg) => ({
      role: msg.role === 'user' ? 'user' : 'model',
      parts: [{ text: msg.content.trim() }],
    }));

    const lastMessage = validMessages[validMessages.length - 1].content.trim();

    const chat = model.startChat({
      history,
      generationConfig: {
        temperature: Number(process.env.GEMINI_TEMPERATURE) || 0.7,
        maxOutputTokens: Number(process.env.GEMINI_MAX_TOKENS) || 2048,
      },
    });

    const result = await chat.sendMessage(lastMessage);
    const responseText = result.response.text();

    if (!responseText) {
      return {
        success: false,
        error: 'Empty response from Gemini',
      };
    }

    return {
      success: true,
      message: responseText.trim(),
    };
  } catch (error) {
    console.error('Gemini API Error:', error);

    return {
      success: false,
      error: error.message || 'Failed to generate response',
    };
  }
};


export const generateTitle = async (messages) => {
  try {
    let firstMessageContent = '';

    if (Array.isArray(messages)) {
      const userMsg = messages.find(m => m.role === 'user');
      if (userMsg) firstMessageContent = userMsg.content;
    } else if (typeof messages === 'object' && messages.content) {
      firstMessageContent = messages.content;
    } else if (typeof messages === 'string') {
      firstMessageContent = messages;
    }

    if (!firstMessageContent || !firstMessageContent.trim()) {
      return {
        success: false,
        error: 'Message content is required for title generation',
      };
    }


    const model = genAI.getGenerativeModel({
      model: 'gemini-3-flash-preview',
    });

    const prompt = `Generate a short, concise title (3-4 words maximum) for this conversation starter: "${firstMessageContent.substring(0, 200)}"
      Return only the title, nothing else. Make it descriptive and relevant.`;

    const result = await model.generateContent(prompt, {
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 20,
      },
    });

    const title = result.response.text().trim();
    const cleanTitle = title
      .replace(/^["']|["']$/g, '')
      .replace(/\s+/g, ' ')
      .trim()
      .substring(0, 50);

    if (!cleanTitle) {
      const words = firstMessageContent.trim().split(/\s+/).slice(0, 4).join(' ');
      return {
        success: true,
        title: words || 'New Chat',
      };
    }

    return {
      success: true,
      title: cleanTitle,
    };
  } catch (error) {
    console.error('Title generation error:', error);
    const words = firstMessageContent ? firstMessageContent.trim().split(/\s+/).slice(0, 4).join(' ') : 'New Chat';
    return {
      success: true,
      title: words || 'New Chat',
    };
  }
};

export default genAI;
