import express from 'express';
import logger from '../utils/logger';
import { MongoChats } from '../db/mongodb/ChatsSchema';
import { MongoMessages } from '../db/mongodb/Messages';
import { verifyToken } from '../utils/token';

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    // let chats = await db.query.chats.findMany();
    const { token } = req.headers as { token: string };
    const { userId, isRoot } = await verifyToken(token);
    let chats = await MongoChats.find({ userId }).lean();
    // 将 _id 转换为 id
    // 转换 _id 为 id
    chats = chats.map((chat) => ({
      ...chat,
      id: chat._id.toString(),
      _id: undefined,
    }));
    chats = chats.reverse();

    return res.status(200).json({ chats: chats });
  } catch (err) {
    res.status(500).json({ message: 'An error has occurred.' });
    logger.error(`Error in getting chats: ${err.message}`);
  }
});

router.get('/:id', async (req, res) => {
  try {
    // const chatExists = await db.query.chats.findFirst({
    //   where: eq(chats.id, req.params.id),
    // });
    const { token } = req.headers as { token: string };
    const { userId, isRoot } = await verifyToken(token);
    const chatExists = await MongoChats.findOne({
      _id: req.params.id,
      userId,
    }).lean();
    if (!chatExists) {
      return res.status(404).json({ message: 'Chat not found' });
    }
    const chatMessages = await MongoMessages.find({
      chatId: req.params.id,
    }).lean();
    // const chatMessages = await db.query.messages.findMany({
    //   where: eq(messages.chatId, req.params.id),
    // });

    return res.status(200).json({
      chat: {
        ...chatExists,
        id: chatExists._id,
        _id: undefined,
      },
      messages: chatMessages.map((messages) => {
        return {
          ...messages,
          id: messages._id,
          _id: undefined,
        };
      }),
    });
  } catch (err) {
    res.status(500).json({ message: 'An error has occurred.' });
    logger.error(`Error in getting chat: ${err.message}`);
  }
});

router.delete(`/:id`, async (req, res) => {
  try {
    // const chatExists = await db.query.chats.findFirst({
    //   where: eq(chats.id, req.params.id),
    // });
    // if (!chatExists) {
    //   return res.status(404).json({message: 'Chat not found'});
    // }
    const { token } = req.headers as { token: string };
    const { userId, isRoot } = await verifyToken(token);
    const result = await MongoChats.findOneAndDelete({
      _id: req.params.id,
      userId,
    });
    if (!result) {
      return res.status(404).json({ message: 'Chat not found' });
    }

    // await db.delete(chats).where(eq(chats.id, req.params.id)).execute();
    await MongoMessages.deleteMany({
      chatId: req.params.id,
    });
    // await db
    //   .delete(messages)
    //   .where(eq(messages.chatId, req.params.id))
    //   .execute();

    return res.status(200).json({ message: 'Chat deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: 'An error has occurred.' });
    logger.error(`Error in deleting chat: ${err.message}`);
  }
});

export default router;
