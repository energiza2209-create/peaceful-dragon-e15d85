import { describe, it, expect, vi } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import vm from 'vm';

const appSource = readFileSync(resolve(__dirname, '../../app.js'), 'utf-8');

function createMockDom() {
  const elements: Record<string, any> = {};
  const navItems: any[] = [];
  const views: any[] = [];

  function createElement(tag: string, attrs?: Record<string, string>) {
    const el = {
      tagName: tag.toUpperCase(),
      id: attrs?.id || '',
      className: '',
      dataset: {} as Record<string, string>,
      textContent: '',
      innerHTML: '',
      style: {} as Record<string, string>,
      children: [] as any[],
      classList: {
        _classes: new Set<string>(),
        add(c: string) { this._classes.add(c); },
        remove(c: string) { this._classes.delete(c); },
        toggle(c: string, force?: boolean) {
          if (force !== undefined) { if (force) this._classes.add(c); else this._classes.delete(c); }
          else { if (this._classes.has(c)) this._classes.delete(c); else this._classes.add(c); }
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
    };
    return el;
  }

  const nav1 = createElement('div');
  nav1.dataset.view = 'dashboard';
  const nav2 = createElement('div');
  nav2.dataset.view = 'funil';
  navItems.push(nav1, nav2);

  const view1 = createElement('div');
  view1.id = 'view-dashboard';
  const view2 = createElement('div');
  view2.id = 'view-funil';
  views.push(view1, view2);

  elements['viewTitle'] = createElement('h1');
  elements['viewSubtitle'] = createElement('p');
  elements['content'] = createElement('div');
  elements['menuToggle'] = createElement('button');
  elements['horizontalNav'] = createElement('nav');
  elements['userChip'] = createElement('div');
  elements['userChipBtn'] = createElement('button');
  elements['userLogout'] = createElement('button');
  elements['newProposalBtn'] = createElement('button');
  elements['modalClose'] = createElement('button');
  elements['modalOverlay'] = createElement('div');
  elements['modalTitle'] = createElement('h2');
  elements['modalBody'] = createElement('div');
  elements['toast'] = createElement('div');

  const querySelector = vi.fn((sel: string) => {
    if (sel.startsWith('#')) return elements[sel.slice(1)] || null;
    if (sel === '.content') return elements['content'] || null;
    return null;
  });

  const querySelectorAll = vi.fn((sel: string) => {
    if (sel === '.nav-item') return navItems;
    if (sel === '.view') return views;
    return [];
  });

  const mockDocument = {
    querySelector,
    querySelectorAll,
    createElement,
    addEventListener: vi.fn(),
    readyState: 'complete',
    body: {
      classList: {
        _classes: new Set<string>(),
        toggle(c: string, force?: boolean) {
          if (force !== undefined) { if (force) this._classes.add(c); else this._classes.delete(c); }
          else { if (this._classes.has(c)) this._classes.delete(c); else this._classes.add(c); }
          return this._classes.has(c);
        },
        contains(c: string) { return this._classes.has(c); },
      },
    },
  };

  return { elements, navItems, views, mockDocument, nav1, nav2 };
}

function loadAppInVm(mockDocument: any) {
  const timers: any[] = [];
  const sandbox: any = {
    document: mockDocument,
    window: {
      location: { hostname: 'localhost', search: '' },
      innerWidth: 1024,
      innerHeight: 768,
      supabaseClient: null,
    },
    console: { log: vi.fn(), warn: vi.fn(), error: vi.fn(), info: vi.fn(), debug: vi.fn() },
    logger: {
      error: vi.fn(),
      warn: vi.fn(),
      info: vi.fn(),
      audit: vi.fn(),
      debug: vi.fn(),
    },
    setTimeout: vi.fn((fn: (..._args: any[]) => void, _ms?: number) => { timers.push({ fn, ms: _ms }); return timers.length; }),
    clearTimeout: vi.fn(),
    URLSearchParams: class {
      constructor(public _s: string) {}
      get(_k: string) { return this._s.includes(_k + '=true') ? 'true' : null; }
    },
    DB: {
      ensureSeed: vi.fn(),
      getProdutos: vi.fn(() => []),
      getPropostas: vi.fn(() => []),
      getClients: vi.fn(() => []),
      getNfeImports: vi.fn(() => []),
      remote: { init: vi.fn().mockResolvedValue(true), ready: vi.fn(() => false) },
      addProposta: vi.fn(),
      updateProposta: vi.fn(),
    },
    Auth: {
      init: vi.fn(),
      logout: vi.fn().mockResolvedValue({ success: true }),
    },
    Math,
    Date,
    JSON,
    Array,
    Object,
    Set,
    String,
    Number,
    TypeError,
    Error,
    encodeURIComponent,
    undefined: undefined,
    NaN,
    Infinity,
  };
  const ctx = vm.createContext(sandbox);
  const patched = appSource.replace(/^const /gm, 'var ');
  vm.runInContext(patched, ctx);
  return ctx;
}

describe('Router/Navigation', () => {
  it('VIEWS object is created with register and get', () => {
    const { mockDocument } = createMockDom();
    const ctx = loadAppInVm(mockDocument);
    expect(ctx.VIEWS).toBeDefined();
    expect(typeof ctx.VIEWS.register).toBe('function');
    expect(typeof ctx.VIEWS.get).toBe('function');
  });

  it('VIEWS.register and get works', () => {
    const { mockDocument } = createMockDom();
    const ctx = loadAppInVm(mockDocument);
    ctx.VIEWS.register('test', { title: 'Test', render: vi.fn() });
    const def = ctx.VIEWS.get('test');
    expect(def).toBeDefined();
    expect(def.title).toBe('Test');
  });

  it('VIEWS.get returns undefined for unregistered view', () => {
    const { mockDocument } = createMockDom();
    const ctx = loadAppInVm(mockDocument);
    expect(ctx.VIEWS.get('nonexistent')).toBeUndefined();
  });

  it('State object has current and meta', () => {
    const { mockDocument } = createMockDom();
    const ctx = loadAppInVm(mockDocument);
    expect(ctx.State).toBeDefined();
    expect(ctx.State.current).toBeDefined();
    expect(ctx.State.meta).toBeDefined();
    expect(ctx.State.meta).toHaveProperty('dashboard');
    expect(ctx.State.meta).toHaveProperty('funil');
    expect(ctx.State.meta).toHaveProperty('login');
  });

  it('navigate() updates State.current', () => {
    const { mockDocument } = createMockDom();
    const ctx = loadAppInVm(mockDocument);
    ctx.VIEWS.register('funil', { title: 'Funil', render: vi.fn() });
    ctx.navigate('funil');
    expect(ctx.State.current).toBe('funil');
  });

  it('navigate() does nothing for invalid key', () => {
    const { mockDocument } = createMockDom();
    const ctx = loadAppInVm(mockDocument);
    const before = ctx.State.current;
    ctx.navigate('nonexistent');
    expect(ctx.State.current).toBe(before);
  });

  it('navigate() toggles auth-mode class for login', () => {
    const { mockDocument } = createMockDom();
    const ctx = loadAppInVm(mockDocument);
    ctx.navigate('login');
    expect(mockDocument.body.classList.contains('auth-mode')).toBe(true);
  });

  it('navigate() removes auth-mode for non-login', () => {
    const { mockDocument } = createMockDom();
    const ctx = loadAppInVm(mockDocument);
    ctx.VIEWS.register('dashboard', { title: 'Dash', render: vi.fn() });
    ctx.navigate('dashboard');
    expect(mockDocument.body.classList.contains('auth-mode')).toBe(false);
  });

  it('navigate() sets view title from State.meta', () => {
    const { mockDocument, elements } = createMockDom();
    const ctx = loadAppInVm(mockDocument);
    ctx.VIEWS.register('funil', { title: 'Funil', subtitle: 'Sub', render: vi.fn() });
    ctx.navigate('funil');
    expect(elements['viewTitle'].textContent).toBe('Funil de Vendas');
    expect(elements['viewSubtitle'].textContent).toContain('Mova');
  });

  it('navigate() calls view render function', () => {
    const { mockDocument } = createMockDom();
    const ctx = loadAppInVm(mockDocument);
    const renderFn = vi.fn();
    ctx.VIEWS.register('funil', { title: 'Funil', render: renderFn });
    ctx.navigate('funil');
    expect(renderFn).toHaveBeenCalled();
  });

  it('navigate() handles render errors gracefully', () => {
    const { mockDocument } = createMockDom();
    const ctx = loadAppInVm(mockDocument);
    ctx.VIEWS.register('funil', { title: 'Funil', render: () => { throw new Error('boom'); } });
    expect(() => ctx.navigate('funil')).not.toThrow();
  });

  it('Modal.open and close toggle overlay', () => {
    const { mockDocument, elements } = createMockDom();
    const ctx = loadAppInVm(mockDocument);
    ctx.Modal.open('Title', '<p>body</p>');
    expect(elements['modalOverlay'].classList.contains('open')).toBe(true);
    expect(elements['modalTitle'].textContent).toBe('Title');
    ctx.Modal.close();
    expect(elements['modalOverlay'].classList.contains('open')).toBe(false);
  });

  it('refreshAll calls dashboard and current view render', () => {
    const { mockDocument } = createMockDom();
    const ctx = loadAppInVm(mockDocument);
    const dashRender = vi.fn();
    const funilRender = vi.fn();
    ctx.VIEWS.register('dashboard', { render: dashRender });
    ctx.VIEWS.register('funil', { render: funilRender });
    ctx.State.current = 'funil';
    ctx.refreshAll();
    expect(dashRender).toHaveBeenCalled();
    expect(funilRender).toHaveBeenCalled();
  });

  it('refreshAll skips login view', () => {
    const { mockDocument } = createMockDom();
    const ctx = loadAppInVm(mockDocument);
    const loginRender = vi.fn();
    const dashRender = vi.fn();
    ctx.VIEWS.register('login', { render: loginRender });
    ctx.VIEWS.register('dashboard', { render: dashRender });
    ctx.State.current = 'login';
    ctx.refreshAll();
    expect(loginRender).not.toHaveBeenCalled();
  });

  it('BRL formats currency correctly', () => {
    const { mockDocument } = createMockDom();
    const ctx = loadAppInVm(mockDocument);
    expect(ctx.BRL(1000)).toContain('1');
    expect(ctx.BRL(0)).toContain('0');
    expect(ctx.BRL(null)).toContain('0');
  });

  it('escapeHtml escapes special characters', () => {
    const { mockDocument } = createMockDom();
    const ctx = loadAppInVm(mockDocument);
    expect(ctx.escapeHtml('<script>')).toContain('&lt;');
    expect(ctx.escapeHtml('&amp;')).toContain('&amp;');
    expect(ctx.escapeHtml('"test"')).toContain('&quot;');
  });

  it('fmtDate returns a string with date', () => {
    const { mockDocument } = createMockDom();
    const ctx = loadAppInVm(mockDocument);
    const result = ctx.fmtDate('2026-01-15');
    expect(typeof result).toBe('string');
    expect(result).toContain('/');
    expect(result).toContain('2026');
  });
});
