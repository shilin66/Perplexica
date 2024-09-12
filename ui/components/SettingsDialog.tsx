import { cn } from '@/lib/utils';
import { Dialog, Transition } from '@headlessui/react';
import { CloudUpload, RefreshCcw, RefreshCw } from 'lucide-react';
import React, {
  Fragment,
  type SelectHTMLAttributes,
  useEffect,
  useState,
} from 'react';
import { Slider } from 'antd';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = ({ className, ...restProps }: InputProps) => {
  return (
    <input
      {...restProps}
      className={cn(
        'bg-light-secondary dark:bg-dark-secondary px-3 py-2 flex items-center overflow-hidden border border-light-200 dark:border-dark-200 dark:text-white rounded-lg text-sm',
        className,
      )}
    />
  );
};

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  options: { value: string; label: string; disabled?: boolean }[];
}

export const Select = ({ className, options, ...restProps }: SelectProps) => {
  return (
    <select
      {...restProps}
      className={cn(
        'bg-light-secondary dark:bg-dark-secondary px-3 py-2 flex items-center overflow-hidden border border-light-200 dark:border-dark-200 dark:text-white rounded-lg text-sm',
        className,
      )}
    >
      {options.map(({ label, value, disabled }) => {
        return (
          <option key={value} value={value} disabled={disabled}>
            {label}
          </option>
        );
      })}
    </select>
  );
};

interface SettingsType {
  chatModelProviders: {
    [key: string]: any[];
  };
  embeddingModelProviders: {
    [key: string]: string[];
  };
  openaiApiKey: string;
  groqApiKey: string;
  anthropicApiKey: string;
  ollamaApiUrl: string;
}

const SettingsDialog = ({
  isOpen,
  setIsOpen,
}: {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
}) => {
  const [config, setConfig] = useState<SettingsType | null>(null);
  const [selectedChatModelProvider, setSelectedChatModelProvider] = useState<
    string | null
  >(null);
  const [selectedChatModel, setSelectedChatModel] = useState<string | null>(
    null,
  );
  const [selectedEmbeddingModelProvider, setSelectedEmbeddingModelProvider] =
    useState<string | null>(null);
  const [selectedEmbeddingModel, setSelectedEmbeddingModel] = useState<
    string | null
  >(null);
  const [customOpenAIApiKey, setCustomOpenAIApiKey] = useState<string>('');
  const [customOpenAIBaseURL, setCustomOpenAIBaseURL] = useState<string>('');
  const [temperature, setTemperature] = useState<number>(0.5);
  const [contextSize, setContextSize] = useState<number>(8192);
  const [isLoading, setIsLoading] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const fetchConfig = async () => {
        setIsLoading(true);
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/config`, {
          headers: {
            'Content-Type': 'application/json',
          },
        });

        const data = (await res.json()) as SettingsType;
        setConfig(data);

        const chatModelProvidersKeys = Object.keys(
          data.chatModelProviders || {},
        );
        const embeddingModelProvidersKeys = Object.keys(
          data.embeddingModelProviders || {},
        );

        const defaultChatModelProvider =
          chatModelProvidersKeys.length > 0 ? chatModelProvidersKeys[0] : '';
        const defaultEmbeddingModelProvider =
          embeddingModelProvidersKeys.length > 0
            ? embeddingModelProvidersKeys[0]
            : '';

        const chatModelProvider = 'openai';
        const chatModel =
          localStorage.getItem('chatModel') ||
          (data.chatModelProviders &&
            data.chatModelProviders[chatModelProvider]?.[0].modelName) ||
          '';
        const temperature = parseFloat(
          localStorage.getItem('temperature') || '0.5',
        );
        const contextSize = parseInt(
          localStorage.getItem('contextSize') || '8192',
        );
        const embeddingModelProvider = 'openai';
        const embeddingModel =
          localStorage.getItem('embeddingModel') ||
          (data.embeddingModelProviders &&
            data.embeddingModelProviders[embeddingModelProvider]?.[0]) ||
          '';

        console.log('chatModel', chatModel);
        setSelectedChatModelProvider(chatModelProvider);
        setSelectedChatModel(chatModel);
        setSelectedEmbeddingModelProvider(embeddingModelProvider);
        setSelectedEmbeddingModel(embeddingModel);
        setCustomOpenAIApiKey(localStorage.getItem('openAIApiKey') || '');
        setCustomOpenAIBaseURL(localStorage.getItem('openAIBaseURL') || '');
        setTemperature(temperature);
        setContextSize(contextSize);
        setIsLoading(false);
      };

      fetchConfig();
      console.log(selectedChatModel);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const handleSubmit = async () => {
    setIsUpdating(true);

    try {
      // await fetch(`${process.env.NEXT_PUBLIC_API_URL}/config`, {
      //   method: 'POST',
      //   headers: {
      //     'Content-Type': 'application/json',
      //   },
      //   body: JSON.stringify(config),
      // });

      localStorage.setItem('chatModelProvider', 'openai');
      localStorage.setItem('chatModel', selectedChatModel!);
      localStorage.setItem('temperature', String(temperature!));
      localStorage.setItem('contextSize', String(contextSize!));
      localStorage.setItem('embeddingModelProvider', 'openai');
      localStorage.setItem('embeddingModel', selectedEmbeddingModel!);
      localStorage.setItem('openAIApiKey', customOpenAIApiKey!);
      localStorage.setItem('openAIBaseURL', customOpenAIBaseURL!);
    } catch (err) {
      console.log(err);
    } finally {
      setIsUpdating(false);
      setIsOpen(false);

      window.location.reload();
    }
  };

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog
        as="div"
        className="relative z-50"
        onClose={() => setIsOpen(false)}
      >
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-white/50 dark:bg-black/50" />
        </Transition.Child>
        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-200"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-100"
              leaveFrom="opacity-100 scale-200"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-md transform rounded-2xl bg-light-secondary dark:bg-dark-secondary border border-light-200 dark:border-dark-200 p-6 text-left align-middle shadow-xl transition-all">
                <Dialog.Title className="text-xl font-medium leading-6 dark:text-white">
                  Settings
                </Dialog.Title>
                {config && !isLoading && (
                  <div className="flex flex-col space-y-4 mt-6">
                    <div className="flex flex-col space-y-1">
                      <p className="text-black/70 dark:text-white/70 text-sm">
                        Chat Model
                      </p>
                      <Select
                        value={selectedChatModel ?? undefined}
                        onChange={(e) => setSelectedChatModel(e.target.value)}
                        options={(() => {
                          const chatModelProvider =
                            config.chatModelProviders['openai'];

                          return chatModelProvider
                            ? chatModelProvider.length > 0
                              ? chatModelProvider.map((model) => ({
                                  value: model.modelName,
                                  label: model.modelName,
                                }))
                              : [
                                  {
                                    value: '',
                                    label: 'No models available',
                                    disabled: true,
                                  },
                                ]
                            : [
                                {
                                  value: '',
                                  label:
                                    'Invalid provider, please check backend logs',
                                  disabled: true,
                                },
                              ];
                        })()}
                      />
                    </div>
                    <div className="flex flex-col space-y-1">
                      <p className="text-black/70 dark:text-white/70 text-sm">
                        Temperature
                      </p>
                      <Slider
                        defaultValue={temperature}
                        min={0}
                        step={0.1}
                        max={
                          config.chatModelProviders?.['openai']?.find(
                            (item) => item.modelName === selectedChatModel,
                          )?.maxTemperature ?? 2
                        }
                        onChange={(value) => setTemperature(value)}
                      />
                    </div>
                    <div className="flex flex-col space-y-1">
                      <p className="text-black/70 dark:text-white/70 text-sm">
                        Max Context
                      </p>
                      <Slider
                        defaultValue={contextSize}
                        min={0}
                        step={1}
                        max={
                          config.chatModelProviders?.['openai']?.find(
                            (item) => item.modelName === selectedChatModel,
                          )?.maxContext ?? 8192
                        }
                        onChange={(value) => setContextSize(value)}
                      />
                    </div>
                    <div className="flex flex-col space-y-1">
                      <p className="text-black/70 dark:text-white/70 text-sm">
                        Embedding Model
                      </p>
                      <Select
                        value={selectedEmbeddingModel ?? undefined}
                        onChange={(e) =>
                          setSelectedEmbeddingModel(e.target.value)
                        }
                        options={(() => {
                          const embeddingModelProvider =
                            config.embeddingModelProviders['openai'];

                          return embeddingModelProvider
                            ? embeddingModelProvider.length > 0
                              ? embeddingModelProvider.map((model) => ({
                                  label: model,
                                  value: model,
                                }))
                              : [
                                  {
                                    label: 'No embedding models available',
                                    value: '',
                                    disabled: true,
                                  },
                                ]
                            : [
                                {
                                  label:
                                    'Invalid provider, please check backend logs',
                                  value: '',
                                  disabled: true,
                                },
                              ];
                        })()}
                      />
                    </div>
                  </div>
                )}
                {isLoading && (
                  <div className="w-full flex items-center justify-center mt-6 text-black/70 dark:text-white/70 py-6">
                    <RefreshCcw className="animate-spin" />
                  </div>
                )}
                <div className="w-full mt-6 space-y-2">
                  <p className="text-xs text-black/50 dark:text-white/50">
                    We&apos;ll refresh the page after updating the settings.
                  </p>
                  <button
                    onClick={handleSubmit}
                    className="bg-[#24A0ED] flex flex-row items-center space-x-2 text-white disabled:text-white/50 hover:bg-opacity-85 transition duration-100 disabled:bg-[#ececec21] rounded-full px-4 py-2"
                    disabled={isLoading || isUpdating}
                  >
                    {isUpdating ? (
                      <RefreshCw size={20} className="animate-spin" />
                    ) : (
                      <CloudUpload size={20} />
                    )}
                  </button>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
};

export default SettingsDialog;
