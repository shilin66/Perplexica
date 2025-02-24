import express from 'express';
import logger from '../utils/logger';
import {
  getAvailableChatModelProviders,
  getAvailableEmbeddingModelProviders,
} from '../lib/providers';
import Cookie from "cookie";
import {verifyToken} from "../utils/token";

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const { token, cookie } = req.headers as { token: string, cookie:string };
    const cookies = Cookie.parse(cookie || '');
    const cookieToken = token || cookies['fastgpt_token'];
    await verifyToken(cookieToken);
    const [chatModelProviders, embeddingModelProviders] = await Promise.all([
      getAvailableChatModelProviders(),
      getAvailableEmbeddingModelProviders(),
    ]);

    res.status(200).json({ chatModelProviders, embeddingModelProviders });
  } catch (err) {
    res.status(500).json({ message: 'An error has occurred.' });
    logger.error(err.message);
  }
});

export default router;
