import { useState } from 'react';
import { X, Trash2, Calendar, MapPin, Tag, CheckSquare, Square, Clock, AlertTriangle } from 'lucide-react';
import { Task, CATEGORIES, PRIORITIES, TaskStatus, Priority, ChecklistItem } from '../../types';
import { cn } from '../../utils';

interface TaskModalProps {
  task: Task | null;
  selectedDate: string;
  onSave: (data: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>) => void;
  onDelete?: () => void;
  onClose: () => void;
}

export function TaskModal({ task, selectedDate, onSave, onDelete, onClose }: TaskModalProps) {
  const [title, setTitle] = useState(task?.title ?? '');
  const [description, setDescription] = useState(task?.description ?? '');
  const [category, setCategory] = useState(task?.category ?? 'crises');
  const [priority, setPriority] = useState<Priority>(task?.priority ?? 'media');
  const [status, setStatus] = useState<TaskStatus>(task?.status ?? 'a_fazer');
  const [dueDate, setDueDate] = useState(task?.dueDate?.slice(0, 10) ?? selectedDate);
  const [location, setLocation] = useState(task?.location ?? '');
  const [tags, setTags] = useState(task?.tags?.join(', ') ?? '');
  const [checklist, setChecklist] = useState<ChecklistItem[]>(task?.checklist ?? []);
  const [newCheckItem, setNewCheckItem] = useState('');

  const addCheckItem = () => {
    if (!newCheckItem.trim()) return;
    setChecklist([...checklist, { id: Date.now().toString(36), text: newCheckItem.trim(), done: false }]);
    setNewCheckItem('');
  };

  const toggleCheck = (id: string) => {
    setChecklist(checklist.map((c) => (c.id === id ? { ...c, done: !c.done } : c)));
  };

  const removeCheck = (id: string) => {
    setChecklist(checklist.filter((c) => c.id !== id));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    onSave({
      title: title.trim(),
      description: description.trim(),
      category,
      priority,
      status,
      dueDate: dueDate || null,
      location: location.trim(),
      tags: tags.split(',').map((t) => t.trim()).filter(Boolean),
      checklist,
    });
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-start justify-center pt-8 md:pt-16 px-4" onClick={onClose}>
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg max-h-[85vh] overflow-y-auto shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b border-slate-700/50">
          <h2 className="text-lg font-bold text-white">{task ? 'Editar Tarefa' : 'Nova Tarefa'}</h2>
          <div className="flex items-center gap-2">
            {onDelete && (
              <button onClick={onDelete} className="p-1.5 rounded-lg text-red-400 hover:bg-red-500/10 transition-colors" title="Excluir">
                <Trash2 size={16} />
              </button>
            )}
            <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-700 transition-colors">
              <X size={18} />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {/* Title */}
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Título da tarefa..."
            className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
            autoFocus
          />

          {/* Description */}
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Descrição detalhada..."
            rows={3}
            className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm resize-none"
          />

          {/* Category + Priority */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Categoria</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {CATEGORIES.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Prioridade</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as Priority)}
                className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {PRIORITIES.map((p) => (
                  <option key={p.value} value={p.value}>{p.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Status + Due Date */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as TaskStatus)}
                className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="a_fazer">A Fazer</option>
                <option value="em_andamento">Em Andamento</option>
                <option value="concluido">Concluído</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Vencimento</label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* Location */}
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1"><MapPin size={12} className="inline mr-1" />Local</label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Ex.: Hospital São Lucas — Bloco Cirúrgico"
              className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Tags */}
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1"><Tag size={12} className="inline mr-1" />Tags (separadas por vírgula)</label>
            <input
              type="text"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="calibração, padrão, urgente"
              className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Checklist */}
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-2"><CheckSquare size={12} className="inline mr-1" />Checklist</label>
            <div className="space-y-1.5 mb-2">
              {checklist.map((item) => (
                <div key={item.id} className="flex items-center gap-2 group">
                  <button type="button" onClick={() => toggleCheck(item.id)} className="shrink-0">
                    {item.done ? <CheckSquare size={16} className="text-emerald-400" /> : <Square size={16} className="text-slate-500" />}
                  </button>
                  <span className={cn('text-sm flex-1', item.done ? 'text-slate-500 line-through' : 'text-slate-200')}>{item.text}</span>
                  <button type="button" onClick={() => removeCheck(item.id)} className="opacity-0 group-hover:opacity-100 text-slate-500 hover:text-red-400 transition-all">
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={newCheckItem}
                onChange={(e) => setNewCheckItem(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addCheckItem())}
                placeholder="Novo item..."
                className="flex-1 bg-slate-800 border border-slate-600 rounded-lg px-3 py-1.5 text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <button type="button" onClick={addCheckItem} className="px-3 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-white text-xs font-medium transition-colors">
                Adicionar
              </button>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-2 border-t border-slate-700/50">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700 text-sm font-medium transition-colors">
              Cancelar
            </button>
            <button type="submit" className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium transition-colors">
              {task ? 'Salvar' : 'Criar Tarefa'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
