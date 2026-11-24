export type Priority = 'baixa' | 'media' | 'alta' | 'urgente';
export type TaskStatus = 'a_fazer' | 'em_andamento' | 'concluido';
export type CalendarView = 'month' | 'week' | 'day';
export type TabView = 'agenda' | 'kanban' | 'lista';

export interface ChecklistItem {
  id: string;
  text: string;
  done: boolean;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  category: string;
  priority: Priority;
  status: TaskStatus;
  dueDate: string | null;
  createdAt: string;
  updatedAt: string;
  checklist: ChecklistItem[];
  location: string;
  tags: string[];
}

export interface CalendarEvent {
  id: string;
  taskId: string | null;
  title: string;
  date: string;
  time: string;
  endTime: string;
  location: string;
  category: string;
  notes: string;
}

export interface Category {
  id: string;
  name: string;
  color: string;
  bgClass: string;
  textClass: string;
}

export const CATEGORIES: Category[] = [
  { id: 'crises', name: 'Crises & Escalações', color: '#ef4444', bgClass: 'bg-red-500/15', textClass: 'text-red-400' },
  { id: 'calibracao', name: 'Calibrações & Contratos', color: '#a855f7', bgClass: 'bg-purple-500/15', textClass: 'text-purple-400' },
  { id: 'financeiro', name: 'Financeiro & Compras', color: '#f59e0b', bgClass: 'bg-amber-500/15', textClass: 'text-amber-400' },
  { id: 'comercial', name: 'Comercial & Orçamentos', color: '#06b6d4', bgClass: 'bg-cyan-500/15', textClass: 'text-cyan-400' },
  { id: 'rh', name: 'RH & Equipe Técnica', color: '#10b981', bgClass: 'bg-emerald-500/15', textClass: 'text-emerald-400' },
];

export const PRIORITIES: { value: Priority; label: string; color: string }[] = [
  { value: 'baixa', label: 'Baixa', color: '#64748b' },
  { value: 'media', label: 'Média', color: '#3b82f6' },
  { value: 'alta', label: 'Alta', color: '#f59e0b' },
  { value: 'urgente', label: 'Urgente', color: '#ef4444' },
];

export const STATUS_LABELS: Record<TaskStatus, string> = {
  a_fazer: 'A Fazer',
  em_andamento: 'Em Andamento',
  concluido: 'Concluído',
};
