import * as mongoose from 'mongoose';

const MessagesSchema = new mongoose.Schema({
  content: {
    type: String,
    required: true,
  },

  chatId: {
    type: String,
    required: true,
  },

  messageId: {
    type: String,
    required: true,
  },

  role: {
    type: String,
    required: false,
  },

  metadata: {
    type: String,
    required: false,
  },
});

try {
  MessagesSchema.index({ chatId: 1 });
  MessagesSchema.index({ messageId: 1 });
} catch (error) {
  console.log(error);
}

export const MongoMessages = mongoose.model('messages', MessagesSchema);
