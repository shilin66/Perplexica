import * as mongoose from 'mongoose';

const ChatsSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
  },

  focusMode: {
    type: String,
    default: false,
  },

  userId: {
    type: String,
    required: true,
  },

  createdAt: {
    type: Date,
    default: Date.now,
  },
});

try {
  ChatsSchema.index({ userId: 1 });
} catch (error) {
  console.log(error);
}

export const MongoChats = mongoose.model('Chats', ChatsSchema);
