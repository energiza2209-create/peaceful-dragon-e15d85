const API_URL = 'http://localhost:3001/api';

async function request(path: string, opts?: RequestInit) {
  const res = await fetch(`${API_URL}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...opts,
  });
  if (!res.ok) throw new Error(`API ${res.status}`);
  return res.json();
}

export async function apiHealth() {
  return request('/health');
}

export async function apiGetTasks() {
  return request('/tasks');
}

export async function apiSaveTask(task: any) {
  if (task.id) {
    return request(`/tasks/${task.id}`, { method: 'PUT', body: JSON.stringify(task) });
  }
  return request('/tasks', { method: 'POST', body: JSON.stringify(task) });
}

export async function apiDeleteTask(id: string) {
  return request(`/tasks/${id}`, { method: 'DELETE' });
}

export async function apiGetEvents() {
  return request('/events');
}

export async function apiSaveEvent(evt: any) {
  return request('/events', { method: 'POST', body: JSON.stringify(evt) });
}

export async function apiDeleteEvent(id: string) {
  return request(`/events/${id}`, { method: 'DELETE' });
}

export async function apiCloudSync(tasks: any[], events: any[]) {
  return request('/cloud-sync', {
    method: 'POST',
    body: JSON.stringify({ tasks, events }),
  });
}

export async function apiGetAll() {
  return request('/cloud-sync');
}

let _online = false;
export function isApiOnline() { return _online; }
export function setApiOnline(v: boolean) { _online = v; }

// Probe API on load
apiHealth().then(() => setApiOnline(true)).catch(() => setApiOnline(false));
