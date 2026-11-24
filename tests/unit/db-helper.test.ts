import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import vm from 'vm';

const dataSource = readFileSync(resolve(__dirname, '../../data.js'), 'utf-8');

function createMockStorage() {
  const store: Record<string, string> = {};
  return {
    store,
    mock: {
      getItem: vi.fn((k: string) => store[k] ?? null),
      setItem: vi.fn((k: string, v: string) => { store[k] = v; }),
      removeItem: vi.fn((k: string) => { delete store[k]; }),
      clear: vi.fn(() => { Object.keys(store).forEach(k => delete store[k]); }),
      get length() { return Object.keys(store).length; },
      key: vi.fn(() => null),
    } as any,
  };
}

function loadDBInVm(storage: any) {
  const sandbox: any = {
    console: { log: vi.fn(), warn: vi.fn(), error: vi.fn(), info: vi.fn(), debug: vi.fn() },
    localStorage: storage,
    crypto: { randomUUID: () => 'uuid-' + Math.random().toString(36).slice(2, 10) },
    window: {
      location: { hostname: 'localhost', search: '' },
      supabaseClient: null,
      crypto: { randomUUID: () => 'uuid-' + Math.random().toString(36).slice(2, 8) },
    },
    toast: vi.fn(),
    setTimeout: (fn: (..._args: any[]) => void) => { fn(); return 1; },
    clearTimeout: vi.fn(),
    Date,
    JSON,
    Array,
    Object,
    Set,
    Map,
    Math,
    Number,
    String,
    RegExp,
    Error,
    TypeError,
    parseInt,
    parseFloat,
    isNaN,
    encodeURIComponent,
    decodeURIComponent,
    NaN,
    Infinity,
    undefined: undefined,
    DOMParser: class { parseFromString() { return {}; } },
  };
  const ctx = vm.createContext(sandbox);
  const patched = dataSource.replace(/^const /gm, 'var ');
  vm.runInContext(patched, ctx);
  return ctx.DB;
}

describe('DB helper', () => {
  let store: Record<string, string>;
  let mockStorage: any;

  beforeEach(() => {
    vi.clearAllMocks();
    const s = createMockStorage();
    store = s.store;
    mockStorage = s.mock;
  });

  it('DB public API has expected shape', () => {
    const DB = loadDBInVm(mockStorage);
    expect(DB).toBeDefined();
    expect(typeof DB.getProdutos).toBe('function');
    expect(typeof DB.getPropostas).toBe('function');
    expect(typeof DB.addProposta).toBe('function');
    expect(typeof DB.updateProposta).toBe('function');
    expect(typeof DB.deleteProposta).toBe('function');
    expect(typeof DB.getClients).toBe('function');
    expect(typeof DB.remote).toBe('object');
    expect(typeof DB.ensureSeed).toBe('function');
    expect(typeof DB.totalProposta).toBe('function');
    expect(typeof DB.STATUS).toBe('object');
    expect(Array.isArray(DB.STATUS_ORDER)).toBe(true);
    expect(Array.isArray(DB.CATEGORIAS)).toBe(true);
  });

  it('STATUS has all expected keys', () => {
    const DB = loadDBInVm(mockStorage);
    expect(DB.STATUS).toHaveProperty('aberto');
    expect(DB.STATUS).toHaveProperty('precificacao');
    expect(DB.STATUS).toHaveProperty('enviada');
    expect(DB.STATUS).toHaveProperty('negociacao');
    expect(DB.STATUS).toHaveProperty('ganho');
    expect(DB.STATUS).toHaveProperty('perdido');
  });

  it('STATUS_ORDER has 6 entries in correct order', () => {
    const DB = loadDBInVm(mockStorage);
    expect(DB.STATUS_ORDER).toEqual(['aberto', 'precificacao', 'enviada', 'negociacao', 'ganho', 'perdido']);
  });

  it('ensureSeed populates products in localStorage', () => {
    const DB = loadDBInVm(mockStorage);
    DB.ensureSeed();
    expect(store['metrolab_produtos']).toBeDefined();
    const produtos = JSON.parse(store['metrolab_produtos']);
    expect(Array.isArray(produtos)).toBe(true);
    expect(produtos.length).toBeGreaterThan(0);
    expect(produtos[0].id).toBe('P001');
  });

  it('ensureSeed does not overwrite existing data', () => {
    store['metrolab_produtos'] = JSON.stringify([{ id: 'CUSTOM', nome: 'Custom' }]);
    const DB = loadDBInVm(mockStorage);
    DB.ensureSeed();
    const produtos = JSON.parse(store['metrolab_produtos']);
    expect(produtos[0].id).toBe('CUSTOM');
  });

  it('ensureSeed with force=true overwrites', () => {
    store['metrolab_produtos'] = JSON.stringify([{ id: 'CUSTOM', nome: 'Custom' }]);
    const DB = loadDBInVm(mockStorage);
    DB.ensureSeed(true);
    const produtos = JSON.parse(store['metrolab_produtos']);
    expect(produtos[0].id).toBe('P001');
  });

  it('getProdutos returns products after seed', () => {
    const DB = loadDBInVm(mockStorage);
    DB.ensureSeed();
    const produtos = DB.getProdutos();
    expect(produtos.length).toBeGreaterThan(0);
    expect(produtos[0]).toHaveProperty('nome');
    expect(produtos[0]).toHaveProperty('categoria');
    expect(produtos[0]).toHaveProperty('preco');
  });

  it('getPropostas returns array', () => {
    const DB = loadDBInVm(mockStorage);
    DB.ensureSeed();
    const propostas = DB.getPropostas();
    expect(Array.isArray(propostas)).toBe(true);
  });

  it('addProposta creates a new proposal', () => {
    const DB = loadDBInVm(mockStorage);
    DB.ensureSeed();
    const p = DB.addProposta({
      cliente: 'Test Client',
      contato: 'Test Contact',
      status: 'aberto',
      categoria: 'Calibração',
      itens: [{ produtoId: 'P001', nome: 'Test', preco: 100, qtd: 1 }],
    });
    expect(p.id).toBeDefined();
    expect(p.id).toMatch(/^PROP-/);
    expect(p.cliente).toBe('Test Client');
    expect(p.criadoEm).toBeDefined();
  });

  it('addProposta increments sequence', () => {
    const DB = loadDBInVm(mockStorage);
    DB.ensureSeed();
    const p1 = DB.addProposta({ cliente: 'C1', status: 'aberto', itens: [] });
    const p2 = DB.addProposta({ cliente: 'C2', status: 'aberto', itens: [] });
    expect(p1.id).not.toBe(p2.id);
  });

  it('updateProposta modifies fields', () => {
    const DB = loadDBInVm(mockStorage);
    DB.ensureSeed();
    const p = DB.addProposta({ cliente: 'Original', status: 'aberto', itens: [] });
    const updated = DB.updateProposta(p.id, { cliente: 'Updated' });
    expect(updated.cliente).toBe('Updated');
  });

  it('updateProposta returns null for non-existent id', () => {
    const DB = loadDBInVm(mockStorage);
    DB.ensureSeed();
    const result = DB.updateProposta('PROP-9999', { cliente: 'X' });
    expect(result).toBeNull();
  });

  it('getClients returns empty array initially', () => {
    const DB = loadDBInVm(mockStorage);
    const clients = DB.getClients();
    expect(Array.isArray(clients)).toBe(true);
    expect(clients.length).toBe(0);
  });

  it('totalProposta sums items correctly', () => {
    const DB = loadDBInVm(mockStorage);
    const p = { itens: [
      { preco: 100, qtd: 2 },
      { preco: 50, qtd: 3 },
    ]};
    expect(DB.totalProposta(p)).toBe(350);
  });

  it('totalProposta returns 0 for empty items', () => {
    const DB = loadDBInVm(mockStorage);
    expect(DB.totalProposta({ itens: [] })).toBe(0);
    expect(DB.totalProposta({})).toBe(0);
  });

  it('remote.status returns offline when no supabaseClient', () => {
    const DB = loadDBInVm(mockStorage);
    expect(DB.remote.status()).toBe('offline');
  });

  it('remote.ready returns false when no supabaseClient', () => {
    const DB = loadDBInVm(mockStorage);
    expect(DB.remote.ready()).toBe(false);
  });

  it('CATEGORIAS contains expected categories', () => {
    const DB = loadDBInVm(mockStorage);
    expect(DB.CATEGORIAS).toContain('Calibração');
    expect(DB.CATEGORIAS).toContain('Sensores SPO2');
    expect(DB.CATEGORIAS).toContain('Laudos Técnicos');
  });

  it('upsertProduto adds new product', () => {
    const DB = loadDBInVm(mockStorage);
    DB.ensureSeed();
    const p = DB.upsertProduto({ nome: 'New Product', categoria: 'Test', preco: 100 });
    expect(p.id).toBeDefined();
    expect(p.id).toMatch(/^P/);
  });

  it('deleteProduto removes product', () => {
    const DB = loadDBInVm(mockStorage);
    DB.ensureSeed();
    DB.deleteProduto('P001');
    const produtos = DB.getProdutos();
    expect(produtos.find((x: any) => x.id === 'P001')).toBeUndefined();
  });
});
