import jwt from 'jsonwebtoken';
import { getJwtSignKey } from '../config';

export const verifyToken = async (
  token: string,
): Promise<{ userId: string; isRoot: boolean }> => {
  return new Promise((resolve, reject) => {
     if (!token) {
      return reject(new Error('Invalid token'));
    }
     const arr = token.split(':');
     if (arr.length !== 2) {
      return reject(new Error('Invalid token'));
    }
     resolve({
       userId: arr[0],
       isRoot: false,
     })
  })
  // const signKey = getJwtSignKey();
  // return new Promise((resolve, reject) => {
  //   jwt.verify(token, signKey, (err, decoded: any) => {
  //     if (err || !decoded?.userId) {
  //       return reject(new Error('Invalid token'));
  //     }
  //     resolve({
  //       userId: decoded.userId,
  //       isRoot: decoded.isRoot,
  //     });
  //   });
  // });
};
