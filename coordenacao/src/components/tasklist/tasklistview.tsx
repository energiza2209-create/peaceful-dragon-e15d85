import { useState, useMemo } from 'react';
import { Search, CheckCircle2, Circle, Trash2, Filter } from 'lucide-react';
import { Task, TaskStatus, CATEGORIES, PRIORITIES, STATUS_LABELS, Priority } from '../../types';
import { cn, priorityColor, checklistProgress, dueColor, formatRelative } from '../../utils';

interface TaskListViewProps {
  tasks: Task[];
  onEditTask: (t: Task) => void;
  onMoveTask: (id: string, status: TaskStatus) => void;
  onDeleteTask: (id: string) => void;
}

export function TaskListView({ tasks, onEditTask, onMoveTask, onDeleteTask }: TaskListViewProps) {
  const [search, setSearch] = useState('');
  const [filterCat, setFilterCat] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterPriority, setFilterPriority] = useState<string>('all');
  const [showFilters, setShowFilters] = useState(false);

  const filtered = useMemo(() => {
    return tasks.filter((t) => {
      if (search) {
        const q = search.toLowerCase();
        const match = t.title.toLowerCase().includes(q) || t.description.toLowerCase().includes(q) || t.tags.some((tag) => tag.toLowerCase().includes(q));
        if (!match) return false;
      }
      if (filterCat !== 'all' && t.category !== filterCat) return false;
      if (filterStatus !== 'all' && t.status !== filterStatus) return false;
      if (filterPriority !== 'all' && t.priority !== filterPriority) return false;
      return true;
    });
  }, [tasks, search, filterCat, filterStatus, filterPriority]);

  const catName = (id: string) => CATEGORIES.find((c) => c.id === id)?.name ?? id;
  const catColor = (id: string) => CATEGORIES.find((c) => c.id === id)?.color ?? '#64748b';

  const activeFilters = [filterCat, filterStatus, filterPriority].filter((f) => f !== 'all').length;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-white">Lista de Tarefas</h2>
        <span className="text-xs text-slate-500">{filtered.length} tarefa{filtered.length !== 1 ? 's' : ''}</span>
      </div>

      {/* Search + Filters */}
      <div className="bg-slate-900/50 rounded-2xl border border-slate-700/50 p-3 mb-4">
        <div className="flex items-center gap-2">
          <div className="flex-1 relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por título, descrição ou tags..."
              className="w-full bg-slate-800 border border-slate-600 rounded-lg pl-9 pr-3 py-2 text-white text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={cn('flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors', showFilters ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white border border-slate-600')}
          >
            <Filter size={14} />
            Filtros {activeFilters > 0 && <span className="w-5 h-5 rounded-full bg-indigo-500 text-white text-[10px] flex items-center justify-center">{activeFilters}</span>}
          </button>
        </div>

        {showFilters && (
          <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-slate-700/50">
            <select value={filterCat} onChange={(e) => setFilterCat(e.target.value)} className="bg-slate-800 border border-slate-600 rounded-lg px-2 py-1.5 text-white text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500">
              <option value="all">Todas categorias</option>
              {CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="bg-slate-800 border border-slate-600 rounded-lg px-2 py-1.5 text-white text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500">
              <option value="all">Todos status</option>
              <option value="a_fazer">A Fazer</option>
              <option value="em_andamento">Em Andamento</option>
              <option value="concluido">Concluído</option>
            </select>
            <select value={filterPriority} onChange={(e) => setFilterPriority(e.target.value)} className="bg-slate-800 border border-slate-600 rounded-lg px-2 py-1.5 text-white text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500">
              <option value="all">Todas prioridades</option>
              {PRIORITIES.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
            </select>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="bg-slate-900/50 rounded-2xl border border-slate-700/50 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-700/50">
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Status</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Tarefa</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase hidden md:table-cell">Categoria</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase hidden lg:table-cell">Prioridade</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Vencimento</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase hidden md:table-cell">Progresso</th>
                <th className="w-10 px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((t) => {
                const progress = checklistProgress(t.checklist);
                return (
                  <tr key={t.id} onClick={() => onEditTask(t)} className="border-b border-slate-700/30 hover:bg-slate-800/50 cursor-pointer transition-colors">
                    <td className="px-4 py-3">
                      {t.status === 'concluido' ? (
                        <CheckCircle2 size={18} className="text-emerald-400" />
                      ) : (
                        <Circle size={18} className={t.status === 'em_andamento' ? 'text-blue-400' : 'text-slate-500'} />
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className={cn('font-medium', t.status === 'concluido' ? 'text-slate-500 line-through' : 'text-white')}>{t.title}</div>
                      {t.location && <div className="text-[10px] text-slate-500 mt-0.5">{t.location}</div>}
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ backgroundColor: catColor(t.category) + '20', color: catColor(t.category) }}>
                        {catName(t.category)}
                      </span>
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell">
                      <span className={cn('text-[10px] font-semibold px-2 py-0.5 rounded-full', priorityColor(t.priority))}>{t.priority}</span>
                    </td>
                    <td className="px-4 py-3">
                      {t.dueDate && <span className={cn('text-xs', dueColor(t))}>{formatRelative(t.dueDate)}</span>}
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      {t.checklist.length > 0 && (
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-1 bg-slate-700 rounded-full overflow-hidden">
                            <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${progress}%` }} />
                          </div>
                          <span className="text-[10px] text-slate-500">{progress}%</span>
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={(e) => { e.stopPropagation(); onDeleteTask(t.id); }}
                        className="p-1 rounded text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="text-center text-slate-500 py-8 text-sm">Nenhuma tarefa encontrada.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
