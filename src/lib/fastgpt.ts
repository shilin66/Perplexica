import axios from 'axios';
import {getFastGptApiKey, getFastGptEndpoint} from '../config';

export type Models = {
  llmModels: string[];
  embeddingModels: string[];
};

export const getFastGptInitData = async () => {
  const res = await axios.get(
    getFastGptEndpoint() + '/api/common/system/getInitData',
    {
      headers: {
        Authorization: 'Bearer ' + getFastGptApiKey()
      }
    }
  );
  const models = {
    llmModels: [],
    embeddingModels: [],
  };

  res.data.data.activeModelList.forEach((model: any) => {
    if (model.aiSearch) {
      if (model.type === 'embedding') {
        models.embeddingModels.push(model.model);
      } else if (model.type === 'llm') {
        models.llmModels.push({
          model: model.model,
          maxContext: model.maxContext,
          maxTemperature: model.maxTemperature,
        });
      }
    }
  });
  return models;
};
