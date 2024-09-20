import { startWebSocketServer } from './websocket';
import express from 'express';
import cors from 'cors';
import http from 'http';
import routes from './routes';
import { getBasePath, getPort } from './config';
import logger from './utils/logger';
import { connectMongo } from './db/mongodb/init';

const port = getPort();

const app = express();
const server = http.createServer(app);

const corsOptions = {
  origin: '*',
};

app.use(cors(corsOptions));
app.use(express.json());

app.use(`/${getBasePath()}/api`, routes);
app.get(`/${getBasePath()}/api`, (_, res) => {
  res.status(200).json({ status: 'ok' });
});

const serverStart = async () => {
  try {
    await connectMongo(); // 等待数据库连接完成
    server.listen(port, () => {
      logger.info(`Server is running on port ${port}`);
    });

    startWebSocketServer(server);
  } catch (error) {
    logger.error('Server could not start.', error);
    process.exit(1); // 如果数据库连接失败，停止进程
  }
};

serverStart();

process.on('uncaughtException', (err, origin) => {
  logger.error(`Uncaught Exception at ${origin}: ${err}`);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error(`Unhandled Rejection at: ${promise}, reason: ${reason}`);
});
