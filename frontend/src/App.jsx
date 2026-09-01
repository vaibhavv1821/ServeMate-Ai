import { Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import CustomerDashboard from './pages/CustomerDashboard';
import ProviderDashboard from './pages/ProviderDashboard';
import AdminDashboard from './pages/AdminDashboard';
import ProtectedRoute from './components/ProtectedRoute';
import RoleProtectedRoute from './components/RoleProtectedRoute';
import Unauthorized from './pages/Unauthorized';
import NotFound from './pages/NotFound';

function App() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
      <Navbar />
      <main className="flex-1">
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/unauthorized" element={<Unauthorized />} />

          {/* Customer Protected Route */}
          <Route
            path="/customer/dashboard"
            element={
              <RoleProtectedRoute allowedRoles={['CUSTOMER']}>
                <CustomerDashboard />
              </RoleProtectedRoute>
            }
          />

          {/* Provider Protected Route */}
          <Route
            path="/provider/dashboard"
            element={
              <RoleProtectedRoute allowedRoles={['PROVIDER']}>
                <ProviderDashboard />
              </RoleProtectedRoute>
            }
          />

          {/* Admin Protected Route */}
          <Route
            path="/admin/dashboard"
            element={
              <RoleProtectedRoute allowedRoles={['ADMIN']}>
                <AdminDashboard />
              </RoleProtectedRoute>
            }
          />

          {/* Fallback 404 Route */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
    </div>
  );
}

export default App;
