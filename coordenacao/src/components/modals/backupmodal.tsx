import { useState } from 'react';
import { X, Download, Upload, Trash2, FileJson } from 'lucide-react';
import { exportBackup, importBackup, clearAll } from '../../store';

interface BackupModalProps {
  onClose: () => void;
}

export function BackupModal({ onClose }: BackupModalProps) {
  const [msg, setMsg] = useState('');
  const [confirmClear, setConfirmClear] = useState(false);

  const handleExport = () => {
    const json = exportBackup();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `backup-coordenacao-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setMsg('Backup exportado com sucesso!');
  };

  const handleImport = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        const ok = importBackup(ev.target?.result as string);
        setMsg(ok ? 'Backup restaurado com sucesso!' : 'Erro: arquivo inválido.');
      };
      reader.readAsText(file);
    };
    input.click();
  };

  const handleClear = () => {
    if (!confirmClear) {
      setConfirmClear(true);
      return;
    }
    clearAll();
    setMsg('Dados limpos. Recarregue a página.');
    setConfirmClear(false);
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center px-4" onClick={onClose}>
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-sm shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b border-slate-700/50">
          <h2 className="text-lg font-bold text-white">Backup & Dados</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-700 transition-colors">
            <X size={18} />
          </button>
        </div>
        <div className="p-4 space-y-3">
          <button onClick={handleExport} className="w-full flex items-center gap-3 p-3 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700/50 transition-colors text-left">
            <Download size={20} className="text-indigo-400" />
            <div>
              <div className="text-sm font-medium text-white">Exportar JSON</div>
              <div className="text-xs text-slate-500">Download de todos os dados</div>
            </div>
          </button>
          <button onClick={handleImport} className="w-full flex items-center gap-3 p-3 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700/50 transition-colors text-left">
            <Upload size={20} className="text-emerald-400" />
            <div>
              <div className="text-sm font-medium text-white">Restaurar backup</div>
              <div className="text-xs text-slate-500">Importar arquivo JSON</div>
            </div>
          </button>
          <button
            onClick={handleClear}
            className="w-full flex items-center gap-3 p-3 rounded-xl bg-slate-800 hover:bg-red-500/10 border border-slate-700/50 hover:border-red-500/30 transition-colors text-left"
          >
            <Trash2 size={20} className="text-red-400" />
            <div>
              <div className="text-sm font-medium text-white">{confirmClear ? 'Confirmar limpeza?' : 'Limpar dados'}</div>
              <div className="text-xs text-slate-500">{confirmClear ? 'Clique novamente para apagar tudo' : 'Restaurar dados de fábrica'}</div>
            </div>
          </button>
          {msg && <p className="text-sm text-emerald-400 text-center pt-2">{msg}</p>}
        </div>
      </div>
    </div>
  );
}
