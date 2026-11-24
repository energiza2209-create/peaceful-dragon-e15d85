import { useState } from 'react';
import { ChevronLeft, ChevronRight, Plus, ArrowRight } from 'lucide-react';
import { Task, TaskStatus, CATEGORIES, STATUS_LABELS } from '../../types';
import { cn, priorityColor, checklistProgress, dueColor, formatRelative } from '../../utils';

interface KanbanBoardProps {
  tasks: Task[];
  onMoveTask: (id: string, status: TaskStatus) => void;
  onEditTask: (t: Task) => void;
  onNewTask: () => void;
}

const COLUMNS: { key: TaskStatus; color: string }[] = [
  { key: 'a_fazer', color: 'border-slate-500' },
  { key: 'em_andamento', color: 'border-blue-500' },
  { key: 'concluido', color: 'border-emerald-500' },
];

export function KanbanBoard({ tasks, onMoveTask, onEditTask, onNewTask }: KanbanBoardProps) {
  const [dragId, setDragId] = useState<string | null>(null);

  const grouped: Record<TaskStatus, Task[]> = {
    a_fazer: tasks.filter((t) => t.status === 'a_fazer'),
    em_andamento: tasks.filter((t) => t.status === 'em_andamento'),
    concluido: tasks.filter((t) => t.status === 'concluido'),
  };

  const nextStatus: Record<TaskStatus, TaskStatus | null> = {
    a_fazer: 'em_andamento',
    em_andamento: 'concluido',
    concluido: null,
  };

  const prevStatus: Record<TaskStatus, TaskStatus | null> = {
    a_fazer: null,
    em_andamento: 'a_fazer',
    concluido: 'em_andamento',
  };

  const handleDragStart = (id: string) => setDragId(id);
  const handleDragEnd = () => setDragId(null);
  const handleDrop = (status: TaskStatus) => {
    if (dragId) {
      onMoveTask(dragId, status);
      setDragId(null);
    }
  };

  const catName = (id: string) => CATEGORIES.find((c) => c.id === id)?.name ?? id;
  const catColor = (id: string) => CATEGORIES.find((c) => c.id === id)?.color ?? '#64748b';

  const TaskCard = ({ task }: { task: Task }) => {
    const progress = checklistProgress(task.checklist);
    const next = nextStatus[task.status];
    const prev = prevStatus[task.status];

    return (
      <div
        draggable
        onDragStart={() => handleDragStart(task.id)}
        onDragEnd={handleDragEnd}
        onClick={() => onEditTask(task)}
        className={cn(
          'bg-slate-800/80 border border-slate-700/50 rounded-xl p-3 cursor-pointer hover:border-slate-600 transition-all group',
          dragId === task.id && 'opacity-50 scale-95',
        )}
      >
        {/* Category tag */}
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ backgroundColor: catColor(task.category) + '20', color: catColor(task.category) }}>
            {catName(task.category)}
          </span>
          <span className={cn('text-[10px] font-semibold px-2 py-0.5 rounded-full', priorityColor(task.priority))}>
            {task.priority}
          </span>
        </div>

        {/* Title */}
        <h4 className="text-sm font-semibold text-white mb-1 leading-tight">{task.title}</h4>

        {/* Due date */}
        {task.dueDate && (
          <div className={cn('text-xs mb-2', dueColor(task))}>
            {formatRelative(task.dueDate)}
          </div>
        )}

        {/* Tags */}
        {task.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-2">
            {task.tags.slice(0, 3).map((tag) => (
              <span key={tag} className="text-[10px] px-1.5 py-0.5 rounded bg-slate-700 text-slate-400">{tag}</span>
            ))}
          </div>
        )}

        {/* Checklist progress */}
        {task.checklist.length > 0 && (
          <div className="mb-2">
            <div className="flex items-center justify-between mb-0.5">
              <span className="text-[10px] text-slate-500">{task.checklist.filter((c) => c.done).length}/{task.checklist.length}</span>
              <span className="text-[10px] text-slate-500">{progress}%</span>
            </div>
            <div className="w-full h-1 bg-slate-700 rounded-full overflow-hidden">
              <div className="h-full bg-indigo-500 rounded-full transition-all" style={{ width: `${progress}%` }} />
            </div>
          </div>
        )}

        {/* Location */}
        {task.location && (
          <div className="text-[10px] text-slate-500 truncate mb-2">{task.location}</div>
        )}

        {/* Action buttons */}
        <div className="flex items-center justify-between opacity-0 group-hover:opacity-100 transition-opacity pt-1 border-t border-slate-700/30">
          <div className="flex gap-1">
            {prev && (
              <button
                onClick={(e) => { e.stopPropagation(); onMoveTask(task.id, prev); }}
                className="p-1 rounded text-slate-500 hover:text-white hover:bg-slate-700 transition-colors"
                title={`Mover para ${STATUS_LABELS[prev]}`}
              >
                <ChevronLeft size={14} />
              </button>
            )}
            {next && (
              <button
                onClick={(e) => { e.stopPropagation(); onMoveTask(task.id, next); }}
                className="p-1 rounded text-slate-500 hover:text-white hover:bg-slate-700 transition-colors"
                title={`Mover para ${STATUS_LABELS[next]}`}
              >
                <ChevronRight size={14} />
              </button>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-white">Quadro Kanban</h2>
        <button onClick={onNewTask} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium transition-colors">
          <Plus size={14} /> Nova Tarefa
        </button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {COLUMNS.map((col) => (
          <div
            key={col.key}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => handleDrop(col.key)}
            className={cn('bg-slate-900/50 rounded-2xl border-t-2 border border-slate-700/50 p-3 min-h-[200px]', col.color)}
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-white">{STATUS_LABELS[col.key]}</h3>
              <span className="text-xs text-slate-500 bg-slate-800 px-2 py-0.5 rounded-full">{grouped[col.key].length}</span>
            </div>
            <div className="space-y-2">
              {grouped[col.key].map((task) => (
                <TaskCard key={task.id} task={task} />
              ))}
              {grouped[col.key].length === 0 && (
                <div className="text-center text-slate-600 text-xs py-8">Nenhuma tarefa</div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
