"use client";
import React, { useState, useEffect, useCallback } from "react";
import TaskCard from "./TaskCard";
import TicketDetailModal from "@/components/TicketDetailModal";
import { Ticket, TicketStatus, User } from "@/types";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { Loader2 } from "lucide-react";
import { useRealtimeTickets } from "@/hooks/useRealtimeTickets";

interface KanbanProps {
  searchQuery?: string;
  users?: User[];
  assets?: { id: number; name: string; type: string }[];
}

const STATUS_COLORS: Record<string, string> = {
  TODO: 'border-t-zinc-500',
  IN_PROGRESS: 'border-t-blue-500',
  AWAITING_USER: 'border-t-yellow-500',
  RESOLVED: 'border-t-green-500',
  CLOSED: 'border-t-zinc-800',
};

const KanbanBoard = ({ searchQuery = "", users, assets }: KanbanProps) => {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [columns, setColumns] = useState<{ id: number; title: string; order: number }[]>([]);

  const fetchColumns = async () => {
    try {
      const res = await fetch("/api/kanban-columns");
      if (res.ok) {
        const data = await res.json();
        if (data && data.length > 0) {
          setColumns(data);
        } else {
          setColumns([
            { id: 1, title: 'TODO', order: 10 },
            { id: 2, title: 'IN_PROGRESS', order: 20 },
            { id: 3, title: 'AWAITING_USER', order: 30 },
            { id: 4, title: 'RESOLVED', order: 40 },
            { id: 5, title: 'CLOSED', order: 50 },
          ]);
        }
      }
    } catch (err) {
      console.error("Failed to fetch columns", err);
    }
  };

  const fetchTickets = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/tickets/kanban");
      if (!res.ok) throw new Error("Failed to fetch tickets");
      const data = await res.json();
      setTickets(data.tickets || []);
    } catch (err: unknown) {
      console.error("Fetch Error:", err);
    } finally {
      setIsLoading(false);
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
            return [...prev, ticket];
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
    fetchTickets();
    fetchColumns();

    // Reduced polling interval since we have real-time updates
    const interval = setInterval(() => {
      fetchTickets();
    }, 30000); // Fallback polling every 30 seconds

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (selectedTicket) {
      const updated = tickets.find((t: Ticket) => t.id === selectedTicket.id);
      if (updated) setSelectedTicket(updated);
    }
  }, [tickets, selectedTicket]);

  const moveTicket = async (ticketId: number, newStatus: TicketStatus) => {
    const originalTickets = [...tickets];
    setTickets((prev: Ticket[]) =>
      prev.map((t: Ticket) => (t.id === ticketId ? { ...t, status: newStatus } : t)),
    );

    try {
      const res = await fetch(`/api/tickets/${ticketId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error("Failed to move ticket");
    } catch (err: unknown) {
      setTickets(originalTickets);
      console.error(err);
    }
  };

  const onDragEnd = (result: any) => {
    if (!result.destination) return;
    const { source, destination, draggableId } = result;
    if (source.droppableId === destination.droppableId) return;

    const ticketId = parseInt(draggableId);
    if (isNaN(ticketId)) return;
    
    const newStatus = destination.droppableId;
    moveTicket(ticketId, newStatus as TicketStatus);
  };

  const filteredTickets = tickets.filter((t: Ticket) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      t.title.toLowerCase().includes(q) ||
      t.description.toLowerCase().includes(q) ||
      t.requesterName?.toLowerCase().includes(q) ||
      t.id.toString().includes(q)
    );
  });

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <div className="flex h-full w-full overflow-x-auto gap-4 p-4 pb-8 custom-scrollbar">
        {columns.map((col: any) => {
          const statusTopBorder = STATUS_COLORS[col.title] || 'border-t-zinc-700';
          const colTickets = filteredTickets.filter((t: Ticket) => t.status === col.title);

          return (
            <div
              key={col.id}
              className={`
                min-w-[300px] w-[300px] flex-shrink-0 flex flex-col rounded-2xl
                bg-zinc-900/40 border border-white/5
              `}
            >
              <div className={`px-4 py-3 border-b border-white/5 flex items-center justify-between rounded-t-2xl border-t-2 ${statusTopBorder}`}>
                <h3 className="text-xs font-black uppercase tracking-widest text-white/60">
                  {col.title.replaceAll('_', ' ')}
                </h3>
                <span className="text-[10px] font-bold bg-white/5 text-white/40 px-2 py-0.5 rounded-full">
                  {colTickets.length}
                </span>
              </div>

              <Droppable droppableId={col.title}>
                {(provided: any) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className="flex-1 overflow-y-auto p-3 space-y-3 custom-scrollbar min-h-[200px]"
                  >
                    {isLoading ? (
                      <div className="flex justify-center p-4">
                        <Loader2 className="w-5 h-5 animate-spin text-white/20" />
                      </div>
                    ) : colTickets.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-10 text-white/10">
                        <div className="w-8 h-8 rounded-full border-2 border-dashed border-white/10 mb-2" />
                        <span className="text-[10px] uppercase tracking-widest font-bold">Empty</span>
                      </div>
                    ) : (
                      colTickets.map((ticket: Ticket, index: number) => (
                        <Draggable key={ticket.id} draggableId={ticket.id.toString()} index={index}>
                          {(provided: any, snapshot: any) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              style={{
                                ...provided.draggableProps.style,
                                opacity: snapshot.isDragging ? 0.8 : 1,
                              }}
                            >
                              <TaskCard
                                ticket={ticket}
                                onClick={() => setSelectedTicket(ticket)}
                              />
                            </div>
                          )}
                        </Draggable>
                      ))
                    )}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </div>
          );
        })}

        <TicketDetailModal
          ticket={selectedTicket}
          isOpen={!!selectedTicket}
          onClose={() => setSelectedTicket(null)}
          onUpdate={fetchTickets}
          users={users}
          assets={assets}
        />
      </div>
    </DragDropContext>
  );
};

export default KanbanBoard;
