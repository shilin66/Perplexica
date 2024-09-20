import fs from 'fs';
import path from 'path';
import toml from '@iarna/toml';
import mongoose from 'mongoose';

const configFileName = 'config.toml';

interface Config {
  GENERAL: {
    PORT: number;
    SIMILARITY_MEASURE: string;
    MONGODB_URI: string;
    MONGODB_MAX_LINK: string;
    JWT_SIGN_KEY: string;
    BASE_PATH: string;
  };
  API_KEYS: {
    OPENAI: string;
    GROQ: string;
    ANTHROPIC: string;
  };
  API_ENDPOINTS: {
    SEARXNG: string;
    OLLAMA: string;
    FASTGPT_URL: string;
    OPENAI_BASE_URL: string;
  };
}

type RecursivePartial<T> = {
  [P in keyof T]?: RecursivePartial<T[P]>;
};

const loadConfig = () =>
  toml.parse(
    fs.readFileSync(path.join(__dirname, `../${configFileName}`), 'utf-8'),
  ) as any as Config;

export const getPort = () => loadConfig().GENERAL.PORT;

export const getBasePath = () => loadConfig().GENERAL.BASE_PATH;

export const getSimilarityMeasure = () =>
  loadConfig().GENERAL.SIMILARITY_MEASURE;

export const getOpenaiApiKey = () => loadConfig().API_KEYS.OPENAI;

export const getGroqApiKey = () => loadConfig().API_KEYS.GROQ;

export const getAnthropicApiKey = () => loadConfig().API_KEYS.ANTHROPIC;

export const getSearxngApiEndpoint = () => loadConfig().API_ENDPOINTS.SEARXNG;

export const getOllamaApiEndpoint = () => loadConfig().API_ENDPOINTS.OLLAMA;

export const getFastGptEndpoint = () => loadConfig().API_ENDPOINTS.FASTGPT_URL;

export const getJwtSignKey = () => loadConfig().GENERAL.JWT_SIGN_KEY;
export const getOpenaiBaseUrl = () => {
  const openaiBaseUrl = loadConfig().API_ENDPOINTS.OPENAI_BASE_URL;
  // 如果没有配置，则使用默认值
  return openaiBaseUrl || 'https://api.openai.com/v1';
};

export const getMongoDbUrl = () => {
  const mongoDbUrl = loadConfig().GENERAL.MONGODB_URI;
  // 如果没有配置，则使用默认值
  return mongoDbUrl || 'mongodb://localhost:27017/perplexica';
};

export const getMongoDbMaxLink = () => {
  const mongoDbMaxLink = loadConfig().GENERAL.MONGODB_MAX_LINK;
  // 如果没有配置，则使用默认值
  return mongoDbMaxLink || '30';
};

export const connectionMongo = () => {
  if (!global.mongodb) {
    global.mongodb = mongoose;
  }
  return global.mongodb;
};

export const updateConfig = (config: RecursivePartial<Config>) => {
  const currentConfig = loadConfig();

  for (const key in currentConfig) {
    if (!config[key]) config[key] = {};

    if (typeof currentConfig[key] === 'object' && currentConfig[key] !== null) {
      for (const nestedKey in currentConfig[key]) {
        if (
          !config[key][nestedKey] &&
          currentConfig[key][nestedKey] &&
          config[key][nestedKey] !== ''
        ) {
          config[key][nestedKey] = currentConfig[key][nestedKey];
        }
      }
    } else if (currentConfig[key] && config[key] !== '') {
      config[key] = currentConfig[key];
    }
  }

  fs.writeFileSync(
    path.join(__dirname, `../${configFileName}`),
    toml.stringify(config),
  );
};
