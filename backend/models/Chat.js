import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema(
  {
    role: {
      type: String,
      required: true,
      enum: ['user', 'assistant', 'system'],
    },
    content: {
      type: String,
      required: [true, 'Please add message content'],
    },
    images: [
      {
        url: String,
        publicId: String,
      },
    ],
    feedback: {
      type: String,
      enum: ['like', 'dislike', null],
      default: null,
    },
  },
  { timestamps: true }
);

const chatSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Please add a chat title'],
      trim: true,
      maxlength: [100, 'Title cannot be more than 100 characters'],
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    messages: [messageSchema],
    isShared: {
      type: Boolean,
      default: false,
    },
    shareToken: { type: String, unique: true, sparse: true },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

chatSchema.index({ user: 1, updatedAt: -1 });
chatSchema.index({ shareToken: 1 }, { unique: true, sparse: true });

chatSchema.methods.generateShareToken = function () {
  const token = require('crypto').randomBytes(20).toString('hex');
  this.shareToken = token;
  this.shareExpires = Date.now() + 30 * 24 * 60 * 60 * 1000; // 30 days
  this.isShared = true;
  return token;
};

chatSchema.methods.removeShareToken = function () {
  this.shareToken = undefined;
  this.shareExpires = undefined;
  this.isShared = false;
};

chatSchema.pre('save', function (next) {
  if (this.isNew && this.messages.length > 0 && !this.title) {
    const firstMessage = this.messages[0].content;
    this.title =
      firstMessage.length > 50
        ? firstMessage.substring(0, 47) + '...'
        : firstMessage;
  }
  next();
});

chatSchema.index(
  { title: 'text', 'messages.content': 'text' },
  {
    weights: {
      title: 10,
      'messages.content': 5,
    },
    name: 'chat_text_search',
  }
);

export default mongoose.model('Chat', chatSchema);
