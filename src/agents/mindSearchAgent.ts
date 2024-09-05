import { BaseMessage } from '@langchain/core/messages';
import {
  ChatPromptTemplate,
  MessagesPlaceholder,
  PromptTemplate,
} from '@langchain/core/prompts';
import {
  RunnableLambda,
  RunnableMap,
  RunnableSequence,
} from '@langchain/core/runnables';
import { StringOutputParser } from '@langchain/core/output_parsers';
import type { StreamEvent } from '@langchain/core/tracers/log_stream';
import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import type { Embeddings } from '@langchain/core/embeddings';
import formatChatHistoryAsString from '../utils/formatHistory';
import eventEmitter from 'events';
import logger from '../utils/logger';
import { searchSearxng } from '../lib/searxng';
import { Document } from '@langchain/core/documents';
import { getDocumentsFromLinks } from '../lib/linkDocument';
import { rerankDocs } from '../lib/docProcess';
import { IterableReadableStream } from '@langchain/core/utils/stream';
import LineOutputParser from '../lib/outputParsers/lineOutputParser';

const plannerPrompt = `
你是一个任务分解器并且具有互联网搜索的能力。
你需要理解用户的问题，根据问题的复杂程度，将用户的问题拆分成2个以上简单的，独立并且没有相互依赖的子任务，去获取充分的信息以解决问题。
对于每个子任务，你需要根据你的能力判断是否需要进行联网搜索获取信息来完成这个任务，如果需要搜索你需要生成对应搜索条件，可以多个条件，以确保你能获取到足够的信息来完成这个任务。
答案必须是一个\`plans\`XML块中包含这个格式的JSON数组: [{{"planName":"","needSearch": true/false, "searchKeys":[]}}]，不能出现其它的任何内容，字符等。

下面的\`examples\`XML块中有几个示例供您参考

<example>
1.问题：
<question>
如何保证redis和mysql的数据一致性
</question>

答案：
<plans>
[
  {{
    "needSearch": true,
    "planName": "研究Redis和MySQL的数据一致性策略",
    "searchKeys": [
      "Redis MySQL 数据一致性策略"
    ]
  }},
  {{
    "needSearch": true,
    "planName": "了解事务和锁机制在Redis和MySQL中的应用",
    "searchKeys": [
      "事务 锁机制 Redis MySQL"
    ]
  }}
]
</plans>

2.问题：
<question>
如何评价巴黎奥运会开幕式
</question>

答案：
<plans>
[
  {{
    "needSearch": true,
    "planName": "收集巴黎奥运会开幕式的基本信息",
    "searchKeys": [
      "巴黎奥运会开幕式基本信息"
    ]
  }},
  {{
    "needSearch": true,
    "planName": "查找专业评论和观众反馈",
    "searchKeys": [
      "巴黎奥运会开幕式 专业评论",
      "巴黎奥运会开幕式 观众反馈"
    ]
  }},
  {{
    "needSearch": true,
    "planName": "分析开幕式的技术和创意亮点",
    "searchKeys": [
      "巴黎奥运会开幕式 技术亮点",
      "巴黎奥运会开幕式 创意亮点"
    ]
  }}
]
</plans>
</example>

下面的任何内容都是实际对话的一部分，你需要使用对话和问题，根据上面分享的指导原则，将问题分解成计划
<conversation>
{chat_history}
</conversation>

问题:
<question>
{query}
</question>

答案: 
`;

const mindPrompt = `
你是一个思维导图专家，你的任务是根据用户输入的问题，结合你自己掌握的知识和\`context\` XML标签中提供的文本，生成一个思维导图。

### 回复计划:
1. **理解和分析用户查询和上下文conext:**
   - 查看在“context”XML块中提供的文本。
   - 识别与用户问题最相关的信息。
2. **制作一个符合要求的思维导图:**
   - 回复需要使用标准的markdown格式
   - 将用户问题作为思维导图的根节点，围绕根节点展开
   - 整个思维导图的逻辑要求有深度
   - 同一级别的节点数最好不超过10个
   - 思维导图的节点不能有重复，不要有总结之类的节点
   - 每个节点的内容要求简洁精炼，不能过长
   - 不能出现代码块\`\`\`相关的符号，内容
3. **回答内容**
   - 只需要返回最终生成的思维导图，不能出现其它内容，文本等   

<context>
{context}
</context>

下面的\`examples\`XML块中有一个思维导图示例供您参考
<example>
# 保证Redis和MySQL数据一致性的策略

## 一致性模型
- ACID特性
  - 原子性
  - 一致性
  - 隔离性
  - 持久性
- 最终一致性
  - 短暂不一致
  - 最终收敛

## 同步机制
- 主从复制
- 发布/订阅模式
- 定期检查和数据校验

## 错误处理和容错机制
- 异常情况应对
- 数据库故障恢复策略

## 读写在数据和多级缓存
### 读写分离
- 主从复制
### 缓存层级设计
- Redis缓存

## 应用层面的控制
### 并发控制机制
  - 锁或悲观锁定

## 监控和报警
- 实时监控系统
- 异常状况警报

## 数据同步方法
- MySQL触发器与UDF函数
- 解析MySQL binlog
- 过期时间设置
- 定时刷新缓存
- 消息队列同步
- Canal的使用
</example>

### 自我完善阶段:
1. **评估回答:**
   - 回答是否全面、详细，并与用户问题一致?
   - 它是否遵循结构化的回答，是否组织良好，并具有规范的markdown格式?
   - 是否有重复的思维导图节点
2. **确定需要改进的地方:**
   - 回答的哪些具体方面可以加强以获得更好的清晰度、细节
3. **回答:**
   - 根据已确定的需要改进的地方，在必要时进一步修改.

以下是你的回答：
`;

const basicWebSearchResponsePrompt = `
You are Perplexica, an AI model specialized in answering user queries with detailed, informative, and relevant responses.

### 回复计划:
1. **理解和分析用户查询query和上下文conext:**
   - 查看在\`context\`XML块中提供的搜索结果。
   - 识别与用户查询\`query\`XML块最相关的信息。
2. **理解和分析大纲mindMap:**
   - 充分理解在\`mindMap\`XML块中提供MarkDown格式的大纲。
3. **制定一个结构化的回应:**
   - **引言:** 以主题或查询的简要介绍开始。
   - **主要内容:** 提供详细、全面的解释，涵盖问题的各个方面。以中长回复为目标，按照\`mindMap\`XML块中定义的大纲回复，对思维导图的每一个点作出充分的解释和必要的扩展。
   - **结论:** 总结主要要点或提供一个结束语来总结回应。
4. **确保彻底性和深度:**
   - 在必要的地方扩展解释，以确保回应是全面的。
   - 避免给出简短的答案。总是以提供更多细节和背景为目标。
   
### 质量指南(自我改进的问题格式):
1. **交互质量:**
   - **相关性:**回复是否准确地解释和解决了查询?
   - **清晰度:**回复是否清晰且易于用户理解?
   - **有用性:**回复是否提供了有效引导用户的深入信息?
   - **用户体验:**用户的交互是否直观?
2. **内容相关性:**
   - **深度:**内容是否全面覆盖查询并提供详细解释?
   - **准确性:**内容是否事实正确并经过充分研究?
   - **权威:**内容的来源是否信誉良好和可靠?
 
<query>
{query}
</query>

<context>
{context}
</context>

<mindMap>
{mindGraph}
</mindMap>

### 自我完善阶段:
1. **评估回答:**
   - 回答是否全面、详细，并与查询一致?
   - 它是否遵循结构化的回答，是否组织良好，并具有适当的markdown格式?
2. **确定需要改进的地方:**
   - 回答的哪些具体方面可以加强以获得更好的清晰度、细节或引用准确性?
3. **回答:**
   - 根据已确定的需要改进的地方，在必要时进一步完善和扩展响应.

今天的日期是 ${new Date().toISOString()}.
`;

const strParser = new StringOutputParser();

const handleStream = async (
  stream: IterableReadableStream<StreamEvent>,
  emitter: eventEmitter,
) => {
  let result: any;
  let cancel = false;
  emitter.on('end', () => {
    cancel = true;
  });
  for await (const event of stream) {
    if (cancel) {
      return;
    }
    if (event.event === 'on_chain_end' && event.name === 'MakePlan') {
      try {
        const plans = event.data.output;
        emitter.emit('data', JSON.stringify({ type: 'makePlan', data: plans }));
      } catch (e) {
        logger.error('searchPlan Err', e);
      }
    }
    if (event.event === 'on_chain_end' && event.name === 'ExecutePlan') {
      emitter.emit(
        'data',
        JSON.stringify({
          type: 'executePlan',
          data: event.data.output.context,
        }),
      );
    }
    if (event.event === 'on_chain_end' && event.name === 'MindGraph') {
      emitter.emit(
        'data',
        JSON.stringify({ type: 'mindGraph', data: event.data.output }),
      );
    }
    if (
      event.event === 'on_chain_end' &&
      event.name === 'FinalSourceRetriever'
    ) {
      emitter.emit(
        'data',
        JSON.stringify({ type: 'sources', data: event.data.output }),
      );
    }
    if (
      event.event === 'on_chain_stream' &&
      event.name === 'FinalResponseGenerator'
    ) {
      emitter.emit(
        'data',
        JSON.stringify({ type: 'response', data: event.data.chunk }),
      );
    }

    if (event.event === 'on_llm_stream' && event.name === 'PlanAnswer') {
      const planName = event.metadata.planName;
      if (result) {
        result += event.data.chunk.content;
      } else {
        result = event.data.chunk.content;
      }
      emitter.emit(
        'data',
        JSON.stringify({
          type: 'planAnswer',
          data: { answer: event.data.chunk.content, planName },
        }),
      );
    }
    if (event.event === 'on_llm_stream' && event.name === 'GenerateMind') {
      if (result) {
        result += event.data.chunk.content;
      } else {
        result = event.data.chunk.content;
      }
      emitter.emit(
        'data',
        JSON.stringify({
          type: 'generateMind',
          data: event.data.chunk.content,
        }),
      );
    }
    if (event.event === 'on_llm_end' && event.name === 'GenerateMind') {
      emitter.emit(
        'data',
        JSON.stringify({ type: 'mindGraph', data: event.data.output }),
      );
    }

    if (
      event.event === 'on_chain_end' &&
      event.name === 'FinalResponseGenerator'
    ) {
      emitter.emit('end');
    }
  }
  return result;
};

type BasicChainInput = {
  chat_history: BaseMessage[];
  query: string;
};

const createPlanMakeChain = (llm: BaseChatModel, emitter: eventEmitter) => {
  return RunnableSequence.from([
    PromptTemplate.fromTemplate(plannerPrompt),
    llm,
    strParser,
    RunnableLambda.from(async (input: string) => {
      logger.info('createPlanMakeChain=>' + input);

      const plansOutputParser = new LineOutputParser({
        key: 'plans',
      });
      let plans = await plansOutputParser.parse(input);
      if (plans.endsWith('"')) {
        plans = plans.slice(0, -1);
      }
      try {
        return JSON.parse(plans);
      } catch (e) {
        emitter.emit(
          'error',
          JSON.stringify({
            data: 'An error has occurred please try again later',
          }),
        );
        logger.error('createPlanMakeChain Error ', e);
        return;
      }
    }),
  ]);
};

const createSearchChain = (
  llm: BaseChatModel,
  embeddings: Embeddings,
  emitter: eventEmitter,
) => {
  const processDocs = async (docs: Document[]) => {
    return docs.map((doc) => {
      return {
        url: doc.metadata.url,
        title: doc.metadata.title,
        content: doc.pageContent,
      };
    });
  };
  const doSearch = async (input: any) => {
    logger.info('executePlan input=>' + JSON.stringify(input));
    const plans = input.context as any[];
    const results = [];
    for (const searchPlan of plans) {
      // if not needsearch
      if (!searchPlan.needSearch) {
        results.push(searchPlan);
        continue;
      }
      const allDocs = (
        await Promise.all(
          searchPlan.searchKeys.map(async (inputItem) => {
            const res = await searchSearxng(inputItem);

            return res.results.map(
              (result) =>
                new Document({
                  pageContent: result.content,
                  metadata: {
                    title: result.title,
                    url: result.url,
                    ...(result.img_src && { img_src: result.img_src }),
                  },
                }),
            );
          }),
        )
      ).flat();

      const docs: Document[] = [];
      const seenUrls = new Set();

      allDocs.forEach((doc) => {
        const url = doc.metadata.url;
        if (!seenUrls.has(url)) {
          seenUrls.add(url);
          docs.push(doc);
        }
      });
      const rerankedDocs = await rerankDocs({
        query: searchPlan.planName,
        docs: docs,
        embeddings,
        returnSize: 5,
        weight: 0.5,
      });
      searchPlan.searchResult = await processDocs(rerankedDocs);
      results.push(searchPlan);
      emitter.emit(
        'data',
        JSON.stringify({
          type: 'doSearch',
          data: {
            planName: searchPlan.planName,
            searchResult: searchPlan.searchResult,
          },
        }),
      );
    }
    return results;
  };
  return RunnableLambda.from(doSearch);
};

const createExecutePlanChain = (
  llm: BaseChatModel,
  embeddings: Embeddings,
  emitter: eventEmitter,
) => {
  return RunnableLambda.from(async (input: any) => {
    logger.info('createExecutePlanChain=>' + JSON.stringify(input));
    const query = input.query;
    const plans = input.context as any[];
    for (const plan of plans) {
      try {
        logger.info('<===---------------======>' + plan.planName);
        let webAnswer = [];
        if (plan.needSearch) {
          const links = plan.searchResult.map((searchResult) => {
            return searchResult.url;
          });
          const linkDocs = await getDocumentsFromLinks({ links });
          const docGroups: Document[] = [];
          const rerankedDocs = await rerankDocs({
            query: plan.planName,
            docs: linkDocs,
            embeddings,
            returnSize: -1,
            weight: 0.5,
          });
          rerankedDocs.map((doc) => {
            const URLDocExists = docGroups.find(
              (d) =>
                d.metadata.url === doc.metadata.url &&
                d.metadata.totalDocs < 10,
            );

            if (!URLDocExists) {
              docGroups.push({
                ...doc,
                metadata: {
                  ...doc.metadata,
                  totalDocs: 1,
                },
              });
            }

            const docIndex = docGroups.findIndex(
              (d) =>
                d.metadata.url === doc.metadata.url &&
                d.metadata.totalDocs < 10,
            );

            if (docIndex !== -1) {
              docGroups[docIndex].pageContent =
                docGroups[docIndex].pageContent + `\n\n` + doc.pageContent;
              docGroups[docIndex].metadata.totalDocs += 1;
            }
          });
          await Promise.all(
            docGroups.map(async (doc) => {
              const res = await llm.invoke(`
              你是一个文本分析者，擅长根据用户问题从指定的文本中分析出答案。
              您将得到一个“query”XML块，其中包含用户的查询。
              你需要从提供“text”XML块中找总结出符合用户查询的答案。
              答案要求准确，精炼，不能遗漏任何关键点。
              如果提供的文本不包含有关查询的信息，你的答案只能是\`nothing\`，不能出现其它内容。
              只返回答案，不返回任何其他消息、文本或XML块。
  
              <query>
              ${plan.planName}
              </query>
  
              <text>
              ${doc.pageContent}
              </text>
  
              确保查询的答案来自于提供的文本
            `);
              logger.info(('docGroupsSummary=>' + res.content) as string);
              if (res.content !== 'nothing') {
                webAnswer.push((res.content as string).trim());
              }
            }),
          );
        }

        if (webAnswer.length === 0 && plan.needSearch) {
          emitter.emit(
            'data',
            JSON.stringify({
              type: 'planAnswer',
              data: {
                planName: plan.planName,
                answer: 'Unknown',
              },
            }),
          );
        } else {
          let stream: IterableReadableStream<StreamEvent>;
          if (plan.needSearch) {
            const planAnswer = webAnswer.join('\n\n');
            stream = llm
              .withConfig({
                runName: 'PlanAnswer',
                metadata: {
                  planName: plan.planName,
                },
              })
              .streamEvents(
                `
            您是一个文本总结者。您需要对 \`text\` XML 块中提供的文本进行总结。
            您需要确保在总结文本时不会遗漏任何要点。
            只返回总结的文本，而不返回任何其他信息、文本或 XML 块。
            你的回答需要符合标准的markdown格式

            <text>
            ${planAnswer}
            </text>
          `,
                {
                  version: 'v1',
                },
              );
          } else {
            stream = llm
              .withConfig({
                runName: 'PlanAnswer',
                metadata: {
                  planName: plan.planName,
                },
              })
              .streamEvents(
                `
              <query>
              ${plan.planName}
              </query>
              Make sure to answer the query.
            `,
                {
                  version: 'v1',
                },
              );
          }
          plan.answer = await handleStream(stream, emitter);
        }
        emitter.emit(
          'data',
          JSON.stringify({
            type: 'planAnswer',
            data: { planName: plan.planName, status: 'finished' },
          }),
        );
        plan.status = 'finished';
        logger.info('================>' + plan.planName);
      } catch (e) {
        plan.answer = 'Unknown';
        emitter.emit(
          'data',
          JSON.stringify({
            type: 'planAnswer',
            data: { planName: plan.planName, answer: 'Unknown' },
          }),
        );
        emitter.emit(
          'data',
          JSON.stringify({
            type: 'planAnswer',
            data: { planName: plan.planName, status: 'finished' },
          }),
        );
        plan.status = 'finished';
        logger.error(plan.planName, ': 执行异常', e);
      }
    }
    logger.info('createExecutePlanChainReturn=>' + JSON.stringify(input));
    return input;
  });
};

const buildInput = (input: any) => {
  input.context = input.context.map((plan) => {
    return plan.answer;
  });
  return input;
};

const createMindChain = (llm: BaseChatModel, emitter: eventEmitter) => {
  return RunnableSequence.from([
    ChatPromptTemplate.fromMessages([
      ['system', mindPrompt],
      ['user', '{query}'],
    ]),
    RunnableLambda.from(async (input: any) => {
      const streamEvents = llm
        .withConfig({ runName: 'GenerateMind' })
        .streamEvents(input, {
          version: 'v1',
        });
      return await handleStream(streamEvents, emitter);
    }),
    llm,
    strParser,
  ]);
};

const createBasicWebSearchAnsweringChain = (
  llm: BaseChatModel,
  embeddings: Embeddings,
  emitter: eventEmitter,
) => {
  const planChain = createPlanMakeChain(llm, emitter);
  const searchChain = createSearchChain(llm, embeddings, emitter);
  const executePlanChain = createExecutePlanChain(llm, embeddings, emitter);
  const mindChain = createMindChain(llm, emitter);

  return RunnableSequence.from([
    RunnableMap.from({
      query: (input: BasicChainInput) => input.query,
      chat_history: (input: BasicChainInput) => input.chat_history,
      context: RunnableSequence.from([
        (input) => ({
          query: input.query,
          chat_history: formatChatHistoryAsString(input.chat_history),
        }),
        planChain.withConfig({
          runName: 'MakePlan',
        }),
      ]),
    }),
    RunnableMap.from({
      query: (input: any) => input.query,
      chat_history: (input: any) => input.chat_history,
      context: RunnableSequence.from([
        (input) => ({
          query: input.query,
          chat_history: formatChatHistoryAsString(input.chat_history),
          context: input.context,
        }),
        searchChain.withConfig({
          runName: 'searchPlan',
        }),
      ]),
    }),
    executePlanChain.withConfig({ runName: 'ExecutePlan' }),
    buildInput,
    RunnableMap.from({
      query: (input: any) => input.query,
      chat_history: (input: any) => input.chat_history,
      context: (input: any) => input.context,
      mindGraph: mindChain.withConfig({
        runName: 'MindGraph',
      }),
    }),
    ChatPromptTemplate.fromMessages([
      ['system', basicWebSearchResponsePrompt],
      new MessagesPlaceholder('chat_history'),
      ['user', '{query}'],
    ]),
    llm,
    strParser,
  ]).withConfig({
    runName: 'FinalResponseGenerator',
  });
};

const basicSearch = (
  query: string,
  history: BaseMessage[],
  llm: BaseChatModel,
  embeddings: Embeddings,
) => {
  const emitter = new eventEmitter();
  try {
    const basicWebSearchAnsweringChain = createBasicWebSearchAnsweringChain(
      llm,
      embeddings,
      emitter,
    );

    const stream = basicWebSearchAnsweringChain.streamEvents(
      {
        chat_history: history,
        query: query,
      },
      {
        version: 'v1',
      },
    );

    handleStream(stream, emitter);
  } catch (err) {
    emitter.emit(
      'error',
      JSON.stringify({ data: 'An error has occurred please try again later' }),
    );
    logger.error(`Error in websearch: ${err}`);
  }

  return emitter;
};

const handleMindSearch = (
  message: string,
  history: BaseMessage[],
  llm: BaseChatModel,
  embeddings: Embeddings,
) => {
  const emitter = basicSearch(message, history, llm, embeddings);
  return emitter;
};

export default handleMindSearch;
