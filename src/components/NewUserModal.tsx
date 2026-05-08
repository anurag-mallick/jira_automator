"use client";
import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { X, AlertCircle } from 'lucide-react';

interface NewUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const NewUserModal = ({ isOpen, onClose, onSuccess }: NewUserModalProps) => {
  const {} = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    name: '',
    role: 'STAFF'
  });

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...formData,
          password: formData.password || 'Welcome@123'
        }),
      });
      if (res.ok) {
        onSuccess();
        onClose();
      } else {
        const data = await res.json();
        setError(data.error || 'Error creating user');
      }
    } catch (err) {
      setError('Error connecting to server');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose}></div>
      <div className="glass-card w-full max-w-md relative p-8 animate-in fade-in zoom-in duration-200">
        <button onClick={onClose} className="absolute right-6 top-6 text-white/40 hover:text-white">
          <X size={20} />
        </button>
        
        <h2 className="text-2xl font-bold mb-6">Add New User</h2>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center gap-2 text-red-500 text-xs font-bold mb-4">
              <AlertCircle size={14} />
              {error}
            </div>
          )}

          <div className="space-y-1">
            <label className="text-[10px] uppercase font-bold text-white/40 ml-1">Full Name</label>
            <input 
              required
              type="text" 
              value={formData.name}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
              placeholder="e.g. John Doe"
              className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-sm focus:border-indigo-500/50 outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] uppercase font-bold text-white/40 ml-1">User ID / Username</label>
              <input 
                required
                type="text" 
                value={formData.username}
                onChange={(e) => setFormData({...formData, username: e.target.value})}
                placeholder="unique_id"
                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-sm focus:border-indigo-500/50 outline-none"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] uppercase font-bold text-white/40 ml-1">Role</label>
              <select 
                value={formData.role}
                onChange={(e) => setFormData({...formData, role: e.target.value})}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-sm focus:border-indigo-500/50 outline-none"
              >
                <option value="STAFF">Staff</option>
                <option value="ADMIN">Admin</option>
              </select>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] uppercase font-bold text-white/40 ml-1">Email Address</label>
            <input 
              required
              type="email" 
              value={formData.email}
              onChange={(e) => setFormData({...formData, email: e.target.value})}
              placeholder="user@company.com"
              className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-sm focus:border-indigo-500/50 outline-none"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] uppercase font-bold text-white/40 ml-1">Initial Password</label>
            <input 
              type="text" 
              value={formData.password}
              onChange={(e) => setFormData({...formData, password: e.target.value})}
              placeholder="Leave blank to use default (Welcome@123)"
              className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-sm focus:border-indigo-500/50 outline-none text-indigo-400 font-medium"
            />
          </div>

          <button 
            type="submit"
            disabled={loading}
            className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 mt-4 rounded-lg shadow-lg shadow-indigo-600/20 transition-all disabled:opacity-50 uppercase text-xs tracking-widest"
          >
            {loading ? 'Adding...' : 'Create User Account'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default NewUserModal;
