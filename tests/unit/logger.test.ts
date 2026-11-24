import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createSandbox, loadScript, SandboxResult } from '../helpers/sandbox';

describe('logger', () => {
  let sb: SandboxResult;

  beforeEach(() => {
    vi.clearAllMocks();
    sb = createSandbox();
    loadScript(sb.ctx, 'shared/logger.js');
  });

  it('logger object has all methods', () => {
    const logger = (sb.ctx as any).window.logger;
    expect(typeof logger.error).toBe('function');
    expect(typeof logger.warn).toBe('function');
    expect(typeof logger.info).toBe('function');
    expect(typeof logger.debug).toBe('function');
    expect(typeof logger.getLogs).toBe('function');
    expect(typeof logger.clearLogs).toBe('function');
    expect(typeof logger.exportLogs).toBe('function');
  });

  it('error() logs to console.error and persists', () => {
    const logger = (sb.ctx as any).window.logger;
    logger.error('test error', 'test-context', { detail: 42 });

    expect(sb.mockConsole.error).toHaveBeenCalledTimes(1);
    const logs = JSON.parse(sb.store['energiza_logs'] || '[]');
    expect(logs).toHaveLength(1);
    expect(logs[0].level).toBe('error');
    expect(logs[0].message).toBe('test error');
    expect(logs[0].context).toBe('test-context');
  });

  it('warn() logs to console.warn and persists', () => {
    const logger = (sb.ctx as any).window.logger;
    logger.warn('warning msg', 'ctx');

    expect(sb.mockConsole.warn).toHaveBeenCalledTimes(1);
    const logs = JSON.parse(sb.store['energiza_logs'] || '[]');
    expect(logs[0].level).toBe('warn');
  });

  it('info() logs to console.info and persists', () => {
    const logger = (sb.ctx as any).window.logger;
    logger.info('info msg');

    expect(sb.mockConsole.info).toHaveBeenCalledTimes(1);
    const logs = JSON.parse(sb.store['energiza_logs'] || '[]');
    expect(logs[0].level).toBe('info');
  });

  it('debug() logs to console.debug and persists', () => {
    const logger = (sb.ctx as any).window.logger;
    logger.debug('debug msg');

    expect(sb.mockConsole.debug).toHaveBeenCalledTimes(1);
    const logs = JSON.parse(sb.store['energiza_logs'] || '[]');
    expect(logs[0].level).toBe('debug');
  });

  it('getLogs() returns parsed logs from localStorage', () => {
    sb.store['energiza_logs'] = JSON.stringify([{ level: 'info', message: 'saved' }]);
    const logger = (sb.ctx as any).window.logger;
    const logs = logger.getLogs();
    expect(logs).toHaveLength(1);
    expect(logs[0].message).toBe('saved');
  });

  it('getLogs() returns [] on corrupt data', () => {
    sb.store['energiza_logs'] = 'NOT_JSON';
    const logger = (sb.ctx as any).window.logger;
    const logs = logger.getLogs();
    expect(logs).toEqual([]);
  });

  it('clearLogs() removes logs from localStorage', () => {
    sb.store['energiza_logs'] = JSON.stringify([{ level: 'info' }]);
    const logger = (sb.ctx as any).window.logger;
    logger.clearLogs();
    expect(sb.mockStorage.removeItem).toHaveBeenCalledWith('energiza_logs');
  });

  it('exportLogs() returns formatted JSON string', () => {
    sb.store['energiza_logs'] = JSON.stringify([{ level: 'info', message: 'a' }]);
    const logger = (sb.ctx as any).window.logger;
    const exported = logger.exportLogs();
    const parsed = JSON.parse(exported);
    expect(parsed).toHaveLength(1);
  });

  it('log entry includes timestamp', () => {
    const logger = (sb.ctx as any).window.logger;
    logger.info('timestamped');
    const logs = JSON.parse(sb.store['energiza_logs'] || '[]');
    expect(logs[0].timestamp).toBeDefined();
    expect(new Date(logs[0].timestamp).getTime()).not.toBeNaN();
  });

  it('log entry includes user from localStorage', () => {
    sb.store['energiza_user'] = JSON.stringify({ id: 'user-123' });
    const logger = (sb.ctx as any).window.logger;
    logger.info('with user');
    const logs = JSON.parse(sb.store['energiza_logs'] || '[]');
    expect(logs[0].user).toBe('user-123');
  });

  it('log entry defaults user to anonymous', () => {
    const logger = (sb.ctx as any).window.logger;
    logger.info('no user');
    const logs = JSON.parse(sb.store['energiza_logs'] || '[]');
    expect(logs[0].user).toBe('anonymous');
  });

  it('truncates logs beyond 500 entries', () => {
    const manyLogs = Array.from({ length: 501 }, (_, i) => ({ level: 'info', message: `log-${i}` }));
    sb.store['energiza_logs'] = JSON.stringify(manyLogs);

    const logger = (sb.ctx as any).window.logger;
    logger.info('new log');

    const logs = JSON.parse(sb.store['energiza_logs'] || '[]');
    expect(logs.length).toBeLessThanOrEqual(500);
  });
});
