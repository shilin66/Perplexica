import {WebSocket} from 'ws';
import {handleMessage} from './messageHandler';
import {BaseChatModel} from '@langchain/core/language_models/chat_models';
import type {Embeddings} from '@langchain/core/embeddings';
import type {IncomingMessage} from 'http';
import logger from '../utils/logger';
import {ChatOpenAI, OpenAIEmbeddings} from '@langchain/openai';
import {getFastGptInitData} from "../lib/fastgpt";
import {getOpenaiApiKey, getOpenaiBaseUrl} from "../config";

export const handleConnection = async (
  ws: WebSocket,
  request: IncomingMessage,
) => {
  try {
    const searchParams = new URL(request.url, `http://${request.headers.host}`)
      .searchParams;
    const {llmModels, embeddingModels} = await getFastGptInitData();
    const chatModel =
      searchParams.get('chatModel') ||
      llmModels[0].model;

    const embeddingModel =
      searchParams.get('embeddingModel') ||
      embeddingModels[0];

    const temperature = Number(searchParams.get('temperature')) || 0.7;
    const contextSize = Number(searchParams.get('contextSize')) || 8192;

    let llm: BaseChatModel | undefined;
    let embeddings: Embeddings | undefined;

    llm = new ChatOpenAI({
      modelName: chatModel,
      openAIApiKey: getOpenaiApiKey(),
      temperature: temperature,
      maxTokens: contextSize,
      configuration: {
        baseURL: getOpenaiBaseUrl(),
      },
    }) as unknown as BaseChatModel;

    embeddings = new OpenAIEmbeddings(
      {
        openAIApiKey: getOpenaiApiKey(),
        modelName: embeddingModel,
        configuration: {
          baseURL: getOpenaiBaseUrl(),
        },
      }
    ) as unknown as Embeddings;

    if (!llm || !embeddings) {
      ws.send(
        JSON.stringify({
          type: 'error',
          data: 'Invalid LLM or embeddings model selected, please refresh the page and try again.',
          key: 'INVALID_MODEL_SELECTED',
        }),
      );
      ws.close();
    }
    let session = {};
    ws.on(
      'message',
      async (message) =>
        await handleMessage(message.toString(), ws, llm, embeddings, session),
    );

    ws.on('close', () => logger.debug('Connection closed'));
  } catch (err) {
    ws.send(
      JSON.stringify({
        type: 'error',
        data: 'Internal server error.',
        key: 'INTERNAL_SERVER_ERROR',
      }),
    );
    ws.close();
    logger.error(err);
  }
};
