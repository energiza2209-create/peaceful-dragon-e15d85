import { Calendar, LayoutGrid, List, Bell, Plus, Download, HelpCircle, Cloud, CloudOff } from 'lucide-react';
import { TabView } from '../types';
import { cn } from '../utils';

interface HeaderProps {
  tab: TabView;
  onTabChange: (t: TabView) => void;
  overdueCount: number;
  dueTodayCount: number;
  onNewTask: () => void;
  onNotif: () => void;
  onBackup: () => void;
  onHelp: () => void;
}

const tabs: { key: TabView; label: string; icon: typeof Calendar }[] = [
  { key: 'agenda', label: 'Agenda', icon: Calendar },
  { key: 'kanban', label: 'Kanban', icon: LayoutGrid },
  { key: 'lista', label: 'Lista', icon: List },
];

export function Header({ tab, onTabChange, overdueCount, dueTodayCount, onNewTask, onNotif, onBackup, onHelp }: HeaderProps) {
  const totalAlerts = overdueCount + dueTodayCount;

  return (
    <header className="bg-slate-900/80 backdrop-blur-md border-b border-slate-700/50 sticky top-0 z-50">
      <div className="flex items-center justify-between px-3 md:px-6 h-14">
        {/* Left: Title + Tabs */}
        <div className="flex items-center gap-4">
          <h1 className="text-sm md:text-base font-bold text-white hidden sm:block whitespace-nowrap">
            Coordenação Operacional
          </h1>
          <nav className="flex bg-slate-800 rounded-lg p-0.5">
            {tabs.map((t) => (
              <button
                key={t.key}
                onClick={() => onTabChange(t.key)}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all',
                  tab === t.key ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white hover:bg-slate-700/50',
                )}
              >
                <t.icon size={14} />
                <span className="hidden md:inline">{t.label}</span>
              </button>
            ))}
          </nav>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-1.5 md:gap-2">
          {/* Sync indicator */}
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-emerald-500/10 text-emerald-400 text-xs">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="hidden lg:inline">Local</span>
          </div>

          <button
            onClick={onNotif}
            className="relative p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700/50 transition-colors"
            title="Notificações"
          >
            <Bell size={18} />
            {totalAlerts > 0 && (
              <span className="absolute -top-0.5 -right-0.5 w-4.5 h-4.5 min-w-[18px] flex items-center justify-center rounded-full bg-red-500 text-white text-[10px] font-bold">
                {totalAlerts}
              </span>
            )}
          </button>

          <button
            onClick={onNewTask}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium transition-colors"
          >
            <Plus size={14} />
            <span className="hidden sm:inline">Nova Tarefa</span>
          </button>

          <button
            onClick={onBackup}
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700/50 transition-colors"
            title="Backup & Dados"
          >
            <Download size={18} />
          </button>

          <button
            onClick={onHelp}
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700/50 transition-colors"
            title="Manual do Usuário"
          >
            <HelpCircle size={18} />
          </button>
        </div>
      </div>
    </header>
  );
}
