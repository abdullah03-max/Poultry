// =============================================================================
// SHAN POULTRY PROTEIN - Authentication Login Page
// Daylight B2B Clean Corporate Edition
// Includes Password View/Hide Toggle and 1-Click Instant Demo Login
// =============================================================================

import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Lock, Mail, ArrowRight, AlertCircle, Loader2, Eye, EyeOff, Sparkles, ShieldCheck } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const { login, loginAsDemo } = useAuth();
  const [email, setEmail] = useState<string>('admin@shanpoultryprotein.com');
  const [password, setPassword] = useState<string>('shanadmin2026');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      setErrorMsg(null);
      const res = await login(email, password);
      if (!res.success) {
        setErrorMsg(res.error || 'Invalid credentials. You can click Haji Shan (Admin) below to sign in instantly.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Authentication error.');
    } finally {
      setLoading(false);
    }
  };

  const handleInstantDemoLogin = (role: 'admin' | 'worker') => {
    loginAsDemo(role);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center p-4">
      <div className="w-full max-w-md bg-white border border-slate-200 rounded-3xl p-8 shadow-card space-y-6">
        {/* Brand Banner */}
        <div className="text-center space-y-2">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-700 to-blue-500 mx-auto flex items-center justify-center shadow-lg shadow-blue-500/25 text-white font-black text-2xl tracking-tighter">
            SP
          </div>
          <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">SHAN POULTRY PROTEIN</h1>
          <p className="text-xs text-slate-500">Waste Collection & Weight Management Portal</p>
        </div>

        {errorMsg && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Email Address
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl pl-9 pr-4 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                placeholder="admin@shanpoultryprotein.com"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl pl-9 pr-10 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 font-mono"
                placeholder="••••••••"
              />
              {/* Password View/Hide Toggle Button */}
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 transition p-1"
                title={showPassword ? 'Hide password' : 'Show password'}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4 text-slate-400" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md shadow-blue-600/20 transition flex items-center justify-center gap-2"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <span>Sign In to System</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* 1-Click Instant Demo Profiles Login */}
        <div className="pt-4 border-t border-slate-100 space-y-2.5">
          <p className="text-[11px] text-slate-500 text-center font-medium flex items-center justify-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            1-Click Instant Sign-In:
          </p>
          <div className="grid grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={() => handleInstantDemoLogin('admin')}
              className="py-2.5 px-3 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-xl text-xs font-bold border border-blue-200 transition text-center flex items-center justify-center gap-1.5 shadow-sm"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
              <span>Haji Shan (Admin)</span>
            </button>
            <button
              type="button"
              onClick={() => handleInstantDemoLogin('worker')}
              className="py-2.5 px-3 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-bold border border-slate-200 transition text-center flex items-center justify-center gap-1.5 shadow-sm"
            >
              <span>Rashid (Collector)</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
