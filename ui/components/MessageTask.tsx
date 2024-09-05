import React, { useEffect, useState } from 'react';
import { Collapse, CollapseProps, ConfigProvider, Timeline } from 'antd';
import TaskDetail from '@/components/TaskDetail';
import { Loading3QuartersOutlined } from '@ant-design/icons';

const MessageTask = ({ executePlan }: { executePlan: any }) => {
  const [items, setItems] = useState<{}[]>([]);

  const covert2timeline = (executePlan: any) => {
    return executePlan.map((plan: any) => {
      const collapseItems: CollapseProps['items'] = [
        {
          key:
            plan.status === 'finished'
              ? plan.planName + '-finished'
              : plan.planName,
          label: plan.planName,
          children: <TaskDetail plan={{ ...plan }} />,
        },
      ];
      return {
        dot: !(plan.status === 'finished') ? (
          <Loading3QuartersOutlined spin />
        ) : null,
        children:
          plan.status === 'finished' ? (
            <Collapse bordered={false} items={collapseItems} />
          ) : (
            <Collapse
              bordered={false}
              items={collapseItems}
              defaultActiveKey={plan.planName}
            />
          ),
      };
    });
  };

  useEffect(() => {
    console.log('executePlan===', JSON.stringify(executePlan));
    setItems(covert2timeline(executePlan));
  }, [executePlan]);

  return (
    <ConfigProvider
      theme={{
        components: {
          Timeline: {
            dotBg: 'transparent',
          },
        },
      }}
    >
      <Timeline items={items} />
    </ConfigProvider>
  );
};

export default MessageTask;
