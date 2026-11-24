import { AlertTriangle, Clock, ChevronRight } from 'lucide-react';

interface AlertBannerProps {
  overdueCount: number;
  dueTodayCount: number;
  onOpen: () => void;
}

export function AlertBanner({ overdueCount, dueTodayCount, onOpen }: AlertBannerProps) {
  return (
    <div className="bg-red-500/10 border-b border-red-500/20 px-3 md:px-6 py-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 flex-wrap">
          {overdueCount > 0 && (
            <div className="flex items-center gap-1.5 text-red-400 text-xs font-semibold">
              <AlertTriangle size={14} />
              <span>{overdueCount} tarefa{overdueCount > 1 ? 's' : ''} atrasada{overdueCount > 1 ? 's' : ''}</span>
            </div>
          )}
          {dueTodayCount > 0 && (
            <div className="flex items-center gap-1.5 text-amber-400 text-xs font-semibold">
              <Clock size={14} />
              <span>{dueTodayCount} vencendo hoje</span>
            </div>
          )}
        </div>
        <button
          onClick={onOpen}
          className="flex items-center gap-1 text-xs text-slate-400 hover:text-white transition-colors"
        >
          Ver todas <ChevronRight size={14} />
        </button>
      </div>
    </div>
  );
}
