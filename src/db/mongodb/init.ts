import type { Mongoose } from 'mongoose';
import {
  connectionMongo as connectMongoDB,
  getMongoDbMaxLink,
  getMongoDbUrl,
} from '../../config';
import { delay } from '../../utils/delay';
import logger from '../../utils/logger';

const maxConnecting = Math.max(30, Number(getMongoDbMaxLink() || 20));

/**
 * connect MongoDB and init data
 */
export async function connectMongo(): Promise<Mongoose> {
  /* Connecting, connected will return */
  const connectionMongo = connectMongoDB();
  if (connectionMongo.connection.readyState !== 0) {
    return connectionMongo;
  }

  console.log('mongo start connect');
  try {
    connectionMongo.set('strictQuery', true);

    connectionMongo.connection.on('error', async (error) => {
      console.log('mongo error', error);
      await connectionMongo.disconnect();
      await delay(1000);
      connectMongo();
    });
    connectionMongo.connection.on('disconnected', () => {
      console.log('mongo disconnected');
    });

    await connectionMongo.connect(getMongoDbUrl() as string, {
      bufferCommands: true,
      maxConnecting: maxConnecting,
      maxPoolSize: maxConnecting,
      minPoolSize: 20,
      connectTimeoutMS: 60000,
      waitQueueTimeoutMS: 60000,
      socketTimeoutMS: 60000,
      maxIdleTimeMS: 300000,
      retryWrites: true,
      retryReads: true,

      // readPreference: 'secondaryPreferred',
      // readConcern: { level: 'local' },
      // writeConcern: { w: 'majority', j: true }
    });

    console.log('mongo connected');
    return connectionMongo;
  } catch (error) {
    logger.error('mongo connect error', error);
    await connectionMongo.disconnect();
    await delay(1000);
    return connectMongo();
  }
}
