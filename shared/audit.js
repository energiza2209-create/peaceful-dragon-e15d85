/**
 * Sistema de Auditoria — ENERGIZA CRM
 *
 * Registra todas as ações de segurança e operacionais.
 * Armazena em localStorage e sincroniza com Supabase quando disponível.
 *
 * Padrão: Window Global (Scripts Clássicos + IIFE)
 */

window.Audit = (() => {
  'use strict';

  const AUDIT_KEY = 'energiza_audit';
  const MAX_ENTRIES = 1000;
  const SUPABASE_TABLE = 'audit_logs';

  // ─── Ações de Auditoria ───
  const ACTIONS = {
    // Autenticação
    LOGIN_SUCCESS: 'login_success',
    LOGIN_FAILED: 'login_failed',
    LOGIN_ERROR: 'login_error',
    LOGOUT: 'logout',
    SESSION_EXPIRED: 'session_expired',
    PASSWORD_RESET: 'password_reset_requested',
    PASSWORD_CHANGED: 'password_changed',

    // Usuários
    USER_CREATED: 'user_created',
    USER_UPDATED: 'user_updated',
    USER_DELETED: 'user_deleted',
    PROFILE_CHANGED: 'profile_changed',
    PERMISSION_CHANGED: 'permission_changed',

    // Dados
    DATA_CREATED: 'data_created',
    DATA_UPDATED: 'data_updated',
    DATA_DELETED: 'data_deleted',
    DATA_IMPORTED: 'data_imported',
    DATA_EXPORTED: 'data_exported',

    // Sistema
    SYSTEM_ERROR: 'system_error',
    SYNC_STARTED: 'sync_started',
    SYNC_COMPLETED: 'sync_completed',
    SYNC_FAILED: 'sync_failed',
  };

  // ─── Log Principal ───
  function log(action, data) {
    const entry = {
      id: _generateId(),
      timestamp: new Date().toISOString(),
      action: action,
      userId: _getUserId(),
      userEmail: _getUserEmail(),
      data: data || {},
      ip: null,
      userAgent: navigator.userAgent,
      screen: _getScreenInfo(),
    };

    // Tentar obter IP (pode falhar por CORS)
    _fetchIP().then(ip => {
      entry.ip = ip;
      _persistEntry(entry);
    }).catch(() => {
      _persistEntry(entry);
    });

    return entry;
  }

  // ─── Persistir Entrada ───
  function _persistEntry(entry) {
    // Salvar em localStorage
    _saveToLocalStorage(entry);

    // Sincronizar com Supabase (async, sem blocking)
    _syncToSupabase(entry);
  }

  // ─── LocalStorage ───
  function _saveToLocalStorage(entry) {
    try {
      const logs = JSON.parse(localStorage.getItem(AUDIT_KEY) || '[]');
      logs.push(entry);

      // Manter apenas as últimas MAX_ENTRIES
      if (logs.length > MAX_ENTRIES) {
        logs.splice(0, logs.length - MAX_ENTRIES);
      }

      localStorage.setItem(AUDIT_KEY, JSON.stringify(logs));
    } catch (_) {
      // localStorage full or unavailable
    }
  }

  // ─── Supabase Sync ───
  async function _syncToSupabase(entry) {
    if (!window.supabaseClient) return;

    try {
      await window.supabaseClient
        .from(SUPABASE_TABLE)
        .insert({
          id: entry.id,
          timestamp: entry.timestamp,
          action: entry.action,
          user_id: entry.userId,
          user_email: entry.userEmail,
          data: entry.data,
          ip: entry.ip,
          user_agent: entry.userAgent,
          screen: entry.screen,
        });
    } catch (_) {
      // Silently fail — audit in localStorage is fallback
    }
  }

  // ─── Buscar Logs ───
  function getLogs(filters) {
    let logs = JSON.parse(localStorage.getItem(AUDIT_KEY) || '[]');

    if (filters) {
      if (filters.action) {
        logs = logs.filter(l => l.action === filters.action);
      }
      if (filters.userId) {
        logs = logs.filter(l => l.userId === filters.userId);
      }
      if (filters.startDate) {
        logs = logs.filter(l => new Date(l.timestamp) >= new Date(filters.startDate));
      }
      if (filters.endDate) {
        logs = logs.filter(l => new Date(l.timestamp) <= new Date(filters.endDate));
      }
      if (filters.limit) {
        logs = logs.slice(-filters.limit);
      }
    }

    return logs;
  }

  // ─── Buscar Logs de Segurança ───
  function getSecurityLogs(limit) {
    const securityActions = [
      ACTIONS.LOGIN_SUCCESS,
      ACTIONS.LOGIN_FAILED,
      ACTIONS.LOGIN_ERROR,
      ACTIONS.LOGOUT,
      ACTIONS.SESSION_EXPIRED,
      ACTIONS.PASSWORD_RESET,
      ACTIONS.PASSWORD_CHANGED,
      ACTIONS.PROFILE_CHANGED,
      ACTIONS.PERMISSION_CHANGED,
    ];

    return getLogs({ limit: limit || 100 }).filter(l =>
      securityActions.includes(l.action)
    );
  }

  // ─── Exportar Logs ───
  function exportLogs(format) {
    const logs = getLogs();

    if (format === 'csv') {
      return _exportAsCSV(logs);
    }

    return JSON.stringify(logs, null, 2);
  }

  function _exportAsCSV(logs) {
    if (logs.length === 0) return '';

    const headers = ['Timestamp', 'Action', 'User ID', 'Email', 'IP', 'Data'];
    const rows = logs.map(l => [
      l.timestamp,
      l.action,
      l.userId,
      l.userEmail,
      l.ip || 'N/A',
      JSON.stringify(l.data),
    ]);

    return [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  }

  // ─── Limpar Logs ───
  function clearLogs() {
    localStorage.removeItem(AUDIT_KEY);
  }

  // ─── Helpers ───
  function _generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  function _getUserId() {
    if (typeof window.Auth !== 'undefined' && window.Auth.getUser()) {
      return window.Auth.getUser().id;
    }
    return 'anonymous';
  }

  function _getUserEmail() {
    if (typeof window.Auth !== 'undefined' && window.Auth.getUser()) {
      return window.Auth.getUser().email;
    }
    return 'anonymous';
  }

  function _getScreenInfo() {
    return {
      width: window.screen.width,
      height: window.screen.height,
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight,
      },
    };
  }

  async function _fetchIP() {
    try {
      const response = await fetch('https://api.ipify.org?format=json', {
        signal: AbortSignal.timeout(2000),
      });
      const data = await response.json();
      return data.ip;
    } catch (_) {
      return null;
    }
  }

  // ─── API Pública ───
  return {
    log: log,
    getLogs: getLogs,
    getSecurityLogs: getSecurityLogs,
    exportLogs: exportLogs,
    clearLogs: clearLogs,
    ACTIONS: ACTIONS,
  };
})();
