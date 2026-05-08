"use client";
import React from 'react';

const ListView = () => {
  return (
    <div className="p-6">
      <div className="glass-card overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-white/5 text-white/60 border-b border-white/5 uppercase text-[10px] tracking-widest font-bold">
            <tr>
              <th className="px-6 py-4">ID</th>
              <th className="px-6 py-4">Title</th>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4">Priority</th>
              <th className="px-6 py-4">Assignee</th>
              <th className="px-6 py-4">Created</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            <tr className="hover:bg-white/[0.02] transition-colors group">
              <td className="px-6 py-4 text-white/40">#123</td>
              <td className="px-6 py-4 font-medium">Server infrastructure upgrade</td>
              <td className="px-6 py-4">
                <span className="bg-indigo-500/10 text-indigo-400 px-2 py-1 rounded text-[10px] font-bold uppercase">In Progress</span>
              </td>
              <td className="px-6 py-4">
                <span className="text-white/60">Medium</span>
              </td>
              <td className="px-6 py-4 text-white/60">Anurag</td>
              <td className="px-6 py-4 text-white/40">2h ago</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ListView;
