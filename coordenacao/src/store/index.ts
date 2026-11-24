import { Task, CalendarEvent } from '../types';
import {
  apiGetAll, apiSaveTask, apiDeleteTask, apiSaveEvent, apiDeleteEvent,
  apiCloudSync, isApiOnline, setApiOnline,
} from '../api';

const TASKS_KEY = 'coord_tasks';
const EVENTS_KEY = 'coord_events';

function uid(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 9);
}

function load<T>(key: string): T[] {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function save<T>(key: string, data: T[]) {
  localStorage.setItem(key, JSON.stringify(data));
}

export function getTasks(): Task[] {
  return load<Task>(TASKS_KEY);
}

export function saveTasks(tasks: Task[]) {
  save(TASKS_KEY, tasks);
}

export function addTask(task: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>): Task {
  const tasks = getTasks();
  const now = new Date().toISOString();
  const newTask: Task = {
    ...task,
    id: uid(),
    createdAt: now,
    updatedAt: now,
  };
  tasks.push(newTask);
  saveTasks(tasks);
  return newTask;
}

export function updateTask(id: string, patch: Partial<Task>): Task | null {
  const tasks = getTasks();
  const idx = tasks.findIndex((t) => t.id === id);
  if (idx === -1) return null;
  tasks[idx] = { ...tasks[idx], ...patch, updatedAt: new Date().toISOString() };
  saveTasks(tasks);
  return tasks[idx];
}

export function deleteTask(id: string): boolean {
  const tasks = getTasks();
  const filtered = tasks.filter((t) => t.id !== id);
  if (filtered.length === tasks.length) return false;
  saveTasks(filtered);
  return true;
}

export function moveTask(id: string, status: Task['status']): Task | null {
  return updateTask(id, { status });
}

export function getEvents(): CalendarEvent[] {
  return load<CalendarEvent>(EVENTS_KEY);
}

export function saveEvents(events: CalendarEvent[]) {
  save(EVENTS_KEY, events);
}

export function addEvent(evt: Omit<CalendarEvent, 'id'>): CalendarEvent {
  const events = getEvents();
  const newEvt: CalendarEvent = { ...evt, id: uid() };
  events.push(newEvt);
  saveEvents(events);
  return newEvt;
}

export function deleteEvent(id: string): boolean {
  const events = getEvents();
  const filtered = events.filter((e) => e.id !== id);
  if (filtered.length === events.length) return false;
  saveEvents(filtered);
  return true;
}

export function exportBackup(): string {
  return JSON.stringify({ tasks: getTasks(), events: getEvents(), exportedAt: new Date().toISOString() }, null, 2);
}

export function importBackup(json: string): boolean {
  try {
    const data = JSON.parse(json);
    if (data.tasks) saveTasks(data.tasks);
    if (data.events) saveEvents(data.events);
    return true;
  } catch {
    return false;
  }
}

export function clearAll() {
  localStorage.removeItem(TASKS_KEY);
  localStorage.removeItem(EVENTS_KEY);
}

export function seedDemoData() {
  if (getTasks().length > 0) return;
  const now = new Date();
  const fmt = (d: Date) => d.toISOString();
  const addDays = (d: Date, n: number) => new Date(d.getTime() + n * 86400000);
  const addHours = (d: Date, n: number) => new Date(d.getTime() + n * 3600000);

  const demoTasks: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>[] = [
    {
      title: 'Calibração do padrão de massa — Hospital São Lucas',
      description: 'Envio do padrão metrológico para calibração externa no INMETRO. Prazo contractual: 15 dias úteis.',
      category: 'calibracao',
      priority: 'alta',
      status: 'em_andamento',
      dueDate: fmt(addDays(now, 5)),
      location: 'Hospital São Lucas — Lab. Metrologia',
      tags: ['calibração', 'padrão', 'INMETRO'],
      checklist: [
        { id: 'c1', text: 'Desmontagem preliminar do padrão', done: true },
        { id: 'c2', text: 'Cotação da placa com fabricante', done: true },
        { id: 'c3', text: 'Agendamento com laboratório acreditado', done: false },
        { id: 'c4', text: 'Calibração na bancada', done: false },
        { id: 'c5', text: 'Emissão do laudo e liberação', done: false },
      ],
    },
    {
      title: 'Equipamento parado — Bomba de infusão BD Alaris',
      description: 'Cliente relata falha na bomba de infusão. Equipamento aguardando placa de controle importada.',
      category: 'crises',
      priority: 'urgente',
      status: 'a_fazer',
      dueDate: fmt(addDays(now, 1)),
      location: 'Hospital Municipal — Centro Cirúrgico',
      tags: ['crise', 'equipamento parado', 'peça rara'],
      checklist: [
        { id: 'c6', text: 'Diagnóstico do equipamento', done: true },
        { id: 'c7', text: 'Solicitação de peça ao fabricante', done: true },
        { id: 'c8', text: 'Acompanhamento da importação', done: false },
        { id: 'c9', text: 'Reparo e testes funcionais', done: false },
      ],
    },
    {
      title: 'Proposta comercial — Contrato de assistência técnica',
      description: 'Elaboração de proposta para contrato anual de assistência técnica de 45 equipamentos.',
      category: 'comercial',
      priority: 'media',
      status: 'em_andamento',
      dueDate: fmt(addDays(now, 10)),
      location: 'Escritório',
      tags: ['proposta', 'contrato', 'assistência técnica'],
      checklist: [
        { id: 'c10', text: 'Levantamento dos equipamentos', done: true },
        { id: 'c11', text: 'Cálculo de horas técnicas', done: true },
        { id: 'c12', text: 'Montagem da proposta comercial', done: false },
        { id: 'c13', text: 'Revisão e envio ao cliente', done: false },
      ],
    },
    {
      title: 'Liberação de compra — Peças para ultrassom GE',
      description: 'Compra urgente de transdutores para manutenção preventiva. Necessita aprovação financeira.',
      category: 'financeiro',
      priority: 'alta',
      status: 'a_fazer',
      dueDate: fmt(addDays(now, 3)),
      location: 'Almoxarifado',
      tags: ['compra', 'aprovação', 'peças'],
      checklist: [
        { id: 'c14', text: 'Cotação com fornecedores', done: true },
        { id: 'c15', text: 'Aprovação do gestor', done: false },
        { id: 'c16', text: 'Emissão da OS de compra', done: false },
      ],
    },
    {
      title: 'Escala de sobreaviso — Feriado de Final de Ano',
      description: 'Definição da escala de técnicos para sobreaviso durante o período de 20/12 a 02/01.',
      category: 'rh',
      priority: 'media',
      status: 'concluido',
      dueDate: fmt(addDays(now, -2)),
      location: 'RH / Coordenação',
      tags: ['escala', 'sobreaviso', 'feriado'],
      checklist: [
        { id: 'c17', text: 'Levantar disponibilidade da equipe', done: true },
        { id: 'c18', text: 'Montar escala', done: true },
        { id: 'c19', text: 'Comunicar aos técnicos', done: true },
      ],
    },
    {
      title: 'Auditoria interna — ISO 17025',
      description: 'Preparação e execução da auditoria interna do sistema de gestão da qualidade.',
      category: 'calibracao',
      priority: 'alta',
      status: 'a_fazer',
      dueDate: fmt(addDays(now, 7)),
      location: 'Sala de Reuniões — Bloco Administrativo',
      tags: ['auditoria', 'ISO 17025', 'qualidade'],
      checklist: [
        { id: 'c20', text: 'Planejamento da auditoria', done: true },
        { id: 'c21', text: 'Seleção de amostras', done: false },
        { id: 'c22', text: 'Execução da auditoria', done: false },
        { id: 'c23', text: 'Relatório e ações corretivas', done: false },
      ],
    },
    {
      title: 'Manutenção preventiva — Autoclave 50L',
      description: 'PM semestral da autoclave conforme cronograma de manutenção.',
      category: 'crises',
      priority: 'media',
      status: 'concluido',
      dueDate: fmt(addDays(now, -5)),
      location: 'Hospital Central — Central de Materiais',
      tags: ['PM', 'autoclave', 'preventiva'],
      checklist: [
        { id: 'c24', text: 'Verificação de vedações', done: true },
        { id: 'c25', text: 'Teste de pressão', done: true },
        { id: 'c26', text: 'Calibração de sensores', done: true },
        { id: 'c27', text: 'Emissão do laudo', done: true },
      ],
    },
    {
      title: 'Orçamento pendente — Espectrofotômetro UV-VIS',
      description: 'Orçamento de R$ 12.400 para reparo da fonte de luz. Aguardando aprovação há 15 dias.',
      category: 'comercial',
      priority: 'urgente',
      status: 'a_fazer',
      dueDate: fmt(addDays(now, 0)),
      location: 'Oficina Interna — Bancada de Óptica',
      tags: ['orçamento', 'travado', 'espectrofotômetro'],
      checklist: [
        { id: 'c28', text: 'Diagnóstico completo', done: true },
        { id: 'c29', text: 'Proposta enviada ao cliente', done: true },
        { id: 'c30', text: 'Aguardando aprovação', done: false },
      ],
    },
  ];

  const demoEvents: Omit<CalendarEvent, 'id'>[] = [
    {
      taskId: null,
      title: 'Reunião de alinhamento — Equipe técnica',
      date: fmt(new Date(now.getFullYear(), now.getMonth(), now.getDate())),
      time: '09:00',
      endTime: '10:00',
      location: 'Sala de Reuniões',
      category: 'rh',
      notes: 'Pauta: escala de sobreaviso, treinamentos pendentes',
    },
    {
      taskId: null,
      title: 'Visita técnica — Hospital São Lucas',
      date: fmt(addDays(now, 2)),
      time: '14:00',
      endTime: '17:00',
      location: 'Hospital São Lucas — Bloco Cirúrgico',
      category: 'calibracao',
      notes: 'Instalação de equipamento calibrado',
    },
    {
      taskId: null,
      title: 'Entrega de proposta — Cliente XYZ',
      date: fmt(addDays(now, 4)),
      time: '10:30',
      endTime: '11:30',
      location: 'Escritório / Teams',
      category: 'comercial',
      notes: 'Apresentação da proposta de contrato anual',
    },
  ];

  const tasks = demoTasks.map((t) => {
    const now2 = new Date().toISOString();
    return { ...t, id: uid(), createdAt: now2, updatedAt: now2 };
  });
  const events = demoEvents.map((e) => ({ ...e, id: uid() }));

  saveTasks(tasks);
  saveEvents(events);
}

// --- Cloud Sync ---
export async function syncFromCloud() {
  if (!isApiOnline()) return false;
  try {
    const data = await apiGetAll();
    if (data.tasks) saveTasks(data.tasks);
    if (data.events) saveEvents(data.events);
    return true;
  } catch {
    return false;
  }
}

export async function syncTaskToCloud(task: Task) {
  if (!isApiOnline()) return;
  try { await apiSaveTask(task); } catch { /* offline */ }
}

export async function syncDeleteTaskFromCloud(id: string) {
  if (!isApiOnline()) return;
  try { await apiDeleteTask(id); } catch { /* offline */ }
}

export async function syncEventToCloud(evt: CalendarEvent) {
  if (!isApiOnline()) return;
  try { await apiSaveEvent(evt); } catch { /* offline */ }
}

export async function syncDeleteEventFromCloud(id: string) {
  if (!isApiOnline()) return;
  try { await apiDeleteEvent(id); } catch { /* offline */ }
}

// Check API health periodically
export function startApiProbe() {
  const check = async () => {
    try {
      await apiHealth();
      setApiOnline(true);
    } catch {
      setApiOnline(false);
    }
  };
  check();
  setInterval(check, 15000);
}
