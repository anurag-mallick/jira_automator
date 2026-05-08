"use client";
import { useEffect } from 'react';

interface ToastProps {
  message: string;
  type?: 'success' | 'error';
  onDismiss: () => void;
}

export default function Toast({ message, type = 'success', onDismiss }: ToastProps) {
  useEffect(() => {
    const t = setTimeout(onDismiss, 3500);
    return () => clearTimeout(t);
  }, [onDismiss]);

  return (
    <div className={`fixed bottom-6 right-6 z-[200] flex items-center gap-3 px-4 py-3 rounded-xl shadow-2xl text-sm font-medium animate-in slide-in-from-bottom-4 duration-300 border ${
      type === 'success'
        ? 'bg-zinc-900 border-green-500/30 text-green-400'
        : 'bg-zinc-900 border-red-500/30 text-red-400'
    }`}>
      {message}
      <button onClick={onDismiss} className="text-white/20 hover:text-white/60 ml-1">✕</button>
    </div>
  );
}
