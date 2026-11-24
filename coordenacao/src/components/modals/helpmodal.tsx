import { X, Calendar, LayoutGrid, List, Bell, Cloud, Smartphone, Monitor } from 'lucide-react';

interface HelpModalProps {
  onClose: () => void;
}

export function HelpModal({ onClose }: HelpModalProps) {
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-start justify-center pt-8 md:pt-16 px-4" onClick={onClose}>
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg max-h-[85vh] overflow-y-auto shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b border-slate-700/50">
          <h2 className="text-lg font-bold text-white">Manual do Usuário</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-700 transition-colors">
            <X size={18} />
          </button>
        </div>
        <div className="p-4 space-y-5 text-sm text-slate-300">
          <section>
            <h3 className="text-white font-bold mb-2 flex items-center gap-2"><Calendar size={16} className="text-indigo-400" /> Agenda / Calendário</h3>
            <ul className="space-y-1 list-disc list-inside text-slate-400">
              <li>Alterne entre visualização <strong className="text-white">Mês</strong>, <strong className="text-white">Semana</strong> e <strong className="text-white">Dia</strong>.</li>
              <li>Clique em qualquer dia para criar uma tarefa com a data pré-preenchida.</li>
              <li>Use o botão "Hoje" para voltar rapidamente à data corrente.</li>
              <li>Compromissos aparecem como cartões coloridos com horário e local.</li>
            </ul>
          </section>
          <section>
            <h3 className="text-white font-bold mb-2 flex items-center gap-2"><LayoutGrid size={16} className="text-indigo-400" /> Quadro Kanban</h3>
            <ul className="space-y-1 list-disc list-inside text-slate-400">
              <li>Três colunas: <strong className="text-white">A Fazer</strong>, <strong className="text-white">Em Andamento</strong> e <strong className="text-white">Concluído</strong>.</li>
              <li>Arraste cartões entre colunas ou use os botões de seta.</li>
              <li>Cada cartão mostra categoria, prioridade, vencimento e progresso do checklist.</li>
            </ul>
          </section>
          <section>
            <h3 className="text-white font-bold mb-2 flex items-center gap-2"><List size={16} className="text-indigo-400" /> Lista de Tarefas</h3>
            <ul className="space-y-1 list-disc list-inside text-slate-400">
              <li>Visão completa para auditoria de todas as demandas.</li>
              <li>Filtre por <strong className="text-white">Categoria</strong>, <strong className="text-white">Status</strong>, <strong className="text-white">Prioridade</strong> ou busque por texto.</li>
              <li>Clique em uma linha para editar os detalhes.</li>
            </ul>
          </section>
          <section>
            <h3 className="text-white font-bold mb-2 flex items-center gap-2"><Bell size={16} className="text-indigo-400" /> Alertas</h3>
            <ul className="space-y-1 list-disc list-inside text-slate-400">
              <li><strong className="text-red-400">Atrasadas:</strong> tarefas com prazo estourado.</li>
              <li><strong className="text-amber-400">Vencendo Hoje:</strong> precisam de atenção hoje.</li>
              <li><strong className="text-cyan-400">Próximos 2 Dias:</strong> agenda de curto prazo.</li>
            </ul>
          </section>
          <section>
            <h3 className="text-white font-bold mb-2 flex items-center gap-2"><Cloud size={16} className="text-indigo-400" /> Sincronização entre dispositivos</h3>
            <ul className="space-y-1 list-disc list-inside text-slate-400">
              <li>Os dados ficam salvos no navegador (localStorage).</li>
              <li>Use <strong className="text-white">Backup & Dados</strong> para exportar/importar JSON entre celular e computador.</li>
              <li>A sincronização automática com nuvem (PostgreSQL) estará disponível em breve.</li>
            </ul>
          </section>
          <section>
            <h3 className="text-white font-bold mb-2 flex items-center gap-2"><Monitor size={16} className="text-indigo-400" /> Categorias</h3>
            <ul className="space-y-1 list-disc list-inside text-slate-400">
              <li><span className="text-red-400 font-medium">Crises & Escalações:</span> equipamentos parados, cobranças urgentes.</li>
              <li><span className="text-purple-400 font-medium">Calibrações & Contratos:</span> OS in loco, envio de padrões, logística.</li>
              <li><span className="text-amber-400 font-medium">Financeiro & Compras:</span> liberação de compra, faturamento.</li>
              <li><span className="text-cyan-400 font-medium">Comercial & Orçamentos:</span> propostas pendentes, orçamentos travados.</li>
              <li><span className="text-emerald-400 font-medium">RH & Equipe Técnica:</span> escala, faltas, treinamentos.</li>
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
}
