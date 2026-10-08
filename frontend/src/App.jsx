import {
  Navigate,
  Outlet,
  Route,
  Routes,
} from 'react-router';

import { useAuth } from './context/AuthContext.jsx';

import AppLayout from './components/layout/AppLayout.jsx';

import LoginPage from './pages/LoginPage.jsx';
import DashboardPage from './pages/DashboardPage.jsx';
import UsersPage from './pages/UsersPage.jsx';
import DocumentsPage from './pages/DocumentsPage.jsx';
import DocumentDetailPage from './pages/DocumentDetailPage.jsx';
import AuditPage from './pages/AuditPage.jsx';
import AuditDetailPage from './pages/AuditDetailPage.jsx';
import UnauthorizedPage from './pages/UnauthorizedPage.jsx';

function RequireAuth() {
  const {
    user,
    loading,
  } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f5f8fa]">
        Cargando sesión...
      </div>
    );
  }

  if (!user) {
    return (
      <Navigate
        to="/login"
        replace
      />
    );
  }

  return <Outlet />;
}

function RequireRole({ roles }) {
  const { user } = useAuth();

  if (!roles.includes(user?.role)) {
    return (
      <Navigate
        to="/documents"
        replace
      />
    );
  }

  return <Outlet />;
}

function HomeRedirect() {
  const { user } = useAuth();

  if (user?.role === 'ADMIN') {
    return <Navigate to="/dashboard" replace />;
  }

  return <Navigate to="/documents" replace />;
}

export default function App() {
  return (
    <Routes>
      <Route
        path="/login"
        element={<LoginPage />}
      />

      <Route
        path="/unauthorized"
        element={<UnauthorizedPage />}
      />

      <Route element={<RequireAuth />}>
        <Route element={<AppLayout />}>
          <Route
            path="/"
            element={
              <HomeRedirect />
            }
          />

          <Route
            element={
              <RequireRole roles={['ADMIN']} />
            }
          >
            <Route
              path="/dashboard"
              element={<DashboardPage />}
            />

            <Route
              path="/users"
              element={<UsersPage />}
            />

            <Route
              path="/audit"
              element={<AuditPage />}
            />

            <Route
              path="/audit/:id"
              element={<AuditDetailPage />}
            />
          </Route>

          <Route
            path="/documents"
            element={<DocumentsPage />}
          />

          <Route
            path="/documents/:id"
            element={<DocumentDetailPage />}
          />
        </Route>
      </Route>

      <Route
        path="*"
        element={
          <Navigate
            to="/"
            replace
          />
        }
      />
    </Routes>
  );
}