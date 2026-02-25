import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './stores/authStore';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ChatPage from './pages/ChatPage';
import AdminPage from './pages/AdminPage';
import AIDashboardPage from './pages/AIDashboardPage';
import DocumentsPage from './pages/DocumentsPage';
import DocumentEditorPage from './pages/DocumentEditorPage';
import DocumentViewPage from './pages/DocumentViewPage';

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />;
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return isAuthenticated ? <Navigate to="/" replace /> : <>{children}</>;
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
        <Route path="/register/:token" element={<RegisterPage />} />
        <Route path="/" element={<PrivateRoute><ChatPage /></PrivateRoute>} />
        <Route path="/admin" element={<PrivateRoute><AdminPage /></PrivateRoute>} />
        <Route path="/ai" element={<PrivateRoute><AIDashboardPage /></PrivateRoute>} />
        <Route path="/documents" element={<PrivateRoute><DocumentsPage /></PrivateRoute>} />
        <Route path="/documents/new" element={<PrivateRoute><DocumentEditorPage /></PrivateRoute>} />
        <Route path="/documents/:id" element={<PrivateRoute><DocumentViewPage /></PrivateRoute>} />
        <Route path="/documents/:id/edit" element={<PrivateRoute><DocumentEditorPage /></PrivateRoute>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
