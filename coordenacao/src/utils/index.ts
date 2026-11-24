import { isToday, isTomorrow, isPast, parseISO, differenceInDays, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Task, Priority } from '../types';

export function formatDate(iso: string): string {
  return format(parseISO(iso), 'dd/MM/yyyy', { locale: ptBR });
}

export function formatDateTime(iso: string): string {
  return format(parseISO(iso), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
}

export function formatRelative(iso: string): string {
  const d = parseISO(iso);
  if (isToday(d)) return 'Hoje';
  if (isTomorrow(d)) return 'Amanhã';
  const diff = differenceInDays(d, new Date());
  if (diff < 0) return `${Math.abs(diff)}d atrasado`;
  if (diff <= 7) return `Em ${diff}d`;
  return formatDate(iso);
}

export function isOverdue(task: Task): boolean {
  if (!task.dueDate || task.status === 'concluido') return false;
  return isPast(parseISO(task.dueDate)) && !isToday(parseISO(task.dueDate));
}

export function isDueToday(task: Task): boolean {
  if (!task.dueDate) return false;
  return isToday(parseISO(task.dueDate));
}

export function isDueSoon(task: Task, days = 2): boolean {
  if (!task.dueDate || task.status === 'concluido') return false;
  const d = parseISO(task.dueDate);
  const diff = differenceInDays(d, new Date());
  return diff >= 0 && diff <= days;
}

export function dueColor(task: Task): string {
  if (!task.dueDate || task.status === 'concluido') return 'text-slate-500';
  if (isOverdue(task)) return 'text-red-400';
  if (isDueToday(task)) return 'text-amber-400';
  if (isDueSoon(task)) return 'text-cyan-400';
  return 'text-slate-400';
}

export function priorityColor(p: Priority): string {
  const map: Record<Priority, string> = {
    baixa: 'bg-slate-500/20 text-slate-400',
    media: 'bg-blue-500/20 text-blue-400',
    alta: 'bg-amber-500/20 text-amber-400',
    urgente: 'bg-red-500/20 text-red-400',
  };
  return map[p];
}

export function checklistProgress(checklist: { done: boolean }[]): number {
  if (checklist.length === 0) return 0;
  return Math.round((checklist.filter((c) => c.done).length / checklist.length) * 100);
}

export function cn(...classes: (string | false | null | undefined)[]): string {
  return classes.filter(Boolean).join(' ');
}
