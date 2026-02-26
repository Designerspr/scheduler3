import pool from './connection';
import crypto from 'crypto';

/**
 * 初始化默认用户并生成API Token
 */
async function initUser() {
  const client = await pool.connect();
  
  try {
    // 检查是否已存在用户
    const existingUser = await client.query('SELECT * FROM users LIMIT 1');
    
    if (existingUser.rows.length > 0) {
      console.log('✅ 用户已存在，Token:', existingUser.rows[0].api_token);
      return existingUser.rows[0];
    }
    
    // 生成API Token
    const apiToken = crypto.randomBytes(32).toString('hex');
    
    // 创建默认用户
    const result = await client.query(
      'INSERT INTO users (username, api_token) VALUES ($1, $2) RETURNING *',
      ['default_user', apiToken]
    );
    
    console.log('✅ 默认用户创建成功');
    console.log('📝 API Token:', apiToken);
    console.log('⚠️  请妥善保管此Token，它将用于API认证');
    
    return result.rows[0];
  } catch (error) {
    console.error('❌ 初始化用户失败:', error);
    throw error;
  } finally {
    client.release();
  }
}

// 如果直接运行此文件
if (require.main === module) {
  initUser()
    .then(() => {
      process.exit(0);
    })
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

export default initUser;
