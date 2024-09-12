import axios from 'axios';
import { getFastGptEndpoint } from '../config';

export type Models = {
  llmModels: string[];
  embeddingModels: string[];
};

export const getFastGptInitData = async () => {
  const res = await axios.get(
    getFastGptEndpoint() + '/api/common/system/getInitData',
  );
  const models = {
    llmModels: [],
    embeddingModels: [],
  };
  res.data.data.llmModels.map((llmModel: any) => {
    models.llmModels.push({
      model: llmModel.model,
      maxContext: llmModel.maxContext,
      maxTemperature: llmModel.maxTemperature,
    });
  });
  res.data.data.vectorModels.map((vectorModel: any) => {
    models.embeddingModels.push(vectorModel.model);
  });
  return models;
};
