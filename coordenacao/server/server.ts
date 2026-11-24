import express, { Request, Response } from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, '..', 'data');
const TASKS_FILE = path.join(DATA_DIR, 'tasks.json');
const EVENTS_FILE = path.join(DATA_DIR, 'events.json');

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// --- Data helpers ---
function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}

function loadJson<T>(file: string): T[] {
  try {
    if (!fs.existsSync(file)) return [];
    return JSON.parse(fs.readFileSync(file, 'utf-8'));
  } catch {
    return [];
  }
}

function saveJson<T>(file: string, data: T[]) {
  ensureDataDir();
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

function uid(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 9);
}

// --- Health ---
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), storage: 'json-file' });
});

// --- Tasks CRUD ---
app.get('/api/tasks', (_req: Request, res: Response) => {
  res.json(loadJson(TASKS_FILE));
});

app.post('/api/tasks', (req: Request, res: Response) => {
  const tasks = loadJson(TASKS_FILE);
  const now = new Date().toISOString();
  const newTask = {
    ...req.body,
    id: req.body.id || uid(),
    createdAt: req.body.createdAt || now,
    updatedAt: now,
  };
  tasks.push(newTask);
  saveJson(TASKS_FILE, tasks);
  res.status(201).json(newTask);
});

app.put('/api/tasks/:id', (req: Request, res: Response) => {
  const tasks = loadJson<any>(TASKS_FILE);
  const idx = tasks.findIndex((t: any) => t.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Task not found' });
  tasks[idx] = { ...tasks[idx], ...req.body, id: tasks[idx].id, updatedAt: new Date().toISOString() };
  saveJson(TASKS_FILE, tasks);
  res.json(tasks[idx]);
});

app.delete('/api/tasks/:id', (req: Request, res: Response) => {
  const tasks = loadJson<any>(TASKS_FILE);
  const filtered = tasks.filter((t: any) => t.id !== req.params.id);
  if (filtered.length === tasks.length) return res.status(404).json({ error: 'Task not found' });
  saveJson(TASKS_FILE, filtered);
  res.json({ ok: true });
});

// --- Events CRUD ---
app.get('/api/events', (_req: Request, res: Response) => {
  res.json(loadJson(EVENTS_FILE));
});

app.post('/api/events', (req: Request, res: Response) => {
  const events = loadJson(EVENTS_FILE);
  const newEvt = { ...req.body, id: req.body.id || uid() };
  events.push(newEvt);
  saveJson(EVENTS_FILE, events);
  res.status(201).json(newEvt);
});

app.delete('/api/events/:id', (req: Request, res: Response) => {
  const events = loadJson<any>(EVENTS_FILE);
  const filtered = events.filter((e: any) => e.id !== req.params.id);
  if (filtered.length === events.length) return res.status(404).json({ error: 'Event not found' });
  saveJson(EVENTS_FILE, filtered);
  res.json({ ok: true });
});

// --- Cloud Sync (batch) ---
app.get('/api/cloud-sync', (_req: Request, res: Response) => {
  res.json({
    tasks: loadJson(TASKS_FILE),
    events: loadJson(EVENTS_FILE),
    syncedAt: new Date().toISOString(),
  });
});

app.post('/api/cloud-sync', (req: Request, res: Response) => {
  const { tasks, events } = req.body;
  if (tasks) saveJson(TASKS_FILE, tasks);
  if (events) saveJson(EVENTS_FILE, events);
  res.json({ ok: true, syncedAt: new Date().toISOString() });
});

// --- Start ---
const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3001;
app.listen(PORT, () => {
  ensureDataDir();
  console.log(`  API server rodando em http://localhost:${PORT}`);
});
