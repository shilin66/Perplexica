import express from 'express';
import {
  getAnthropicApiKey,
  getGroqApiKey,
  getOllamaApiEndpoint,
  getOpenaiApiKey,
  updateConfig,
} from '../config';
import { getFastGptInitData } from '../lib/fastgpt';
import Cookie from "cookie";
import {verifyToken} from "../utils/token";

const router = express.Router();

router.get('/', async (req, res) => {
  const { token, cookie } = req.headers as { token: string, cookie:string };
  const cookies = Cookie.parse(cookie || '');
  const cookieToken = token || cookies['fastgpt_token'];
  await verifyToken(cookieToken);
  const config = {};

  config['chatModelProviders'] = {};
  config['embeddingModelProviders'] = {};

  const gptModels = await getFastGptInitData();
  config['chatModelProviders']['openai'] = gptModels.llmModels.map((model) => {
    return {
      modelName: model.model,
      maxTemperature: model.maxTemperature,
      maxContext: model.maxContext,
    };
  });

  config['embeddingModelProviders']['openai'] = gptModels.embeddingModels;

  config['openaiApiKey'] = getOpenaiApiKey();
  config['ollamaApiUrl'] = getOllamaApiEndpoint();
  config['anthropicApiKey'] = getAnthropicApiKey();
  config['groqApiKey'] = getGroqApiKey();

  res.status(200).json(config);
});

router.post('/', async (req, res) => {
  const { token, cookie } = req.headers as { token: string, cookie:string };
  const cookies = Cookie.parse(cookie || '');
  const cookieToken = token || cookies['fastgpt_token'];
  await verifyToken(cookieToken);
  const config = req.body;

  const updatedConfig = {
    API_KEYS: {
      OPENAI: config.openaiApiKey,
      GROQ: config.groqApiKey,
      ANTHROPIC: config.anthropicApiKey,
    },
    API_ENDPOINTS: {
      OLLAMA: config.ollamaApiUrl,
    },
  };

  updateConfig(updatedConfig);

  res.status(200).json({ message: 'Config updated' });
});

export default router;
