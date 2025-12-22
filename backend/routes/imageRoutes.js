import express from 'express';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();
router.post('/generate', protect, async (req, res) => {
  try {
    res.status(200).json({
      success: true,
      data: {
        url: 'https://example.com/generated-image.jpg',
        prompt: req.body.prompt
      }
    });
  } catch (error) {
    console.error('Image generation error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate image',
      error: error.message
    });
  }
});

export default router;
