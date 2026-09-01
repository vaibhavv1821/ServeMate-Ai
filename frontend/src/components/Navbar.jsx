import { useAuth } from '../context/AuthContext';
import { Wrench, LogOut, LogIn, UserPlus, UserCheck, Briefcase, ShieldCheck } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';

export const Navbar = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-50 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center space-x-2 font-bold text-xl">
          <Wrench className="w-6 h-6 text-sky-600" />
          <span className="text-gray-900 font-extrabold tracking-tight">Serv<span className="text-sky-600">Mate</span></span>
        </Link>

        <nav className="flex items-center space-x-4 sm:space-x-6">
          <Link to="/" className="text-gray-600 hover:text-sky-600 text-sm font-medium transition-colors">
            Home
          </Link>

          {isAuthenticated ? (
            <>
              {user?.role === 'CUSTOMER' && (
                <Link to="/customer/dashboard" className="text-gray-600 hover:text-sky-600 text-sm font-medium transition-colors">
                  Dashboard
                </Link>
              )}
              {user?.role === 'PROVIDER' && (
                <Link to="/provider/dashboard" className="text-gray-600 hover:text-sky-600 text-sm font-medium transition-colors">
                  Dashboard
                </Link>
              )}
              {user?.role === 'ADMIN' && (
                <Link to="/admin/dashboard" className="text-gray-600 hover:text-sky-600 text-sm font-medium transition-colors">
                  Admin Console
                </Link>
              )}

              <div className="flex items-center space-x-2 bg-sky-50 text-sky-800 px-3 py-1.5 rounded-full text-xs font-semibold border border-sky-100">
                {user?.role === 'CUSTOMER' && <UserCheck className="w-3.5 h-3.5 text-sky-600" />}
                {user?.role === 'PROVIDER' && <Briefcase className="w-3.5 h-3.5 text-sky-600" />}
                {user?.role === 'ADMIN' && <ShieldCheck className="w-3.5 h-3.5 text-rose-600" />}
                <span className="truncate max-w-[120px]">{user?.name}</span>
              </div>

              <button
                onClick={handleLogout}
                className="flex items-center space-x-1 text-rose-600 hover:text-rose-700 text-sm font-semibold transition-colors"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">Logout</span>
              </button>
            </>
          ) : (
            <>
              <Link
                to="/login"
                className="flex items-center space-x-1 text-gray-700 hover:text-sky-600 text-sm font-semibold transition-colors"
              >
                <LogIn className="w-4 h-4" />
                <span>Login</span>
              </Link>

              <Link
                to="/register"
                className="flex items-center space-x-1 bg-sky-600 text-white hover:bg-sky-700 px-3.5 py-1.5 rounded-xl text-sm font-semibold transition-colors shadow-sm"
              >
                <UserPlus className="w-4 h-4" />
                <span>Register</span>
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
};

export default Navbar;
