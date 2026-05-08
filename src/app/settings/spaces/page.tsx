"use client";
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Plus, Trash2, Folder as FolderIcon, LayoutDashboard, Loader2, AlertCircle, Edit2, Check, X } from 'lucide-react';

interface Folder {
  id: number;
  name: string;
}

interface Space {
  id: number;
  name: string;
  description: string | null;
  folders: Folder[];
}

export default function SpacesSettingsPage() {
  const { user } = useAuth();
  const [spaces, setSpaces] = useState<Space[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Create State
  const [newSpaceName, setNewSpaceName] = useState('');
  const [newSpaceDesc, setNewSpaceDesc] = useState('');
  const [newFolderNames, setNewFolderNames] = useState<Record<number, string>>({});
  
  // Edit State
  const [editingSpaceId, setEditingSpaceId] = useState<number | null>(null);
  const [editSpaceName, setEditSpaceName] = useState('');
  const [editSpaceDesc, setEditSpaceDesc] = useState('');

  const [editingFolderId, setEditingFolderId] = useState<number | null>(null);
  const [editFolderName, setEditFolderName] = useState('');

  useEffect(() => {
    fetchSpaces();
  }, []);

  const fetchSpaces = async () => {
    try {
      const res = await fetch('/api/spaces');
      if (res.ok) {
        setSpaces(await res.json());
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const createSpace = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSpaceName.trim()) return;
    try {
      const res = await fetch('/api/spaces', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ name: newSpaceName, description: newSpaceDesc })
      });
      if (res.ok) {
        setNewSpaceName('');
        setNewSpaceDesc('');
        fetchSpaces();
      } else {
        const body = await res.json();
        setError(body.error);
      }
    } catch (err: any) {
      setError(err.message);
    }
  };

  const createFolder = async (spaceId: number) => {
    const name = newFolderNames[spaceId];
    if (!name?.trim()) return;
    try {
      const res = await fetch('/api/folders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ name, spaceId })
      });
      if (res.ok) {
        setNewFolderNames(prev => ({ ...prev, [spaceId]: '' }));
        fetchSpaces();
      }
    } catch (err: any) {
      setError(err.message);
    }
  };

  const deleteFolder = async (id: number) => {
    if (!confirm("Delete this folder? Tickets will have their folder reference cleared.")) return;
    try {
      const res = await fetch(`/api/folders/${id}`, {
        method: 'DELETE'
      });
      if (res.ok) fetchSpaces();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const startSpaceEdit = (space: Space) => {
    setEditingSpaceId(space.id);
    setEditSpaceName(space.name);
    setEditSpaceDesc(space.description || '');
  };

  const saveSpaceEdit = async (id: number) => {
    if (!editSpaceName.trim()) return;
    try {
      const res = await fetch(`/api/spaces/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editSpaceName, description: editSpaceDesc })
      });
      if (res.ok) {
        setEditingSpaceId(null);
        fetchSpaces();
      }
    } catch (err: any) {
      setError(err.message);
    }
  };

  const startFolderEdit = (folder: Folder) => {
    setEditingFolderId(folder.id);
    setEditFolderName(folder.name);
  };

  const saveFolderEdit = async (id: number) => {
    if (!editFolderName.trim()) return;
    try {
      const res = await fetch(`/api/folders/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editFolderName })
      });
      if (res.ok) {
        setEditingFolderId(null);
        fetchSpaces();
      }
    } catch (err: any) {
      setError(err.message);
    }
  };

  if (loading) return <div className="flex h-64 items-center justify-center"><Loader2 className="animate-spin text-indigo-500" /></div>;

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-white mb-2">Spaces & Folders</h1>
        <p className="text-white/50 text-sm">Organize tickets logically across multiple departments or sub-projects.</p>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl flex items-center gap-3">
          <AlertCircle size={20} />
          <p className="font-medium text-sm">{error}</p>
        </div>
      )}

      {/* Existing Spaces */}
      <div className="space-y-6">
        {spaces.map(space => (
          <div key={space.id} className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden shadow-lg shadow-black/20">
            {/* Space Header */}
            <div className="p-6 bg-white/[0.02] border-b border-white/5 flex items-start justify-between group">
              <div className="flex items-center gap-4 flex-1">
                <div className="p-3 bg-indigo-500/20 text-indigo-400 rounded-xl">
                  <LayoutDashboard size={24} />
                </div>
                {editingSpaceId === space.id ? (
                  <div className="flex-1 space-y-2 max-w-md">
                    <input type="text" value={editSpaceName} onChange={e => setEditSpaceName(e.target.value)} className="w-full bg-zinc-800 border-none rounded px-3 py-1 text-sm focus:ring-1 focus:ring-indigo-500 text-white font-bold" />
                    <input type="text" value={editSpaceDesc} onChange={e => setEditSpaceDesc(e.target.value)} className="w-full bg-zinc-800 border-none rounded px-3 py-1 text-sm focus:ring-1 focus:ring-indigo-500 text-white/70" placeholder="Description" />
                    <div className="flex gap-2">
                      <button onClick={() => saveSpaceEdit(space.id)} className="text-xs bg-green-500 hover:bg-green-400 text-white px-3 py-1 rounded">Save</button>
                      <button onClick={() => setEditingSpaceId(null)} className="text-xs bg-zinc-700 hover:bg-zinc-600 text-white px-3 py-1 rounded">Cancel</button>
                    </div>
                  </div>
                ) : (
                  <div>
                    <h3 className="text-lg font-bold text-white tracking-wide">{space.name}</h3>
                    <p className="text-sm text-white/50">{space.description || 'No description provided.'}</p>
                  </div>
                )}
              </div>
              {user?.role === 'ADMIN' && editingSpaceId !== space.id && (
                <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
                  <button onClick={() => startSpaceEdit(space)} className="p-2 hover:bg-white/10 text-white/50 hover:text-white rounded-lg transition-colors">
                    <Edit2 size={18} />
                  </button>
                </div>
              )}
            </div>

            {/* Folders List */}
            <div className="p-6 space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-widest text-white/30 mb-4">Folders in {space.name}</h4>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {space.folders.map(folder => (
                  <div key={folder.id} className="group flex items-center justify-between bg-zinc-900 border border-white/10 p-4 rounded-xl hover:border-indigo-500/50 transition-colors">
                    {editingFolderId === folder.id ? (
                      <div className="flex items-center gap-2 flex-1">
                        <input type="text" value={editFolderName} onChange={e => setEditFolderName(e.target.value)} className="w-full bg-zinc-800 border-none rounded px-3 py-1 text-sm focus:ring-1 focus:ring-indigo-500 text-white" autoFocus />
                        <button onClick={() => saveFolderEdit(folder.id)} className="p-1 text-green-400 hover:bg-green-400/20 rounded"><Check size={16} /></button>
                        <button onClick={() => setEditingFolderId(null)} className="p-1 text-zinc-400 hover:bg-zinc-700/50 rounded"><X size={16} /></button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-3">
                        <FolderIcon size={18} className="text-indigo-400/50" />
                        <span className="font-semibold text-white/90">{folder.name}</span>
                      </div>
                    )}
                    {user?.role === 'ADMIN' && editingFolderId !== folder.id && (
                      <div className="opacity-0 group-hover:opacity-100 flex gap-1">
                        <button onClick={() => startFolderEdit(folder)} className="p-2 hover:bg-white/10 text-white/70 rounded-lg transition-colors">
                          <Edit2 size={16} />
                        </button>
                        <button onClick={() => deleteFolder(folder.id)} className="p-2 hover:bg-red-500/20 text-red-400 rounded-lg transition-colors">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    )}
                  </div>
                ))}

                {/* Add new Folder Card */}
                {user?.role === 'ADMIN' && (
                  <div className="flex items-center gap-2 bg-zinc-900/50 border border-white/5 border-dashed p-3 rounded-xl">
                    <input 
                      type="text"
                      className="flex-1 bg-transparent border-none text-sm focus:ring-0 text-white placeholder:text-white/20"
                      placeholder="New folder..."
                      value={newFolderNames[space.id] || ''}
                      onChange={e => setNewFolderNames({...newFolderNames, [space.id]: e.target.value})}
                      onKeyDown={e => e.key === 'Enter' && createFolder(space.id)}
                    />
                    <button onClick={() => createFolder(space.id)} disabled={!newFolderNames[space.id]?.trim()} className="bg-white/10 hover:bg-indigo-500 text-white p-1.5 rounded disabled:opacity-30 transition-colors">
                      <Plus size={16} />
                    </button>
                  </div>
                )}
              </div>
              
              {space.folders.length === 0 && <p className="text-sm text-white/40 italic mt-2">No folders exist for this space yet.</p>}
            </div>
          </div>
        ))}
        {spaces.length === 0 && <div className="text-center py-12 bg-white/5 rounded-2xl border border-white/10 border-dashed text-white/40">No Spaces have been created yet.</div>}
      </div>

      {/* Create Space Form */}
      {user?.role === 'ADMIN' && (
        <div className="pt-8 border-t border-white/10">
          <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
            <Plus className="text-indigo-400" />
            Create New Space
          </h3>
          <form onSubmit={createSpace} className="max-w-xl bg-white/5 p-6 rounded-2xl border border-white/10 space-y-4 shadow-xl">
            <div>
              <label className="text-xs uppercase tracking-widest text-white/40 font-bold ml-1 block mb-1">Space Name *</label>
              <input 
                type="text" 
                required
                value={newSpaceName}
                onChange={e => setNewSpaceName(e.target.value)}
                placeholder="e.g., Engineering, IT Operations"
                className="w-full bg-zinc-900 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-indigo-500/50 transition-colors"
              />
            </div>
            <div>
              <label className="text-xs uppercase tracking-widest text-white/40 font-bold ml-1 block mb-1">Description</label>
              <input 
                type="text" 
                value={newSpaceDesc}
                onChange={e => setNewSpaceDesc(e.target.value)}
                placeholder="What is this space for?"
                className="w-full bg-zinc-900 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-indigo-500/50 transition-colors"
              />
            </div>
            <button 
              type="submit"
              disabled={!newSpaceName.trim()}
              className="mt-2 text-sm bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 px-6 rounded-xl shadow-lg transition-all disabled:opacity-50"
            >
              Initialize Space
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
