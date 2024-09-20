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
import { Document } from '@langchain/core/documents';
import { searchSearxng } from '../lib/searxng';
import type { StreamEvent } from '@langchain/core/tracers/log_stream';
import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import type { Embeddings } from '@langchain/core/embeddings';
import formatChatHistoryAsString from '../utils/formatHistory';
import eventEmitter from 'events';
import logger from '../utils/logger';
import LineListOutputParser from '../lib/outputParsers/listLineOutputParser';
import { getDocumentsFromLinks } from '../lib/linkDocument';
import LineOutputParser from '../lib/outputParsers/lineOutputParser';
import { rerankDocs } from '../lib/docProcess';

const basicSearchRetrieverPrompt = `
You are an AI question rephraser, and you can not use any outside tools. You will be given a conversation and a follow-up question,  you will have to rephrase the follow up question and can be used by another LLM to search the web for information to answer it.
If it is a smple writing task or a greeting (unless the greeting contains a question after it) like Hi, Hello, How are you, etc. than a question then you need to return \`not_needed\` as the response (This is because the LLM won't need to search the web for finding information on this topic).
If the user asks some question from some URL or wants you to summarize a PDF or a webpage (via URL) you need to return the links inside the \`links\` XML block and the question inside the \`question\` XML block.  
If the user wants to you to summarize the webpage or the PDF you need to return \`summarize\` inside the \`question\` XML block in place of a question and the link to summarize in the \`links\` XML block.

For questions that do not use a \`links\` xml block, you need to rewrite the problem according to the rules that describe the self-define phase in the \`self-define\` xml block below.
<self-define>
### Self-Define Phase:
1. **Understand the follow-up question:**
   - Identify key components of the follow-up question.

2. **Formulate Rephrased Questions:**
   - Create multiple sub questions that cover different aspects of the original question. 

3. **Advanced Search Logic:**
   - Generate a search sub query for each sub question.
   - Combine elements from each sub question to create a more complete and informative comprehensive search query that captures different facets of the original question.

4. **Finalize Question:**
   - Return the final question using a json Object of this format:
      {{
        "comprehensiveQuery": "a single, comprehensive query",
        "subQueries": [
          "sub query1",
          "sub query2",
          "sub query3"
        ]
      }}, you must place the json in \`question\` xml block.
   - The Json result can not  include any xml block.   
</self-define>

You must always return the rephrased question inside the \`question\` XML block, if there are no links in the follow-up question then don't insert a \`links\` XML block in your response.

There are several examples attached for your reference inside the below \`examples\` XML block
<examples>
1. Follow-up question: Can you tell me what is X from https://examplelinks.com?
Rephrased question:
<question>
Can you tell me what is X?
</question>

<links>
https://examplelinks.com
</links>

2. Hi, how are you?
Rephrased question:
<question>
not_needed
</question>

3. Follow-up question: How was the opening ceremony of the Paris Olympics.
Rephrased question: 
<question>
{{
  "comprehensiveQuery": "How was the opening ceremony of the Paris Olympics.",
  "subQueries": [
    "Olympics 2024 Paris opening ceremony details",
    "2024 Olympics Paris opening ceremony date and location",
    "Paris Olympics opening ceremony performance schedule"
  ]
}}
</question>

4. Follow-up question: Who is Musk.
Rephrased question: 
<question>
{{
  "comprehensiveQuery": "Who is Musk.",
  "subQueries": [
    "Musk's personal background",
    "Musk's career",
    "What is Elon Musk currently doing"
  ]
}}
</question>

</examples>

Anything below is the part of the actual conversation and you need to use conversation and the follow-up question to rephrase the follow-up question based on the guidelines shared above.
<conversation>
{chat_history}
</conversation>

Follow-up question: {query}
Rephrased question:
`;

const basicWebSearchResponsePrompt = `
You are Perplexica, an AI model specialized in searching the web and answering user queries with detailed, informative, and relevant responses.

### Guidelines for Quality (in Question Format for Self-Refine):

1. **Interaction Quality:**
   - **Relevance:** Does the response accurately interpret and address the query?
   - **Clarity:** Is the response clear and easy for the user to understand?
   - **Helpfulness:** Does the response provide in-depth information that guides the user effectively?
   - **User Experience:** Is the interaction intuitive and seamless for the user?

2. **Content Relevance:**
   - **Depth:** Does the content cover the query comprehensively with detailed explanations?
   - **Accuracy:** Is the content factually correct and well-researched?
   - **Authority:** Are the sources of the content reputable and reliable?

### Response Plan:

1. **Understand and Analyze Search Results:**
   - Review the search results provided in the \`context\` XML block.
   - Identify the most relevant information related to the user’s query.

2. **Formulate a Structured Response:**
   - **Introduction:** Start with a brief introduction to the topic or query.
   - **Main Content:** Provide a detailed and thorough explanation that covers all aspects of the query. Aim for medium to long responses.
   - **Supporting Information:** Use bullet points to list key points, facts, or additional insights.
   - **Conclusion:** Summarize the main takeaways or provide a closing statement that wraps up the response.

3. **Incorporate Proper Markdown Formatting:**
   - Use headers (e.g., \`##\`, \`###\`) to break down the response into sections.
   - Use bullet points or numbered lists for clarity and to organize information.
   - Include citations at the end of relevant sentences using [number] notation, which corresponds to the context source.

4. **Ensure Thoroughness and Depth:**
   - Expand on explanations where necessary to ensure the response is comprehensive.
   - Avoid giving short answers. Always aim to provide more detail and context.

### Example Response Structure:

\`\`\`markdown
## Introduction
Start with a brief introduction that provides context or background to the query.

## Detailed Explanation
- **Point 1:** Provide detailed information, ensuring depth and clarity.
- **Point 2:** Expand on additional aspects related to the query.

### Supporting Information
- Bullet points can be used to highlight key facts or important details.
- Ensure each point is well-explained and relevant.

## Conclusion
Summarize the main points and provide a closing statement.

*Citations:* 
- Just display the number and corresponding original title. Must ensure every part of the answer is cited using [1], [2], etc., corresponding to the search result numbers in the context. 
\`\`\`

### Handling Links and Summarization:
- If the query contains links and the user asks for information or summarization from those links, the content will be provided inside the \`context\` XML block. Use this content to generate your response.
- Ensure that every part of the answer is cited using the correct [number] notation corresponding to the search result in the context.
#### XML Block and Citations Example:
- If the context provided contains links and the user asks for information or a summary based on those links, your response should incorporate the XML content like this:

\`
<question>
Summarize
</question>

<links>
https://examplelinks.com
</links>

<context>
{context}
</context>
\`

- All citations should refer to the relevant number from the \`context\` block, like this:

\`
The capital of France is Paris [1].
\`


### Self-Refine Phase:
1. **Evaluate Written Response:**
   - Is the response comprehensive, detailed, and aligned with the query?
   - Does it follow the structured response plan, and is it well-organized with proper markdown formatting?

2. **Identify Areas for Improvement:**
   - What specific aspects of the response could be enhanced for better clarity, detail, or citation accuracy?

3. **Iterate Written Response:**
   - Refine and expand the response further if necessary, based on the identified areas for improvement.

If you find that there's nothing relevant in the search results, you can say, "Hmm, sorry, I could not find any relevant information on this topic. Would you like me to search again or ask something else?" This does not apply to summarization tasks.

Today's date is ${new Date().toISOString()}.
`;

const strParser = new StringOutputParser();

const handleStream = async (
  stream: AsyncGenerator<StreamEvent, any, unknown>,
  emitter: eventEmitter,
) => {
  let cancel = false;
  emitter.on('end', () => {
    cancel = true;
  });
  for await (const event of stream) {
    if (cancel) {
      return;
    }
    if (event.event === 'on_chain_end' && event.name === 'searchPlan') {
      try {
        const plan = JSON.parse(event.data.output.query);
        if (
          plan.hasOwnProperty('comprehensiveQuery') &&
          typeof plan === 'object'
        ) {
          emitter.emit(
            'data',
            JSON.stringify({ type: 'searchPlan', data: plan }),
          );
        }
      } catch (e) {
        // 如果解析失败，返回 false
        logger.error('searchPlan Err', e);
      }
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
    if (
      event.event === 'on_chain_end' &&
      event.name === 'FinalResponseGenerator'
    ) {
      emitter.emit('end');
    }
  }
};

type BasicChainInput = {
  chat_history: BaseMessage[];
  query: string;
};

const test = (a: any) => {
  logger.info('test=>' + a.query);
  return a;
};

const createBasicWebSearchRetrieverChain = (llm: BaseChatModel) => {
  return RunnableSequence.from([
    PromptTemplate.fromTemplate(basicSearchRetrieverPrompt),
    llm,
    strParser,
    RunnableLambda.from(async (input: string) => {
      logger.info('createBasicWebSearchRetrieverChain=>' + input);

      const linksOutputParser = new LineListOutputParser({
        key: 'links',
      });

      const questionOutputParser = new LineOutputParser({
        key: 'question',
      });

      const links = await linksOutputParser.parse(input);
      let question = await questionOutputParser.parse(input);

      if (question === 'not_needed') {
        return { query: '', docs: [] };
      }

      if (links.length > 0) {
        if (question.length === 0) {
          question = 'Summarize';
        }

        let docs = [];

        const linkDocs = await getDocumentsFromLinks({ links });

        const docGroups: Document[] = [];

        linkDocs.map((doc) => {
          const URLDocExists = docGroups.find(
            (d) =>
              d.metadata.url === doc.metadata.url && d.metadata.totalDocs < 10,
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
              d.metadata.url === doc.metadata.url && d.metadata.totalDocs < 10,
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
            You are a text summarizer. You need to summarize the text provided inside the \`text\` XML block. 
            You need to summarize the text into 1 or 2 sentences capturing the main idea of the text.
            You need to make sure that you don't miss any point while summarizing the text.
            You will also be given a \`query\` XML block which will contain the query of the user. Try to answer the query in the summary from the text provided.
            If the query says Summarize then you just need to summarize the text without answering the query.
            Only return the summarized text without any other messages, text or XML block.

            <query>
            ${question}
            </query>

            <text>
            ${doc.pageContent}
            </text>

            Make sure to answer the query in the summary.
          `);

            const document = new Document({
              pageContent: res.content as string,
              metadata: {
                title: doc.metadata.title,
                url: doc.metadata.url,
              },
            });

            docs.push(document);
          }),
        );

        return { query: question, docs };
      } else {
        let queryS: string[] = [];
        try {
          const tmp = JSON.parse(question);
          queryS = [tmp.comprehensiveQuery, ...tmp.subQueries];
        } catch (e) {
          logger.error('make search plan Err', e);
          queryS = [input];
          input = `{"comprehensiveQuery": "${input}"}`;
          logger.info('make search plan=>' + input);
        }

        // 定义一个docs数组，并行调用seachSearxng，最终返回到docs数组
        const allDocs = (
          await Promise.all(
            queryS.map(async (inputItem) => {
              const res = await searchSearxng(inputItem, {
                language: 'en',
              });

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
        // 对docs中的url进行去重
        const docs = [];
        const seenUrls = new Set();

        allDocs.forEach((doc) => {
          const url = doc.metadata.url;
          if (!seenUrls.has(url)) {
            seenUrls.add(url);
            docs.push(doc);
          }
        });
        return { query: question, docs };
      }
    }).withConfig({
      runName: 'searchPlan',
    }),
  ]);
};

const createBasicWebSearchAnsweringChain = (
  llm: BaseChatModel,
  embeddings: Embeddings,
) => {
  const basicWebSearchRetrieverChain = createBasicWebSearchRetrieverChain(llm);

  const processDocs = async (docs: Document[]) => {
    return docs
      .map(
        (_, index) =>
          `${index + 1}. title:${docs[index].metadata.title} \n pageContent: ${docs[index].pageContent}`,
      )
      .join('\n');
  };

  const rerank = async ({
    query,
    docs,
  }: {
    query: string;
    docs: Document[];
  }) => {
    return rerankDocs({ query, docs, embeddings, returnSize: 15, weight: 0.5 });
  };

  return RunnableSequence.from([
    RunnableMap.from({
      query: (input: BasicChainInput) => input.query,
      chat_history: (input: BasicChainInput) => input.chat_history,
      context: RunnableSequence.from([
        (input) => ({
          query: input.query,
          chat_history: formatChatHistoryAsString(input.chat_history),
        }),
        basicWebSearchRetrieverChain
          .pipe(rerank)
          .withConfig({
            runName: 'FinalSourceRetriever',
          })
          .pipe(processDocs),
      ]),
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

const basicWebSearch = (
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

const handleWebSearch = (
  message: string,
  history: BaseMessage[],
  llm: BaseChatModel,
  embeddings: Embeddings,
) => {
  const emitter = basicWebSearch(message, history, llm, embeddings);
  return emitter;
};

export default handleWebSearch;
