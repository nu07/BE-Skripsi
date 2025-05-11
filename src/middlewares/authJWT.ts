import { Request, Response, NextFunction } from 'express';
require('dotenv').config();
import jwt from 'jsonwebtoken';

const verifyToken = (req: Request, res: Response, next: NextFunction) => {
  try {
    let authHeader = req.headers['authorization'];
    const token = authHeader?.split(' ')[1];

    jwt.verify(token, process.env.jwt_secret_key, (_err: any, decoded: any) => {
      // console.log(decoded);
      req.userId = decoded.data.id;
      next();
    });
  } catch (e) {
    res.status(403).json({
      err: e,
      message: 'Unauthorized',
      status: 403,
    });
  }
};

const authJwt = {
  verifyToken,
};

export default authJwt;
