/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const files = [
  'index.html',
  'styles.css',
  'app.js',
  'data.js',
  'supabase-config.js',
  'dev-server.cjs',
  'shared/auth.js',
  'shared/logger.js',
  'shared/error-boundary.js',
  'shared/audit.js',
  'views/login.js',
  'views/dashboard.js',
  'views/funil.js',
  'views/gerador.js',
  'views/catalogo.js',
  'views/relatorios.js',
  'views/parceiros.js',
];

const exportData = {
  projectName: 'ENERGIZA CRM',
  exportDate: new Date().toISOString(),
  files: {},
  supabaseMigrations: {},
  seedData: null,
};

for (const f of files) {
  const fp = path.join(ROOT, f);
  if (fs.existsSync(fp)) {
    exportData.files[f] = fs.readFileSync(fp, 'utf8');
  }
}

const migrationDir = path.join(ROOT, 'supabase-migrations');
if (fs.existsSync(migrationDir)) {
  for (const m of fs.readdirSync(migrationDir).filter(x => x.endsWith('.sql')).sort()) {
    exportData.supabaseMigrations[m] = fs.readFileSync(path.join(migrationDir, m), 'utf8');
  }
}

const outPath = path.join(ROOT, 'export-crm-energiza.json');
fs.writeFileSync(outPath, JSON.stringify(exportData, null, 2), 'utf8');
console.log('Exportado para: ' + outPath);
console.log('Arquivos: ' + Object.keys(exportData.files).length);
console.log('Migrations: ' + Object.keys(exportData.supabaseMigrations).length);
