import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { setCredentials } from '../redux/slices/authSlice';
import { authService } from '../services/api';

function Login() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const isAuthenticated = useSelector(state => state.auth.isAuthenticated);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/');
    }
  }, [isAuthenticated, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const response = await authService.login(email, password);
      dispatch(setCredentials({
        user: response.data.user,
        token: response.data.token
      }));
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-navy-700 to-navy-900 dark:from-navy-900 dark:to-navy-800 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="bg-navy-50 dark:bg-navy-700 rounded-lg shadow-lg p-8 border-t-4 border-gold-600">
          <div className="text-center mb-6">
            <div className="text-5xl mb-3">🎯</div>
            <h1 className="text-3xl font-bold text-gold-600 dark:text-gold-400 font-barlow-condensed uppercase tracking-widest">
              Heidi Dashboard
            </h1>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-navy-900 dark:text-navy-100 mb-2">
                Email Address
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
                className="w-full px-4 py-2 border-2 border-navy-200 dark:border-navy-600 rounded-lg bg-white dark:bg-navy-800 text-navy-900 dark:text-navy-50 placeholder-navy-400 dark:placeholder-navy-500 focus:border-gold-600 dark:focus:border-gold-400 focus:outline-none disabled:bg-navy-100 dark:disabled:bg-navy-900"
                placeholder="admin@test.com"
                required
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-navy-900 dark:text-navy-100 mb-2">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                className="w-full px-4 py-2 border-2 border-navy-200 dark:border-navy-600 rounded-lg bg-white dark:bg-navy-800 text-navy-900 dark:text-navy-50 placeholder-navy-400 dark:placeholder-navy-500 focus:border-gold-600 dark:focus:border-gold-400 focus:outline-none disabled:bg-navy-100 dark:disabled:bg-navy-900"
                placeholder="••••••••"
                required
              />
            </div>

            {error && (
              <div className="p-4 bg-red-50 dark:bg-red-900/30 border-l-4 border-red-500 rounded-lg">
                <p className="text-red-800 dark:text-red-200 text-sm">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full px-4 py-3 bg-gold-600 text-navy-900 font-semibold rounded-lg hover:bg-gold-500 disabled:bg-navy-400 disabled:cursor-not-allowed transition border border-gold-600"
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

        </div>
      </div>
    </div>
  );
}

export default Login;
