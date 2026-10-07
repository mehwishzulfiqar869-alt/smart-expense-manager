import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await axios.post('http://localhost:5000/api/auth/login', {
        email,
        password
      });

      if (response.data.success) {
        login(response.data.user, response.data.token);
        const role = response.data.user.role;
        switch(role) {
  case 'employee': navigate('/employee'); break;
  case 'admin': navigate('/admin'); break;
  case 'member': navigate('/member'); break;
  default: navigate('/');
}
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    // ⬇️ ADD YOUR IMAGE PATH HERE — put your image in public/images/ folder
    // then replace 'your-image.jpg' with your actual filename e.g. 'background.jpg'
    <div
      className="min-h-screen flex items-center justify-center"
      style={{
        backgroundImage: `url('/images/image4.jpg')`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
      }}
    >
      {/* Dark overlay so card stands out */}
      <div className="absolute inset-0 bg-black bg-opacity-40" />

      {/* Card */}
      <div className="relative z-10 bg-white rounded-2xl shadow-2xl flex overflow-hidden" style={{width: '680px'}}>
        
        {/* LEFT SIDE — Login Form */}
        <div className="w-1/2 px-8 py-6 flex flex-col justify-center">
          <div className="text-center mb-4">
            <h1 className="text-2xl font-bold text-gray-800">Expense Manager</h1>
            <p className="text-gray-500 text-sm mt-1">Sign in to continue</p>
          </div>

          <form onSubmit={handleSubmit}>
            {error && (
              <div className="bg-red-100 border border-red-400 text-red-700 px-3 py-2 rounded mb-3 text-sm">
                {error}
              </div>
            )}

            <div className="mb-3">
              <label className="block text-gray-700 text-xs font-bold mb-1">Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:border-blue-500"
                placeholder="Enter your email"
              />
            </div>

            <div className="mb-4">
              <label className="block text-gray-700 text-xs font-bold mb-1">Password</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:border-blue-500"
                placeholder="Enter your password"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className={`w-full bg-blue-600 text-white text-sm font-bold py-2 px-4 rounded-lg hover:bg-blue-700 ${
                loading ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>
        </div>

        {/* RIGHT SIDE — Glass Panel */}
        <div className="w-1/2 bg-blue-600 bg-opacity-80 backdrop-blur flex flex-col items-center justify-center px-8 py-6 text-white">
          <div className="mb-4">
            <svg viewBox="0 0 200 200" className="w-36 h-36" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="30" y="60" width="140" height="90" rx="12" fill="white" fillOpacity="0.15" stroke="white" strokeOpacity="0.4" strokeWidth="2"/>
              <rect x="30" y="60" width="140" height="30" rx="12" fill="white" fillOpacity="0.1"/>
              <rect x="50" y="80" width="28" height="20" rx="4" fill="white" fillOpacity="0.5"/>
              <circle cx="55" cy="115" r="3" fill="white" fillOpacity="0.7"/>
              <circle cx="65" cy="115" r="3" fill="white" fillOpacity="0.7"/>
              <circle cx="75" cy="115" r="3" fill="white" fillOpacity="0.7"/>
              <circle cx="85" cy="115" r="3" fill="white" fillOpacity="0.7"/>
              <circle cx="100" cy="115" r="3" fill="white" fillOpacity="0.7"/>
              <circle cx="110" cy="115" r="3" fill="white" fillOpacity="0.7"/>
              <circle cx="120" cy="115" r="3" fill="white" fillOpacity="0.7"/>
              <circle cx="130" cy="115" r="3" fill="white" fillOpacity="0.7"/>
              <rect x="50" y="30" width="12" height="25" rx="3" fill="white" fillOpacity="0.5"/>
              <rect x="68" y="18" width="12" height="37" rx="3" fill="white" fillOpacity="0.7"/>
              <rect x="86" y="24" width="12" height="31" rx="3" fill="white" fillOpacity="0.5"/>
              <rect x="104" y="10" width="12" height="45" rx="3" fill="white" fillOpacity="0.9"/>
              <rect x="122" y="20" width="12" height="35" rx="3" fill="white" fillOpacity="0.6"/>
              <circle cx="155" cy="85" r="18" fill="white" fillOpacity="0.2" stroke="white" strokeOpacity="0.5" strokeWidth="1.5"/>
              <text x="149" y="91" fontSize="18" fill="white" fillOpacity="0.9" fontWeight="bold">$</text>
              <circle cx="155" cy="135" r="14" fill="white" fillOpacity="0.2" stroke="white" strokeOpacity="0.5" strokeWidth="1.5"/>
              <polyline points="148,135 153,141 163,128" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>

          <h2 className="text-lg font-bold mb-1 text-center">Track Your Expenses</h2>
          <p className="text-center text-blue-100 text-xs leading-relaxed mb-4">
            Manage budgets, scan receipts, and get insights into your spending.
          </p>

          <div className="flex flex-col gap-2 w-full">
            <div className="flex items-center gap-2 bg-white bg-opacity-10 rounded-full px-3 py-1.5 text-xs">
              <span>✅</span> Smart Receipt Scanning
            </div>
            <div className="flex items-center gap-2 bg-white bg-opacity-10 rounded-full px-3 py-1.5 text-xs">
              <span>📊</span> Expense Analytics
            </div>
            <div className="flex items-center gap-2 bg-white bg-opacity-10 rounded-full px-3 py-1.5 text-xs">
              <span>🔒</span> Secure & Private
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default Login;