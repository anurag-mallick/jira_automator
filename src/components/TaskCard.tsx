"use client";
import React from 'react';
import { MessageSquare, CheckSquare, Clock } from 'lucide-react';
import { Ticket, Task, TicketStatus } from '@/types';

interface TaskCardProps {
  ticket: Ticket;
  onDragStart?: (e: React.DragEvent) => void;
  onClick?: () => void;
  onMove?: (status: TicketStatus) => void;
}

const priorityConfig: Record<string, { bg: string; text: string; border: string; label: string }> = {
  P0: { bg: 'bg-red-500/10',    text: 'text-red-400',    border: 'border-l-red-500',    label: 'P0 – Critical' },
  P1: { bg: 'bg-orange-500/10', text: 'text-orange-400', border: 'border-l-orange-500', label: 'P1 – High' },
  P2: { bg: 'bg-indigo-500/10', text: 'text-indigo-400', border: 'border-l-indigo-500', label: 'P2 – Normal' },
  P3: { bg: 'bg-zinc-500/10',   text: 'text-zinc-400',   border: 'border-l-zinc-600',   label: 'P3 – Low' },
};

const TaskCard = ({ ticket, onDragStart, onClick }: TaskCardProps) => {
  const priority = priorityConfig[ticket.priority] ?? priorityConfig.P2;
  const commentCount = ticket._count?.comments ?? ticket.comments?.length ?? 0;
  const checklistCount = ticket._count?.checklists ?? ticket.checklists?.length ?? 0;

  return (
    <div
      draggable
      onDragStart={onDragStart}
      onClick={onClick}
      className={`
        bg-zinc-900 rounded-xl border border-white/5
        hover:border-white/15 hover:bg-zinc-800/80
        transition-all duration-150 cursor-pointer group
        border-l-4 ${priority.border}
      `}
    >
      {/* Top row: priority badge + ticket ID + SLA warning if breached */}
      <div className="flex items-center justify-between px-3 pt-3 pb-1">
        <div className="flex items-center gap-2">
          <span className={`text-[9px] font-black tracking-widest uppercase px-1.5 py-0.5 rounded ${priority.bg} ${priority.text}`}>
            {ticket.priority}
          </span>
          <span className="text-[9px] text-white/20 font-mono">#{ticket.id}</span>
        </div>
        <div className="flex items-center gap-1.5">
          {ticket.slaBreachAt && new Date(ticket.slaBreachAt) < new Date() && (
            <span className="text-[9px] font-bold text-red-500 bg-red-500/10 px-1.5 py-0.5 rounded uppercase tracking-wider">
              SLA
            </span>
          )}
          {ticket.assignedTo && (
            <div
              className="w-5 h-5 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center text-[8px] font-bold border border-zinc-900"
              title={ticket.assignedTo.name || ticket.assignedTo.username}
            >
              {(ticket.assignedTo.name || ticket.assignedTo.username || '?')[0].toUpperCase()}
            </div>
          )}
        </div>
      </div>

      {/* Title — larger, more prominent */}
      <h4 className="px-3 pb-2 text-sm font-semibold text-white/90 leading-snug group-hover:text-white transition-colors line-clamp-2">
        {ticket.title}
      </h4>

      {/* Footer: comments count + checklist progress + due date */}
      {(commentCount > 0 || checklistCount > 0 || ticket.dueDate) && (
        <div className="px-3 pb-3 pt-1 border-t border-white/5 flex items-center gap-3 text-white/25 mt-1">
          {commentCount > 0 && (
            <div className="flex items-center gap-1">
              <MessageSquare size={10} />
              <span className="text-[10px]">{commentCount}</span>
            </div>
          )}
          {checklistCount > 0 && (
            <div className="flex items-center gap-1">
              <CheckSquare size={10} />
              <span className="text-[10px]">{checklistCount}</span>
            </div>
          )}
          {ticket.dueDate && (
            <div className={`flex items-center gap-1 ml-auto text-[10px] font-mono ${
              new Date(ticket.dueDate) < new Date() ? 'text-red-400/70' : 'text-white/25'
            }`}>
              <Clock size={10} />
              {new Date(ticket.dueDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default TaskCard;
