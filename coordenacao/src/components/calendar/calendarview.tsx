import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Plus, Clock } from 'lucide-react';
import { Task, CalendarEvent, CalendarView as CalView, CATEGORIES } from '../../types';
import { cn } from '../../utils';
import {
  startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval,
  format, isSameMonth, isSameDay, isToday, parseISO, addMonths, subMonths,
  addWeeks, subWeeks, startOfDay, endOfDay, getHours, getMinutes,
} from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface CalendarViewProps {
  selectedDate: string;
  onSelectDate: (d: string) => void;
  view: CalView;
  onViewChange: (v: CalView) => void;
  events: CalendarEvent[];
  tasks: Task[];
  onNewEvent: (date: string) => void;
  onEditTask: (t: Task) => void;
  onSaveEvent: (evt: any) => void;
  onDeleteEvent: (id: string) => void;
}

export function CalendarView({
  selectedDate, onSelectDate, view, onViewChange,
  events, tasks, onNewEvent, onEditTask, onSaveEvent, onDeleteEvent,
}: CalendarViewProps) {
  const currentDate = parseISO(selectedDate);
  const [showEventForm, setShowEventForm] = useState(false);
  const [evtTitle, setEvtTitle] = useState('');
  const [evtTime, setEvtTime] = useState('09:00');
  const [evtEndTime, setEvtEndTime] = useState('10:00');
  const [evtLocation, setEvtLocation] = useState('');
  const [evtCategory, setEvtCategory] = useState('rh');
  const [evtNotes, setEvtNotes] = useState('');

  const monthDays = useMemo(() => {
    const start = startOfWeek(startOfMonth(currentDate), { weekStartsOn: 1 });
    const end = endOfWeek(endOfMonth(currentDate), { weekStartsOn: 1 });
    return eachDayOfInterval({ start, end });
  }, [currentDate]);

  const weekDays = useMemo(() => {
    const start = startOfWeek(currentDate, { weekStartsOn: 1 });
    const end = endOfWeek(currentDate, { weekStartsOn: 1 });
    return eachDayOfInterval({ start, end });
  }, [currentDate]);

  const dayHours = useMemo(() => Array.from({ length: 14 }, (_, i) => i + 6), []);

  const getEventsForDay = (d: Date) => {
    const ds = format(d, 'yyyy-MM-dd');
    return events.filter((e) => e.date.slice(0, 10) === ds);
  };

  const getTasksForDay = (d: Date) => {
    const ds = format(d, 'yyyy-MM-dd');
    return tasks.filter((t) => t.dueDate?.slice(0, 10) === ds && t.status !== 'concluido');
  };

  const navigate = (dir: number) => {
    let d: Date;
    if (view === 'month') d = addMonths(currentDate, dir);
    else if (view === 'week') d = addWeeks(currentDate, dir);
    else d = new Date(currentDate.getTime() + dir * 86400000);
    onSelectDate(format(d, 'yyyy-MM-dd'));
  };

  const goToToday = () => onSelectDate(format(new Date(), 'yyyy-MM-dd'));

  const handleSaveEvent = () => {
    if (!evtTitle.trim()) return;
    onSaveEvent({
      taskId: null,
      title: evtTitle.trim(),
      date: selectedDate,
      time: evtTime,
      endTime: evtEndTime,
      location: evtLocation.trim(),
      category: evtCategory,
      notes: evtNotes.trim(),
    });
    setEvtTitle(''); setEvtLocation(''); setEvtNotes('');
    setShowEventForm(false);
  };

  const catColor = (id: string) => CATEGORIES.find((c) => c.id === id)?.color ?? '#64748b';

  const EventCard = ({ time, title, location, category }: { time: string; title: string; location: string; category: string }) => (
    <div className="px-1.5 py-0.5 rounded text-[10px] leading-tight truncate border-l-2" style={{ borderColor: catColor(category), backgroundColor: catColor(category) + '15' }}>
      <span className="text-slate-300">{time}</span> <span className="text-white">{title}</span>
      {location && <span className="text-slate-500"> · {location}</span>}
    </div>
  );

  // --- Month View ---
  if (view === 'month') {
    const weekDayLabels = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];
    return (
      <div className="bg-slate-900/50 rounded-2xl border border-slate-700/50 overflow-hidden">
        {/* Toolbar */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700/50">
          <div className="flex items-center gap-2">
            <button onClick={() => navigate(-1)} className="p-1.5 rounded-lg hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"><ChevronLeft size={18} /></button>
            <span className="text-white font-bold text-sm min-w-[160px] text-center">
              {format(currentDate, "MMMM 'de' yyyy", { locale: ptBR })}
            </span>
            <button onClick={() => navigate(1)} className="p-1.5 rounded-lg hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"><ChevronRight size={18} /></button>
            <button onClick={goToToday} className="ml-2 px-3 py-1 rounded-lg bg-slate-700 hover:bg-slate-600 text-white text-xs font-medium">Hoje</button>
          </div>
          <div className="flex gap-1">
            {(['month', 'week', 'day'] as CalView[]).map((v) => (
              <button key={v} onClick={() => onViewChange(v)} className={cn('px-3 py-1 rounded-lg text-xs font-medium transition-colors', view === v ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-700')}>
                {v === 'month' ? 'Mês' : v === 'week' ? 'Semana' : 'Dia'}
              </button>
            ))}
          </div>
        </div>
        {/* Grid */}
        <div className="grid grid-cols-7">
          {weekDayLabels.map((d) => (
            <div key={d} className="px-2 py-2 text-center text-xs font-semibold text-slate-500 border-b border-slate-700/30">{d}</div>
          ))}
          {monthDays.map((d) => {
            const ds = format(d, 'yyyy-MM-dd');
            const dayEvents = getEventsForDay(d);
            const dayTasks = getTasksForDay(d);
            const inMonth = isSameMonth(d, currentDate);
            const selected = isSameDay(d, currentDate);
            const today = isToday(d);
            return (
              <div
                key={ds}
                onClick={() => onSelectDate(ds)}
                className={cn(
                  'min-h-[90px] md:min-h-[110px] p-1.5 border-b border-r border-slate-700/30 cursor-pointer transition-colors',
                  !inMonth && 'opacity-40',
                  selected && 'bg-indigo-500/10',
                  !selected && 'hover:bg-slate-800/50',
                )}
              >
                <div className={cn('text-xs font-bold mb-1', today ? 'text-indigo-400' : 'text-slate-400')}>
                  {format(d, 'd')}
                </div>
                <div className="space-y-0.5">
                  {dayEvents.slice(0, 2).map((e) => (
                    <EventCard key={e.id} time={e.time} title={e.title} location={e.location} category={e.category} />
                  ))}
                  {dayTasks.slice(0, 2).map((t) => (
                    <div key={t.id} onClick={(e) => { e.stopPropagation(); onEditTask(t); }} className="px-1.5 py-0.5 rounded text-[10px] leading-tight truncate bg-slate-800 text-white border-l-2 border-indigo-500 cursor-pointer hover:bg-slate-700">
                      {t.title}
                    </div>
                  ))}
                  {(dayEvents.length + dayTasks.length) > 4 && (
                    <div className="text-[10px] text-slate-500 px-1">+{(dayEvents.length + dayTasks.length) - 4} mais</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // --- Week View ---
  if (view === 'week') {
    return (
      <div className="bg-slate-900/50 rounded-2xl border border-slate-700/50 overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700/50">
          <div className="flex items-center gap-2">
            <button onClick={() => navigate(-1)} className="p-1.5 rounded-lg hover:bg-slate-700 text-slate-400 hover:text-white"><ChevronLeft size={18} /></button>
            <span className="text-white font-bold text-sm">{format(weekDays[0], "dd/MM")} — {format(weekDays[6], "dd/MM/yyyy")}</span>
            <button onClick={() => navigate(1)} className="p-1.5 rounded-lg hover:bg-slate-700 text-slate-400 hover:text-white"><ChevronRight size={18} /></button>
            <button onClick={goToToday} className="ml-2 px-3 py-1 rounded-lg bg-slate-700 hover:bg-slate-600 text-white text-xs font-medium">Hoje</button>
          </div>
          <div className="flex gap-1">
            {(['month', 'week', 'day'] as CalView[]).map((v) => (
              <button key={v} onClick={() => onViewChange(v)} className={cn('px-3 py-1 rounded-lg text-xs font-medium transition-colors', view === v ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-700')}>
                {v === 'month' ? 'Mês' : v === 'week' ? 'Semana' : 'Dia'}
              </button>
            ))}
          </div>
        </div>
        <div className="overflow-x-auto">
          <div className="grid grid-cols-8 min-w-[700px]">
            <div className="border-r border-slate-700/30" />
            {weekDays.map((d) => (
              <div key={format(d, 'yyyy-MM-dd')} className={cn('px-2 py-2 text-center border-b border-r border-slate-700/30', isToday(d) && 'bg-indigo-500/5')}>
                <div className="text-xs text-slate-500">{format(d, 'EEE', { locale: ptBR })}</div>
                <div className={cn('text-sm font-bold', isToday(d) ? 'text-indigo-400' : 'text-white')}>{format(d, 'd')}</div>
              </div>
            ))}
            {dayHours.map((h) => (
              <React.Fragment key={h}>
                <div className="px-2 py-3 text-[10px] text-slate-500 border-r border-b border-slate-700/30 text-right">{String(h).padStart(2, '0')}:00</div>
                {weekDays.map((d) => {
                  const ds = format(d, 'yyyy-MM-dd');
                  const hourEvents = getEventsForDay(d).filter((e) => parseInt(e.time) === h);
                  return (
                    <div key={ds + h} className="border-r border-b border-slate-700/30 min-h-[48px] p-0.5">
                      {hourEvents.map((e) => (
                        <div key={e.id} className="px-1 py-0.5 rounded text-[10px] truncate border-l-2" style={{ borderColor: catColor(e.category), backgroundColor: catColor(e.category) + '15' }}>
                          <span className="text-white">{e.title}</span>
                        </div>
                      ))}
                    </div>
                  );
                })}
              </React.Fragment>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // --- Day View ---
  return (
    <div className="bg-slate-900/50 rounded-2xl border border-slate-700/50 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700/50">
        <div className="flex items-center gap-2">
          <button onClick={() => navigate(-1)} className="p-1.5 rounded-lg hover:bg-slate-700 text-slate-400 hover:text-white"><ChevronLeft size={18} /></button>
          <span className="text-white font-bold text-sm">{format(currentDate, "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR })}</span>
          <button onClick={() => navigate(1)} className="p-1.5 rounded-lg hover:bg-slate-700 text-slate-400 hover:text-white"><ChevronRight size={18} /></button>
          <button onClick={goToToday} className="ml-2 px-3 py-1 rounded-lg bg-slate-700 hover:bg-slate-600 text-white text-xs font-medium">Hoje</button>
        </div>
        <div className="flex gap-1 items-center">
          {(['month', 'week', 'day'] as CalView[]).map((v) => (
            <button key={v} onClick={() => onViewChange(v)} className={cn('px-3 py-1 rounded-lg text-xs font-medium transition-colors', view === v ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-700')}>
              {v === 'month' ? 'Mês' : v === 'week' ? 'Semana' : 'Dia'}
            </button>
          ))}
          <button onClick={() => setShowEventForm(!showEventForm)} className="ml-2 flex items-center gap-1 px-3 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium">
            <Plus size={14} /> Evento
          </button>
        </div>
      </div>

      {showEventForm && (
        <div className="px-4 py-3 bg-slate-800/50 border-b border-slate-700/50">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
            <input type="text" value={evtTitle} onChange={(e) => setEvtTitle(e.target.value)} placeholder="Título do evento" className="bg-slate-800 border border-slate-600 rounded-lg px-2 py-1.5 text-white text-sm" autoFocus />
            <input type="time" value={evtTime} onChange={(e) => setEvtTime(e.target.value)} className="bg-slate-800 border border-slate-600 rounded-lg px-2 py-1.5 text-white text-sm" />
            <input type="time" value={evtEndTime} onChange={(e) => setEvtEndTime(e.target.value)} className="bg-slate-800 border border-slate-600 rounded-lg px-2 py-1.5 text-white text-sm" />
            <input type="text" value={evtLocation} onChange={(e) => setEvtLocation(e.target.value)} placeholder="Local" className="bg-slate-800 border border-slate-600 rounded-lg px-2 py-1.5 text-white text-sm" />
            <button onClick={handleSaveEvent} className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium">Salvar</button>
          </div>
        </div>
      )}

      <div className="overflow-y-auto max-h-[60vh]">
        {dayHours.map((h) => {
          const hourEvents = getEventsForDay(currentDate).filter((e) => parseInt(e.time) === h);
          const hourTasks = getTasksForDay(currentDate).filter((t) => {
            if (!t.dueDate) return false;
            const d = parseISO(t.dueDate);
            return getHours(d) === h;
          });
          return (
            <div key={h} className="flex border-b border-slate-700/30">
              <div className="w-16 shrink-0 px-2 py-3 text-xs text-slate-500 text-right border-r border-slate-700/30">{String(h).padStart(2, '0')}:00</div>
              <div className="flex-1 min-h-[48px] p-1.5 space-y-1">
                {hourEvents.map((e) => (
                  <div key={e.id} className="flex items-center gap-2 px-2 py-1 rounded-lg border-l-2" style={{ borderColor: catColor(e.category), backgroundColor: catColor(e.category) + '10' }}>
                    <Clock size={12} className="text-slate-400 shrink-0" />
                    <span className="text-xs text-slate-400">{e.time}–{e.endTime}</span>
                    <span className="text-sm text-white font-medium">{e.title}</span>
                    {e.location && <span className="text-xs text-slate-500 hidden md:inline">· {e.location}</span>}
                  </div>
                ))}
                {hourTasks.map((t) => (
                  <div key={t.id} onClick={() => onEditTask(t)} className="flex items-center gap-2 px-2 py-1 rounded-lg bg-slate-800 border-l-2 border-indigo-500 cursor-pointer hover:bg-slate-700">
                    <span className="text-sm text-white">{t.title}</span>
                    <span className="text-[10px] text-slate-500">{t.priority}</span>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

import React from 'react';
