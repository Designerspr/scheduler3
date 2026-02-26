import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Login from './pages/Login';
import Home from './pages/Home';
import TodayPage from './pages/TodayPage';
import QuadrantView from './pages/QuadrantView';
import CalendarView from './pages/CalendarView';
import ArchivePage from './pages/ArchivePage';
import ProgressPage from './pages/ProgressPage';
import PeriodicTasksPage from './pages/PeriodicTasksPage';
import PeriodicTaskDetailPage from './pages/PeriodicTaskDetailPage';
import StatsPage from './pages/StatsPage';
import TaskForm from './components/TaskForm';
import TaskDetail from './components/TaskDetail';
import apiService from './services/api';

// 保护路由组件
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const token = apiService.getToken();
  return token ? <>{children}</> : <Navigate to="/login" />;
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          path="/*"
          element={
            <ProtectedRoute>
              <Layout>
                <Routes>
                  <Route path="/" element={<Home />} />
                  <Route path="/today" element={<Navigate to="/" replace />} />
                  <Route path="/tasks/new" element={<TaskForm />} />
                  <Route path="/tasks/:id" element={<TaskDetail />} />
                  <Route path="/tasks/:id/edit" element={<TaskForm />} />
                  <Route path="/tasks/:id/progress" element={<ProgressPage />} />
                  <Route path="/tasks/:id/periodic" element={<PeriodicTaskDetailPage />} />
                  <Route path="/quadrant" element={<QuadrantView />} />
                  <Route path="/periodic" element={<PeriodicTasksPage />} />
                  <Route path="/date" element={<CalendarView />} />
                  <Route path="/archive" element={<ArchivePage />} />
                  <Route path="/stats" element={<StatsPage />} />
                </Routes>
              </Layout>
            </ProtectedRoute>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
