'use client';

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from 'react';
import { RefreshCcw } from 'lucide-react';
import { toast } from 'sonner';

// 定义配置类型
export type ContextConfig = {
  apiUrl: string;
  wsUrl: string;
  basePath: string;
};

// 定义全局上下文类型
type GlobalContextType = {
  pConfig: ContextConfig | null;
};

// 创建 GlobalContext
const GlobalContext = createContext<GlobalContextType | undefined>(undefined);

// 创建 GlobalProvider
export const GlobalProvider = ({ children }: { children: ReactNode }) => {
  const [config, setConfig] = useState<ContextConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // 使用 fetch 获取 config.json
    fetch(`/pSearch/config/config.json`)
      .then((response) => {
        if (!response.ok) {
          throw new Error('Failed to load config.json');
        }
        return response.json();
      })
      .then((data: ContextConfig) => {
        setLoading(false);
        setConfig(data);
      })
      .catch((error) => {
        setError(error.message);
        toast('Fetch config error');
      });
  }, []);

  // 当配置正在加载时，不渲染子组件
  if (loading) {
    return (
      <div className="w-full h-screen flex items-center justify-center text-black/70 dark:text-white/70 ">
        <RefreshCcw className="animate-spin" />
      </div>
    );
  }

  // 当发生错误时，可以选择显示错误信息
  if (error) {
    return <div>Error loading config: {error}</div>;
  }

  return (
    <GlobalContext.Provider value={{ pConfig: config }}>
      {children}
    </GlobalContext.Provider>
  );
};

// 自定义 Hook 来使用全局上下文
export const useGlobalContext = () => {
  const context = useContext(GlobalContext);
  if (!context) {
    throw new Error('useGlobalContext must be used within a GlobalProvider');
  }
  return context;
};
