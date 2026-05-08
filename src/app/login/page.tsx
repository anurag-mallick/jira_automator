"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { Shield, Mail, Lock, AlertCircle, Cpu, Zap, ShieldCheck, Globe } from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { user, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading && user) {
      router.push('/');
    }
  }, [user, isLoading, router]);

  if (isLoading) return null;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to login');

      router.push('/');
      router.refresh();
    } catch (err: any) {
      setError(err.message || 'Failed to login');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-[#050505]">
      {/* Brand Panel */}
      <div className="hidden lg:flex flex-1 relative overflow-hidden flex-col justify-between p-12 border-r border-white/5 bg-zinc-950/40">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-600/10 via-transparent to-purple-600/10" />
        <div className="absolute top-0 left-0 w-full h-full opacity-20 pointer-events-none" 
             style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, #ffffff10 1px, transparent 0)', backgroundSize: '40px 40px' }} />
        
        <div className="relative z-10 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-600/20">
            <Cpu size={20} className="text-white" />
          </div>
          <span className="text-xl font-black tracking-tighter text-white">HORIZON<span className="text-blue-500">IT</span></span>
        </div>

        <div className="relative z-10 max-w-md">
          <h1 className="text-5xl font-black text-white leading-tight mb-6">
            Future-Proof <br/> <span className="text-blue-500">IT Infrastructure.</span>
          </h1>
          <p className="text-white/40 text-lg leading-relaxed">
            The next generation of IT helpdesk management. Streamlined, intelligence-driven, and local-first.
          </p>
        </div>

        <div className="relative z-10 grid grid-cols-2 gap-8 py-8 border-t border-white/5">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-white/60 text-sm font-bold uppercase tracking-widest">
              <Zap size={14} className="text-yellow-500" /> High Performance
            </div>
            <p className="text-white/20 text-xs">Optimized for local deployment with instant responsiveness.</p>
          </div>
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-white/60 text-sm font-bold uppercase tracking-widest">
              <ShieldCheck size={14} className="text-green-500" /> Enterprise Grade
            </div>
            <p className="text-white/20 text-xs">Built on reliable architecture for 24/7 operations.</p>
          </div>
        </div>
      </div>

      {/* Login Form Panel */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12">
        <div className="w-full max-w-[400px] space-y-8">
          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-white">Welcome back</h2>
            <p className="text-white/40 text-sm font-medium">Please sign in to your staff account.</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em] px-1">Staff ID / Email</label>
                <div className="relative group">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-blue-500 transition-colors" size={16} />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-11 pr-4 text-sm text-white focus:outline-none focus:border-blue-500/50 focus:ring-4 focus:ring-blue-500/5 transition-all placeholder:text-white/10"
                    placeholder="name@horizon.io"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between px-1">
                  <label className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em]">Password</label>
                  <button type="button" className="text-[10px] font-black text-blue-500 uppercase tracking-widest hover:text-blue-400 transition-colors">Forgot?</button>
                </div>
                <div className="relative group">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-blue-500 transition-colors" size={16} />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-11 pr-4 text-sm text-white focus:outline-none focus:border-blue-500/50 focus:ring-4 focus:ring-blue-500/5 transition-all placeholder:text-white/10"
                    placeholder="••••••••"
                  />
                </div>
              </div>
            </div>

            {error && (
              <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-3">
                <AlertCircle className="text-red-500 shrink-0" size={16} />
                <p className="text-xs text-red-500 font-bold">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-500 text-white font-black py-3 rounded-xl active:scale-[0.98] transition-all disabled:opacity-50 disabled:scale-100 flex items-center justify-center gap-2 shadow-lg shadow-blue-600/10 uppercase tracking-widest text-xs"
            >
              {loading ? (
                <span className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
              ) : (
                'System Access'
              )}
            </button>
          </form>

          <div className="pt-8 flex flex-col items-center gap-4">
             <div className="flex items-center gap-3 w-full opacity-20">
               <div className="h-px bg-white grow"></div>
               <span className="text-[9px] font-black uppercase tracking-widest">Horizon Local</span>
               <div className="h-px bg-white grow"></div>
             </div>
             <div className="flex items-center gap-4">
                <Globe size={14} className="text-white/20" />
                <span className="text-[10px] text-white/20 font-medium">Status: All Systems Operational</span>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
}
