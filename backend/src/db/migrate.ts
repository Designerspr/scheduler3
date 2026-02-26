import pool from './connection';
import fs from 'fs';
import path from 'path';

async function runMigrations() {
  const client = await pool.connect();
  
  try {
    // 从项目根目录查找迁移文件
    const projectRoot = path.resolve(__dirname, '../../..');
    const migrationsDir = path.join(projectRoot, 'database/migrations');
    
    // 获取所有迁移文件并按名称排序
    const migrationFiles = fs
      .readdirSync(migrationsDir)
      .filter((file) => file.endsWith('.sql'))
      .sort();

    if (migrationFiles.length === 0) {
      console.log('⚠️  没有找到迁移文件');
      return;
    }

    console.log(`📦 找到 ${migrationFiles.length} 个迁移文件`);

    await client.query('BEGIN');

    for (const file of migrationFiles) {
      const migrationPath = path.join(migrationsDir, file);
      console.log(`🔄 执行迁移: ${file}`);
      
      const migrationSQL = fs.readFileSync(migrationPath, 'utf-8');
      await client.query(migrationSQL);
      
      console.log(`✅ 完成: ${file}`);
    }

    await client.query('COMMIT');
    
    console.log('✅ 所有数据库迁移成功完成');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ 数据库迁移失败:', error);
    throw error;
  } finally {
    client.release();
  }
}

// 如果直接运行此文件
if (require.main === module) {
  runMigrations()
    .then(() => {
      process.exit(0);
    })
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

export default runMigrations;
