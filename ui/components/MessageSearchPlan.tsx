import React, { useEffect, useState } from 'react';
import Markdown from 'markdown-to-jsx';
import { cn } from '@/lib/utils';

const MessageSearchPlan = ({ searchPlan }: { searchPlan: {} }) => {
  const [details, setDetails] = useState('');
  const convertToMarkdown = (obj: any) => {
    let markdown = '';

    for (const key in obj) {
      if (Array.isArray(obj[key])) {
        markdown += `### ${replaceKey(key)}\n`;
        markdown += obj[key].map((item: string) => `- ${item}\n`).join('');
      } else if (typeof obj[key] === 'object') {
        markdown += `### ${replaceKey(key)}\n`;
        markdown += convertToMarkdown(obj[key]);
      } else {
        markdown += `### ${replaceKey(key)}\n- ${obj[key]}\n\n`;
      }
    }
    return markdown;
  };

  const replaceKey = (key: string) => {
    if (key === 'comprehensiveQuery') {
      return 'Main Query';
    } else if (key === 'subQueries') {
      return 'Sub Query';
    } else {
      return key;
    }
  };
  useEffect(() => {
    setDetails(convertToMarkdown(searchPlan));
  }, [searchPlan]);

  return (
    <Markdown
      className={cn(
        'prose dark:prose-invert prose-p:leading-relaxed prose-pre:p-0',
        'max-w-none break-words text-black dark:text-white text-sm md:text-base font-medium',
      )}
    >
      {details}
    </Markdown>
  );
};

export default MessageSearchPlan;
