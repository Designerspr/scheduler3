import { Request, Response, NextFunction } from 'express';
import pool from '../db/connection';

export interface AuthRequest extends Request {
  userId?: number;
  user?: {
    id: number;
    username: string;
    api_token: string;
  };
}

/**
 * Token认证中间件
 * 从Header中获取Token并验证用户
 */
export async function authenticateToken(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  try {
    // 从Header获取Token
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1]; // Bearer <token>

    if (!token) {
      return res.status(401).json({ error: '缺少认证Token' });
    }

    // 查询用户
    const result = await pool.query(
      'SELECT * FROM users WHERE api_token = $1',
      [token]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: '无效的Token' });
    }

    // 将用户信息附加到请求对象
    req.user = result.rows[0];
    req.userId = result.rows[0].id;

    next();
  } catch (error) {
    console.error('认证错误:', error);
    return res.status(500).json({ error: '认证过程出错' });
  }
}
