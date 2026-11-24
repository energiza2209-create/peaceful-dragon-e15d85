import { X, AlertTriangle, Clock, CalendarClock } from 'lucide-react';
import { Task, CATEGORIES } from '../../types';
import { isOverdue, isDueToday, isDueSoon, formatRelative, cn } from '../../utils';

interface NotificationsModalProps {
  tasks: Task[];
  onClose: () => void;
  onEditTask: (t: Task) => void;
}

export function NotificationsModal({ tasks, onClose, onEditTask }: NotificationsModalProps) {
  const overdue = tasks.filter(isOverdue);
  const dueToday = tasks.filter(isDueToday);
  const dueSoon = tasks.filter((t) => isDueSoon(t, 2) && !isDueToday(t));

  const getCategoryName = (id: string) => CATEGORIES.find((c) => c.id === id)?.name ?? id;
  const getCategoryColor = (id: string) => CATEGORIES.find((c) => c.id === id)?.color ?? '#64748b';

  const Section = ({ title, icon, items, color }: { title: string; icon: typeof AlertTriangle; items: Task[]; color: string }) => {
    if (items.length === 0) return null;
    return (
      <div className="mb-4">
        <div className="flex items-center gap-2 mb-2">
          {icon({ size: 16, className: color })}
          <h3 className={`text-sm font-bold ${color}`}>{title} ({items.length})</h3>
        </div>
        <div className="space-y-1.5">
          {items.map((t) => (
            <button
              key={t.id}
              onClick={() => onEditTask(t)}
              className="w-full text-left p-2.5 rounded-lg bg-slate-800/50 hover:bg-slate-700/50 border border-slate-700/50 transition-colors"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm text-white font-medium truncate">{t.title}</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ backgroundColor: getCategoryColor(t.category) + '20', color: getCategoryColor(t.category) }}>
                  {getCategoryName(t.category)}
                </span>
              </div>
              {t.dueDate && (
                <span className="text-xs text-slate-500 mt-0.5 block">
                  Vence: {formatRelative(t.dueDate)}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-start justify-center pt-8 md:pt-16 px-4" onClick={onClose}>
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md max-h-[80vh] overflow-y-auto shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b border-slate-700/50">
          <h2 className="text-lg font-bold text-white">Notificações</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-700 transition-colors">
            <X size={18} />
          </button>
        </div>
        <div className="p-4">
          {overdue.length === 0 && dueToday.length === 0 && dueSoon.length === 0 && (
            <p className="text-center text-slate-500 text-sm py-8">Nenhuma notificação pendente.</p>
          )}
          <Section title="Atrasadas" icon={AlertTriangle} items={overdue} color="text-red-400" />
          <Section title="Vencendo Hoje" icon={Clock} items={dueToday} color="text-amber-400" />
          <Section title="Próximos 2 Dias" icon={CalendarClock} items={dueSoon} color="text-cyan-400" />
        </div>
      </div>
    </div>
  );
}
