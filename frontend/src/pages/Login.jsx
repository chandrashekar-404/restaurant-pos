import React, { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { KeyRound, User as UserIcon, ChefHat, AlertCircle } from 'lucide-react';

const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const { login, user } = useAuth();
  const navigate = useNavigate();

  // If already logged in, redirect based on role
  if (user) {
    return <Navigate to={user.role === 'owner' ? '/dashboard' : '/pos'} replace />;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username || !password) {
      setError('Please enter both username and password.');
      return;
    }

    setError('');
    setSubmitting(true);

    const result = await login(username, password);
    setSubmitting(false);

    if (result.success) {
      // Session restored, AuthContext handles state, Navigate triggered
    } else {
      setError(result.error || 'Invalid credentials.');
    }
  };

  const handleQuickLogin = (userType) => {
    if (userType === 'owner') {
      setUsername('owner');
      setPassword('owner123');
    } else {
      setUsername('cashier1');
      setPassword('cashier123');
    }
    setError('');
  };

  return (
    <div className="login-page">
      {/* Animated background glow nodes */}
      <div className="glow-node node-1"></div>
      <div className="glow-node node-2"></div>

      <div className="login-card glass-card animate-scale-in">
        <div className="login-header">
          <div className="logo-badge">
            <ChefHat size={32} className="logo-icon" />
          </div>
          <h1>Gourmet POS</h1>
          <p>Restaurant Billing & Inventory Control</p>
        </div>

        {error && (
          <div className="login-error-alert animate-fade-in">
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <label className="form-label" htmlFor="username">Username</label>
            <div className="input-with-icon">
              <UserIcon size={18} className="input-icon" />
              <input
                id="username"
                type="text"
                className="form-input"
                placeholder="Enter your username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                disabled={submitting}
                autoFocus
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="password">Password</label>
            <div className="input-with-icon">
              <KeyRound size={18} className="input-icon" />
              <input
                id="password"
                type="password"
                className="form-input"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={submitting}
              />
            </div>
          </div>

          <button
            type="submit"
            className="btn btn-primary btn-block"
            disabled={submitting}
          >
            {submitting ? 'Authenticating...' : 'Sign In'}
          </button>
        </form>

        <div className="quick-login-divider">
          <span>Or Quick Tester Login</span>
        </div>

        <div className="quick-login-buttons">
          <button
            type="button"
            className="btn btn-outline"
            onClick={() => handleQuickLogin('owner')}
            disabled={submitting}
          >
            Owner Account
          </button>
          <button
            type="button"
            className="btn btn-outline"
            onClick={() => handleQuickLogin('cashier')}
            disabled={submitting}
          >
            Cashier Account
          </button>
        </div>
      </div>

      <style>{`
        .login-page {
          min-height: 100vh;
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
          padding: 20px;
        }

        .glow-node {
          position: absolute;
          border-radius: 50%;
          filter: blur(100px);
          z-index: 0;
          opacity: 0.15;
          animation: float 12s infinite alternate ease-in-out;
        }

        .node-1 {
          width: 300px;
          height: 300px;
          background: var(--primary);
          top: 15%;
          left: 20%;
        }

        .node-2 {
          width: 250px;
          height: 250px;
          background: var(--accent);
          bottom: 15%;
          right: 20%;
          animation-delay: -6s;
        }

        @keyframes float {
          0% { transform: translateY(0) scale(1); }
          100% { transform: translateY(-30px) scale(1.1); }
        }

        .login-card {
          width: 100%;
          max-width: 440px;
          padding: 40px;
          position: relative;
          z-index: 1;
          display: flex;
          flex-direction: column;
        }

        .login-header {
          text-align: center;
          margin-bottom: 30px;
        }

        .logo-badge {
          width: 60px;
          height: 60px;
          border-radius: 16px;
          background: rgba(99, 102, 241, 0.1);
          border: 1px solid rgba(99, 102, 241, 0.2);
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 16px;
          box-shadow: 0 8px 16px rgba(0, 0, 0, 0.3);
        }

        .logo-icon {
          color: var(--primary);
          filter: drop-shadow(0 0 8px var(--primary-glow));
        }

        .login-header h1 {
          font-size: 1.8rem;
          font-weight: 700;
          color: var(--text-main);
          letter-spacing: -0.5px;
          margin: 0 0 6px;
        }

        .login-header p {
          color: var(--text-muted);
          font-size: 0.9rem;
        }

        .login-error-alert {
          background: rgba(244, 63, 94, 0.1);
          border: 1px solid rgba(244, 63, 94, 0.25);
          color: #fb7185;
          padding: 12px;
          border-radius: 10px;
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 20px;
          font-size: 0.85rem;
        }

        .input-with-icon {
          position: relative;
          width: 100%;
        }

        .input-icon {
          position: absolute;
          left: 14px;
          top: 50%;
          transform: translateY(-50%);
          color: var(--text-muted);
          pointer-events: none;
        }

        .input-with-icon .form-input {
          padding-left: 44px;
        }

        .btn-block {
          width: 100%;
          padding: 12px;
          font-size: 1rem;
        }

        .quick-login-divider {
          text-align: center;
          margin: 25px 0 20px;
          position: relative;
        }

        .quick-login-divider::before {
          content: '';
          position: absolute;
          left: 0;
          top: 50%;
          width: 100%;
          height: 1px;
          background: var(--border);
          z-index: 0;
        }

        .quick-login-divider span {
          background: #0f172a;
          padding: 0 12px;
          font-size: 0.75rem;
          color: var(--text-muted);
          text-transform: uppercase;
          letter-spacing: 0.5px;
          position: relative;
          z-index: 1;
        }

        .quick-login-buttons {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
        }

        .quick-login-buttons .btn {
          font-size: 0.85rem;
          padding: 10px;
        }
      `}</style>
    </div>
  );
};

export default Login;
