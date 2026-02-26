import OpenAI from 'openai';
import dotenv from 'dotenv';
import pool from '../db/connection';
import { CreateTaskInput, Task } from '../types/task';

dotenv.config();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * 解析自然语言输入为任务
 */
export async function parseNaturalLanguage(input: string): Promise<CreateTaskInput[]> {
  try {
    const prompt = `你是一个待办事项管理助手。请将用户的自然语言输入解析为结构化的任务列表。

任务类型说明：
- urgent: 急类型任务（必须有截止日期）
- slow: 慢类型任务（需要跟踪进度）
- periodic: 周期任务（需要定期完成，如每天、每周等）

象限说明（可选）：
- 1: 重要且紧急
- 2: 重要不紧急
- 3: 不重要但紧急
- 4: 不重要不紧急

优先级：low, medium, high

请以JSON数组格式返回，每个任务包含以下字段：
{
  "title": "任务标题",
  "description": "任务描述（可选）",
  "task_type": "urgent|slow|periodic",
  "priority": "low|medium|high",
  "quadrant": 1|2|3|4（可选）,
  "deadline": "YYYY-MM-DD"（急类型任务必填）,
  "period_type": "daily|weekly|monthly|custom"（周期任务必填）,
  "period_value": 数字（自定义周期时必填）
}

用户输入：${input}

只返回JSON数组，不要其他文字说明。`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content:
            '你是一个专业的待办事项解析助手。只返回有效的JSON数组，不要添加任何解释文字。',
        },
        { role: 'user', content: prompt },
      ],
      temperature: 0.3,
    });

    const responseText = completion.choices[0].message.content || '[]';
    
    // 尝试提取JSON（去除可能的markdown代码块）
    let jsonText = responseText.trim();
    if (jsonText.startsWith('```')) {
      jsonText = jsonText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    }

    const tasks = JSON.parse(jsonText);
    
    // 验证和规范化任务数据
    return tasks.map((task: any) => {
      const parsed: CreateTaskInput = {
        title: task.title,
        description: task.description,
        task_type: task.task_type || 'urgent',
        priority: task.priority || 'medium',
        quadrant: task.quadrant,
        deadline: task.deadline,
        completion_percentage: 0,
      };

      // 验证急类型任务必须有DDL
      if (parsed.task_type === 'urgent' && !parsed.deadline) {
        // 如果没有提供DDL，尝试从输入中推断或设置为明天
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        parsed.deadline = tomorrow.toISOString().split('T')[0];
      }

      return parsed;
    });
  } catch (error) {
    console.error('AI解析错误:', error);
    throw new Error('AI解析失败，请检查输入格式');
  }
}

/**
 * 生成任务总结
 */
export async function generateTaskSummary(userId: number): Promise<string> {
  try {
    // 获取用户的所有任务
    const tasksResult = await pool.query(
      'SELECT * FROM tasks WHERE user_id = $1 ORDER BY created_at DESC',
      [userId]
    );

    const tasks: Task[] = tasksResult.rows;

    if (tasks.length === 0) {
      return '您还没有创建任何任务。';
    }

    // 统计信息
    const total = tasks.length;
    const completed = tasks.filter((t) => t.status === 'completed').length;
    const inProgress = tasks.filter((t) => t.status === 'in_progress').length;
    const pending = tasks.filter((t) => t.status === 'pending').length;

    // 按象限统计
    const quadrantStats = {
      1: tasks.filter((t) => t.quadrant === 1).length,
      2: tasks.filter((t) => t.quadrant === 2).length,
      3: tasks.filter((t) => t.quadrant === 3).length,
      4: tasks.filter((t) => t.quadrant === 4).length,
    };

    // 按类型统计
    const typeStats = {
      urgent: tasks.filter((t) => t.task_type === 'urgent').length,
      slow: tasks.filter((t) => t.task_type === 'slow').length,
      periodic: tasks.filter((t) => t.task_type === 'periodic').length,
    };

    // 获取即将到期的任务
    const upcomingDeadlines = tasks
      .filter((t) => t.deadline && t.status !== 'completed')
      .sort((a, b) => {
        const dateA = new Date(a.deadline!).getTime();
        const dateB = new Date(b.deadline!).getTime();
        return dateA - dateB;
      })
      .slice(0, 5)
      .map((t) => ({
        title: t.title,
        deadline: t.deadline,
        priority: t.priority,
      }));

    const prompt = `请根据以下任务数据生成一份简洁的任务总结报告，包括：
1. 总体完成情况
2. 各象限任务分布
3. 各类型任务分布
4. 即将到期的任务提醒
5. 改进建议

任务数据：
- 总任务数：${total}
- 已完成：${completed}
- 进行中：${inProgress}
- 待处理：${pending}
- 完成率：${Math.round((completed / total) * 100)}%

象限分布：
- 重要且紧急：${quadrantStats[1]}
- 重要不紧急：${quadrantStats[2]}
- 不重要但紧急：${quadrantStats[3]}
- 不重要不紧急：${quadrantStats[4]}

类型分布：
- 急类型：${typeStats.urgent}
- 慢类型：${typeStats.slow}
- 周期类型：${typeStats.periodic}

即将到期的任务：
${upcomingDeadlines.map((t) => `- ${t.title} (${t.deadline}, ${t.priority}优先级)`).join('\n')}

请用中文生成一份友好、简洁的总结报告。`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: '你是一个专业的任务管理助手，擅长分析任务数据并提供有价值的建议。',
        },
        { role: 'user', content: prompt },
      ],
      temperature: 0.7,
    });

    return completion.choices[0].message.content || '无法生成总结';
  } catch (error) {
    console.error('AI总结生成错误:', error);
    throw new Error('生成任务总结失败');
  }
}
