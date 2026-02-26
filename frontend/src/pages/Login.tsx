import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import apiService from '../services/api';

export default function Login() {
  const navigate = useNavigate();
  const [token, setToken] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    // 如果已有Token，检查是否有效
    const existingToken = apiService.getToken();
    if (existingToken) {
      setToken(existingToken);
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!token.trim()) {
      setError('请输入Token');
      return;
    }

    try {
      // 设置Token并测试
      apiService.setToken(token);
      
      // 尝试获取任务列表来验证Token
      await apiService.getTasks();
      
      // 验证成功，跳转到首页
      navigate('/');
    } catch (err: any) {
      setError('Token无效，请检查后重试');
      apiService.clearToken();
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full bg-white rounded-lg shadow p-8">
        <h1 className="text-2xl font-bold text-center mb-6">待办事项管理工具</h1>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              API Token
            </label>
            <input
              type="text"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="请输入您的API Token"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-xs text-gray-500 mt-1">
              请从后端服务器获取Token（运行 npm run init-user）
            </p>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          <button
            type="submit"
            className="w-full bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
          >
            登录
          </button>
        </form>
      </div>
    </div>
  );
}
