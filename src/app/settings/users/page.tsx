"use client";
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Users, Loader2, ShieldAlert, CheckCircle2, Key, UserPlus, Shield, User as UserIcon } from 'lucide-react';
import { User } from '@/types';
import NewUserModal from '@/components/NewUserModal';

export default function UserManagementPage() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [updating, setUpdating] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/users');
      if (res.ok) {
        setUsers(await res.json());
      } else {
        const data = await res.json();
        setError(data.error || 'Failed to fetch users');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const updateUserRole = async (userId: number, newRole: string) => {
    setUpdating(userId.toString());
    setError('');
    setSuccess('');
    
    try {
      const res = await fetch(`/api/users/${userId}/role`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ role: newRole })
      });
      
      if (res.ok) {
        setSuccess('User role updated successfully.');
        setUsers(users.map(u => u.id === userId ? { ...u, role: newRole as any } : u));
      } else {
        const data = await res.json();
        setError(data.error || 'Failed to update role');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setUpdating(null);
    }
  };

  const resetPassword = async (userId: number) => {
    setUpdating(userId.toString());
    setError('');
    setSuccess('');

    try {
      const res = await fetch(`/api/users/${userId}/reset-password`, {
        method: 'POST'
      });
      
      if (res.ok) {
        setSuccess('Password reset to default (Welcome@123) successfully.');
      } else {
        const data = await res.json();
        setError(data.error || 'Failed to reset password');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setUpdating(null);
    }
  };
  
  const toggleUserStatus = async (userId: number, currentStatus: boolean) => {
    setUpdating(userId.toString());
    setError('');
    setSuccess('');

    try {
      const res = await fetch(`/api/users/${userId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ isActive: !currentStatus })
      });
      
      if (res.ok) {
        setSuccess(`User ${!currentStatus ? 'activated' : 'deactivated'} successfully.`);
        setUsers(users.map(u => u.id === userId ? { ...u, isActive: !currentStatus } : u));
      } else {
        const data = await res.json();
        setError(data.error || 'Failed to update status');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setUpdating(null);
    }
  };

  useEffect(() => {
    fetchUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading) return <div className="flex h-64 items-center justify-center"><Loader2 className="animate-spin text-indigo-500" /></div>;

  return (
    <div className="space-y-8 animate-in fade-in duration-500 max-w-6xl">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white mb-2 flex items-center gap-3">
            <Users className="text-indigo-400" /> User Management
          </h1>
          <p className="text-white/50 text-sm">Manage access and permissions for all users across the workspace.</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold px-6 py-3 rounded-xl shadow-lg shadow-indigo-600/20 transition-all flex items-center gap-2 uppercase tracking-widest active:scale-[0.98]"
        >
          <UserPlus size={16} /> Add New User
        </button>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl flex items-center gap-3">
          <ShieldAlert size={20} />
          <p className="font-medium text-sm">{error}</p>
        </div>
      )}

      {success && (
        <div className="bg-green-500/10 border border-green-500/20 text-green-400 p-4 rounded-xl flex items-center gap-3">
          <CheckCircle2 size={20} />
          <p className="font-medium text-sm">{success}</p>
        </div>
      )}

      <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-white/[0.02] border-b border-white/5">
                <th className="px-6 py-4 text-[10px] font-bold text-white/40 uppercase tracking-widest">User Profile</th>
                <th className="px-6 py-4 text-[10px] font-bold text-white/40 uppercase tracking-widest">User ID</th>
                <th className="px-6 py-4 text-[10px] font-bold text-white/40 uppercase tracking-widest text-center">Status</th>
                <th className="px-6 py-4 text-[10px] font-bold text-white/40 uppercase tracking-widest">Role</th>
                <th className="px-6 py-4 text-[10px] font-bold text-white/40 uppercase tracking-widest text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {users.map((u) => (
                <tr key={u.id} className={`hover:bg-white/[0.02] transition-colors group ${!u.isActive ? 'opacity-50 grayscale-[0.5]' : ''}`}>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm border shadow-inner ${
                        u.isActive 
                          ? 'bg-gradient-to-br from-indigo-500/20 to-purple-500/20 text-indigo-400 border-white/10' 
                          : 'bg-zinc-800 text-zinc-500 border-zinc-700'
                      }`}>
                        {u.name ? u.name.substring(0, 1).toUpperCase() : (u.email || 'U').substring(0, 1).toUpperCase()}
                      </div>
                      <div>
                        <div className="font-bold text-white/90 flex items-center gap-2">
                          {u.name || 'Anonymous User'}
                          {u.id === currentUser?.id && (
                            <span className="bg-indigo-500/10 text-indigo-400 text-[10px] uppercase font-bold px-2 py-0.5 rounded-md border border-indigo-500/20">Me</span>
                          )}
                        </div>
                        <div className="text-white/40 text-xs mt-0.5 font-medium">{u.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <code className="bg-black/40 border border-white/5 px-2 py-1 rounded text-[10px] text-white/40 font-mono tracking-tight">
                      {u.username}
                    </code>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex justify-center">
                      <button 
                        onClick={() => toggleUserStatus(u.id, u.isActive)}
                        disabled={updating === u.id.toString() || u.id === currentUser?.id}
                        className={`text-[9px] font-black uppercase tracking-tighter px-2 py-1 rounded border transition-all ${
                          u.isActive 
                            ? 'bg-green-500/10 text-green-500 border-green-500/20 hover:bg-green-500/20' 
                            : 'bg-red-500/10 text-red-500 border-red-500/20 hover:bg-red-500/20'
                        } disabled:opacity-50`}
                      >
                        {u.isActive ? 'Active' : 'Inactive'}
                      </button>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center gap-2">
                        {u.role === 'ADMIN' ? <Shield size={12} className="text-purple-400" /> : <UserIcon size={12} className="text-indigo-400" />}
                        <span className={`text-[10px] font-bold uppercase tracking-wider ${
                          u.role === 'ADMIN' ? 'text-purple-400' : 
                          u.role === 'STAFF' ? 'text-indigo-400' : 
                          'text-zinc-400'
                        }`}>
                          {u.role || 'USER'}
                        </span>
                      </div>
                      <select
                        value={u.role || 'USER'}
                        disabled={updating === u.id.toString() || u.id === currentUser?.id}
                        onChange={(e) => updateUserRole(u.id, e.target.value)}
                        className="bg-zinc-900 border border-white/10 rounded-lg px-2 py-1 text-[11px] text-white/70 focus:outline-none focus:border-indigo-500/40 transition-colors disabled:opacity-50 w-28"
                      >
                        <option value="USER">Standard</option>
                        <option value="STAFF">Staff</option>
                        <option value="ADMIN">Admin</option>
                      </select>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button 
                      onClick={() => resetPassword(u.id)}
                      disabled={updating === u.id.toString()}
                      className="text-white/40 hover:text-white text-[10px] font-bold uppercase tracking-widest bg-white/5 hover:bg-white/10 px-3 py-2 rounded-lg transition-all border border-white/5 flex items-center gap-2 ml-auto"
                    >
                      <Key size={12} /> Reset Password
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {users.length === 0 && (
            <div className="p-12 text-center">
              <Users className="mx-auto text-white/10 mb-4" size={48} />
              <div className="text-white/30 font-medium italic">No users found in system.</div>
            </div>
          )}
        </div>
      </div>

      <NewUserModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onSuccess={fetchUsers} 
      />
    </div>
  );
}
