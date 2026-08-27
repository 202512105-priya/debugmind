import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, Shield, Github, ArrowRight } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('developer@acme.dev');
  const [password, setPassword] = useState('••••••••');
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    localStorage.setItem('debugmind_token', 'mock_jwt_token_debugmind');
    localStorage.setItem('debugmind_user_email', email || 'dev@debugmind.ai');
    setTimeout(() => {
      setLoading(false);
      navigate('/projects');
    }, 400);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-6 relative">
      <div
        className="absolute inset-0 opacity-[0.03] dark:opacity-[0.06] pointer-events-none"
        style={{
          backgroundImage:
            'linear-gradient(#64748b 1px, transparent 1px), linear-gradient(90deg, #64748b 1px, transparent 1px)',
          backgroundSize: '32px 32px',
        }}
      />

      <div className="w-full max-w-[360px] relative z-10">
        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 rounded-xl bg-blue-600 flex items-center justify-center mb-3 shadow-lg shadow-blue-600/30 text-white">
            <Sparkles className="w-6 h-6" />
          </div>
          <span className="text-[18px] font-bold text-slate-900 dark:text-slate-100 tracking-tight">
            DebugMind
          </span>
          <span className="text-[12px] text-slate-500 dark:text-slate-400 mt-0.5">
            AI Reliability Engineer
          </span>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm p-6">
          <h1 className="text-[16px] font-semibold text-slate-900 dark:text-slate-100 mb-0.5">
            Sign in to your account
          </h1>
          <p className="text-[12px] text-slate-500 dark:text-slate-400 mb-5">
            Automated CI log analysis & debugging.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-[12px] font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-md px-3 py-2 text-[13px] text-slate-900 dark:text-slate-100 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900/50 transition-all"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-[12px] font-medium text-slate-700 dark:text-slate-300">
                  Password
                </label>
                <span className="text-[11px] text-blue-600 dark:text-blue-400 cursor-pointer hover:underline">
                  Forgot?
                </span>
              </div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-md px-3 py-2 text-[13px] text-slate-900 dark:text-slate-100 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900/50 transition-all"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md py-2 text-[13px] font-medium shadow-sm transition-all disabled:opacity-50"
            >
              <span>{loading ? 'Signing in...' : 'Sign In'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          <div className="flex items-center gap-3 my-4">
            <div className="flex-1 h-px bg-slate-200 dark:bg-slate-800" />
            <span className="text-[11px] text-slate-400">or</span>
            <div className="flex-1 h-px bg-slate-200 dark:bg-slate-800" />
          </div>

          <button
            onClick={handleSubmit}
            className="w-full flex items-center justify-center gap-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-md py-2 text-[13px] font-medium hover:bg-slate-50 dark:hover:bg-slate-700/60 transition-colors shadow-sm"
          >
            <Github className="w-4 h-4" />
            <span>Continue with GitHub</span>
          </button>
        </div>

        <div className="flex items-center justify-center gap-4 mt-6">
          {['SOC 2 Type II', 'GDPR Compliant', 'SSO Ready'].map((badge) => (
            <div key={badge} className="flex items-center gap-1 text-[10px] text-slate-400">
              <Shield className="w-3 h-3" />
              <span>{badge}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
