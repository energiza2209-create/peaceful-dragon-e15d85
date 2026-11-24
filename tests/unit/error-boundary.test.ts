import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createContext, runInContext } from 'vm';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const errorBoundarySource = readFileSync(resolve(__dirname, '../../shared/error-boundary.js'), 'utf-8');

function createErrorBoundarySandbox() {
  const elements: Record<string, any> = {};
  const eventHandlers: Record<string, (..._args: any[]) => void> = {};

  function createElement(tag: string) {
    const styles: Record<string, string> = {};
    const el: any = {
      tagName: tag.toUpperCase(),
      id: '',
      className: '',
      textContent: '',
      innerHTML: '',
      style: new Proxy(styles, {
        get: (_t: any, prop: string) => {
          if (prop === 'cssText') {
            return Object.entries(styles).filter(([k]) => k !== 'cssText').map(([k, v]) => `${k}:${v}`).join(';');
          }
          return styles[prop] || '';
        },
        set: (_t: any, prop: string, value: any) => {
          if (prop === 'cssText' && typeof value === 'string') {
            value.split(';').filter(Boolean).forEach((rule: string) => {
              const parts = rule.split(':').map((s: string) => s.trim());
              if (parts.length >= 2) styles[parts[0]] = parts.slice(1).join(':');
            });
          } else {
            styles[prop] = value;
          }
          if (prop === 'display') { /* display set */ }
          return true;
        },
      }),
      children: [] as any[],
      classList: {
        _classes: new Set<string>(),
        add(c: string) { this._classes.add(c); },
        remove(c: string) { this._classes.delete(c); },
        toggle(c: string) {
          if (this._classes.has(c)) this._classes.delete(c); else this._classes.add(c);
          return this._classes.has(c);
        },
        contains(c: string) { return this._classes.has(c); },
      },
      addEventListener: vi.fn(),
      appendChild: vi.fn((child: any) => { el.children.push(child); }),
      remove: vi.fn(),
      click: vi.fn(),
    };
    return el;
  }

  const sandbox: any = {
    document: {
      createElement,
      getElementById: vi.fn((id: string) => {
        if (!elements[id]) {
          const el = createElement('div');
          el.id = id;
          elements[id] = el;
        }
        return elements[id];
      }),
      body: {
        appendChild: vi.fn((child: any) => {
          if (child.id) elements[child.id] = child;
        }),
        classList: {
          _classes: new Set<string>(),
          toggle(c: string) {
            if (this._classes.has(c)) this._classes.delete(c); else this._classes.add(c);
            return this._classes.has(c);
          },
          contains(c: string) { return this._classes.has(c); },
        },
      },
      readyState: 'complete',
      addEventListener: vi.fn(),
    },
    window: {
      logger: {
        error: vi.fn(),
        warn: vi.fn(),
        info: vi.fn(),
        debug: vi.fn(),
      },
      addEventListener: vi.fn((event: string, handler: (..._args: any[]) => void) => {
        eventHandlers[event] = handler;
      }),
      location: { reload: vi.fn() },
    },
    console: { log: vi.fn(), warn: vi.fn(), error: vi.fn(), info: vi.fn(), debug: vi.fn() },
    Error,
    TypeError,
    String,
    parseInt,
    parseFloat,
    isNaN,
    undefined: undefined,
  };

  const ctx = createContext(sandbox);
  return { ctx, elements, eventHandlers, sandbox };
}

describe('error-boundary', () => {
  let eb: ReturnType<typeof createErrorBoundarySandbox>;

  beforeEach(() => {
    vi.clearAllMocks();
    eb = createErrorBoundarySandbox();
  });

  it('creates error boundary overlay in DOM', () => {
    runInContext(errorBoundarySource, eb.ctx);

    expect(eb.sandbox.document.body.appendChild).toHaveBeenCalled();
    const appendedEl = eb.sandbox.document.body.appendChild.mock.calls[0][0];
    expect(appendedEl).toBeDefined();
  });

  it('has reload and dismiss buttons', () => {
    runInContext(errorBoundarySource, eb.ctx);

    const reloadBtn = eb.elements['error-boundary-reload'];
    const dismissBtn = eb.elements['error-boundary-dismiss'];
    expect(reloadBtn).toBeDefined();
    expect(dismissBtn).toBeDefined();
  });

  it('dismiss button hides overlay', () => {
    runInContext(errorBoundarySource, eb.ctx);

    const dismissBtn = eb.elements['error-boundary-dismiss'];
    expect(dismissBtn).toBeDefined();

    const addedElements = eb.sandbox.document.body.appendChild.mock.calls.map((c: any[]) => c[0]);
    const overlay = addedElements.find((el: any) => el.id === 'error-boundary-overlay');

    dismissBtn.addEventListener.mock.calls[0][1]();

    expect(overlay.style.display).toBe('none');
  });

  it('logs error to logger when window.error fires', () => {
    runInContext(errorBoundarySource, eb.ctx);

    const handler = eb.eventHandlers['error'];
    expect(handler).toBeDefined();

    const event = {
      message: 'Test error',
      filename: 'test.js',
      lineno: 42,
      colno: 10,
      error: new Error('Test error'),
      preventDefault: vi.fn(),
    };

    handler(event);

    expect(event.preventDefault).toHaveBeenCalled();
    expect(eb.sandbox.window.logger.error).toHaveBeenCalled();
    const callArgs = (eb.sandbox.window.logger.error as any).mock.calls[0];
    expect(callArgs[0]).toContain('Test error');
    expect(callArgs[1]).toBe('error-boundary');
  });

  it('logs unhandled rejection to logger', () => {
    runInContext(errorBoundarySource, eb.ctx);

    const handler = eb.eventHandlers['unhandledrejection'];
    expect(handler).toBeDefined();

    const event = {
      reason: new Error('Promise failed'),
      preventDefault: vi.fn(),
    };

    handler(event);

    expect(event.preventDefault).toHaveBeenCalled();
    expect(eb.sandbox.window.logger.error).toHaveBeenCalled();
  });

  it('handles unhandledrejection with string reason', () => {
    runInContext(errorBoundarySource, eb.ctx);

    const handler = eb.eventHandlers['unhandledrejection'];
    const event = {
      reason: 'string error',
      preventDefault: vi.fn(),
    };

    handler(event);

    expect(eb.sandbox.window.logger.error).toHaveBeenCalled();
  });

  it('shows error message in overlay', () => {
    runInContext(errorBoundarySource, eb.ctx);

    const handler = eb.eventHandlers['error'];
    const event = {
      message: 'UI crash',
      filename: '',
      lineno: 0,
      colno: 0,
      error: null,
      preventDefault: vi.fn(),
    };

    handler(event);

    const msgEl = eb.elements['error-boundary-message'];
    expect(msgEl).toBeDefined();
    expect(msgEl.textContent).toContain('UI crash');
  });

  it('does nothing when document is undefined', () => {
    const ctxNoDoc = createContext({
      window: {},
      console: { log: vi.fn(), warn: vi.fn(), error: vi.fn(), info: vi.fn(), debug: vi.fn() },
      Error,
      String,
      undefined: undefined,
    });
    expect(() => runInContext(errorBoundarySource, ctxNoDoc)).not.toThrow();
  });
});
