import axios from 'axios';
import { htmlToText } from 'html-to-text';
import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter';
import { Document } from '@langchain/core/documents';
import pdfParse from 'pdf-parse';
import logger from '../utils/logger';

export const getDocumentsFromLinks = async ({ links }: { links: string[] }) => {
  const splitter = new RecursiveCharacterTextSplitter();

  let docs: Document[] = [];

  await Promise.all(
    links.map(async (link) => {
      link =
        link.startsWith('http://') || link.startsWith('https://')
          ? link
          : `https://${link}`;

      let res;
      try {
        res = await axios.get(link, {
          responseType: 'arraybuffer',
        });
      } catch (e) {
        if (e instanceof Error) {
          logger.error(`read doc links error: ${e.message}`);
        } else {
          logger.error('read doc links error:', String(e));
        }
        return;
      }

      const isPdf = res.headers['content-type'] === 'application/pdf';

      if (isPdf) {
        const pdfText = await pdfParse(res.data);
        const parsedText = pdfText.text
          .replace(/(\r\n|\n|\r)/gm, ' ')
          .replace(/\s+/g, ' ')
          .trim();

        const splittedText = await splitter.splitText(parsedText);
        const title = 'PDF Document';

        const linkDocs = splittedText.map((text) => {
          return new Document({
            pageContent: text,
            metadata: {
              title: title,
              url: link,
            },
          });
        });

        docs.push(...linkDocs);
        return;
      }

      const parsedText = htmlToText(res.data.toString('utf8'), {
        selectors: [
          {
            selector: 'a',
            options: {
              ignoreHref: true,
            },
          },
        ],
      })
        .replace(/(\r\n|\n|\r)/gm, ' ')
        .replace(/\s+/g, ' ')
        .trim();

      const splittedText = await splitter.splitText(parsedText);
      const title = res.data
        .toString('utf8')
        .match(/<title>(.*?)<\/title>/)?.[1];

      const linkDocs = splittedText.map((text) => {
        return new Document({
          pageContent: text,
          metadata: {
            title: title || link,
            url: link,
          },
        });
      });

      docs.push(...linkDocs);
    }),
  );

  return docs;
};
