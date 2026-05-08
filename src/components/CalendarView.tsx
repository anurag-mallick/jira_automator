"use client";
import React, { useState, useEffect } from 'react';
import { Calendar, dateFnsLocalizer } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay } from 'date-fns';
import { enUS } from 'date-fns/locale/en-US';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { Ticket, User } from '@/types';
import TicketDetailModal from '@/components/TicketDetailModal';
import { Loader2, AlertCircle } from 'lucide-react';

const locales = {
  'en-US': enUS,
};

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales,
});

interface CalendarViewProps {
  users?: User[];
  assets?: any[];
}

const CalendarView = ({ users, assets }: CalendarViewProps) => {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTickets = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/tickets?all=true&hasDueDate=true');
      if (!res.ok) throw new Error('Failed to fetch tickets');
      const data = await res.json();
      setTickets(data.tickets || []);
    } catch (err: Error | any) {
      setError(err.message || 'Connection error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTickets();
  }, []);

  if (loading) return (
    <div className="flex-1 flex items-center justify-center py-24">
      <Loader2 className="w-7 h-7 text-indigo-500 animate-spin" />
    </div>
  );

  if (error) return (
    <div className="glass-card p-6 flex items-center gap-3 text-red-400">
      <AlertCircle size={18} />
      <span className="text-sm">{error}</span>
      <button onClick={() => fetchTickets()} className="ml-auto text-indigo-400 hover:underline text-xs font-bold">Retry</button>
    </div>
  );

  const events = tickets.map(ticket => {
    const start = ticket.dueDate ? new Date(ticket.dueDate) : new Date(ticket.createdAt);
    const end = ticket.dueDate ? new Date(ticket.dueDate) : new Date(ticket.createdAt);
    // Big calendar requires start and end Date objects
    return {
      id: ticket.id,
      title: ticket.title,
      start,
      end,
      resource: ticket,
    };
  });

  const eventStyleGetter = (event: { resource: Ticket }) => {
    const ticket = event.resource as Ticket;
    let backgroundColor = '#3f3f46'; // default zinc-700
    if (ticket.status === 'RESOLVED' || ticket.status === 'CLOSED') backgroundColor = '#10b981'; // emerald-500
    else if (ticket.priority === 'P0') backgroundColor = '#f87171'; // red-400
    else if (ticket.priority === 'P1') backgroundColor = '#fb923c'; // orange-400
    else if (ticket.priority === 'P2') backgroundColor = '#6366f1'; // indigo-500

    return {
      style: {
        backgroundColor,
        borderRadius: '4px',
        opacity: 0.8,
        color: 'white',
        border: '0px',
        display: 'block',
        fontSize: '0.75rem',
        fontWeight: 'bold'
      }
    };
  };

  return (
    <div className="glass-card p-6 h-[700px] calendar-container">
      <style dangerouslySetInnerHTML={{__html: `
        .calendar-container .rbc-calendar {
          font-family: inherit;
        }
        .calendar-container .rbc-header {
          border-bottom: 1px solid rgba(255,255,255,0.05);
          padding: 8px;
          font-size: 0.75rem;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: rgba(255,255,255,0.4);
          font-weight: 700;
        }
        .calendar-container .rbc-month-view {
          border: 1px solid rgba(255,255,255,0.05);
          border-radius: 8px;
          overflow: hidden;
          background: rgba(255,255,255,0.02);
        }
        .calendar-container .rbc-day-bg {
          border-left: 1px solid rgba(255,255,255,0.05);
        }
        .calendar-container .rbc-month-row {
          border-top: 1px solid rgba(255,255,255,0.05);
        }
        .calendar-container .rbc-off-range-bg {
          background: rgba(255,255,255,0.01);
        }
        .calendar-container .rbc-date-cell {
          padding: 4px 8px;
          font-size: 0.875rem;
          color: rgba(255,255,255,0.6);
        }
        .calendar-container .rbc-today {
          background: rgba(99, 102, 241, 0.1);
        }
        .calendar-container .rbc-toolbar button {
          color: rgba(255,255,255,0.6);
          border: 1px solid rgba(255,255,255,0.1);
          background: transparent;
        }
        .calendar-container .rbc-toolbar button:hover {
          background: rgba(255,255,255,0.1);
          color: white;
        }
        .calendar-container .rbc-toolbar button:active,
        .calendar-container .rbc-toolbar button.rbc-active {
          background: rgba(99, 102, 241, 0.2);
          color: #818cf8;
          border-color: rgba(99, 102, 241, 0.5);
          box-shadow: none;
        }
      `}} />
      <Calendar
        localizer={localizer}
        events={events}
        startAccessor="start"
        endAccessor="end"
        style={{ height: '100%' }}
        onSelectEvent={(event) => setSelectedTicket(event.resource)}
        eventPropGetter={eventStyleGetter}
        views={['month', 'week', 'day']}
        defaultView="month"
      />
      <TicketDetailModal
        isOpen={!!selectedTicket}
        ticket={selectedTicket}
        onClose={() => setSelectedTicket(null)}
        onUpdate={fetchTickets}
        users={users}
        assets={assets}
      />
    </div>
  );
};

export default CalendarView;
