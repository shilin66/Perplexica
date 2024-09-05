import React, { useEffect, useState, useRef } from 'react';
import { Document } from '@langchain/core/documents';
import MessageSources from '@/components/MessageSources';
import { Card, Flex, Tag } from 'antd';
import { cn } from '@/lib/utils';
import Markdown from 'markdown-to-jsx';
import {
  CheckCircleOutlined,
  Loading3QuartersOutlined,
} from '@ant-design/icons';

const TaskDetail = ({ plan }: { plan: any }) => {
  const [sources, setSources] = useState<Document[]>();
  const [planAnswer, setPlanAnswer] = useState<string>('');
  const answerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (plan.searchResult) {
      setSources(
        plan.searchResult.map(
          (item: any) =>
            new Document({
              pageContent: item.content,
              metadata: {
                title: item.title,
                url: item.url,
              },
            }),
        ),
      );
    }
    if (plan.answer) {
      setPlanAnswer(plan.answer);
    }
  }, [plan]);

  return (
    <>
      <Flex vertical gap="small">
        <Card
          title="搜索关键字"
          extra={
            sources && sources.length > 0 ? (
              <CheckCircleOutlined style={{ color: 'green' }} />
            ) : (
              plan.needSearch && (
                <Loading3QuartersOutlined spin style={{ color: 'blue' }} />
              )
            )
          }
          bordered={false}
          size={'small'}
        >
          <Flex vertical={false} gap="small">
            {plan.searchKeys && plan.searchKeys.length > 0 ? (
              plan.searchKeys.map((item: any) => (
                <Tag color="gold" key={item}>
                  {item}
                </Tag>
              ))
            ) : (
              <p>无需搜索</p>
            )}
          </Flex>
        </Card>
        {sources && sources.length > 0 && (
          <Card
            title="分析网页内容"
            bordered={false}
            size={'small'}
            extra={
              plan?.status === 'finished' ? (
                <CheckCircleOutlined style={{ color: 'green' }} />
              ) : (
                plan.needSearch && (
                  <Loading3QuartersOutlined spin style={{ color: 'blue' }} />
                )
              )
            }
          >
            <MessageSources sources={sources} />
          </Card>
        )}
        {planAnswer && planAnswer.length > 0 && (
          <Card title="计划执行结果" bordered={false} size={'small'}>
            <div ref={answerRef} className="answer-content">
              <Markdown
                className={cn(
                  'prose dark:prose-invert prose-p:leading-relaxed prose-pre:p-0',
                  'max-w-none break-words text-black dark:text-white text-sm font-mono',
                )}
              >
                {planAnswer}
              </Markdown>
            </div>
          </Card>
        )}
      </Flex>
    </>
  );
};

export default TaskDetail;
