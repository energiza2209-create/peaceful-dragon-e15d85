import { useState, useEffect, useCallback } from 'react';
import { Header } from './components/Header';
import { CalendarView as CalendarComponent } from './components/calendar/CalendarView';
import { KanbanBoard } from './components/kanban/KanbanBoard';
import { TaskListView } from './components/tasklist/TaskListView';
import { TaskModal } from './components/modals/TaskModal';
import { NotificationsModal } from './components/modals/NotificationsModal';
import { BackupModal } from './components/modals/BackupModal';
import { HelpModal } from './components/modals/HelpModal';
import { AlertBanner } from './components/AlertBanner';
import { TabView, Task, CalendarView as CalView } from './types';
import {
  getTasks, addTask, updateTask, deleteTask, moveTask,
  getEvents, addEvent, deleteEvent,
  syncFromCloud, syncTaskToCloud, syncDeleteTaskFromCloud,
  syncEventToCloud, syncDeleteEventFromCloud, startApiProbe,
} from './store';

export default function App() {
  const [tab, setTab] = useState<TabView>('agenda');
  const [calView, setCalView] = useState<CalView>('month');
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [tasks, setTasks] = useState<Task[]>([]);
  const [refreshKey, setRefreshKey] = useState(0);

  // Modals
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [editTask, setEditTask] = useState<Task | null>(null);
  const [showNotif, setShowNotif] = useState(false);
  const [showBackup, setShowBackup] = useState(false);
  const [showHelp, setShowHelp] = useState(false);

  const refresh = useCallback(() => {
    setTasks(getTasks());
    setRefreshKey((k) => k + 1);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  // Start API probe + sync from cloud on load
  useEffect(() => {
    startApiProbe();
    syncFromCloud().then(() => refresh());
  }, []);

  // Polling localStorage + cloud sync every 10s
  useEffect(() => {
    const iv = setInterval(() => {
      syncFromCloud().then(() => refresh());
    }, 10000);
    return () => clearInterval(iv);
  }, []);

  const overdueCount = tasks.filter((t) => {
    if (!t.dueDate || t.status === 'concluido') return false;
    const d = new Date(t.dueDate);
    const now = new Date();
    return d < now && !(d.toDateString() === now.toDateString());
  }).length;

  const dueTodayCount = tasks.filter((t) => {
    if (!t.dueDate || t.status === 'concluido') return false;
    return new Date(t.dueDate).toDateString() === new Date().toDateString();
  }).length;

  const handleNewTask = (date?: string) => {
    setEditTask(null);
    if (date) setSelectedDate(date);
    setShowTaskModal(true);
  };

  const handleEditTask = (task: Task) => {
    setEditTask(task);
    setShowTaskModal(true);
  };

  const handleSaveTask = (data: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>) => {
    let saved: Task | null;
    if (editTask) {
      saved = updateTask(editTask.id, data);
    } else {
      saved = addTask(data);
    }
    if (saved) syncTaskToCloud(saved);
    refresh();
    setShowTaskModal(false);
  };

  const handleDeleteTask = (id: string) => {
    deleteTask(id);
    syncDeleteTaskFromCloud(id);
    refresh();
    setShowTaskModal(false);
  };

  const handleMoveTask = (id: string, status: Task['status']) => {
    const updated = moveTask(id, status);
    if (updated) syncTaskToCloud(updated);
    refresh();
  };

  const handleSaveEvent = (evt: any) => {
    addEvent(evt);
    refresh();
  };

  const handleDeleteEvent = (id: string) => {
    deleteEvent(id);
    refresh();
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header
        tab={tab}
        onTabChange={setTab}
        overdueCount={overdueCount}
        dueTodayCount={dueTodayCount}
        onNewTask={() => handleNewTask()}
        onNotif={() => setShowNotif(true)}
        onBackup={() => setShowBackup(true)}
        onHelp={() => setShowHelp(true)}
      />

      {(overdueCount > 0 || dueTodayCount > 0) && (
        <AlertBanner overdueCount={overdueCount} dueTodayCount={dueTodayCount} onOpen={() => setShowNotif(true)} />
      )}

      <main className="flex-1 overflow-auto p-3 md:p-6">
        {tab === 'agenda' && (
          <CalendarComponent
            key={refreshKey}
            selectedDate={selectedDate}
            onSelectDate={setSelectedDate}
            view={calView}
            onViewChange={setCalView}
            events={getEvents()}
            tasks={tasks}
            onNewEvent={(date) => { setSelectedDate(date); handleNewTask(date); }}
            onEditTask={handleEditTask}
            onSaveEvent={handleSaveEvent}
            onDeleteEvent={handleDeleteEvent}
          />
        )}
        {tab === 'kanban' && (
          <KanbanBoard
            key={refreshKey}
            tasks={tasks}
            onMoveTask={handleMoveTask}
            onEditTask={handleEditTask}
            onNewTask={() => handleNewTask()}
          />
        )}
        {tab === 'lista' && (
          <TaskListView
            key={refreshKey}
            tasks={tasks}
            onEditTask={handleEditTask}
            onMoveTask={handleMoveTask}
            onDeleteTask={handleDeleteTask}
          />
        )}
      </main>

      {showTaskModal && (
        <TaskModal
          task={editTask}
          selectedDate={selectedDate}
          onSave={handleSaveTask}
          onDelete={editTask ? () => handleDeleteTask(editTask.id) : undefined}
          onClose={() => { setShowTaskModal(false); setEditTask(null); }}
        />
      )}
      {showNotif && (
        <NotificationsModal
          tasks={tasks}
          onClose={() => setShowNotif(false)}
          onEditTask={(t) => { setShowNotif(false); handleEditTask(t); }}
        />
      )}
      {showBackup && <BackupModal onClose={() => { setShowBackup(false); refresh(); }} />}
      {showHelp && <HelpModal onClose={() => setShowHelp(false)} />}
    </div>
  );
}
