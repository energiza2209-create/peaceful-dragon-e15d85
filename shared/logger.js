/**
 * Serviço Centralizado de Logs — ENERGIZA CRM
 *
 * Níveis de log: error, warn, info, debug
 * Cada log registra: timestamp, nível, mensagem, contexto, dados extras
 */

const LOG_LEVELS = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3,
};

const currentLevel = LOG_LEVELS[window.location.hostname === 'localhost' ? 'debug' : 'warn'];

function formatTimestamp() {
  return new Date().toISOString();
}

function formatMessage(level, message, context, data) {
  const entry = {
    timestamp: formatTimestamp(),
    level,
    message,
    context: context || 'app',
    user: getCurrentUserId(),
    data: data || null,
  };
  return entry;
}

function getCurrentUserId() {
  try {
    const user = JSON.parse(localStorage.getItem('energiza_user') || '{}');
    return user.id || 'anonymous';
  } catch {
    return 'anonymous';
  }
}

function persistLog(entry) {
  try {
    const logs = JSON.parse(localStorage.getItem('energiza_logs') || '[]');
    logs.push(entry);
    if (logs.length > 500) {
      logs.splice(0, logs.length - 500);
    }
    localStorage.setItem('energiza_logs', JSON.stringify(logs));
  } catch {
    // localStorage full or unavailable — silently fail
  }
}

function outputToConsole(entry) {
  const prefix = `[${entry.timestamp}] [${entry.level.toUpperCase()}] [${entry.context}]`;
  const suffix = entry.data ? entry.data : '';

  switch (entry.level) {
    case 'error':
      console.error(prefix, entry.message, suffix);
      break;
    case 'warn':
      console.warn(prefix, entry.message, suffix);
      break;
    case 'info':
      console.info(prefix, entry.message, suffix);
      break;
    case 'debug':
      console.debug(prefix, entry.message, suffix);
      break;
  }
}

window.logger = {
  error(message, context, data) {
    if (currentLevel >= LOG_LEVELS.error) {
      const entry = formatMessage('error', message, context, data);
      outputToConsole(entry);
      persistLog(entry);
    }
  },

  warn(message, context, data) {
    if (currentLevel >= LOG_LEVELS.warn) {
      const entry = formatMessage('warn', message, context, data);
      outputToConsole(entry);
      persistLog(entry);
    }
  },

  info(message, context, data) {
    if (currentLevel >= LOG_LEVELS.info) {
      const entry = formatMessage('info', message, context, data);
      outputToConsole(entry);
      persistLog(entry);
    }
  },

  debug(message, context, data) {
    if (currentLevel >= LOG_LEVELS.debug) {
      const entry = formatMessage('debug', message, context, data);
      outputToConsole(entry);
      persistLog(entry);
    }
  },

  getLogs() {
    try {
      return JSON.parse(localStorage.getItem('energiza_logs') || '[]');
    } catch {
      return [];
    }
  },

  clearLogs() {
    localStorage.removeItem('energiza_logs');
  },

  exportLogs() {
    const logs = this.getLogs();
    return JSON.stringify(logs, null, 2);
  },
};
