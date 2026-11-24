import { createContext, runInContext, Context } from 'vm';
import { vi } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

export interface SandboxResult {
  ctx: Context;
  store: Record<string, string>;
  mockStorage: any;
  mockConsole: any;
  elements: Record<string, any>;
  eventHandlers: Record<string, (..._args: any[]) => void>;
}

export function createSandbox(overrides: Record<string, any> = {}): SandboxResult {
  const store: Record<string, string> = {};
  const elements: Record<string, any> = {};
  const eventHandlers: Record<string, (..._args: any[]) => void> = {};

  const mockStorage = {
    getItem: vi.fn((k: string) => store[k] ?? null),
    setItem: vi.fn((k: string, v: string) => { store[k] = v; }),
    removeItem: vi.fn((k: string) => { delete store[k]; }),
    clear: vi.fn(() => { Object.keys(store).forEach(k => delete store[k]); }),
    get length() { return Object.keys(store).length; },
    key: vi.fn(() => null),
  };

  const mockConsole = {
    log: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  };

  function createElement(tag: string, attrs?: Record<string, string>) {
    const el: any = {
      tagName: tag.toUpperCase(),
      id: attrs?.id || '',
      className: '',
      dataset: {} as Record<string, string>,
      textContent: '',
      innerHTML: '',
      style: new Proxy({} as Record<string, string>, {
        get: (_t: any, prop: string) => {
          if (prop === 'display') return '';
          if (prop === 'cssText') return '';
          return '';
        },
        set: () => true,
      }),
      children: [] as any[],
      classList: {
        _classes: new Set<string>(),
        add(c: string) { this._classes.add(c); },
        remove(c: string) { this._classes.delete(c); },
        toggle(c: string, force?: boolean) {
          if (force !== undefined) {
            if (force) this._classes.add(c); else this._classes.delete(c);
          } else {
            if (this._classes.has(c)) this._classes.delete(c); else this._classes.add(c);
          }
          return this._classes.has(c);
        },
        contains(c: string) { return this._classes.has(c); },
      },
      addEventListener: vi.fn(),
      setAttribute: vi.fn(),
      appendChild: vi.fn((child: any) => { el.children.push(child); return child; }),
      remove: vi.fn(),
      click: vi.fn(),
      contains: vi.fn(() => false),
      focus: vi.fn(),
      blur: vi.fn(),
      value: '',
      checked: false,
      type: 'text',
      disabled: false,
      placeholder: '',
      closest: vi.fn(() => null),
    };
    if (attrs?.id) elements[attrs.id] = el;
    return el;
  }

  const sandbox: any = {
    window: {
      location: {
        hostname: 'localhost',
        origin: 'http://localhost:3000',
        search: '',
        pathname: '/',
        reload: vi.fn(),
        href: 'http://localhost:3000',
      },
      innerWidth: 1024,
      innerHeight: 768,
      screen: { width: 1920, height: 1080 },
      supabaseClient: null,
      supabase: undefined,
      crypto: { randomUUID: () => 'test-uuid-' + Math.random().toString(36).slice(2, 8) },
      addEventListener: vi.fn((event: string, handler: (..._args: any[]) => void) => {
        eventHandlers[event] = handler;
      }),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
      performance: { now: vi.fn(() => Date.now()) },
      requestAnimationFrame: vi.fn((fn: (..._args: any[]) => void) => { fn(Date.now()); return 1; }),
      cancelAnimationFrame: vi.fn(),
      matchMedia: vi.fn(() => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() })),
      logger: undefined,
      Auth: undefined,
      Audit: undefined,
      DB: undefined,
      SUPABASE_URL: 'https://test.supabase.co',
      SUPABASE_ANON_KEY: 'test-anon-key',
      ...overrides.window,
    },
    document: {
      querySelector: vi.fn((sel: string) => {
        if (sel.startsWith('#')) return elements[sel.slice(1)] || null;
        return null;
      }),
      querySelectorAll: vi.fn(() => []),
      createElement,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      readyState: 'complete',
      body: {
        classList: {
          _classes: new Set<string>(),
          toggle(c: string, force?: boolean) {
            if (force !== undefined) {
              if (force) this._classes.add(c); else this._classes.delete(c);
            } else {
              if (this._classes.has(c)) this._classes.delete(c); else this._classes.add(c);
            }
            return this._classes.has(c);
          },
          contains(c: string) { return this._classes.has(c); },
        },
        appendChild: vi.fn((child: any) => {
          if (child.id) elements[child.id] = child;
        }),
      },
      getElementById: vi.fn((id: string) => {
        if (!elements[id]) {
          elements[id] = createElement('div', { id });
        }
        return elements[id];
      }),
      ...overrides.document,
    },
    console: mockConsole,
    localStorage: mockStorage,
    navigator: { userAgent: 'test-agent' },
    history: { pushState: vi.fn(), replaceState: vi.fn(), back: vi.fn() },
    location: {
      hostname: 'localhost',
      href: 'http://localhost:3000',
      reload: vi.fn(),
      origin: 'http://localhost:3000',
    },
    fetch: vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({}), text: () => Promise.resolve('') }),
    setTimeout: vi.fn((fn: (..._args: any[]) => void, _ms?: number) => { fn(); return 1; }),
    clearTimeout: vi.fn(),
    setInterval: vi.fn(() => 1),
    clearInterval: vi.fn(),
    URLSearchParams: class {
      params: Record<string, string> = {};
      constructor(s: string) {
        if (s) s.split('&').forEach(p => {
          const parts = p.split('=');
          if (parts[0]) this.params[decodeURIComponent(parts[0])] = decodeURIComponent(parts[1] || '');
        });
      }
      get(k: string) { return this.params[k] ?? null; }
      has(k: string) { return k in this.params; }
    },
    AbortSignal: { timeout: (_ms: number) => ({}) },
    CustomEvent: class { constructor(_type: string, _detail: any) {} },
    Event: class { constructor(_type: string) {} },
    Error,
    TypeError,
    RangeError,
    Math,
    Date,
    JSON,
    Array,
    Object,
    Set,
    Map,
    String,
    Number,
    Boolean,
    RegExp,
    parseInt,
    parseFloat,
    isNaN,
    isFinite,
    encodeURIComponent,
    decodeURIComponent,
    encodeURI,
    decodeURI,
    NaN,
    Infinity,
    undefined: undefined,
    DOMParser: class { parseFromString() { return { body: { childNodes: [], innerHTML: '' } }; } },
    toast: vi.fn(),
    ...overrides,
  };

  const ctx = createContext(sandbox);
  return { ctx, store, mockStorage, mockConsole, elements, eventHandlers };
}

export function loadScript(sandboxCtx: Context, scriptPath: string): void {
  const source = readFileSync(resolve(__dirname, '../../', scriptPath), 'utf-8');
  const patched = source.replace(/^const /gm, 'var ');
  runInContext(patched, sandboxCtx);
}

export function loadScriptSource(sandboxCtx: Context, source: string): void {
  const patched = source.replace(/^const /gm, 'var ');
  runInContext(patched, sandboxCtx);
}
