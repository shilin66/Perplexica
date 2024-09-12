import { ChatOpenAI, OpenAIEmbeddings } from '@langchain/openai';
import { getOpenaiApiKey, getOpenaiBaseUrl } from '../../config';
import logger from '../../utils/logger';
import { getFastGptInitData } from '../fastgpt';

export const loadOpenAIChatModels = async () => {
  const openAIApiKey = getOpenaiApiKey();
  if (!openAIApiKey) return {};
  try {
    const gptModels = await getFastGptInitData();
    const chatModels = {};
    gptModels.llmModels.forEach((llmModel) => {
      chatModels[llmModel.model] = new ChatOpenAI(
        {
          openAIApiKey,
          modelName: llmModel.model,
          temperature: 0.7,
        },
        { baseURL: getOpenaiBaseUrl() },
      );
    });

    return chatModels;
  } catch (err) {
    logger.error(`Error loading OpenAI models: ${err}`);
    return {};
  }
};

export const loadOpenAIEmbeddingsModels = async () => {
  const openAIApiKey = getOpenaiApiKey();
  if (!openAIApiKey) return {};

  try {
    const embModels = await getFastGptInitData();
    const embeddingModels = {};
    embModels.embeddingModels.forEach((embeddingModel) => {
      embeddingModels[embeddingModel] = new OpenAIEmbeddings(
        {
          openAIApiKey,
          modelName: embeddingModel,
        },
        { baseURL: getOpenaiBaseUrl() },
      );
    });
    return embeddingModels;
  } catch (err) {
    logger.error(`Error loading OpenAI embeddings model: ${err}`);
    return {};
  }
};
