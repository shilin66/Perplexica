import express from 'express';
import generateSuggestions from '../agents/suggestionGeneratorAgent';
import { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { getAvailableChatModelProviders } from '../lib/providers';
import { HumanMessage, AIMessage } from '@langchain/core/messages';
import logger from '../utils/logger';
import Cookie from "cookie";
import {verifyToken} from "../utils/token";

const router = express.Router();

router.post('/', async (req, res) => {
  try {
    const { token, cookie } = req.headers as { token: string, cookie:string };
    const cookies = Cookie.parse(cookie || '');
    const cookieToken = token || cookies['fastgpt_token'];
    await verifyToken(cookieToken);
    let { chat_history, chat_model, chat_model_provider } = req.body;

    chat_history = chat_history.map((msg: any) => {
      if (msg.role === 'user') {
        return new HumanMessage(msg.content);
      } else if (msg.role === 'assistant') {
        return new AIMessage(msg.content);
      }
    });

    const chatModels = await getAvailableChatModelProviders();
    const provider = chat_model_provider ?? Object.keys(chatModels)[0];
    const chatModel = chat_model ?? Object.keys(chatModels[provider])[0];

    let llm: BaseChatModel | undefined;

    if (chatModels[provider] && chatModels[provider][chatModel]) {
      llm = chatModels[provider][chatModel] as BaseChatModel | undefined;
    }

    if (!llm) {
      res.status(500).json({ message: 'Invalid LLM model selected' });
      return;
    }

    const suggestions = await generateSuggestions({ chat_history }, llm);

    res.status(200).json({ suggestions: suggestions });
  } catch (err) {
    res.status(500).json({ message: 'An error has occurred.' });
    logger.error(`Error in generating suggestions: ${err.message}`);
  }
});

export default router;
