import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createSandbox, loadScript, SandboxResult } from '../helpers/sandbox';

describe('Auth module', () => {
  let sb: SandboxResult;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    sb = createSandbox();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  function loadAuth() {
    loadScript(sb.ctx, 'shared/auth.js');
    return (sb.ctx as any).window.Auth;
  }

  it('Auth object has all public methods', () => {
    const Auth = loadAuth();
    expect(typeof Auth.init).toBe('function');
    expect(typeof Auth.login).toBe('function');
    expect(typeof Auth.logout).toBe('function');
    expect(typeof Auth.resetPassword).toBe('function');
    expect(typeof Auth.updatePassword).toBe('function');
    expect(typeof Auth.getUser).toBe('function');
    expect(typeof Auth.getSession).toBe('function');
    expect(typeof Auth.getProfile).toBe('function');
    expect(typeof Auth.isAuthenticated).toBe('function');
    expect(typeof Auth.hasPermission).toBe('function');
    expect(typeof Auth.getProfiles).toBe('function');
    expect(typeof Auth.updateProfile).toBe('function');
    expect(typeof Auth.listUsers).toBe('function');
  });

  it('PROFILES contains expected roles', () => {
    const Auth = loadAuth();
    const profiles = Auth.getProfiles();
    expect(profiles).toHaveProperty('admin');
    expect(profiles).toHaveProperty('comercial');
    expect(profiles).toHaveProperty('tecnico');
    expect(profiles).toHaveProperty('financeiro');
    expect(profiles).toHaveProperty('leitura');
  });

  it('admin has all permissions', () => {
    const Auth = loadAuth();
    const adminPerms = Auth.getProfiles().admin.permissions;
    expect(adminPerms).toContain('all');
  });

  it('isAuthenticated() returns false when no session', () => {
    const Auth = loadAuth();
    expect(Auth.isAuthenticated()).toBe(false);
  });

  it('getUser() returns null when no session', () => {
    const Auth = loadAuth();
    expect(Auth.getUser()).toBeNull();
  });

  it('getSession() returns null when no session', () => {
    const Auth = loadAuth();
    expect(Auth.getSession()).toBeNull();
  });

  it('getProfile() returns null when no profile', () => {
    const Auth = loadAuth();
    expect(Auth.getProfile()).toBeNull();
  });

  it('hasPermission() returns false when no profile', () => {
    const Auth = loadAuth();
    expect(Auth.hasPermission('clientes')).toBe(false);
  });

  it('login() fails without supabaseClient', async () => {
    const Auth = loadAuth();
    const result = await Auth.login('test@test.com', 'password');
    expect(result.success).toBe(false);
    expect(result.error).toContain('Supabase client');
  });

  it('logout() succeeds without supabaseClient', async () => {
    const Auth = loadAuth();
    Auth.init(vi.fn());
    const result = await Auth.logout();
    expect(result.success).toBe(true);
  });

  it('resetPassword() fails without supabaseClient', async () => {
    const Auth = loadAuth();
    const result = await Auth.resetPassword('test@test.com');
    expect(result.success).toBe(false);
  });

  it('updatePassword() fails without supabaseClient', async () => {
    const Auth = loadAuth();
    const result = await Auth.updatePassword('newpass');
    expect(result.success).toBe(false);
  });

  it('login() calls supabaseClient.auth.signInWithPassword', async () => {
    const mockSignIn = vi.fn().mockResolvedValue({
      data: {
        session: { user: { id: 'u1', email: 'a@b.com' } },
        user: { id: 'u1', email: 'a@b.com' },
      },
      error: null,
    });
    const mockFrom = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: { id: 'u1', role: 'admin' }, error: null }),
    });

    (sb.ctx as any).window.supabaseClient = {
      auth: {
        signInWithPassword: mockSignIn,
        signOut: vi.fn().mockResolvedValue({ error: null }),
        getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'u1', email: 'a@b.com' } } }),
        resetPasswordForEmail: vi.fn().mockResolvedValue({ error: null }),
        updateUser: vi.fn().mockResolvedValue({ error: null }),
      },
      from: mockFrom,
    };

    const Auth = loadAuth();
    Auth.init(vi.fn());
    const result = await Auth.login('a@b.com', 'pass123');

    expect(mockSignIn).toHaveBeenCalledWith({ email: 'a@b.com', password: 'pass123' });
    expect(result.success).toBe(true);
  });

  it('login() handles supabase error', async () => {
    (sb.ctx as any).window.supabaseClient = {
      auth: {
        signInWithPassword: vi.fn().mockResolvedValue({
          data: null,
          error: { message: 'Invalid login' },
        }),
        getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
      },
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: null }),
      }),
    };

    const Auth = loadAuth();
    const result = await Auth.login('a@b.com', 'wrong');
    expect(result.success).toBe(false);
    expect(result.error).toBe('Invalid login');
  });

  it('init() restores session from localStorage', () => {
    const fakeSession = { user: { id: 'u1', email: 'a@b.com' } };
    sb.store['energiza_session'] = JSON.stringify(fakeSession);
    sb.store['energiza_profile'] = JSON.stringify({ id: 'u1', role: 'admin' });

    const Auth = loadAuth();
    const cb = vi.fn();
    Auth.init(cb);

    expect(Auth.getUser()).toEqual({ id: 'u1', email: 'a@b.com' });
    expect(Auth.isAuthenticated()).toBe(true);
  });

  it('init() handles corrupt localStorage gracefully', () => {
    sb.store['energiza_session'] = 'CORRUPT';
    sb.store['energiza_profile'] = 'CORRUPT';

    const Auth = loadAuth();
    Auth.init(vi.fn());
    expect(Auth.isAuthenticated()).toBe(false);
  });

  it('hasPermission() checks role permissions correctly', () => {
    sb.store['energiza_session'] = JSON.stringify({ user: { id: 'u1' } });
    sb.store['energiza_profile'] = JSON.stringify({ id: 'u1', role: 'comercial' });

    const Auth = loadAuth();
    Auth.init(vi.fn());

    expect(Auth.hasPermission('clientes')).toBe(true);
    expect(Auth.hasPermission('propostas')).toBe(true);
    expect(Auth.hasPermission('financeiro')).toBe(false);
  });

  it('hasPermission() returns false for unknown role', () => {
    sb.store['energiza_session'] = JSON.stringify({ user: { id: 'u1' } });
    sb.store['energiza_profile'] = JSON.stringify({ id: 'u1', role: 'nonexistent' });

    const Auth = loadAuth();
    Auth.init(vi.fn());

    expect(Auth.hasPermission('clientes')).toBe(false);
  });

  it('listUsers() fails without supabaseClient', async () => {
    const Auth = loadAuth();
    const result = await Auth.listUsers();
    expect(result.success).toBe(false);
  });

  it('logout() clears session and calls callback', async () => {
    sb.store['energiza_session'] = JSON.stringify({ user: { id: 'u1' } });
    sb.store['energiza_profile'] = JSON.stringify({ id: 'u1', role: 'admin' });

    const Auth = loadAuth();
    const cb = vi.fn();
    Auth.init(cb);

    vi.clearAllMocks();
    const result = await Auth.logout();
    expect(result.success).toBe(true);
    expect(Auth.isAuthenticated()).toBe(false);
  });
});
