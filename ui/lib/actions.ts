import { Message } from '@/components/ChatWindow';
import { ContextConfig } from '@/app/GlobalContext';

export const getSuggestions = async (
  chatHisory: Message[],
  pConfig: ContextConfig | null,
) => {
  const chatModel = localStorage.getItem('chatModel');
  const chatModelProvider = localStorage.getItem('chatModelProvider');

  const res = await fetch(`${pConfig?.apiUrl}/suggestions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      chat_history: chatHisory,
      chat_model: chatModel,
      chat_model_provider: chatModelProvider,
    }),
  });

  const data = (await res.json()) as { suggestions: string[] };

  return data.suggestions;
};
