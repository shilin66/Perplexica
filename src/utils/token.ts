import jwt from 'jsonwebtoken';
import { getJwtSignKey } from '../config';

export const verifyToken = async (
  token: string,
): Promise<{ userId: string; isRoot: boolean }> => {
  const signKey = getJwtSignKey();
  return new Promise((resolve, reject) => {
    jwt.verify(token, signKey, (err, decoded: any) => {
      if (err || !decoded?.userId) {
        return reject('Invalid token');
      }
      resolve({
        userId: decoded.userId,
        isRoot: decoded.isRoot,
      });
    });
  });
};
