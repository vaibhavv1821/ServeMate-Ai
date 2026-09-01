import { Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import Services from './pages/Services';
import Providers from './pages/Providers';
import ProviderDetails from './pages/ProviderDetails';
import CustomerDashboard from './pages/CustomerDashboard';
import CustomerBookings from './pages/CustomerBookings';
import ProviderDashboard from './pages/ProviderDashboard';
import ProviderProfile from './pages/ProviderProfile';
import ProviderServices from './pages/ProviderServices';
import ProviderAvailability from './pages/ProviderAvailability';
import ProviderBookings from './pages/ProviderBookings';
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
          {/* ── Public Routes ── */}
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/services" element={<Services />} />
          <Route path="/providers" element={<Providers />} />
          <Route path="/providers/:id" element={<ProviderDetails />} />
          <Route path="/unauthorized" element={<Unauthorized />} />

          {/* ── Customer Protected Routes ── */}
          <Route path="/customer/dashboard" element={<RoleProtectedRoute allowedRoles={['CUSTOMER']}><CustomerDashboard /></RoleProtectedRoute>} />
          <Route path="/customer/bookings" element={<RoleProtectedRoute allowedRoles={['CUSTOMER']}><CustomerBookings /></RoleProtectedRoute>} />

          {/* ── Provider Protected Routes ── */}
          <Route path="/provider/dashboard" element={<RoleProtectedRoute allowedRoles={['PROVIDER']}><ProviderDashboard /></RoleProtectedRoute>} />
          <Route path="/provider/profile" element={<RoleProtectedRoute allowedRoles={['PROVIDER']}><ProviderProfile /></RoleProtectedRoute>} />
          <Route path="/provider/services" element={<RoleProtectedRoute allowedRoles={['PROVIDER']}><ProviderServices /></RoleProtectedRoute>} />
          <Route path="/provider/availability" element={<RoleProtectedRoute allowedRoles={['PROVIDER']}><ProviderAvailability /></RoleProtectedRoute>} />
          <Route path="/provider/bookings" element={<RoleProtectedRoute allowedRoles={['PROVIDER']}><ProviderBookings /></RoleProtectedRoute>} />

          {/* ── Admin Protected Routes ── */}
          <Route path="/admin/dashboard" element={<RoleProtectedRoute allowedRoles={['ADMIN']}><AdminDashboard /></RoleProtectedRoute>} />

          {/* ── Fallback ── */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
    </div>
  );
}

export default App;
