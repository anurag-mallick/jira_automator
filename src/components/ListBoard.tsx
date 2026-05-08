"use client";
import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { ChevronRight, Loader2, AlertCircle, Trash2, X } from 'lucide-react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { Ticket, User } from '@/types';
import TicketDetailModal from '@/components/TicketDetailModal';
import { useDensity } from '@/context/DensityContext';
import { useRealtimeTickets } from '@/hooks/useRealtimeTickets';

const priorityColor: Record<string, string> = {
  P0: 'text-red-400',
  P1: 'text-orange-400',
  P2: 'text-indigo-400',
  P3: 'text-zinc-400',
};

const statusColors: Record<string, string> = {
  TODO:          'bg-zinc-700/50 text-zinc-300',
  IN_PROGRESS:   'bg-blue-500/15 text-blue-300',
  AWAITING_USER: 'bg-yellow-500/15 text-yellow-300',
  RESOLVED:      'bg-green-500/15 text-green-300',
  CLOSED:        'bg-zinc-600/30 text-zinc-400',
};

interface ListBoardProps {
  searchQuery?: string;
  users?: User[];
  assets?: { id: number; name: string; type: string }[];
  key?: any;
}

const ListBoard = ({ searchQuery = "", users, assets }: ListBoardProps) => {
  const { density } = useDensity();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, totalCount: 0 });
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [selectedTicketIds, setSelectedTicketIds] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(true);
  const [savingBulk, setSavingBulk] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [bulkError, setBulkError] = useState<string | null>(null);
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);
  
  const { user: authUser } = useAuth();
  const isAdmin = authUser?.role === 'ADMIN';
  const currentPageRef = React.useRef(pagination.page);

  useEffect(() => {
    currentPageRef.current = pagination.page;
  }, [pagination.page]);

  const fetchTickets = async (page = 1) => {
    setLoading(true);
    setError(null);
    try {
      const url = searchQuery
        ? `/api/tickets?all=true`
        : `/api/tickets?page=${page}&pageSize=20`;
      const res = await fetch(url);
      if (!res.ok) throw new Error('Failed to fetch tickets');
      const data = await res.json();
      setTickets(data.tickets);
      setPagination(data.pagination);
      setSelectedTicketIds(new Set()); 
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Connection error');
    } finally {
      setLoading(false);
    }
  };

  // Handle real-time ticket updates
  const handleTicketUpdate = useCallback((event: { type: 'created' | 'updated' | 'deleted'; ticket: any }) => {
    const { type, ticket } = event;
    
    setTickets((prev) => {
      switch (type) {
        case 'created':
          // Add new ticket if it doesn't exist
          if (!prev.find(t => t.id === ticket.id)) {
            return [ticket, ...prev];
          }
          return prev;
        
        case 'updated':
          // Update existing ticket
          return prev.map(t => t.id === ticket.id ? { ...t, ...ticket } : t);
        
        case 'deleted':
          // Remove deleted ticket
          return prev.filter(t => t.id !== ticket.id);
        
        default:
          return prev;
      }
    });
  }, []);

  // Subscribe to real-time updates
  useRealtimeTickets(handleTicketUpdate);

  useEffect(() => { 
    fetchTickets(currentPageRef.current); 
    // Reduced polling interval since we have real-time updates
    const interval = setInterval(() => fetchTickets(currentPageRef.current), 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (searchQuery !== undefined) fetchTickets(1);
  }, [searchQuery]);

  const filteredTickets = tickets.filter((t: Ticket) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    const title = t.title || "";
    const description = t.description || "";
    const requester = t.requesterName || t.authorName || "";
    const id = t.id?.toString() || "";

    return (
      title.toLowerCase().includes(q) ||
      description.toLowerCase().includes(q) ||
      requester.toLowerCase().includes(q) ||
      id.includes(q)
    );
  });

  const toggleSelectAll = () => {
    if (selectedTicketIds.size === filteredTickets.length) {
      setSelectedTicketIds(new Set());
    } else {
      setSelectedTicketIds(new Set(filteredTickets.map((t: Ticket) => t.id)));
    }
    setShowBulkDeleteConfirm(false);
  };

  const toggleSelectTicket = (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    const newSelected = new Set(selectedTicketIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedTicketIds(newSelected);
    setShowBulkDeleteConfirm(false);
  };

  const handleBulkAction = async (actionType: 'status' | 'priority' | 'assignee' | 'delete', value?: string) => {
    if (selectedTicketIds.size === 0) return;
    
    if (actionType === 'delete' && !showBulkDeleteConfirm) {
      setShowBulkDeleteConfirm(true);
      return;
    }

    setSavingBulk(true);
    setBulkError(null);
    try {
      const data: Record<string, any> = {};
      if (actionType === 'status') data.status = value;
      if (actionType === 'priority') data.priority = value;
      if (actionType === 'assignee') data.assignedToId = value ? parseInt(value) : null;
      if (actionType === 'delete') data.delete = true;

      const res = await fetch('/api/tickets/bulk', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ids: Array.from(selectedTicketIds),
          data
        })
      });

      if (res.ok) {
        setSelectedTicketIds(new Set());
        setShowBulkDeleteConfirm(false);
        fetchTickets(pagination.page);
      } else {
        const err = await res.json();
        setBulkError(err.error || 'Bulk action failed');
      }
    } catch (e) {
      console.error(e);
      setBulkError('An error occurred during bulk action.');
    } finally {
      setSavingBulk(false);
    }
  };

  const parentRef = React.useRef<HTMLDivElement>(null);

  const rowHeights = {
    compact: 48,
    comfortable: 56,
    spacious: 64
  };

  const rowVirtualizer = useVirtualizer({
    count: filteredTickets.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => rowHeights[density],
    overscan: 5,
  });

  if (loading) return (
    <div className="flex-1 flex items-center justify-center py-24">
      <Loader2 className="w-7 h-7 text-indigo-500 animate-spin" />
    </div>
  );

  if (error) return (
    <div className="bg-red-500/10 border border-red-500/20 p-6 rounded-2xl flex items-center gap-3 text-red-400">
      <AlertCircle size={18} />
      <span className="text-sm">{error}</span>
      <button onClick={() => fetchTickets(1)} className="ml-auto text-indigo-400 hover:underline text-xs font-bold">Retry</button>
    </div>
  );

  return (
    <>
      <div className="bg-zinc-950/20 border border-white/5 rounded-2xl overflow-hidden flex flex-col h-[700px] relative">
        {/* Table Header */}
        <div className="grid grid-cols-[auto_1fr_120px_100px_120px_80px_40px] gap-0 px-4 py-3 border-b border-white/5 text-[10px] font-black uppercase tracking-widest text-white/25 items-center">
          <div className="w-10">
            <input 
              type="checkbox" 
              checked={selectedTicketIds.size === filteredTickets.length && filteredTickets.length > 0}
              onChange={toggleSelectAll}
              className="rounded border-white/10 bg-black/20 text-indigo-500 focus:ring-0 cursor-pointer w-4 h-4"
            />
          </div>
          <div>Title</div>
          <div className="px-2">Assignee</div>
          <div className="px-2">Status</div>
          <div className="px-2">Priority</div>
          <div className="px-2">Created</div>
          <div></div>
        </div>

        {/* virtualized Scroll Container */}
        <div 
          ref={parentRef} 
          className="flex-1 overflow-auto custom-scrollbar"
        >
          {filteredTickets.length === 0 ? (
            <div className="flex items-center justify-center p-24 text-white/20 text-sm">No tickets found</div>
          ) : (
            <div
              style={{
                height: `${rowVirtualizer.getTotalSize()}px`,
                width: '100%',
                position: 'relative',
              }}
            >
              {rowVirtualizer.getVirtualItems().map((virtualRow: any) => {
                const ticket = filteredTickets[virtualRow.index];
                const priorityBorder = {
                  P0: 'border-l-red-500',
                  P1: 'border-l-orange-500',
                  P2: 'border-l-indigo-500',
                  P3: 'border-l-zinc-600',
                }[ticket.priority as string] || 'border-l-zinc-700';

                return (
                  <div
                    key={virtualRow.key}
                    className={`absolute top-0 left-0 w-full grid grid-cols-[auto_1fr_120px_100px_120px_80px_40px] items-center hover:bg-white/[0.03] transition-colors group cursor-pointer border-b border-white/5 border-l-4 ${priorityBorder}`}
                    style={{
                      height: `${virtualRow.size}px`,
                      top: 0,
                      left: 0,
                      transform: `translateY(${virtualRow.start}px)`,
                    }}
                    onClick={() => setSelectedTicket(ticket)}
                  >
                    <div className="w-10 px-0 h-full flex items-center justify-center" onClick={(e: React.MouseEvent) => e.stopPropagation()}>
                       <input 
                        type="checkbox" 
                        checked={selectedTicketIds.has(ticket.id)}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => toggleSelectTicket(ticket.id, e as unknown as React.MouseEvent)}
                        className="rounded border-white/10 bg-black/20 text-indigo-500 focus:ring-0 cursor-pointer w-4 h-4"
                      />
                    </div>
                    <div className="px-0 h-full flex items-center text-sm font-medium overflow-hidden">
                      <span className="truncate text-white/90">
                        <span className="text-[10px] text-white/20 font-mono mr-2">#{ticket.id}</span>
                        {ticket.title}
                      </span>
                    </div>
                    <div className="px-2 h-full flex items-center overflow-hidden">
                      {ticket.assignedTo ? (
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-indigo-500/20 to-purple-500/20 border border-white/5 flex items-center justify-center text-[10px] font-bold text-white/60">
                            {(ticket.assignedTo.name || ticket.assignedTo.username || '?')[0].toUpperCase()}
                          </div>
                          <span className="text-[11px] text-white/40 truncate hidden lg:block">{ticket.assignedTo.name || ticket.assignedTo.username}</span>
                        </div>
                      ) : <span className="text-[11px] text-white/10">Unassigned</span>}
                    </div>
                    <div className="px-2 h-full flex items-center">
                      <span className={`text-[9px] px-2 py-0.5 rounded-full font-black uppercase tracking-tighter ${statusColors[ticket.status] ?? 'bg-white/5 text-white/50'}`}>
                        {ticket.status.replaceAll('_', ' ')}
                      </span>
                    </div>
                    <div className="px-2 h-full flex items-center">
                      <span className={`text-[10px] font-bold ${priorityColor[ticket.priority] ?? 'text-white/40'}`}>
                        {ticket.priority}
                      </span>
                    </div>
                    <div className="px-2 h-full flex items-center text-[10px] text-white/30 font-mono">
                      {new Date(ticket.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                    </div>
                    <div className="h-full flex items-center justify-center">
                      <ChevronRight size={14} className="text-white/10 group-hover:text-white/40" />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Floating Action Bar */}
        {selectedTicketIds.size > 0 && (
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-zinc-800 border border-white/10 shadow-2xl rounded-2xl px-4 py-3 flex flex-col items-center gap-2 animate-in slide-in-from-bottom-5 z-20 overflow-hidden min-w-[320px]">
            {showBulkDeleteConfirm ? (
              <div className="flex items-center justify-between w-full px-2 py-1">
                <span className="text-xs font-bold text-red-400">Delete {selectedTicketIds.size} tickets?</span>
                <div className="flex gap-2">
                   <button 
                    onClick={() => setShowBulkDeleteConfirm(false)}
                    className="text-[10px] font-black uppercase tracking-widest text-white/40 hover:text-white px-2 py-1 rounded bg-white/5 transition-all"
                   >
                     Cancel
                   </button>
                   <button 
                    disabled={savingBulk}
                    onClick={() => handleBulkAction('delete')}
                    className="text-[10px] font-black uppercase tracking-widest bg-red-500 text-white px-3 py-1 rounded shadow-lg shadow-red-500/20 active:scale-95 transition-all"
                   >
                     {savingBulk ? 'Deleting...' : 'Confirm Delete'}
                   </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-4 w-full">
                <span className="text-sm font-bold text-white px-2 shrink-0">
                  {selectedTicketIds.size} selected
                </span>
                <div className="h-4 w-px bg-white/10 shrink-0"></div>
                
                <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide">
                  <select 
                      className="bg-zinc-900 border border-white/10 rounded-lg text-xs px-2 py-1.5 focus:outline-none focus:border-indigo-500 text-white/80"
                      onChange={(e) => e.target.value && handleBulkAction('status', e.target.value)}
                      value=""
                  >
                    <option value="" disabled>Set Status...</option>
                    <option value="TODO">TODO</option>
                    <option value="IN_PROGRESS">IN PROGRESS</option>
                    <option value="AWAITING_USER">AWAITING USER</option>
                    <option value="RESOLVED">RESOLVED</option>
                    <option value="CLOSED">CLOSED</option>
                  </select>

                  <select 
                      className="bg-zinc-900 border border-white/10 rounded-lg text-xs px-2 py-1.5 focus:outline-none focus:border-indigo-500 text-white/80"
                      onChange={(e) => e.target.value && handleBulkAction('priority', e.target.value)}
                      value=""
                  >
                    <option value="" disabled>Set Priority...</option>
                    <option value="P0">P0 - Critical</option>
                    <option value="P1">P1 - High</option>
                    <option value="P2">P2 - Normal</option>
                    <option value="P3">P3 - Low</option>
                  </select>

                  <select 
                      className="bg-zinc-900 border border-white/10 rounded-lg text-xs px-2 py-1.5 focus:outline-none focus:border-indigo-500 text-white/80"
                      onChange={(e) => e.target.value && handleBulkAction('assignee', e.target.value)}
                      value=""
                  >
                    <option value="" disabled>Assign To...</option>
                    <option value="">Unassigned</option>
                    {users?.map(u => (
                      <option key={u.id} value={u.id}>{u.name || u.username}</option>
                    ))}
                  </select>

                  {isAdmin && (
                    <button 
                      onClick={() => setShowBulkDeleteConfirm(true)}
                      className="bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white border border-red-500/20 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ml-2 flex items-center gap-1 shrink-0"
                    >
                      <Trash2 size={12} /> Delete
                    </button>
                  )}
                </div>
                {savingBulk && <Loader2 className="w-4 h-4 animate-spin text-indigo-500 ml-2 shrink-0" />}
              </div>
            )}
            {bulkError && (
              <div className="w-full flex items-center gap-2 px-2 py-1 text-[10px] text-red-400 font-bold bg-red-400/5 rounded border border-red-400/10">
                <AlertCircle size={10} />
                {bulkError}
                <button onClick={() => setBulkError(null)} className="ml-auto opacity-40 hover:opacity-100"><X size={10}/></button>
              </div>
            )}
          </div>
        )}
      </div>

      {!searchQuery && (
        <div className="flex items-center justify-between mt-6 px-2">
          <div className="text-xs text-white/40 font-medium">
            Showing <span className="text-white/70">{tickets.length}</span> of <span className="text-white/70">{pagination.totalCount}</span> tickets
          </div>
          <div className="flex items-center gap-2">
            <button 
              disabled={pagination.page <= 1}
              onClick={() => fetchTickets(pagination.page - 1)}
              className="px-4 py-2 bg-white/5 hover:bg-white/10 disabled:opacity-30 disabled:hover:bg-white/5 rounded-xl border border-white/5 text-xs font-bold transition-all"
            >
              Prev
            </button>
            <div className="text-[10px] uppercase tracking-widest text-white/40 font-bold px-4">
              Page {pagination.page} of {pagination.totalPages}
            </div>
            <button 
              disabled={pagination.page >= pagination.totalPages}
              onClick={() => fetchTickets(pagination.page + 1)}
              className="px-4 py-2 bg-white/5 hover:bg-white/10 disabled:opacity-30 disabled:hover:bg-white/5 rounded-xl border border-white/5 text-xs font-bold transition-all"
            >
              Next
            </button>
          </div>
        </div>
      )}

      <TicketDetailModal
        isOpen={!!selectedTicket}
        ticket={selectedTicket}
        onClose={() => setSelectedTicket(null)}
        onUpdate={() => fetchTickets(pagination.page)}
        users={users}
        assets={assets}
      />
    </>
  );
};

export default ListBoard;
