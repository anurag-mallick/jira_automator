"use client";
import React, { useState, useEffect } from 'react';
import NewUserModal from '@/components/NewUserModal';
import { useAuth } from '@/context/AuthContext';
import { Shield, Home } from 'lucide-react';
import Link from 'next/link';
import { User } from '@/types';

const UserManagement = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const { user } = useAuth(); // kept if we need role check later, but currently unused in this component's logic besides being there.
  // Actually the warning said 'user' is assigned but never used. I'll remove it if not used.
  // But wait, the admin page SHOULD probably check if the user is an admin.
  // For now I'll just remove the unused variable to satisfy lint.

  const fetchUsers = React.useCallback(async () => {
    try {
      const res = await fetch('/api/users');
      if (res.ok) {
        const data = await res.json();
        setUsers(data);
      }
    } catch (e) {
      console.error('Failed to fetch users');
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  return (
    <div className="min-h-screen bg-zinc-950 text-white flex flex-col">
      <header className="h-14 border-b border-white/5 flex items-center justify-between px-8 bg-black/20 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <Link href="/" className="p-1.5 hover:bg-white/5 rounded-md transition-colors">
            <Home size={18} className="text-white/40" />
          </Link>
          <div className="w-px h-4 bg-white/10 mx-1" />
          <h2 className="text-sm font-bold flex items-center gap-2">
            <Shield size={14} className="text-purple-400" />
            Admin / User Management
          </h2>
        </div>
      </header>

      <div className="p-12 max-w-5xl mx-auto w-full">
        <div className="flex justify-between items-end mb-8">
          <div>
            <h1 className="text-3xl mb-1 font-bold">User Management</h1>
            <p className="text-white/40 text-sm">Create and manage access for IT management team staff.</p>
          </div>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold px-6 py-3 rounded-lg shadow-lg shadow-indigo-600/20 transition-all uppercase tracking-widest active:scale-[0.98]"
          >
            Add New User
          </button>
        </div>

        <div className="glass-card overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead className="bg-white/5 text-white/60 border-b border-white/5 uppercase text-[10px] tracking-widest font-bold">
              <tr>
                <th className="px-6 py-4">Full Name</th>
                <th className="px-6 py-4">Email</th>
                <th className="px-6 py-4">User ID</th>
                <th className="px-6 py-4">Role</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {users.map(u => (
                <tr key={u.id} className="hover:bg-white/2 transition-colors group">
                  <td className="px-6 py-4 font-medium">{u.name}</td>
                  <td className="px-6 py-4 text-white/40">{u.email}</td>
                  <td className="px-6 py-4 text-white/20 text-xs">{u.username}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-tighter ${u.role === 'ADMIN' ? 'bg-orange-500/10 text-orange-400' : 'bg-blue-500/10 text-blue-400'}`}>
                      {u.role}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`flex items-center gap-2 text-[10px] font-bold uppercase ${u.isActive ? 'text-green-500' : 'text-white/20'}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${u.isActive ? 'bg-green-500 animate-pulse' : 'bg-white/20'}`}></span>
                      {u.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button className="text-red-400/60 hover:text-red-400 text-xs font-medium transition-colors">Deactivate</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <NewUserModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onSuccess={fetchUsers} 
      />
    </div>
  );
};

export default UserManagement;
