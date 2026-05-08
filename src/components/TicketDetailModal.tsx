"use client";
import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Ticket, Comment as TicketComment, User, Priority, ChecklistItem } from '../types';
import { X, Send, User as UserIcon, AlertCircle, CheckCircle, Loader2, Server, Cpu, Clock, Zap, Trash2 } from 'lucide-react';
import { uploadAttachment } from '@/lib/storage';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface TicketDetailModalProps {
  ticket: Ticket | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: () => void;
  users?: User[];
  assets?: { id: number; name: string; type: string }[];
}

const STATUS_OPTIONS = ['TODO','IN_PROGRESS','AWAITING_USER','RESOLVED','CLOSED'];
const PRIORITY_OPTIONS: Priority[] = ['P0','P1','P2','P3'];

const PRIORITY_LABELS: Record<string, string> = {
  P0: 'P0 – Critical',
  P1: 'P1 – High',
  P2: 'P2 – Normal',
  P3: 'P3 – Low',
};

const TicketDetailModal = ({ ticket, isOpen, onClose, onUpdate, users, assets: initialAssets }: TicketDetailModalProps) => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';

  const [comments, setComments] = useState<TicketComment[]>([]);
  const [staff, setStaff] = useState<User[]>(users || []);
  const [assets, setAssets] = useState<{ id: number; name: string; type: string }[]>(initialAssets || []);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Local editable state
  const [localStatus, setLocalStatus] = useState('');
  const [localPriority, setLocalPriority] = useState<Priority>('P2');
  const [localAssignee, setLocalAssignee] = useState<string>('');
  const [localTags, setLocalTags] = useState<string>('');
  const [localDueDate, setLocalDueDate] = useState<string>('');
  const [checklists, setChecklists] = useState<ChecklistItem[]>([]);
  const [newChecklistTitle, setNewChecklistTitle] = useState('');
  const [localAsset, setLocalAsset] = useState<string>('');
  
  // Tabs & Timeline
  const [activeTab, setActiveTab] = useState<'details' | 'timeline'>('details');
  const [activityLogs, setActivityLogs] = useState<{
    id: number;
    action: string;
    field?: string;
    oldValue?: string;
    newValue?: string;
    createdAt: string;
    user?: { name: string; username: string };
  }[]>([]);
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);
  const [logsError, setLogsError] = useState(false);

  // Mentions
  const [showMentions, setShowMentions] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');
  const [mentionIndex, setMentionIndex] = useState(-1);
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);

  const fetchActivityLogs = useCallback(async () => {
    if (!ticket) return;
    setIsLoadingLogs(true);
    setLogsError(false);
    try {
      const res = await fetch(`/api/tickets/${ticket.id}/activity`);
      if (res.ok) {
        setActivityLogs(await res.json());
      } else {
        setLogsError(true);
      }
    } catch (e) {
      console.error(e);
      setLogsError(true);
    } finally {
      setIsLoadingLogs(false);
    }
  }, [ticket]);

  const fetchComments = useCallback(async () => {
    if (!ticket) return;
    try {
      const res = await fetch(`/api/tickets/${ticket.id}/comments`);
      if (res.ok) setComments(await res.json());
    } catch (e) {
      console.error(e);
    }
  }, [ticket]);

  const fetchStaff = useCallback(async () => {
    try {
      const res = await fetch('/api/users');
      if (res.ok) setStaff(await res.json());
    } catch (e) {
      console.error(e);
    }
  }, []);

  const fetchAssets = useCallback(async () => {
    try {
      const res = await fetch('/api/assets');
      if (res.ok) setAssets(await res.json());
    } catch (e) {
      console.error(e);
    }
  }, []);

  useEffect(() => {
    if (isOpen && ticket) {
      setLocalStatus(ticket.status);
      setLocalPriority(ticket.priority);
      setLocalAssignee(ticket.assignedToId ? String(ticket.assignedToId) : '');
      setLocalTags(ticket.tags ? ticket.tags.join(', ') : '');
      setLocalDueDate(ticket.dueDate ? new Date(ticket.dueDate).toISOString().split('T')[0] : '');
      setLocalAsset(ticket.assetId ? String(ticket.assetId) : '');
      setChecklists(ticket.checklists || []);
      setShowDeleteConfirm(false);
      fetchComments();
      fetchActivityLogs();
      if (!users) fetchStaff();
      else setStaff(users);
      if (!initialAssets) fetchAssets();
      else setAssets(initialAssets);
    }
  }, [isOpen, ticket, fetchComments, fetchActivityLogs, fetchStaff, fetchAssets, users, initialAssets]);

  const saveTicket = async () => {
    if (!ticket) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/tickets/${ticket.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: localStatus,
          priority: localPriority,
          assignedToId: localAssignee ? parseInt(localAssignee) : null,
          assetId: localAsset ? parseInt(localAsset) : null,
          tags: localTags.split(',').map(t => t.trim()).filter(Boolean),
          dueDate: localDueDate || null
        })
      });
      if (res.ok) {
        onUpdate();
        onClose();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  const triageTicket = async () => {
    if (!ticket) return;
    setSaving(true);
    try {
      const res = await fetch('/api/tickets/triage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: ticket.title, description: ticket.description })
      });
      if (res.ok) {
        const result = await res.json();
        setLocalPriority(result.priority);
        setLocalAssignee(result.assignedToId ? String(result.assignedToId) : '');
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  const addChecklistItem = async () => {
    if (!newChecklistTitle.trim() || !ticket) return;
    try {
      const res = await fetch(`/api/tickets/${ticket.id}/checklists`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: newChecklistTitle })
      });
      if (res.ok) {
        const item = await res.json();
        setChecklists([...checklists, item]);
        setNewChecklistTitle('');
        onUpdate();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const toggleChecklist = async (id: number, isCompleted: boolean) => {
    try {
      setChecklists(checklists.map(c => c.id === id ? { ...c, isCompleted } : c));
      const res = await fetch(`/api/checklists/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isCompleted })
      });
      if (res.ok) onUpdate();
    } catch (e) {
      console.error(e);
    }
  };

  const deleteChecklist = async (id: number) => {
    try {
      setChecklists(checklists.filter(c => c.id !== id));
      const res = await fetch(`/api/checklists/${id}`, {
        method: 'DELETE'
      });
      if (res.ok) onUpdate();
    } catch (e) {
      console.error(e);
    }
  };

  const postComment = async () => {
    if (!newComment.trim() || !ticket) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/tickets/${ticket.id}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: newComment })
      });
      if (res.ok) {
        setNewComment('');
        fetchComments();
        fetchActivityLogs();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const deleteTicket = async () => {
    if (!ticket) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/tickets/${ticket.id}`, { method: 'DELETE' });
      if (res.ok) {
        onUpdate();
        onClose();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  const handleCommentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setNewComment(val);

    const cursor = e.target.selectionStart;
    const textBeforeCursor = val.slice(0, cursor);
    const match = textBeforeCursor.match(/@([a-zA-Z0-9_\-\.]*)$/);

    if (match) {
        setShowMentions(true);
        setMentionQuery(match[1]);
        setMentionIndex(match.index || -1);
    } else {
        setShowMentions(false);
    }
  };

  const insertMention = (username: string) => {
      if (mentionIndex === -1) return;
      const beforeMention = newComment.slice(0, mentionIndex);
      const afterCursor = newComment.slice(textareaRef.current?.selectionStart || newComment.length);
      const updatedComment = `${beforeMention}@${username} ${afterCursor}`;
      setNewComment(updatedComment);
      setShowMentions(false);
      textareaRef.current?.focus();
  };

  const filteredStaff = staff.filter(u => 
    u.username.toLowerCase().includes(mentionQuery.toLowerCase()) || 
    (u.name && u.name.toLowerCase().includes(mentionQuery.toLowerCase()))
  );

  const priorityBarColor = {
    P0: 'bg-red-500',
    P1: 'bg-orange-500',
    P2: 'bg-indigo-500',
    P3: 'bg-zinc-600',
  }[localPriority as string] || 'bg-zinc-700';

  if (!isOpen || !ticket) return null;

  const PrioritySelect = () => (
    <select value={localPriority} onChange={e => setLocalPriority(e.target.value as Priority)} className="w-full bg-zinc-800 border border-white/5 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500/40 transition-colors">
      {PRIORITY_OPTIONS.map(opt => <option key={opt} value={opt}>{PRIORITY_LABELS[opt]}</option>)}
    </select>
  );

  const AssigneeSelect = () => (
    <select value={localAssignee} onChange={e => setLocalAssignee(e.target.value)} className="w-full bg-zinc-800 border border-white/5 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500/40 transition-colors">
      <option value="">Unassigned</option>
      {staff.map(u => <option key={u.id} value={u.id}>{u.name || u.username}</option>)}
    </select>
  );

  const AssetSelect = () => (
    <select value={localAsset} onChange={e => setLocalAsset(e.target.value)} className="w-full bg-zinc-800 border border-white/5 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500/40 transition-colors">
      <option value="">No Asset Linked</option>
      {assets.map(asset => <option key={asset.id} value={asset.id}>{asset.name}</option>)}
    </select>
  );

  const DueDateInput = () => (
    <input type="date" value={localDueDate} onChange={e => setLocalDueDate(e.target.value)} className="w-full bg-zinc-800 border border-white/5 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500/40 transition-colors scheme-dark" />
  );

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-2xl bg-[#09090b] border-l border-white/5 h-full flex flex-col shadow-2xl animate-in slide-in-from-right duration-300">
        
        {/* Header Redesign */}
        <div className="px-6 py-5 border-b border-white/5">
          <div className={`h-0.5 w-full mb-4 rounded-full ${priorityBarColor}`} />
          
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-mono text-white/30 mb-1">#{ticket.id}</p>
              <h2 className="text-base font-bold text-white leading-snug">{ticket.title}</h2>
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              <button 
                onClick={triageTicket}
                disabled={saving}
                className="p-1.5 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 border border-indigo-500/20 rounded-lg transition-all"
                title="Magic Triage"
              >
                <Cpu size={14} />
              </button>
              <button onClick={onClose} className="p-1.5 hover:bg-white/10 rounded-lg transition-colors shrink-0">
                <X className="w-4 h-4 text-white/40" />
              </button>
            </div>
          </div>

          <div className="flex items-center gap-1 mt-4">
            {STATUS_OPTIONS.map((s, i, arr) => {
              const currentIndex = arr.indexOf(localStatus);
              const stepIndex = arr.indexOf(s);
              const isPast = stepIndex < currentIndex;
              const isCurrent = s === localStatus;
              return (
                <button
                  key={s}
                  onClick={() => setLocalStatus(s)}
                  className={`flex-1 h-1.5 rounded-full transition-all ${
                    isCurrent ? 'bg-indigo-500' :
                    isPast ? 'bg-white/30' :
                    'bg-white/10 hover:bg-white/20'
                  }`}
                  title={s.replaceAll('_', ' ')}
                />
              );
            })}
          </div>
          <p className="text-[10px] text-white/30 mt-1.5 font-medium uppercase tracking-wider">
            {localStatus.replaceAll('_', ' ')}
          </p>
        </div>

        {/* Tabs */}
        <div className="flex px-6 border-b border-white/5 bg-zinc-950/20">
          <button 
            onClick={() => setActiveTab('details')}
            className={`px-4 py-3 text-[10px] font-black uppercase tracking-widest border-b-2 transition-colors ${activeTab === 'details' ? 'border-indigo-500 text-indigo-400' : 'border-transparent text-white/30 hover:text-white/60'}`}
          >
            Details
          </button>
          <button 
            onClick={() => { setActiveTab('timeline'); fetchActivityLogs(); }}
            className={`px-4 py-3 text-[10px] font-black uppercase tracking-widest border-b-2 transition-colors ${activeTab === 'timeline' ? 'border-indigo-500 text-indigo-400' : 'border-transparent text-white/30 hover:text-white/60'}`}
          >
            Timeline
          </button>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {activeTab === 'details' ? (
            <div className="divide-y divide-white/5">
              <div className="px-6 py-6 grid grid-cols-2 gap-x-6 gap-y-6">
                {[
                  { label: 'Priority', content: <PrioritySelect /> },
                  { label: 'Assignee', content: <AssigneeSelect /> },
                  { label: 'Due Date', content: <DueDateInput /> },
                  { label: 'Asset', content: <AssetSelect /> },
                ].map(({ label, content }) => (
                  <div key={label}>
                    <p className="text-[10px] uppercase tracking-widest text-white/30 font-bold mb-2">{label}</p>
                    {content}
                  </div>
                ))}
              </div>

              <div className="px-6 py-6">
                <p className="text-[10px] uppercase tracking-widest text-white/30 font-bold mb-4">Description</p>
                <div className="text-sm text-white/80 prose prose-invert prose-indigo max-w-none">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{ticket.description}</ReactMarkdown>
                </div>
              </div>

              <div className="px-6 py-6 bg-zinc-950/20">
                <p className="text-[10px] uppercase tracking-widest text-white/30 font-bold mb-4">Checklist</p>
                <div className="space-y-2 mb-4">
                  {checklists.map(item => (
                    <div key={item.id} className="flex items-center gap-3 bg-white/5 p-2 rounded-lg group border border-transparent hover:border-white/5">
                      <input type="checkbox" checked={item.isCompleted} onChange={(e) => toggleChecklist(item.id, e.target.checked)} className="rounded border-none/10 bg-zinc-700 text-indigo-500 w-4 h-4 cursor-pointer focus:ring-0" />
                      <span className={`flex-1 text-sm ${item.isCompleted ? 'text-white/20 line-through' : 'text-white/70'}`}>{item.title}</span>
                      <button onClick={() => deleteChecklist(item.id)} className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-500/20 text-red-400 rounded transition-all"><X className="w-3 h-3" /></button>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    value={newChecklistTitle} 
                    onChange={e => setNewChecklistTitle(e.target.value)} 
                    onKeyDown={e => e.key === 'Enter' && addChecklistItem()} 
                    placeholder="Add item..." 
                    className="flex-1 bg-zinc-800 border border-white/5 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500/40" 
                  />
                  <button onClick={addChecklistItem} disabled={!newChecklistTitle.trim()} className="bg-zinc-800 hover:bg-zinc-700 text-white px-3 py-2 rounded-lg text-xs font-bold disabled:opacity-50 transition-colors">Add</button>
                </div>
              </div>

              <div className="px-6 py-6 flex items-center justify-between">
                {isAdmin ? (
                  showDeleteConfirm ? (
                    <div className="flex items-center gap-2 animate-in slide-in-from-left-2">
                      <span className="text-xs font-bold text-red-500">Delete ticket?</span>
                      <button 
                        onClick={() => setShowDeleteConfirm(false)}
                        className="text-[10px] font-black uppercase tracking-widest text-white/40 hover:text-white px-2 py-1 rounded bg-white/5 transition-all"
                      >
                        Cancel
                      </button>
                      <button 
                        onClick={deleteTicket}
                        className="text-[10px] font-black uppercase tracking-widest bg-red-500 text-white px-2 py-1 rounded shadow-lg shadow-red-500/20 active:scale-95 transition-all"
                      >
                        Confirm
                      </button>
                    </div>
                  ) : (
                    <button 
                      onClick={() => setShowDeleteConfirm(true)} 
                      className="bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 font-bold rounded-lg px-4 py-2 text-sm transition-all flex items-center gap-2"
                    >
                      <Trash2 size={14} /> Delete
                    </button>
                  )
                ) : <div />}
                <div className="flex gap-3">
                  <label className="bg-zinc-800 hover:bg-zinc-700 text-white/60 hover:text-white px-4 py-2 rounded-lg text-sm font-bold cursor-pointer transition-all flex items-center gap-2">
                    <input type="file" className="hidden" onChange={async (e) => {
                      if (e.target.files && e.target.files[0] && ticket) {
                         setSaving(true);
                         await uploadAttachment(ticket.id, e.target.files[0]);
                         setSaving(false);
                      }
                    }} />
                    Attach
                  </label>
                  <button 
                    onClick={saveTicket} 
                    disabled={saving} 
                    className="bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg px-6 py-2 text-sm transition-all active:scale-[0.98] disabled:opacity-50"
                  >
                    {saving ? 'Saving...' : 'Save & Close'}
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-6">
              <div className="relative border-l border-white/5 ml-3 space-y-6 pb-6 mt-4">
                {isLoadingLogs ? (
                  <div className="flex justify-center p-12"><Loader2 className="animate-spin text-white/20" /></div>
                ) : activityLogs.map((log) => (
                  <div key={log.id} className="relative pl-6">
                    <div className="absolute -left-1.5 top-1 w-3 h-3 rounded-full bg-zinc-800 border-2 border-white/10" />
                    <div className="bg-white/5 border border-white/5 rounded-xl p-3">
                      <div className="flex justify-between items-start mb-1">
                        <span className="text-xs font-bold text-white/60">{log.user?.name || log.user?.username || 'System'}</span>
                        <span className="text-[10px] text-white/20 font-mono">{new Date(log.createdAt).toLocaleDateString()}</span>
                      </div>
                      <p className="text-[11px] text-white/40 leading-relaxed">{log.action.replaceAll('_', ' ')}: {log.newValue || log.newValue === null ? 'Updated' : 'Action taken'}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="p-4 bg-zinc-950/40 border-t border-white/5 relative">
          {showMentions && filteredStaff.length > 0 && (
            <div className="absolute bottom-full mb-2 left-4 w-64 bg-zinc-800 border border-white/5 rounded-xl shadow-2xl overflow-hidden max-h-48 overflow-y-auto z-50">
              {filteredStaff.map(u => (
                <button
                  key={u.id}
                  onClick={() => insertMention(u.username)}
                  className="w-full text-left px-4 py-2 hover:bg-white/5 text-sm transition-colors flex items-center justify-between"
                >
                  <span className="font-bold text-white/80">{u.name || u.username}</span>
                  <span className="text-[10px] text-white/30">@{u.username}</span>
                </button>
              ))}
            </div>
          )}

          <div className="flex gap-2">
            <textarea 
               ref={textareaRef}
               value={newComment} 
               onChange={handleCommentChange} 
               placeholder="Write a comment..." 
               className="flex-1 bg-zinc-900 border border-white/5 rounded-xl p-3 text-sm focus:outline-none focus:border-indigo-500/20 resize-none h-12 text-white" 
            />
            <button onClick={postComment} disabled={loading || !newComment.trim()} className="bg-indigo-600 hover:bg-indigo-500 text-white p-3 rounded-xl disabled:opacity-50 transition-colors">
              <Send size={18} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TicketDetailModal;