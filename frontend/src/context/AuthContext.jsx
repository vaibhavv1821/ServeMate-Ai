import { createContext, useContext, useState, useEffect } from 'react';
import axiosClient from '../api/axiosClient';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem('servmate_token') || null);
  const [loading, setLoading] = useState(true);

  // Initialize and verify user on mount or token change
  useEffect(() => {
    const initializeAuth = async () => {
      const storedToken = localStorage.getItem('servmate_token');
      if (storedToken) {
        try {
          axiosClient.defaults.headers.common['Authorization'] = `Bearer ${storedToken}`;
          const res = await axiosClient.get('/auth/me');
          if (res && res.data && res.data.user) {
            setUser(res.data.user);
            setToken(storedToken);
          } else {
            handleLocalLogout();
          }
        } catch (error) {
          console.warn('Session verification failed:', error.message);
          handleLocalLogout();
        }
      } else {
        handleLocalLogout();
      }
      setLoading(false);
    };

    initializeAuth();
  }, []);

  const handleLocalLogout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('servmate_token');
    delete axiosClient.defaults.headers.common['Authorization'];
  };

  /**
   * Register User (CUSTOMER or PROVIDER)
   */
  const register = async (formData) => {
    const res = await axiosClient.post('/auth/register', formData);
    // res is: { status: 'success', message: '...', data: { token, user } }
    const { token: authToken, user: userData } = res.data;

    setToken(authToken);
    setUser(userData);
    localStorage.setItem('servmate_token', authToken);
    axiosClient.defaults.headers.common['Authorization'] = `Bearer ${authToken}`;
    return userData;
  };

  /**
   * Login User
   */
  const login = async (credentials) => {
    const res = await axiosClient.post('/auth/login', credentials);
    // res is: { status: 'success', message: '...', data: { token, user } }
    const { token: authToken, user: userData } = res.data;

    setToken(authToken);
    setUser(userData);
    localStorage.setItem('servmate_token', authToken);
    axiosClient.defaults.headers.common['Authorization'] = `Bearer ${authToken}`;
    return userData;
  };

  /**
   * Logout User (Clears client-side JWT token and state)
   */
  const logout = () => {
    handleLocalLogout();
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!user && !!token,
        loading,
        login,
        register,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
