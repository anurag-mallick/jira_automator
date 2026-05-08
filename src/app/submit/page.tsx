"use client";
import React, { useState } from 'react';
import Link from 'next/link';
import { Shield, CheckCircle2, ArrowLeft, Send, Sparkles, AlertCircle } from 'lucide-react';

const PublicTicketForm = () => {
  const [submitted, setSubmitted] = useState(false);
  const [ticketId, setTicketId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    requesterName: '',
    priority: 'P2'
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/public/tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      if (res.ok) {
        const data = await res.json();
        setTicketId(data.id);
        setSubmitted(true);
      } else {
        throw new Error('Failed to submit');
      }
    } catch (err) {
      setError('System unavailable. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-[#fcfcfd] flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white border border-zinc-200 shadow-xl rounded-[2.5rem] p-12 text-center animate-in zoom-in-95 duration-500">
          <div className="w-20 h-20 bg-green-50 text-green-600 rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-inner">
            <CheckCircle2 size={40} />
          </div>
          <h2 className="text-3xl font-black text-zinc-900 mb-3 tracking-tight">Request Received</h2>
          <p className="text-zinc-500 mb-8 leading-relaxed">
            Your support ticket has been registered successfully. Our IT engineering team has been notified.
          </p>
          
          {ticketId && (
            <div className="bg-zinc-50 border border-zinc-100 rounded-2xl p-4 mb-8">
              <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400 block mb-1">Reference ID</span>
              <span className="text-2xl font-mono font-bold text-zinc-900">#{ticketId}</span>
            </div>
          )}

          <button 
            onClick={() => { setSubmitted(false); setFormData({ title: '', description: '', requesterName: '', priority: 'P2' }); }} 
            className="w-full bg-zinc-900 hover:bg-zinc-800 text-white font-bold py-4 rounded-2xl transition-all shadow-lg active:scale-[0.98]"
          >
            Submit Another Request
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#fcfcfd] text-zinc-900 selection:bg-indigo-100">
      <header className="h-20 border-b border-zinc-200/60 flex items-center px-6 md:px-12 justify-center bg-white/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-600/20">
            <Shield size={16} className="text-white" />
          </div>
          <span className="text-sm font-black tracking-tighter">HORIZON<span className="text-indigo-600">IT</span></span>
        </div>
      </header>

      <main className="max-w-3xl mx-auto py-20 px-6">
        <div className="mb-16 text-center md:text-left">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 text-indigo-600 text-[10px] font-black uppercase tracking-widest mb-6 mx-auto md:mx-0">
            <Sparkles size={12} /> Support Channel
          </div>
          <h1 className="text-5xl font-black text-zinc-900 tracking-tight mb-4">How can we help?</h1>
          <p className="text-zinc-500 text-lg max-w-xl leading-relaxed font-medium mx-auto md:mx-0">
            Describe the technical issue you're facing. Our distributed IT team typically responds within 2 hours.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-10 group">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
            <div className="space-y-3">
              <label className="text-[11px] uppercase tracking-[0.2em] text-zinc-400 font-black ml-1">Requester Name</label>
              <input 
                type="text" 
                value={formData.requesterName}
                onChange={(e) => setFormData({...formData, requesterName: e.target.value})}
                placeholder="Optional"
                className="w-full bg-white border-2 border-zinc-100 rounded-2xl px-5 py-4 text-sm focus:outline-none focus:border-indigo-500/50 focus:ring-4 focus:ring-indigo-500/5 transition-all placeholder:text-zinc-300"
              />
            </div>
            <div className="space-y-3">
              <label className="text-[11px] uppercase tracking-[0.2em] text-zinc-400 font-black ml-1">Urgency Level</label>
              <div className="relative">
                <select 
                  value={formData.priority}
                  onChange={(e) => setFormData({...formData, priority: e.target.value})}
                  className="w-full bg-white border-2 border-zinc-100 rounded-2xl px-5 py-4 text-sm focus:outline-none focus:border-indigo-500/50 focus:ring-4 focus:ring-indigo-500/5 transition-all appearance-none cursor-pointer font-bold"
                >
                  <option value="P3">Low Priority</option>
                  <option value="P2">Normal Operation</option>
                  <option value="P1">High Urgency</option>
                </select>
                <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-zinc-400">
                  <Shield size={16} />
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <label className="text-[11px] uppercase tracking-[0.2em] text-zinc-400 font-black ml-1">Issue Summary</label>
            <input 
              required
              type="text" 
              value={formData.title}
              onChange={(e) => setFormData({...formData, title: e.target.value})}
              placeholder="Keep it brief (e.g. WiFi connection dropping)"
              className="w-full bg-white border-2 border-zinc-100 rounded-2xl px-5 py-4 text-sm focus:outline-none focus:border-indigo-500/50 focus:ring-4 focus:ring-indigo-500/5 transition-all placeholder:text-zinc-300 font-medium"
            />
          </div>

          <div className="space-y-3">
            <label className="text-[11px] uppercase tracking-[0.2em] text-zinc-400 font-black ml-1">Details & Context</label>
            <textarea 
              required
              rows={6}
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
              placeholder="What happened? Any error codes? When did it start?"
              className="w-full bg-white border-2 border-zinc-100 rounded-2xl px-5 py-4 text-sm focus:outline-none focus:border-indigo-500/50 focus:ring-4 focus:ring-indigo-500/5 transition-all resize-none placeholder:text-zinc-300 leading-relaxed font-medium"
            ></textarea>
          </div>

          {error && (
            <div className="flex items-center gap-3 p-4 bg-red-50 text-red-600 rounded-2xl border border-red-100 animate-in fade-in slide-in-from-top-2">
              <AlertCircle size={18} />
              <p className="text-xs font-bold uppercase tracking-wider">{error}</p>
            </div>
          )}

          <div className="pt-4">
            <button 
              type="submit"
              disabled={loading}
              className="w-full bg-zinc-900 group-hover:bg-indigo-600 hover:!bg-indigo-500 text-white font-black py-5 rounded-[1.5rem] shadow-xl shadow-indigo-600/10 transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-3 uppercase tracking-[0.2em] text-xs"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <Send size={16} /> Disseminate Request
                </>
              )}
            </button>
            <p className="text-center text-[10px] text-zinc-400 mt-6 font-bold uppercase tracking-widest">
              Secured by Horizon IT &bull; No Login Required
            </p>
          </div>
        </form>
      </main>
    </div>
  );
};

export default PublicTicketForm;
