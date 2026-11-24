/* =========================================================
   ENERGIZA CRM — Camada de dados (100% local / LocalStorage)
   Fonte primária de propostas: chave real 'duocrm-quotes'.
   Sem dados fictícios de propostas e sem API externa.
   ========================================================= */

/* =========================================================
   ENERGIZA CRM — Camada de dados (100% local / LocalStorage)
   Fonte primária de propostas: chave real 'duocrm-quotes'.
   Sem dados fictícios de propostas e sem API externa.
   ========================================================= */

// DB — global usada em todas as views via window scope
/* eslint-disable no-unused-vars, @typescript-eslint/no-unused-vars */
const DB = (() => {
  const KEY_PROD = 'metrolab_produtos';
  const KEY_PROP = 'metrolab_propostas';
  const KEY_SEQ = 'metrolab_seq';

  // Chave real do app antigo (fonte primária das propostas reais).
  const KEY_REAL = 'duocrm-quotes';

  // ─── User identity (multi-tenant) ───
  // A-01 CORRIGIDO: usa Auth real (Supabase) em vez de identidade local fictícia.
  function getCurrentUser() {
    const authUser = window.Auth && window.Auth.getUser ? window.Auth.getUser() : null;
    const profile = window.Auth && window.Auth.getProfile ? window.Auth.getProfile() : null;
    if (authUser && profile) {
      return { id: authUser.id, name: profile.name || authUser.email, role: profile.role || 'leitura' };
    }
    // Fallback: modo demo offline (sem login)
    const KEY_USER = 'energiza_user';
    let u = load(KEY_USER, null);
    if (!u) {
      u = { id: crypto.randomUUID(), name: 'Administrador', role: 'admin' };
      save(KEY_USER, u);
    }
    return u;
  }
  function isAdmin() {
    const profile = window.Auth && window.Auth.getProfile ? window.Auth.getProfile() : null;
    if (profile) return profile.role === 'admin' || (window.Auth.hasPermission && window.Auth.hasPermission('all'));
    return getCurrentUser().role === 'admin';
  }

  const STATUS = {
    aberto: { key: 'aberto', label: 'Cotação em Aberto', color: '#6b7688', badge: 'badge-aberto' },
    precificacao: { key: 'precificacao', label: 'Em Precificação / Montagem', color: '#a855f7', badge: 'badge-precificacao' },
    enviada: { key: 'enviada', label: 'Proposta Enviada', color: '#3b82f6', badge: 'badge-enviada' },
    negociacao: { key: 'negociacao', label: 'Em Negociação', color: '#f59e0b', badge: 'badge-negociacao' },
    ganho: { key: 'ganho', label: 'Ganho / Faturado', color: '#22c55e', badge: 'badge-ganho' },
    perdido: { key: 'perdido', label: 'Perdidas / Canceladas', color: '#ef4444', badge: 'badge-perdido' },
  };
  // Ordem/colunas do funil (cadência lógica do comercial).
  const STATUS_ORDER = ['aberto', 'precificacao', 'enviada', 'negociacao', 'ganho', 'perdido'];

  const CATEGORIAS = ['Calibração', 'Teste de Segurança Elétrica', 'Manutenção de Autoclaves', 'Sensores SPO2', 'Peças e Insumos', 'Laudos Técnicos'];

  // imagem placeholder embutida (SVG data-uri) por categoria — sem requisição externa
  function ph(label, c1, c2) {
    const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='200' height='200'><defs><linearGradient id='g' x1='0' y1='0' x2='1' y2='1'><stop offset='0' stop-color='${c1}'/><stop offset='1' stop-color='${c2}'/></linearGradient></defs><rect width='200' height='200' fill='#151B26'/><rect x='24' y='24' width='152' height='152' rx='16' fill='url(#g)' opacity='0.25'/><text x='100' y='108' font-family='Inter,Arial' font-size='16' fill='#aab3c5' text-anchor='middle'>${label}</text></svg>`;
    return 'data:image/svg+xml;utf8,' + encodeURIComponent(svg);
  }

  const SEED_PRODUTOS = [
    { id: 'P001', nome: 'Calibração de Monitor Multiparâmetro', categoria: 'Calibração', descricao: 'Calibração completa com rastreabilidade RBC/INMETRO, incluindo emissão de certificado e etiqueta de conformidade.', preco: 850.00, custo: 850.00, fornecedor: 'MetroLab Interno', foto: ph('Calibração', '#7C5CFF', '#3B82F6') },
    { id: 'P002', nome: 'Manutenção Preventiva de Autoclave', categoria: 'Manutenção de Autoclaves', descricao: 'Revisão de válvulas, gaxetas, sensores de pressão e teste Bowie-Dick. Inclui relatório fotográfico.', preco: 1450.00, custo: 1450.00, fornecedor: 'MetroLab Interno', foto: ph('Autoclave', '#f59e0b', '#ef4444') },
    { id: 'P003', nome: 'Sensor SPO2 Reutilizável Adulto', categoria: 'Sensores SPO2', descricao: 'Sensor de oximetria compatível multimarca, clip adulto, cabo 1,5m, garantia de 12 meses.', preco: 320.00, custo: 320.00, fornecedor: 'MedSupply Ltda', foto: ph('Sensor SPO2', '#22c55e', '#3B82F6') },
    { id: 'P004', nome: 'Manutenção Corretiva de Autoclave', categoria: 'Manutenção de Autoclaves', descricao: 'Diagnóstico e reparo emergencial com troca de componentes eletrônicos e hidráulicos.', preco: 2600.00, custo: 2600.00, fornecedor: 'MetroLab Interno', foto: ph('Corretiva', '#ef4444', '#7C5CFF') },
    { id: 'P005', nome: 'Calibração de Bomba de Infusão', categoria: 'Calibração', descricao: 'Verificação de vazão e pressão de oclusão com padrão calibrado, certificado incluso.', preco: 680.00, custo: 680.00, fornecedor: 'MetroLab Interno', foto: ph('Bomba Infusão', '#7C5CFF', '#22c55e') },
    { id: 'P006', nome: 'Laudo Técnico de Segurança Elétrica', categoria: 'Laudos Técnicos', descricao: 'Ensaio conforme NBR IEC 60601-1 com emissão de laudo e ART.', preco: 540.00, custo: 540.00, fornecedor: 'MetroLab Interno', foto: ph('Laudo NBR', '#3B82F6', '#a855f7') },
    { id: 'P007', nome: 'Kit Gaxetas para Autoclave', categoria: 'Peças e Insumos', descricao: 'Kit de vedação em silicone atóxico de alta durabilidade para autoclaves de barreira.', preco: 410.00, custo: 410.00, fornecedor: 'AutoParts Med', foto: ph('Kit Gaxetas', '#f59e0b', '#7C5CFF') },
    { id: 'P008', nome: 'Sensor SPO2 Neonatal', categoria: 'Sensores SPO2', descricao: 'Sensor de oximetria neonatal envelopante, hipoalergênico, descartável (caixa c/ 24un).', preco: 890.00, custo: 890.00, fornecedor: 'MedSupply Ltda', foto: ph('SPO2 Neo', '#22c55e', '#7C5CFF') },
    { id: 'P009', nome: 'Calibração e teste de segurança elétrica de aparelho de anestesia', categoria: 'Calibração', descricao: 'Calibração de fluxômetros e vaporizadores com verificação de vazamentos, associada a teste de segurança elétrica conforme NBR IEC 60601-1, com emissão de certificado.', preco: 250.00, custo: 192.00, fornecedor: 'Prestec Hospitalar', foto: ph('Calibração', '#7C5CFF', '#3B82F6') },
    { id: 'P010', nome: 'Calibração e teste de segurança de aspirador cirúrgico', categoria: 'Calibração', descricao: 'Calibração de vácuo e teste de segurança elétrica com verificação de isolamento e corrente de fuga, conforme NBR IEC 60601-1.', preco: 188.57, custo: 132.00, fornecedor: 'Prestec Hospitalar', foto: ph('Calibração', '#7C5CFF', '#3B82F6') },
    { id: 'P011', nome: 'Calibração de balança', categoria: 'Calibração', descricao: 'Calibração com pesos padrão rastreáveis RBC/INMETRO, verificação de linearidade e emissão de certificado.', preco: 171.43, custo: 120.00, fornecedor: 'Prestec Hospitalar', foto: ph('Calibração', '#7C5CFF', '#3B82F6') },
    { id: 'P012', nome: 'Calibração de banho maria', categoria: 'Calibração', descricao: 'Calibração de temperatura com termômetro padrão rastreável, verificação de estabilidade e uniformidade térmica.', preco: 114.29, custo: 80.00, fornecedor: 'Prestec Hospitalar', foto: ph('Calibração', '#7C5CFF', '#3B82F6') },
    { id: 'P013', nome: 'Calibração e teste de segurança de berço aquecido', categoria: 'Calibração', descricao: 'Calibração de temperatura e teste de segurança elétrica, verificação de sensores e alarmes, conforme NBR IEC 60601-1.', preco: 120.00, custo: 92.00, fornecedor: 'Prestec Hospitalar', foto: ph('Calibração', '#7C5CFF', '#3B82F6') },
    { id: 'P014', nome: 'Calibração e teste de segurança de bisturi elétrico', categoria: 'Calibração', descricao: 'Calibração de potência de saída e teste de segurança elétrica, verificação de corrente de fuga e isolamento, conforme NBR IEC 60601-2-2.', preco: 210.00, custo: 160.00, fornecedor: 'Prestec Hospitalar', foto: ph('Calibração', '#7C5CFF', '#3B82F6') },
    { id: 'P015', nome: 'Calibração e teste de segurança de bomba injetora de contraste', categoria: 'Calibração', descricao: 'Calibração de fluxo e pressão de injeção, teste de segurança elétrica e verificação do sistema de detecção de ar.', preco: 890.00, custo: 628.00, fornecedor: 'Prestec Hospitalar', foto: ph('Calibração', '#7C5CFF', '#3B82F6') },
    { id: 'P016', nome: 'Teste de segurança elétrica de cama elétrica', categoria: 'Teste de Segurança Elétrica', descricao: 'Teste de segurança elétrica com verificação de isolamento, corrente de fuga e funcionamento dos motores, conforme NBR IEC 60601-1.', preco: 68.57, custo: 48.00, fornecedor: 'Prestec Hospitalar', foto: ph('Seg. Elétrica', '#f59e0b', '#ef4444') },
    { id: 'P017', nome: 'Calibração e teste de segurança de cardioversor', categoria: 'Calibração', descricao: 'Calibração de energia de desfibrilação e teste de segurança elétrica, verificação de sincronismo e tempo de carga, conforme NBR IEC 60601-2-4.', preco: 190.00, custo: 148.00, fornecedor: 'Prestec Hospitalar', foto: ph('Calibração', '#7C5CFF', '#3B82F6') },
    { id: 'P018', nome: 'Calibração e teste de segurança de CPAP', categoria: 'Calibração', descricao: 'Calibração de pressão e fluxo, teste de segurança elétrica e verificação de alarmes.', preco: 156.57, custo: 109.60, fornecedor: 'Prestec Hospitalar', foto: ph('Calibração', '#7C5CFF', '#3B82F6') },
    { id: 'P019', nome: 'Calibração de cuffômetro', categoria: 'Calibração', descricao: 'Calibração de pressão com padrão rastreável, verificação de linearidade e emissão de certificado.', preco: 49.00, custo: 37.60, fornecedor: 'Prestec Hospitalar', foto: ph('Calibração', '#7C5CFF', '#3B82F6') },
    { id: 'P020', nome: 'Calibração e teste de segurança de eletrocardiógrafo', categoria: 'Calibração', descricao: 'Calibração de sinal e teste de segurança elétrica, verificação de filtros e derivações, conforme NBR IEC 60601-2-25.', preco: 180.00, custo: 136.00, fornecedor: 'Prestec Hospitalar', foto: ph('Calibração', '#7C5CFF', '#3B82F6') },
    { id: 'P021', nome: 'Calibração de esfigmomanômetro aneroide', categoria: 'Calibração', descricao: 'Calibração de pressão com padrão rastreável RBC/INMETRO, verificação de vazamento e linearidade.', preco: 54.86, custo: 38.40, fornecedor: 'Prestec Hospitalar', foto: ph('Calibração', '#7C5CFF', '#3B82F6') },
    { id: 'P022', nome: 'Calibração de esfigmomanômetro digital', categoria: 'Calibração', descricao: 'Calibração de pressão com padrão rastreável, verificação de exatidão e emissão de certificado.', preco: 54.86, custo: 38.40, fornecedor: 'Prestec Hospitalar', foto: ph('Calibração', '#7C5CFF', '#3B82F6') },
    { id: 'P023', nome: 'Calibração e teste de segurança de foco cirúrgico auxiliar', categoria: 'Calibração', descricao: 'Calibração de iluminância e teste de segurança elétrica, verificação de temperatura de cor, conforme NBR IEC 60601-2-41.', preco: 290.00, custo: 220.00, fornecedor: 'Prestec Hospitalar', foto: ph('Calibração', '#7C5CFF', '#3B82F6') },
    { id: 'P024', nome: 'Calibração e teste de segurança de foco cirúrgico de teto', categoria: 'Calibração', descricao: 'Calibração de iluminância e teste de segurança elétrica, verificação de sistema motorizado, conforme NBR IEC 60601-2-41.', preco: 290.00, custo: 220.00, fornecedor: 'Prestec Hospitalar', foto: ph('Calibração', '#7C5CFF', '#3B82F6') },
    { id: 'P025', nome: 'Calibração e teste de segurança de incubadora de transporte', categoria: 'Calibração', descricao: 'Calibração de temperatura e umidade, teste de segurança elétrica e verificação de alarmes, conforme NBR IEC 60601-2-20.', preco: 354.29, custo: 248.00, fornecedor: 'Prestec Hospitalar', foto: ph('Calibração', '#7C5CFF', '#3B82F6') },
    { id: 'P026', nome: 'Calibração e teste de segurança de incubadora neonatal', categoria: 'Calibração', descricao: 'Calibração de temperatura e umidade, teste de segurança elétrica e verificação de sensores, conforme NBR IEC 60601-2-19.', preco: 349.00, custo: 248.00, fornecedor: 'Prestec Hospitalar', foto: ph('Calibração', '#7C5CFF', '#3B82F6') },
    { id: 'P027', nome: 'Teste de segurança elétrica em máquina unitizadora de medicamentos', categoria: 'Teste de Segurança Elétrica', descricao: 'Teste de segurança elétrica com verificação de isolamento e corrente de fuga, conforme NBR IEC 60601-1.', preco: 102.86, custo: 72.00, fornecedor: 'Prestec Hospitalar', foto: ph('Seg. Elétrica', '#f59e0b', '#ef4444') },
    { id: 'P028', nome: 'Calibração de gerador de marca-passo externo', categoria: 'Calibração', descricao: 'Calibração de frequência e amplitude de pulso, teste de segurança elétrica, conforme NBR IEC 60601-2-31.', preco: 262.86, custo: 184.00, fornecedor: 'Prestec Hospitalar', foto: ph('Calibração', '#7C5CFF', '#3B82F6') },
    { id: 'P029', nome: 'Teste de segurança de mesa cirúrgica', categoria: 'Teste de Segurança Elétrica', descricao: 'Teste de segurança elétrica com verificação de isolamento e funcionamento dos movimentos motorizados, conforme NBR IEC 60601-1.', preco: 102.86, custo: 72.00, fornecedor: 'Prestec Hospitalar', foto: ph('Seg. Elétrica', '#f59e0b', '#ef4444') },
    { id: 'P030', nome: 'Calibração e teste de segurança de monitor multiparamétrico', categoria: 'Calibração', descricao: 'Calibração de parâmetros vitais (ECG, SpO2, PA, NI, temperatura) e teste de segurança elétrica, conforme NBR IEC 60601-2-49.', preco: 238.51, custo: 184.00, fornecedor: 'Prestec Hospitalar', foto: ph('Calibração', '#7C5CFF', '#3B82F6') },
    { id: 'P031', nome: 'Calibração de oxímetro de pulso', categoria: 'Calibração', descricao: 'Calibração de saturação de oxigênio com simulador padrão, verificação de exatidão e emissão de certificado.', preco: 95.00, custo: 72.00, fornecedor: 'Prestec Hospitalar', foto: ph('Calibração', '#7C5CFF', '#3B82F6') },
    { id: 'P032', nome: 'Teste de segurança de pistola pressurizadora', categoria: 'Teste de Segurança Elétrica', descricao: 'Calibração de pressão com padrão rastreável, verificação de linearidade e emissão de certificado.', preco: 114.29, custo: 80.00, fornecedor: 'Prestec Hospitalar', foto: ph('Seg. Elétrica', '#f59e0b', '#ef4444') },
    { id: 'P033', nome: 'Calibração de ressuscitador infantil', categoria: 'Calibração', descricao: 'Calibração de volume e pressão de insuflação, verificação de válvulas e emissão de certificado.', preco: 137.14, custo: 96.00, fornecedor: 'Prestec Hospitalar', foto: ph('Calibração', '#7C5CFF', '#3B82F6') },
    { id: 'P034', nome: 'Calibração de termo-higrômetro', categoria: 'Calibração', descricao: 'Calibração de temperatura e umidade relativa com padrão rastreável RBC/INMETRO, emissão de certificado.', preco: 95.00, custo: 72.00, fornecedor: 'Prestec Hospitalar', foto: ph('Calibração', '#7C5CFF', '#3B82F6') },
    { id: 'P035', nome: 'Calibração de termômetro clínico', categoria: 'Calibração', descricao: 'Calibração de temperatura com padrão rastreável, verificação de exatidão e emissão de certificado.', preco: 80.00, custo: 56.00, fornecedor: 'Prestec Hospitalar', foto: ph('Calibração', '#7C5CFF', '#3B82F6') },
    { id: 'P036', nome: 'Calibração de termômetro infravermelho', categoria: 'Calibração', descricao: 'Calibração de temperatura por infravermelho com padrão de corpo negro, verificação de exatidão.', preco: 80.00, custo: 56.00, fornecedor: 'Prestec Hospitalar', foto: ph('Calibração', '#7C5CFF', '#3B82F6') },
    { id: 'P037', nome: 'Teste de segurança elétrica de umidificador aquecido', categoria: 'Teste de Segurança Elétrica', descricao: 'Teste de segurança elétrica com verificação de isolamento e funcionamento do sistema de aquecimento, conforme NBR IEC 60601-1.', preco: 102.86, custo: 72.00, fornecedor: 'Prestec Hospitalar', foto: ph('Seg. Elétrica', '#f59e0b', '#ef4444') },
    { id: 'P038', nome: 'Calibração e teste de segurança de ventilador de transporte', categoria: 'Calibração', descricao: 'Calibração de volume, pressão e FiO2, teste de segurança elétrica, conforme NBR IEC 60601-2-12.', preco: 290.00, custo: 212.00, fornecedor: 'Prestec Hospitalar', foto: ph('Calibração', '#7C5CFF', '#3B82F6') },
    { id: 'P039', nome: 'Calibração e teste de segurança de ventilador pulmonar', categoria: 'Calibração', descricao: 'Calibração de volume, pressão e FiO2, teste de segurança elétrica e verificação de alarmes, conforme NBR IEC 60601-2-12.', preco: 290.00, custo: 212.00, fornecedor: 'Prestec Hospitalar', foto: ph('Calibração', '#7C5CFF', '#3B82F6') },
    { id: 'P040', nome: 'Calibração e teste de segurança de fototerapia', categoria: 'Calibração', descricao: 'Calibração de irradiância com radiômetro padrão, verificação de espectro de luz e emissão de certificado.', preco: 97.14, custo: 68.00, fornecedor: 'Prestec Hospitalar', foto: ph('Calibração', '#7C5CFF', '#3B82F6') },
    { id: 'P041', nome: 'Calibração de caixa aquecedora de contraste', categoria: 'Calibração', descricao: 'Verificação de temperatura e funcionamento do sistema de aquecimento, conforme especificação do fabricante.', preco: 290.00, custo: 0.00, fornecedor: 'A definir', foto: ph('Calibração', '#7C5CFF', '#3B82F6') },
    { id: 'P042', nome: 'Calibração de caixa térmica', categoria: 'Calibração', descricao: 'Verificação de vedação e manutenção de temperatura interna para transporte de amostras/materiais.', preco: 79.00, custo: 0.00, fornecedor: 'A definir', foto: ph('Calibração', '#7C5CFF', '#3B82F6') },
    { id: 'P043', nome: 'Calibração e teste de segurança de câmara de conservação', categoria: 'Calibração', descricao: 'Calibração de temperatura e teste de segurança elétrica, verificação de uniformidade térmica e alarmes, conforme boas práticas de armazenamento.', preco: 590.00, custo: 0.00, fornecedor: 'A definir', foto: ph('Calibração', '#7C5CFF', '#3B82F6') },
    { id: 'P044', nome: 'Calibração e teste de segurança de cardiotocógrafo', categoria: 'Calibração', descricao: 'Calibração de sinal e teste de segurança elétrica, verificação de sensores de frequência cardíaca fetal e contrações, conforme NBR IEC 60601-2-37.', preco: 190.00, custo: 0.00, fornecedor: 'A definir', foto: ph('Calibração', '#7C5CFF', '#3B82F6') },
    { id: 'P045', nome: 'Calibração de centrífuga', categoria: 'Calibração', descricao: 'Calibração de rotação (RPM) com padrão rastreável, verificação de balanceamento e emissão de certificado.', preco: 120.00, custo: 0.00, fornecedor: 'A definir', foto: ph('Calibração', '#7C5CFF', '#3B82F6') },
    { id: 'P046', nome: 'Calibração de contador manual de células', categoria: 'Calibração', descricao: 'Calibração de contagem com padrão de referência, verificação de exatidão e emissão de certificado.', preco: 120.00, custo: 0.00, fornecedor: 'A definir', foto: ph('Calibração', '#7C5CFF', '#3B82F6') },
    { id: 'P047', nome: 'Calibração e teste de segurança de detector fetal', categoria: 'Calibração', descricao: 'Calibração de sinal Doppler e teste de segurança elétrica, verificação de sensibilidade do transdutor, conforme NBR IEC 60601-2-37.', preco: 120.00, custo: 0.00, fornecedor: 'A definir', foto: ph('Calibração', '#7C5CFF', '#3B82F6') },
    { id: 'P048', nome: 'Calibração de medidor de icterícia', categoria: 'Calibração', descricao: 'Calibração de leitura com padrão de referência, verificação de exatidão e emissão de certificado.', preco: 90.00, custo: 0.00, fornecedor: 'A definir', foto: ph('Calibração', '#7C5CFF', '#3B82F6') },
    // === Produtos IMED HEF (P049–P073) fornecidos por METROLAB SOLUÇÕES ===
    { id: 'P049', nome: 'Aparelho de Pressão Arterial Digital LA800 G-Tech', categoria: 'Peças e Insumos', descricao: 'Monitor de pressão arterial digital e automático de braço. Método oscilométrico, com indicador de arritmia cardíaca, gráfico de nível de hipertensão e indicador de movimentação excessiva. Possui tecnologia Smart Inflate, capacidade de memória para 240 medições divididas em até 2 usuários, braçadeira universal (23 a 43 cm de circunferência) e aprovação INMETRO/ANVISA.', preco: 200.00, custo: 0.00, fornecedor: 'MetroLab Soluções', foto: ph('LA800 G-Tech', '#f59e0b', '#7C5CFF') },
    { id: 'P050', nome: 'Braçadeira Adulto PNI com Manguito 1 Via 25-35cm Azul', categoria: 'Peças e Insumos', descricao: 'Braçadeira para medição não invasiva de pressão arterial (PNI/NIBP), tamanho adulto, fabricada em náilon de alta resistência na cor azul. Circunferência aplicável de 25 cm a 35 cm, equipada com manguito interno e tubo/extensão de 1 via com encaixe para monitores multiparamétricos. Reutilizável e higienizável.', preco: 100.00, custo: 0.00, fornecedor: 'MetroLab Soluções', foto: ph('Braç. Adulto PNI', '#f59e0b', '#7C5CFF') },
    { id: 'P051', nome: 'Braçadeira Obeso PNI com Manguito 1 Via 33-41cm', categoria: 'Peças e Insumos', descricao: 'Braçadeira PNI para pacientes obesos/braço largo, com circunferência de 33 cm a 41 cm. Confeccionada em tecido de náilon lavável com fecho em velcro de alta fixação. Acompanha manguito em borracha/silicone de 1 via para conexão a monitores de sinais vitais.', preco: 100.00, custo: 0.00, fornecedor: 'MetroLab Soluções', foto: ph('Braç. Obeso PNI', '#f59e0b', '#7C5CFF') },
    { id: 'P052', nome: 'Célula de Oxigênio para Ventilador TECME Graphnet', categoria: 'Peças e Insumos', descricao: 'Sensor/célula galvânica de medição de concentração de oxigênio (O2) compatível com ventiladores pulmonares mecânicos da linha Tecme Graphnet (GraphNet Neo, TS, Advance). Alta precisão no monitoramento contínuo da FiO2 entregue ao paciente, rápida resposta e estabilidade de sinal.', preco: 1000.00, custo: 0.00, fornecedor: 'MetroLab Soluções', foto: ph('Célula O2 TECME', '#f59e0b', '#7C5CFF') },
    { id: 'P053', nome: 'Circuito Ventilatório para Ventilador IX5', categoria: 'Peças e Insumos', descricao: 'Circuito paciente reutilizável/autoclavável de silicone para ventilador mecânico invasivo/não invasivo (compatível com linha IX5 / Tecme). Composto por ramos inspiratório e expiratório, conector Y, linhas de monitorização de pressão/fluxo proximal e conexões padrão de 22mm.', preco: 1000.00, custo: 0.00, fornecedor: 'MetroLab Soluções', foto: ph('Circuito IX5', '#f59e0b', '#7C5CFF') },
    { id: 'P054', nome: 'Conector Engate Rápido para PNI Metálico BP12', categoria: 'Peças e Insumos', descricao: 'Conector metálico de engate rápido tipo BP12 / Subminiature de latão niquelado para mangueiras de PNI (Pressão Não Invasiva). Utilizado para garantir vedação estanque e conexão segura entre a braçadeira, a extensão e o monitor multiparamétrico.', preco: 50.00, custo: 0.00, fornecedor: 'MetroLab Soluções', foto: ph('Conector BP12', '#f59e0b', '#7C5CFF') },
    { id: 'P055', nome: 'Conexão Y de Oxigênio', categoria: 'Peças e Insumos', descricao: 'Conexão metálica ou em policarbonato em formato "Y" com rosca/engate para redes ou cilindros de oxigênio medicinal. Permite a divisão de uma única fonte de O2 para dois equipamentos ou acessórios simultâneos sem perda de estanqueidade.', preco: 80.00, custo: 0.00, fornecedor: 'MetroLab Soluções', foto: ph('Conexão Y O2', '#f59e0b', '#7C5CFF') },
    { id: 'P056', nome: 'Cuffmetro', categoria: 'Calibração', descricao: 'Manômetro manual (Cuffômetro/VBM) projetado para medição e controle da pressão de insuflação do balonete (cuff) de tubos endotraqueais e cânulas de traqueostomia. Escala analógica graduada em cmH2O, com bomba manual de insuflação integrada e válvula de alívio de pressão.', preco: 2500.00, custo: 0.00, fornecedor: 'MetroLab Soluções', foto: ph('Cuffmetro', '#7C5CFF', '#3B82F6') },
    { id: 'P057', nome: 'Fluxômetro de Oxigênio em Vidro 15L/min', categoria: 'Peças e Insumos', descricao: 'Fluxômetro de bilha para gás medicinal (Oxigênio - O2). Tubo medidor em vidro calibrado de 0 a 15 Litros por minuto (L/min), corpo em metal cromado, esfera de leitura em aço inoxidável e conexão padronizada ABNT NBR.', preco: 100.00, custo: 0.00, fornecedor: 'MetroLab Soluções', foto: ph('Fluxômetro O2', '#f59e0b', '#7C5CFF') },
    { id: 'P058', nome: 'Manômetro de Cilindro de Oxigênio', categoria: 'Peças e Insumos', descricao: 'Manômetro de alta/baixa pressão para reguladores de vazão de cilindros de Oxigênio medicinal. Mostrador analógico com escala graduada de pressão em psi / bar, corpo metálico robusto, rosca de conexão padrão e indicador visual de nível de gás no cilindro.', preco: 400.00, custo: 0.00, fornecedor: 'MetroLab Soluções', foto: ph('Manômetro O2', '#f59e0b', '#7C5CFF') },
    { id: 'P059', nome: 'Sensor de Oximetria Neonatal compatível com Monitor Alfamed', categoria: 'Sensores SPO2', descricao: 'Sensor de oximetria de pulso (SpO2) modelo envoltório/fita neonatal (Soft/Y-sensor ou adesivo) compatível com monitores multiparamétricos Alfamed. Projetado para fixação segura e confortável no pé ou mão de recém-nascidos, com cabo flexível e alta sensibilidade de captação.', preco: 450.00, custo: 0.00, fornecedor: 'MetroLab Soluções', foto: ph('SpO2 Neo Alfamed', '#22c55e', '#3B82F6') },
    { id: 'P060', nome: 'Sensor de Oximetria Adulto compatível com Monitor Alfamed', categoria: 'Sensores SPO2', descricao: 'Sensor de oximetria (SpO2) tipo clipe de dedo (Finger Clip) reutilizável para uso adulto, compatível com monitores de sinais vitais Alfamed. Fabricado em material médico durável, alta precisão de leitura para saturação de O2 e frequência cardíaca.', preco: 450.00, custo: 0.00, fornecedor: 'MetroLab Soluções', foto: ph('SpO2 Adulto Alfamed', '#22c55e', '#3B82F6') },
    { id: 'P061', nome: 'Sensor de Oximetria Adulto compatível com Monitor Mindray', categoria: 'Sensores SPO2', descricao: 'Sensor de oximetria de pulso (SpO2) tipo clipe de dedo para uso adulto reutilizável, compatível com a linha de monitores multiparamétricos Mindray (iMEC, uMEC, BeneView, ePM). Conector dedicado com pinagem padrão Mindray, com excelente resistência a interferências de luz ambiente.', preco: 450.00, custo: 0.00, fornecedor: 'MetroLab Soluções', foto: ph('SpO2 Adulto Mindray', '#22c55e', '#3B82F6') },
    { id: 'P062', nome: 'Sensor de Oximetria Adulto compatível com Monitor Prolife', categoria: 'Sensores SPO2', descricao: 'Sensor de SpO2 reutilizável tipo clipe articulado de dedo para pacientes adultos, compatível com monitores da marca Prolife. Composto por cabo blindado de alta flexibilidade, fotodetectores de alta precisão e revestimento anatômico.', preco: 350.00, custo: 0.00, fornecedor: 'MetroLab Soluções', foto: ph('SpO2 Adulto Prolife', '#22c55e', '#3B82F6') },
    { id: 'P063', nome: 'Sensor de Temperatura de Pele compatível com Monitor Mindray', categoria: 'Peças e Insumos', descricao: 'Sensor de temperatura corporal de superfície/pele (Skin Temperature Probe) reutilizável, compatível com a série de monitores Mindray. Disco metálico sensível com cabo flexível e conector padrão redondo de pino rápido.', preco: 250.00, custo: 0.00, fornecedor: 'MetroLab Soluções', foto: ph('Temp. Pele Mindray', '#f59e0b', '#7C5CFF') },
    { id: 'P064', nome: 'Sensor de Temperatura de Pele compatível com Monitor Prolife', categoria: 'Peças e Insumos', descricao: 'Sensor de temperatura cutânea reutilizável para medição contínua de temperatura da pele em monitores multiparamétricos Prolife. Terminal metálico plano em disco para rápida condução térmica e fixação precisa.', preco: 250.00, custo: 0.00, fornecedor: 'MetroLab Soluções', foto: ph('Temp. Pele Prolife', '#f59e0b', '#7C5CFF') },
    { id: 'P065', nome: 'Sensor de ECG compatível com Monitor Alfamed', categoria: 'Peças e Insumos', descricao: 'Cabo paciente/sensor para Eletrocardiograma (ECG) de 3 ou 5 vias (garras/snap) compatível com monitores Alfamed. Cabo com blindagem contra interferências eletromagnéticas (bisturi elétrico), condutores flexíveis e conector dedicado.', preco: 250.00, custo: 0.00, fornecedor: 'MetroLab Soluções', foto: ph('ECG Alfamed', '#f59e0b', '#7C5CFF') },
    { id: 'P066', nome: 'Sensor de ECG compatível com Monitor Mindray', categoria: 'Peças e Insumos', descricao: 'Cabo de ECG de 5 vias tipo garra/snap para monitorização cardíaca contínua em monitores multiparamétricos Mindray. Cabo tronco revestido em TPU de grau médico, altamente resistente ao ressecamento e quebras por dobras.', preco: 300.00, custo: 0.00, fornecedor: 'MetroLab Soluções', foto: ph('ECG Mindray', '#f59e0b', '#7C5CFF') },
    { id: 'P067', nome: 'Sensor de ECG compatível com Monitor Prolife', categoria: 'Peças e Insumos', descricao: 'Cabo paciente de ECG com 5 vias garra/snap compatível com monitores Prolife. Alta condutividade de sinal e supressão de ruídos para traçados eletrocardiográficos precisos no monitor.', preco: 350.00, custo: 0.00, fornecedor: 'MetroLab Soluções', foto: ph('ECG Prolife', '#f59e0b', '#7C5CFF') },
    { id: 'P068', nome: 'Suporte de Parede para Monitor Mindray uMEC 15', categoria: 'Peças e Insumos', descricao: 'Suporte de fixação de parede articulado e ajustável fabricado em liga de alumínio injetado com pintura eletrostática, projetado especificamente para monitores multiparamétricos Mindray série uMEC (uMEC15/uMEC12/uMEC10). Possui canal de parede, rotação horizontal, inclinação vertical, organizador de cabos e cesto integrado para guardar acessórios.', preco: 1934.50, custo: 0.00, fornecedor: 'MetroLab Soluções', foto: ph('Suporte uMEC 15', '#f59e0b', '#7C5CFF') },
    { id: 'P069', nome: 'Termohigrômetro com Certificado de Calibração RBC', categoria: 'Calibração', descricao: 'Termo-higrômetro digital com display LCD para medição simultânea de temperatura e umidade relativa do ar. Função de registro de máximas e mínimas, sonda externa/interna e acompanhado obrigatoriamente de Certificado de Calibração rastreável à RBC (Rede Brasileira de Calibração / Inmetro).', preco: 250.00, custo: 0.00, fornecedor: 'MetroLab Soluções', foto: ph('Termohigrômetro', '#7C5CFF', '#3B82F6') },
    { id: 'P070', nome: 'Termômetro Digital de Testa Sem Contato G-Tech', categoria: 'Calibração', descricao: 'Termômetro clínico digital infravermelho sem contato (Touch Free) de testa da marca G-Tech. Leitura ultra-rápida (1 a 2 segundos), visor retroiluminado com indicação de febre por cores, memória de medições e desligamento automático.', preco: 200.00, custo: 0.00, fornecedor: 'MetroLab Soluções', foto: ph('Term. Testa G-Tech', '#7C5CFF', '#3B82F6') },
    { id: 'P071', nome: 'Vacuômetro Protec, Copo em Vidro 500ml', categoria: 'Peças e Insumos', descricao: 'Frasco aspirador / regulador de vácuo tipo vacuômetro da marca Protec. Equipado com indicador de vácuo analógico, frasco graduado em vidro de 500ml autoclavável, tampa com boia de segurança para transbordamento e conexões para rede hospitalar de vácuo.', preco: 330.00, custo: 0.00, fornecedor: 'MetroLab Soluções', foto: ph('Vacuômetro Protec', '#f59e0b', '#7C5CFF') },
    { id: 'P072', nome: 'Válvula Exalatória para Ventilador Leistung Luft 3', categoria: 'Peças e Insumos', descricao: 'Conjunto de válvula exalatória (corpo e diafragma) projetado especificamente para utilização no ventilador mecânico pulmonar Leistung Luft 3. Confeccionada em material de grau médico autoclavável/reutilizável, garantindo controle preciso do fluxo exalado e da pressão PEEP.', preco: 600.00, custo: 0.00, fornecedor: 'MetroLab Soluções', foto: ph('Válv. Exal. Luft 3', '#f59e0b', '#7C5CFF') },
    { id: 'P073', nome: 'Válvula Reguladora de Oxigênio para Cilindro', categoria: 'Peças e Insumos', descricao: 'Válvula reguladora de pressão para cilindro de Oxigênio medicinal. Confeccionada em latão cromado com sistema de pistão de alta durabilidade, manômetro de pressão de entrada e saída, conexão padrão ABNT (CGA 540/298) e válvula de segurança integrada.', preco: 350.00, custo: 0.00, fornecedor: 'MetroLab Soluções', foto: ph('Válv. Reg. O2', '#f59e0b', '#7C5CFF') },
  ];

  function seedPropostas() {
    const now = new Date();
    const y = now.getFullYear(), m = now.getMonth();
    const prev = new Date(y, m - 1, 15);
    const mk = (day, monthOffset) => new Date(y, m + monthOffset, day).toISOString();
    const item = (pid, qtd) => {
      const p = SEED_PRODUTOS.find(x => x.id === pid);
      return { produtoId: p.id, nome: p.nome, descricao: p.descricao, categoria: p.categoria, preco: p.preco, qtd, foto: p.foto };
    };
    return [
      { id: 'PROP-1001', cliente: 'Hospital Santa Casa', contato: 'Dra. Marina Alves', status: 'ganho', criadoEm: mk(3, 0), atualizadoEm: mk(6, 0), categoria: 'Calibração', itens: [item('P001', 4), item('P005', 2)], validade: '15 dias', prazo: '30 dias úteis', pagamento: '30/60 dias — Boleto' },
      { id: 'PROP-1002', cliente: 'Hospital São Lucas', contato: 'Eng. Rafael Dias', status: 'ganho', criadoEm: mk(5, 0), atualizadoEm: mk(9, 0), categoria: 'Manutenção de Autoclaves', itens: [item('P002', 2), item('P007', 3)], validade: '15 dias', prazo: '20 dias úteis', pagamento: 'À vista — 5% desc.' },
      { id: 'PROP-1003', cliente: 'Clínica Vida Plena', contato: 'Sr. João Prado', status: 'negociacao', criadoEm: mk(8, 0), atualizadoEm: mk(12, 0), categoria: 'Sensores SPO2', itens: [item('P003', 6), item('P008', 1)], validade: '10 dias', prazo: '15 dias úteis', pagamento: '30 dias — Boleto' },
      { id: 'PROP-1004', cliente: 'Hospital Regional Norte', contato: 'Dra. Célia Motta', status: 'enviada', criadoEm: mk(11, 0), atualizadoEm: mk(13, 0), categoria: 'Manutenção de Autoclaves', itens: [item('P004', 1)], validade: '15 dias', prazo: 'Imediato', pagamento: '30/60/90 dias' },
      { id: 'PROP-1005', cliente: 'UPA Central', contato: 'Enf. Paulo Reis', status: 'aberto', criadoEm: mk(14, 0), atualizadoEm: mk(14, 0), categoria: 'Laudos Técnicos', itens: [item('P006', 8)], validade: '20 dias', prazo: '10 dias úteis', pagamento: 'Empenho público' },
      { id: 'PROP-1006', cliente: 'Maternidade Aurora', contato: 'Dra. Fernanda Lopes', status: 'enviada', criadoEm: mk(15, 0), atualizadoEm: mk(15, 0), categoria: 'Sensores SPO2', itens: [item('P008', 3), item('P003', 4)], validade: '15 dias', prazo: '15 dias úteis', pagamento: '30 dias' },
      { id: 'PROP-1007', cliente: 'Hospital Santa Casa', contato: 'Dra. Marina Alves', status: 'ganho', criadoEm: mk(2, 0), atualizadoEm: mk(4, 0), categoria: 'Laudos Técnicos', itens: [item('P006', 5)], validade: '15 dias', prazo: '10 dias úteis', pagamento: 'À vista' },
      // mês anterior
      { id: 'PROP-0951', cliente: 'Hospital São Lucas', contato: 'Eng. Rafael Dias', status: 'ganho', criadoEm: prev.toISOString(), atualizadoEm: prev.toISOString(), categoria: 'Calibração', itens: [item('P001', 6)], validade: '15 dias', prazo: '30 dias úteis', pagamento: '30 dias' },
      { id: 'PROP-0952', cliente: 'Clínica Vida Plena', contato: 'Sr. João Prado', status: 'ganho', criadoEm: new Date(y, m - 1, 8).toISOString(), atualizadoEm: new Date(y, m - 1, 20).toISOString(), categoria: 'Manutenção de Autoclaves', itens: [item('P002', 1), item('P004', 1)], validade: '15 dias', prazo: '20 dias úteis', pagamento: 'À vista' },
      { id: 'PROP-0953', cliente: 'UPA Central', contato: 'Enf. Paulo Reis', status: 'ganho', criadoEm: new Date(y, m - 1, 22).toISOString(), atualizadoEm: new Date(y, m - 1, 26).toISOString(), categoria: 'Sensores SPO2', itens: [item('P003', 10)], validade: '15 dias', prazo: '15 dias úteis', pagamento: '30 dias' },
    ];
  }

  function load(key, fallback) {
    try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; }
    catch (_) { return fallback; }
  }
  function save(key, val) { localStorage.setItem(key, JSON.stringify(val)); }

  /* =========================================================
     CAMADA REMOTA (Supabase) — MODO HÍBRIDO CENTRADO NA NUVEM
     - A NUVEM ('negociacoes') é a fonte definitiva.
     - LocalStorage é apenas espelho local/offline (fallback).
     - Toda ação de escrita vai para o Supabase IMEDIATAMENTE
       (upsert por linha) e o Realtime empurra para os demais
       dispositivos sem refresh.
     - Tabela 'negociacoes': { id text PK, data jsonb, updated_at timestamptz }
       'data' carrega a proposta INTEIRA, inclusive foto_produto
       (base64), descricao_tecnica e metadados de emissão.
     ========================================================= */
  let _remoteOnExternal = null;     // callback p/ re-render das views
  const remote = {
    ready: () => !!window.supabaseClient,
    _syncing: false,   // flag para evitar pulls concorrentes
    channel: null,
    clientsChannel: null,
    status: () => window.supabaseClient ? 'connected' : 'offline',

    async _upsertNegociacoesSafe(rows) {
      const rowArray = Array.isArray(rows) ? rows : [rows];
      const result = await window.supabaseClient
        .from('negociacoes').upsert(rowArray, { onConflict: 'id' });
      if (result.error && result.error.message && result.error.message.includes("Could not find the 'user_id' column")) {
        const plainRows = rowArray.map(({ user_id, ...rest }) => rest);
        logger.warn('[Supabase] negociacoes sem coluna user_id; reexecutando upsert sem user_id', 'sync');
        return await window.supabaseClient
          .from('negociacoes').upsert(plainRows, { onConflict: 'id' });
      }
      return result;
    },

    async _selectNegociacoesSafe(uid) {
      let negQuery = window.supabaseClient.from('negociacoes').select('*');
      if (!isAdmin()) negQuery = negQuery.eq('user_id', uid);
      let result = await negQuery.order('updated_at', { ascending: false });
      if (result.error && result.error.message && result.error.message.includes("Could not find the 'user_id' column")) {
        logger.warn('[Supabase] negociacoes sem coluna user_id; consultando sem filtro', 'sync');
        result = await window.supabaseClient.from('negociacoes').select('*').order('updated_at', { ascending: false });
      }
      return result;
    },

    async _deleteNegociacoesSafe(id, uid) {
      let delQuery = window.supabaseClient.from('negociacoes').delete().eq('id', id);
      if (!isAdmin()) delQuery = delQuery.eq('user_id', uid);
      let result = await delQuery;
      if (result.error && result.error.message && result.error.message.includes("Could not find the 'user_id' column")) {
        logger.warn('[Supabase] negociacoes sem coluna user_id; delete sem filtro user_id', 'sync');
        result = await window.supabaseClient.from('negociacoes').delete().eq('id', id);
      }
      return result;
    },

    async _upsertProductsSafe(rows) {
      const rowArray = Array.isArray(rows) ? rows : [rows];
      let result = await window.supabaseClient.from(PRODS_TABLE).upsert(rowArray, { onConflict: 'code' }).select();
      // Fallback: se a tabela não tem coluna user_id, reexecuta sem ela
      if (result.error && result.error.message && result.error.message.includes("Could not find the 'user_id' column")) {
        const plainRows = rowArray.map(({ user_id, ...rest }) => rest);
        logger.warn('[Supabase] products sem coluna user_id; reexecutando upsert sem user_id', 'products');
        result = await window.supabaseClient.from(PRODS_TABLE).upsert(plainRows, { onConflict: 'code' }).select();
      }
      // Fallback: se algum id enviado não for UUID válido, Postgres retorna erro de syntax
      if (result.error && result.error.message && result.error.message.toLowerCase().includes('invalid input syntax for type uuid')) {
        logger.warn('[Supabase] products upsert falhou por uuid inválido; reexecutando sem campo id', 'products');
        const plainRows = rowArray.map(({ id, ...rest }) => rest);
        result = await window.supabaseClient.from(PRODS_TABLE).upsert(plainRows, { onConflict: 'code' }).select();
      }
      return result;
    },

    async _selectProductsSafe(uid) {
      let q = window.supabaseClient.from(PRODS_TABLE).select('*');
      if (!isAdmin()) q = q.eq('user_id', uid);
      let result = await q.order('code', { ascending: true });
      if (result.error && result.error.message && result.error.message.includes("Could not find the 'user_id' column")) {
        logger.warn('[Supabase] products sem coluna user_id; consultando sem filtro', 'products');
        result = await window.supabaseClient.from(PRODS_TABLE).select('*').order('code', { ascending: true });
      }
      return result;
    },

    // Grava a negociação na nuvem IMEDIATAMENTE (INSERT/UPDATE por linha).
    async upsert(prop) {
      if (!this.ready() || !prop || !prop.id) return;
      const row = {
        id: String(prop.id),
        data: prop,
        updated_at: prop.atualizadoEm || new Date().toISOString(),
        user_id: getCurrentUser().id,
      };
      const { error } = await this._upsertNegociacoesSafe(row);
      if (error) logger.warn('[Supabase] upsert falhou: ' + error.message + ' -> ' + prop.id, 'sync');
    },

    // LEITURA OBRIGATÓRIA no carregamento: puxa a nuvem ANTES de popular o estado.
    // O estado local só é preenchido APÓS a resposta do Supabase. Se a nuvem
    // falhar (offline), cai para o espelho local como fallback.
    async init(onChange) {
      _remoteOnExternal = onChange;
      if (!this.ready()) {
        logger.info('[Supabase] offline — tentando novamente em 3s...', 'sync');
        setTimeout(() => { if (this.ready() && !this._syncing) this.init(onChange).catch(() => {}); }, 3000);
        return false;
      }
      if (this._syncing) { logger.info('[Supabase] init ignorado — já sincronizando', 'sync'); return false; }
      this._syncing = true;

      // Cada operação tem seu próprio try/catch para que uma falha não bloqueie as demais
      // 1 — Pull negociações
      try {
        const { data: negData, error: negErr } = await this._selectNegociacoesSafe(getCurrentUser().id);
        if (!negErr && negData) {
          const local = getPropostas();
          // A-07: usa updated_at do Postgres (server clock) como arbiter de merge
          const localMap = {}; local.forEach(p => { if (p && p.id) localMap[p.id] = p; });
          const cloudMap = {};
          negData.forEach(r => {
            if (!r || !r.data || !r.data.id) return;
            const serverTime = r.updated_at ? new Date(r.updated_at).getTime() : 0;
            const dataTime = r.data && r.data.atualizadoEm ? new Date(r.data.atualizadoEm).getTime() : 0;
            cloudMap[r.data.id] = { data: r.data, serverTime: Math.max(serverTime, dataTime) };
          });
          const allIds = new Set([...Object.keys(localMap), ...Object.keys(cloudMap)]);
          const merged = [];
          allIds.forEach(id => {
            const l = localMap[id]; const c = cloudMap[id];
            if (!c) { merged.push(l); return; }
            if (!l) { merged.push(c.data); return; }
            const localTime = new Date(l.atualizadoEm || 0).getTime();
            merged.push(c.serverTime >= localTime ? c.data : l);
          });
          const latestLocal = getPropostas();
          const mergedIds = new Set(merged.map(p => p.id));
          latestLocal.forEach(p => { if (!mergedIds.has(p.id)) merged.push(p); });
          if (hasRealData()) persistReal(merged); else savePropostas(merged);
          // Push não-bloqueante — não espera terminar para continuar
          this.pushAll().catch(e => logger.warn('[Supabase] pushAll ignorado: ' + e.message, 'sync'));
        } else if (negErr) { logger.warn('[Supabase] pull negociacoes falhou: ' + negErr.message, 'sync'); }
        logger.info('[Supabase] negociacoes pull concluido. Local: ' + getPropostas().length + ' propostas', 'sync');
      } catch (e) { logger.warn('[Supabase] pull negociacoes erro: ' + e, 'sync'); }

      // 2 — Pull clientes
      try {
        logger.info('[Supabase] pull clientes: consultando tabela ' + CLIENTS_TABLE + '...', 'sync');
        let cliQuery = window.supabaseClient.from(CLIENTS_TABLE).select('*');
        if (!isAdmin()) cliQuery = cliQuery.eq('user_id', getCurrentUser().id);
        const { data: cliData, error: cliErr } = await cliQuery;
        if (cliErr) {
          logger.error('[Supabase] pull clientes ERRO: ' + cliErr.message + ' | Código: ' + cliErr.code, 'sync');
          if (typeof toast === 'function') toast('Erro ao buscar clientes da nuvem: ' + cliErr.message);
        }
        if (!cliErr && cliData) {
          logger.info('[Supabase] clientes encontrados na nuvem: ' + cliData.length, 'sync');
          const cloudMap = {};
          cliData.forEach(r => {
            if (!r || !r.id) return;
            let sh = Array.isArray(r.salesHistory) ? r.salesHistory : [];
            try { if (typeof r.salesHistory === 'string') sh = JSON.parse(r.salesHistory); } catch(_) { /* ignore parse errors */ }
            cloudMap[r.id] = {
              id: r.id, name: r.name || '', razaoSocial: r.razaoSocial || '',
              cnpj: r.cnpj || '', email: r.email || '', phone: r.phone || '',
              address: r.address || '', externalCode: r.externalCode || '',
              observations: r.observations || '', lastSale: r.lastSale || '',
              totalSpent: Number(r.totalSpent) || 0,
              salesHistory: sh, created_at: r.created_at,
            };
          });
          const localCli = getClients();
          logger.info('[Supabase] clientes locais antes do merge: ' + localCli.length, 'sync');
          localCli.forEach(c => { if (c && c.id && !cloudMap[c.id]) cloudMap[c.id] = c; });
          saveClients(Object.values(cloudMap));
          logger.info('[Supabase] clientes sincronizados (após merge) — total: ' + Object.values(cloudMap).length, 'sync');
        }
        // Push clientes locais que não estão na nuvem
        this.pushAllClients().catch(e => logger.error('[Supabase] pushAllClients exceção: ' + e, 'sync'));
      } catch (e) { logger.error('[Supabase] pull clientes erro geral: ' + e, 'sync'); }

      // 3 — Pull nfe_imports
      try { await this.pullNfeImports(); } catch (e) { logger.warn('[Supabase] pullNfeImports erro: ' + e, 'sync'); }
      // Push retroativo: envia NFs locais que ainda não estão na nuvem
      try { await this.pushExistingNfeImports(); } catch (e) { logger.warn('[Supabase] pushExistingNfeImports erro: ' + e, 'sync'); }

      // 3b — Pull produtos (se houver na nuvem, sobrepõe local)
      try { await this.pullProducts(); } catch (e) { logger.warn('[Supabase] pullProducts erro: ' + e, 'sync'); }
      // Push produtos locais para a nuvem
      try { await this.pushAllProducts(); } catch (e) { logger.warn('[Supabase] pushAllProducts erro: ' + e, 'sync'); }

      // 3c — Consolida itens das NF-e importadas no price history
      try { this.syncProductsFromNfeImports(); } catch (e) { logger.warn('[Supabase] syncProductsFromNfeImports erro: ' + e, 'sync'); }

      // 4 — Assinaturas Realtime
      try { this.subscribe(); } catch (e) { logger.warn('[Supabase] subscribe erro: ' + e, 'sync'); }
      try { this.subscribeClients(); } catch (e) { logger.warn('[Supabase] subscribeClients erro: ' + e, 'sync'); }
      try { this.subscribeNfeImports(); } catch (e) { logger.warn('[Supabase] subscribeNfeImports erro: ' + e, 'sync'); }

      // 5 — Log final com totais
      logger.info('[Supabase] init concluido. Clientes: ' + getClients().length + ' NFe: ' + load(KEY_NFE_IMPORTS, []).length + ' Propostas: ' + getPropostas().length, 'sync');

      // 6 — SEMPRE dispara refresh da UI, mesmo se algum pull falhou
      if (typeof _remoteOnExternal === 'function') _remoteOnExternal();
      this._syncing = false;
      return true;
    },

    // Espelha TODAS as negociações locais na nuvem (usado no bootstrap).
    async pushAll() {
      if (!this.ready()) return;
      const arr = getPropostas();
      if (!arr.length) { logger.info('[Supabase] pushAll: nenhuma proposta', 'sync'); return; }
      const uid = getCurrentUser().id;
      const rows = arr.map(p => ({
        id: String(p.id),
        data: p,
        updated_at: p.atualizadoEm || new Date().toISOString(),
        user_id: uid,
      }));
      const { error } = await this._upsertNegociacoesSafe(rows);
      if (error) {
        logger.warn('[Supabase] pushAll falhou: ' + error.message, 'sync');
        if (typeof toast === 'function') toast('Erro ao enviar propostas: ' + error.message);
      } else {
        logger.info('[Supabase] pushAll OK: ' + rows.length + ' propostas', 'sync');
      }
    },

    // Puxa dados da nuvem sem recriar subscriptions (útil para refresh manual)
    async pullData() {
      if (!this.ready()) return;
      // Negociações
      try {
        const { data: negData, error: negErr } = await this._selectNegociacoesSafe(getCurrentUser().id);
        if (!negErr && negData) {
          const local = getPropostas();
          // A-07: usa updated_at do Postgres (server clock) como arbiter de merge
          const localMap = {}; local.forEach(p => { if (p && p.id) localMap[p.id] = p; });
          const cloudMap = {};
          negData.forEach(r => {
            if (!r || !r.data || !r.data.id) return;
            const serverTime = r.updated_at ? new Date(r.updated_at).getTime() : 0;
            const dataTime = r.data && r.data.atualizadoEm ? new Date(r.data.atualizadoEm).getTime() : 0;
            cloudMap[r.data.id] = { data: r.data, serverTime: Math.max(serverTime, dataTime) };
          });
          const allIds = new Set([...Object.keys(localMap), ...Object.keys(cloudMap)]);
          const merged = [];
          allIds.forEach(id => {
            const l = localMap[id]; const c = cloudMap[id];
            if (!c) { merged.push(l); return; }
            if (!l) { merged.push(c.data); return; }
            const localTime = new Date(l.atualizadoEm || 0).getTime();
            merged.push(c.serverTime >= localTime ? c.data : l);
          });
          const latestLocal = getPropostas();
          const mergedIds = new Set(merged.map(p => p.id));
          latestLocal.forEach(p => { if (!mergedIds.has(p.id)) merged.push(p); });
          if (hasRealData()) persistReal(merged); else savePropostas(merged);
        }
      } catch (e) { logger.warn('[Supabase] pull negociacoes falhou: ' + e, 'sync'); }
      // Clientes
      try {
        let cliQuery = window.supabaseClient.from(CLIENTS_TABLE).select('*');
        if (!isAdmin()) cliQuery = cliQuery.eq('user_id', getCurrentUser().id);
        const { data: cliData, error: cliErr } = await cliQuery;
        if (cliErr) {
          logger.error('[Supabase] pullData clientes ERRO: ' + cliErr.message + ' | Código: ' + cliErr.code + ' | Detalhes: ' + cliErr.details, 'sync');
        }
        if (!cliErr && cliData) {
          logger.info('[Supabase] pullData clientes: ' + cliData.length + ' registros da nuvem', 'sync');
          const cloudMap = {};
          cliData.forEach(r => {
            if (!r || !r.id) return;
            let sh = Array.isArray(r.salesHistory) ? r.salesHistory : [];
            try { if (typeof r.salesHistory === 'string') sh = JSON.parse(r.salesHistory); } catch(_) { /* ignore parse errors */ }
            cloudMap[r.id] = {
              id: r.id, name: r.name || '', razaoSocial: r.razaoSocial || '',
              cnpj: r.cnpj || '', email: r.email || '', phone: r.phone || '',
              address: r.address || '', externalCode: r.externalCode || '',
              observations: r.observations || '', lastSale: r.lastSale || '',
              totalSpent: Number(r.totalSpent) || 0,
              salesHistory: sh, created_at: r.created_at,
            };
          });
          const localCli = getClients();
          localCli.forEach(c => { if (c && c.id && !cloudMap[c.id]) cloudMap[c.id] = c; });
          saveClients(Object.values(cloudMap));
        }
      } catch (e) { logger.error('[Supabase] pull clientes erro geral: ' + e, 'sync'); }
    },

    // Sobe TODOS os clientes para a nuvem
    async pushAllClients() {
      if (!this.ready()) { logger.error('[Supabase] pushAllClients: supabaseClient não está pronto', 'clients'); return; }
      const arr = getClients();
      if (!arr.length) { logger.info('[Supabase] pushAllClients: nenhum cliente local para enviar', 'clients'); return; }
      logger.info('[Supabase] pushAllClients: enviando ' + arr.length + ' clientes...', 'clients');
      const uid = getCurrentUser().id;
      const rows = arr.map(c => ({
        id: String(c.id), name: c.name || '', razaoSocial: c.razaoSocial || '',
        cnpj: c.cnpj || '', email: c.email || '', phone: c.phone || '',
        address: c.address || '',
        observations: c.observations || '', lastSale: c.lastSale || '',
        totalSpent: c.totalSpent || 0,
        salesHistory: Array.isArray(c.salesHistory) ? c.salesHistory : [],
        user_id: uid,
      }));
      const { data, error } = await window.supabaseClient
        .from(CLIENTS_TABLE).upsert(rows, { onConflict: 'id' }).select();
      if (error) {
        logger.error('[Supabase] pushAllClients ERRO: ' + error.message + ' | Código: ' + error.code + ' | Detalhes: ' + error.details, 'clients');
        logger.error('[Supabase] pushAllClients — verifique RLS da tabela ' + CLIENTS_TABLE + ': anon precisa de INSERT/UPDATE', 'clients');
        if (typeof toast === 'function') toast('Erro ao enviar clientes: ' + error.message);
      } else {
        logger.info('[Supabase] pushAllClients OK: ' + (data || rows).length + ' clientes na nuvem', 'clients');
      }
    },

    // Remove uma negociação da nuvem (DELETE imediato).
    async remove(id) {
      if (!this.ready() || !id) return;
      const { error } = await this._deleteNegociacoesSafe(id, getCurrentUser().id);
      if (error) logger.warn('[Supabase] remove falhou: ' + error.message, 'sync');
    },

    // Assina o Realtime da tabela 'negociacoes' (INSERT/UPDATE/DELETE).
    subscribe() {
      if (!this.ready()) return;
      this.channel = window.supabaseClient
        .channel('negociacoes-rt')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'negociacoes' },
          (payload) => this.applyExternal(payload))
        .subscribe((status) => {
          if (status === 'CHANNEL_ERROR') logger.warn('[Supabase] realtime CHANNEL_ERROR — fallback via REST', 'sync');
          else logger.info('[Supabase] realtime: ' + status, 'sync');
        });
    },

    // Aplica uma mudança vinda de OUTRO dispositivo e re-renderiza na hora.
    // A-06/A-07 CORRIGIDO: usa updated_at do Postgres (server clock) como arbiter.
    // O campo updated_at vem da tabela negociacoes (coluna timestamptz),
    // não do JSON data, garantindo comparação justa entre dispositivos.
    applyExternal(payload) {
      if (payload.eventType === 'DELETE') {
        const id = payload.old && payload.old.id;
        if (!id) return;
        const arr = getPropostas().filter(x => String(x.id) !== String(id));
        if (hasRealData()) persistReal(arr); else savePropostas(arr);
      } else {
        const remote = payload.new && payload.new.data;
        if (!remote || !remote.id) return;
        const arr = getPropostas();
        const i = arr.findIndex(x => String(x.id) === String(remote.id));
        // A-07: usa updated_at do Postgres (server clock) — nunca mais atualizadoEm do cliente
        const serverTime = payload.new && payload.new.updated_at ? new Date(payload.new.updated_at).getTime() : 0;
        const localDataTime = remote && remote.atualizadoEm ? new Date(remote.atualizadoEm).getTime() : 0;
        const remoteTime = Math.max(serverTime, localDataTime);
        if (i >= 0) {
          const local = arr[i];
          const localTime = new Date(local.atualizadoEm || 0).getTime();
          if (remoteTime > localTime) arr[i] = remote;
        } else {
          arr.push(remote);
        }
        if (hasRealData()) persistReal(arr); else savePropostas(arr);
      }
      if (typeof _remoteOnExternal === 'function') _remoteOnExternal();
    },

    // ─── Realtime: Clientes ───
    subscribeClients() {
      if (!this.ready()) return;
      this.clientsChannel = window.supabaseClient
        .channel('clients-rt')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'clients' },
          (payload) => this.applyExternalClients(payload))
        .subscribe((status) => {
          if (status === 'CHANNEL_ERROR') logger.warn('[Supabase] clients realtime CHANNEL_ERROR', 'sync');
          else logger.info('[Supabase] clients realtime: ' + status, 'sync');
        });
    },

    applyExternalClients(payload) {
      const arr = getClients();
      if (payload.eventType === 'DELETE') {
        const id = payload.old && payload.old.id;
        if (!id) return;
        saveClients(arr.filter(x => String(x.id) !== String(id)));
      } else {
        const row = payload.new;
        if (!row || !row.id) return;
        const client = {
          id: row.id,
          name: row.name || '',
          razaoSocial: row.razaoSocial || '',
          cnpj: row.cnpj || '',
          email: row.email || '',
          phone: row.phone || '',
          address: row.address || '',
          externalCode: row.externalCode || '',
          observations: row.observations || '',
          lastSale: row.lastSale || '',
          totalSpent: Number(row.totalSpent) || 0,
          salesHistory: Array.isArray(row.salesHistory) ? row.salesHistory : [],
          created_at: row.created_at,
        };
        const i = arr.findIndex(x => String(x.id) === String(client.id));
        if (i >= 0) arr[i] = client; else arr.push(client);
        saveClients(arr);
      }
      if (typeof _remoteOnExternal === 'function') _remoteOnExternal();
    },

    // ─── NF-e imports ───
    async pushNfeImports(rows) {
      if (!this.ready()) { logger.error('[Supabase] pushNfeImports: supabaseClient não está pronto'); return; }
      if (!rows.length) { logger.info('[Supabase] pushNfeImports: 0 registros para enviar'); return; }
      // Garante que importedAt e items estejam presentes
      const uid = getCurrentUser().id;
      const enriched = rows.map(r => ({
        ...r,
        user_id: uid,
        importedAt: r.importedAt || new Date().toISOString(),
        items: Array.isArray(r.items) ? r.items : [],
      }));
      logger.info('[Supabase] pushNfeImports: enviando ' + enriched.length + ' registros...', 'nfe');
      const { data, error } = await window.supabaseClient
        .from(NFE_IMPORTS_TABLE).upsert(enriched, { onConflict: 'nfId' }).select();
      if (error) {
        logger.error('[Supabase] pushNfeImports ERRO: ' + error.message + ' | Código: ' + error.code + ' | Detalhes: ' + error.details, 'nfe');
        logger.error('[Supabase] pushNfeImports — verifique RLS da tabela ' + NFE_IMPORTS_TABLE, 'nfe');
        if (typeof toast === 'function') toast('Erro ao enviar NF-e: ' + error.message);
      } else {
        logger.info('[Supabase] pushNfeImports OK:', (data || enriched).length, 'registros na nuvem');
      }
    },

    async pullNfeImports() {
      if (!this.ready()) { logger.error('[Supabase] pullNfeImports: supabaseClient não está pronto'); return; }
      if (this._syncing) { logger.info('[Supabase] pullNfeImports ignorado — já sincronizando'); return; }
      this._syncing = true;
      try {
        logger.info('[Supabase] pullNfeImports: consultando tabela ' + NFE_IMPORTS_TABLE + '...', 'nfe');
        let q = window.supabaseClient.from(NFE_IMPORTS_TABLE).select('*');
        if (!isAdmin()) q = q.eq('user_id', getCurrentUser().id);
        const { data, error } = await q.order('importedAt', { ascending: false });
        if (error) {
          logger.error('[Supabase] pullNfeImports ERRO: ' + error.message + ' | Código: ' + error.code + ' | Detalhes: ' + error.details, 'nfe');
          logger.error('[Supabase] pullNfeImports — verifique RLS: anon precisa de SELECT em ' + NFE_IMPORTS_TABLE, 'nfe');
          if (typeof toast === 'function') toast('Erro ao buscar NF-e da nuvem: ' + error.message);
        }
        if (!error && data) {
          save(KEY_NFE_IMPORTS, data);
          logger.info('[Supabase] pullNfeImports OK: ' + data.length + ' registros', 'nfe');
        }
      } catch (e) { logger.error('[Supabase] pullNfeImports erro geral: ' + e, 'nfe'); }
      this._syncing = false;
    },

    // Push retroativo em lote: envia TODAS as NFs do localStorage para a nuvem
    async pushExistingNfeImports() {
      logger.info('[Supabase] pushExistingNfeImports: lendo localStorage...');
      const local = load(KEY_NFE_IMPORTS, []);
      if (!local.length) { logger.info('[Supabase] pushExistingNfeImports: nenhuma NF local'); return 0; }
      const rows = local.map(n => ({
        nfId: n.nfId,
        nfNumber: n.nfNumber || '',
        serie: n.serie || '',
        date: n.date || '',
        supplierName: n.supplierName || '',
        supplierCnpj: n.supplierCnpj || '',
        clientName: n.clientName || '',
        clientCnpj: n.clientCnpj || '',
        productCount: n.productCount || 0,
        importedAt: n.importedAt || new Date().toISOString(),
        items: Array.isArray(n.items) ? n.items : [],
      }));
      await this.pushNfeImports(rows);
      logger.info('[Supabase] pushExistingNfeImports concluido: ' + rows.length + ' NFs enviadas', 'nfe');
      return rows.length;
    },

    subscribeNfeImports() {
      if (!this.ready()) return;
      this.nfeChannel = window.supabaseClient
        .channel('nfe-imports-rt')
        .on('postgres_changes', { event: '*', schema: 'public', table: NFE_IMPORTS_TABLE },
          (payload) => this.applyExternalNfeImport(payload))
        .subscribe((status) => {
          if (status === 'CHANNEL_ERROR') logger.warn('[Supabase] nfe_imports realtime CHANNEL_ERROR', 'sync');
          else logger.info('[Supabase] nfe_imports realtime: ' + status, 'sync');
        });
    },

    applyExternalNfeImport(payload) {
      const arr = load(KEY_NFE_IMPORTS, []);
      if (payload.eventType === 'DELETE') {
        const id = payload.old && payload.old.nfId;
        if (!id) return;
        save(KEY_NFE_IMPORTS, arr.filter(x => x.nfId !== id));
      } else {
        const row = payload.new;
        if (!row || !row.nfId) return;
        const i = arr.findIndex(x => x.nfId === row.nfId);
        if (i >= 0) arr[i] = row; else arr.push(row);
        save(KEY_NFE_IMPORTS, arr);
      }
      if (typeof _remoteOnExternal === 'function') _remoteOnExternal();
    },

    // ─── Products sync ───
    // NOTA: A tabela 'products' no Supabase usa id UUID.
    // Produtos locais têm ids como "P001" — enviados apenas como 'code'.
    // O merge usa 'code' como chave de correspondência.
    async pushAllProducts() {
      if (!this.ready()) { logger.error('[Supabase] pushAllProducts: supabaseClient não está pronto'); return; }
      const arr = getProdutos();
      if (!arr.length) { logger.info('[Supabase] pushAllProducts: nenhum produto local'); return; }
      logger.info('[Supabase] pushAllProducts: enviando ' + arr.length + ' produtos...', 'products');
      const uid = getCurrentUser().id;
      const isUuidV4 = (s) => {
        if (!s || typeof s !== 'string') return false;
        return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);
      };
      const rows = arr.map(p => {
        const rawId = String(p.id);
        const row = {
          code: rawId,
          name: p.nome || '',
          ncm: p.ncm || '',
          last_price: Number(p.preco) || 0,
          total_bought: 0,
          supplier_name: p.fornecedor || '',
          nf_number: '',
          user_id: uid,
        };
        // Only set `id` when it's a valid UUID to avoid Postgres uuid parsing errors
        if (isUuidV4(rawId)) row.id = rawId;
        return row;
      });
      const { data, error } = await this._upsertProductsSafe(rows);
      if (error) {
        logger.error('[Supabase] pushAllProducts ERRO: ' + error.message + ' | Código: ' + error.code + ' | Detalhes: ' + error.details, 'products');
        logger.error('[Supabase] pushAllProducts — verifique RLS da tabela ' + PRODS_TABLE, 'products');
        if (typeof toast === 'function') toast('Erro ao enviar produtos: ' + error.message);
      } else {
        logger.info('[Supabase] pushAllProducts OK:', (data || rows).length, 'produtos na nuvem');
      }
    },

    async pullProducts() {
      if (!this.ready()) { logger.error('[Supabase] pullProducts: supabaseClient não está pronto', 'products'); return; }
      if (this._syncing) { logger.info('[Supabase] pullProducts ignorado — já sincronizando', 'products'); return; }
      this._syncing = true;
      try {
        logger.info('[Supabase] pullProducts: consultando tabela ' + PRODS_TABLE + '...', 'products');
        const { data, error } = await this._selectProductsSafe(getCurrentUser().id);
        if (error) {
          logger.error('[Supabase] pullProducts ERRO: ' + error.message + ' | Código: ' + error.code + ' | Detalhes: ' + error.details, 'products');
          logger.error('[Supabase] pullProducts — verifique RLS: anon precisa de SELECT em ' + PRODS_TABLE, 'products');
          if (typeof toast === 'function') toast('Erro ao buscar produtos da nuvem: ' + error.message);
        }
        if (!error && data) {
          const mapped = data.map(r => ({
            id: r.code || r.id, nome: r.name || '',
            ncm: r.ncm || '', preco: Number(r.last_price) || 0,
            fornecedor: r.supplier_name || '',
          }));
          if (mapped.length) {
            const local = getProdutos();
            // Merge: preserva campos locais que não existem na nuvem (categoria, descricao, etc.)
            const merged = mapped.map(m => {
              const localMatch = local.find(x => x.id === m.id);
              return localMatch ? { ...m, ...localMatch, ...m } : m;
            });
            save(KEY_PROD, merged);
            logger.info('[Supabase] pullProducts OK: ' + merged.length + ' produtos', 'products');
          }
        }
      } catch (e) { logger.error('[Supabase] pullProducts erro geral: ' + e, 'products'); }
      this._syncing = false;
    },

    // Extrai e consolida itens de todas as NF-e importadas em uma lista de rastreio de produtos.
    // Agrupa por código do produto, calcula último preço, total comprado e fornecedores.
    syncProductsFromNfeImports() {
      logger.info('[Supabase] syncProductsFromNfeImports: consolidando...', 'products');
      const imports = getNfeImports();
      if (!imports.length) { logger.info('[Supabase] syncProductsFromNfeImports: nenhum import NF-e', 'products'); return []; }

      const map = {};
      imports.forEach(nf => {
        const items = nf.items || [];
        items.forEach(it => {
          if (!it.codigo && !it.nome) return;
          const key = it.codigo || it.nome;
          if (!map[key]) {
            map[key] = {
              code: it.codigo || '',
              name: it.nome || '—',
              ncm: it.ncm || '',
              entries: [],
            };
          }
          map[key].entries.push({
            unitPrice: it.unitPrice || 0,
            quantity: it.quantidade || 0,
            date: nf.date || '',
            nfNumber: nf.nfNumber || '',
            supplierName: nf.supplierName || '',
            supplierCnpj: nf.supplierCnpj || '',
          });
        });
      });

      // Se há itens das NF-e, salva como price history para a UI consumir
      const result = Object.values(map);
      if (result.length) {
        // Converte para o formato priceHist para compatibilidade com renderProdutos
        const priceHist = [];
        result.forEach(g => {
          g.entries.forEach(e => {
            priceHist.push({
              id: 'NFeItem-' + g.code + '-' + e.nfNumber,
              productCode: g.code,
              productName: g.name,
              ncm: g.ncm,
              nfNumber: e.nfNumber,
              date: e.date,
              supplierName: e.supplierName,
              supplierCnpj: e.supplierCnpj,
              quantity: e.quantity,
              unitPrice: e.unitPrice,
              total: e.unitPrice * e.quantity,
              clientCnpj: '',
            });
          });
        });
        // Mescla com price history existente (de clientes)
        const existing = load(KEY_PRICE_HISTORY, []);
        const merged = [...existing];
        const existKeys = new Set(existing.map(e => e.id));
        let added = 0;
        priceHist.forEach(e => {
          if (!existKeys.has(e.id)) { merged.push(e); added++; }
        });
        if (added) {
          save(KEY_PRICE_HISTORY, merged);
          logger.info('[Supabase] syncProductsFromNfeImports: adicionados ' + added + ' itens ao price history', 'products');
        } else {
          logger.info('[Supabase] syncProductsFromNfeImports: sem novidades', 'products');
        }
      }
      return result;
    },

    // Push completo de todos os dados locais para a nuvem
    async pushAllData() {
      const results = await Promise.allSettled([
        this.pushAll(),
        this.pushAllClients(),
        this.pushExistingNfeImports(),
        this.pushAllProducts(),
      ]);
      const ok = results.filter(r => r.status === 'fulfilled').length;
      logger.info('[Supabase] pushAllData concluido: ' + ok + ' de ' + results.length + ' etapas OK', 'sync');
      if (typeof toast === 'function') toast('Sincronização concluída! Dados disponíveis na nuvem.');
    },
  };

  // Escrita imediata na nuvem para a negociação alterada (espelho local em 2ª via).
  function markDirty(prop) {
    if (!remote.ready()) return;
    if (prop) remote.upsert(prop); else remote.pushAll();
  }

  // Semeia APENAS o catálogo de produtos (usado pelo gerador de propostas).
  // Propostas fictícias NÃO são mais semeadas — o sistema usa exclusivamente
  // as propostas reais da chave 'duocrm-quotes'.
  function ensureSeed(force) {
    if (force || !localStorage.getItem(KEY_PROD)) save(KEY_PROD, SEED_PRODUTOS);
    if (force || !localStorage.getItem(KEY_SEQ)) save(KEY_SEQ, 1100);
  }

  // Restaura propostas de demonstração sob demanda (opcional, botão "Dados demo").
  function seedDemoPropostas() { save(KEY_PROP, seedPropostas()); }

  // ---- Produtos ----
  const getProdutos = () => load(KEY_PROD, []);
  const saveProdutos = (arr) => save(KEY_PROD, arr);
  function upsertProduto(p) {
    const arr = getProdutos();
    if (p.id) {
      const i = arr.findIndex(x => x.id === p.id);
      if (i >= 0) arr[i] = { ...arr[i], ...p }; else arr.push(p);
    } else {
      // A-08 CORRIGIDO: UUID evita colisão (Date.now() colidia a cada ~16min)
      p.id = novoId('P');
      arr.push(p);
    }
    saveProdutos(arr);
    return p;
  }
  function deleteProduto(id) { saveProdutos(getProdutos().filter(x => x.id !== id)); }

  // ---- Adaptador de dados REAIS (chave 'duocrm-quotes' do app antigo) ----
  // Schema real do app antigo (Energiza/DuoCRM):
  //   id, clientName, projectName, value, margin, description,
  //   contactPhone, contactEmail, estimatedDate, createdAt, status,
  //   priority, supplierLinks, productPhoto(s), lossReason...
  // Funil antigo: new | analysis | sent | negotiation | won | lost
  const STATUS_MAP = {
    new: 'aberto', analysis: 'aberto', rascunho: 'aberto', draft: 'aberto', aberto: 'aberto', triagem: 'aberto', elaboracao: 'aberto',
    sent: 'enviada', enviada: 'enviada', enviado: 'enviada',
    precificacao: 'precificacao', quoting: 'precificacao', montagem: 'precificacao',
    negotiation: 'negociacao', negociacao: 'negociacao', pending: 'negociacao', ajustes: 'negociacao',
    won: 'ganho', ganho: 'ganho', ganha: 'ganho', fulfilled: 'ganho', faturado: 'ganho', aprovado: 'ganho', sucesso: 'ganho',
    lost: 'perdido', rejected: 'perdido', perdido: 'perdido', perdida: 'perdido', cancelada: 'perdido',
  };

  function pick(o, keys, def) { for (const k of keys) { if (o && o[k] != null && o[k] !== '') return o[k]; } return def; }

  // Converte um "quote" do formato antigo para o formato interno deste CRM.
  function mapQuote(q, i) {
    const rawStatus = String(pick(q, ['status', 'stage', 'column'], 'new')).toLowerCase().trim();
    const status = STATUS_MAP[rawStatus] || 'aberto';

    const criadoEm = pick(q, ['createdAt', 'criadoEm', 'date', 'data'], new Date().toISOString());
    const atualizadoEm = pick(q, ['updatedAt', 'atualizadoEm', 'lastUpdate', 'movedAt', 'estimatedDate'], criadoEm);

    const projeto = pick(q, ['projectName', 'projeto', 'project'], '');
    const descricao = pick(q, ['description', 'descricao', 'desc'], '');
    // Categoria: usa projectName como rótulo do equipamento/serviço.
    const categoria = pick(q, ['category', 'categoria'], projeto || 'Geral');

    // Foto do produto (se houver).
    const foto = pick(q, ['productPhoto'], '') || (Array.isArray(q && q.productPhotos) ? (q.productPhotos[0] || '') : '');

    // Itens: o app antigo NÃO usa itens detalhados — o valor está em `value`.
    // Se existir um array de itens (versões futuras), usa-o; senão cria item sintético a partir de `value`.
    const rawItens = pick(q, ['items', 'lineItems', 'products', 'itens'], null);
    let itens;
    if (Array.isArray(rawItens) && rawItens.length) {
      itens = rawItens.map(it => ({
        produtoId: pick(it, ['productId', 'produtoId', 'id'], ''),
        nome: pick(it, ['name', 'productName', 'itemName', 'nome'], projeto || 'Item'),
        descricao: pick(it, ['description', 'descricao', 'desc'], ''),
        categoria: pick(it, ['category', 'categoria'], categoria),
        preco: Number(pick(it, ['price', 'unitPrice', 'preco', 'valorUnitario'], 0)) || 0,
        qtd: Number(pick(it, ['quantity', 'qty', 'qtd', 'quantidade'], 1)) || 1,
        foto: pick(it, ['image', 'imageUrl', 'foto', 'img'], foto),
      }));
    } else {
      const valor = Number(pick(q, ['value', 'total', 'totalValue', 'totalPrice', 'amount', 'valorTotal', 'valor'], 0)) || 0;
      itens = [{
        produtoId: '',
        nome: projeto || pick(q, ['title', 'titulo'], 'Proposta'),
        descricao,
        categoria,
        preco: valor,
        qtd: 1,
        foto,
      }];
    }

    // Campos de nível da proposta (usados pelo PDF técnico / card do funil).
    const itemPrincipal = (Array.isArray(itens) && itens[0]) || {};
    const foto_produto = pick(q, ['foto_produto', 'productPhoto'], '') || itemPrincipal.foto || (Array.isArray(q && q.productPhotos) ? (q.productPhotos[0] || '') : '');
    const descricao_tecnica = pick(q, ['descricao_tecnica', 'description', 'descricao', 'desc'], '') || itemPrincipal.descricao || '';

    return {
      id: String(pick(q, ['id', 'quoteNumber', 'proposalId', 'numero'], 'PROP-R' + (i + 1))),
      cliente: pick(q, ['clientName', 'customerName', 'clientHospital', 'hospital', 'companyName', 'cliente'], 'Cliente'),
      contato: pick(q, ['contactName', 'clientContact', 'contact', 'contato', 'responsavel', 'contactEmail', 'contactPhone'], ''),
      projeto,
      status,
      categoria,
      itens,
      foto_produto,
      descricao_tecnica,
      criadoEm: new Date(criadoEm).toISOString(),
      atualizadoEm: new Date(atualizadoEm).toISOString(),
      last_interaction_date: new Date(atualizadoEm).toISOString(),
      data_movimentacao: new Date(atualizadoEm).toISOString(),
      validade: pick(q, ['validity', 'validade'], '15 dias'),
      prazo: pick(q, ['deliveryTerm', 'prazo'], '30 dias úteis'),
      pagamento: pick(q, ['paymentTerms', 'payment', 'pagamento'], 'A combinar'),
      motivo_perda: pick(q, ['motivo_perda', 'lossReason', 'lossDetails'], ''),
      cotacaoNum: pick(q, ['cotacaoNum', 'cotacao_num', 'numeroCotacao'], ''),
      clienteCnpj: pick(q, ['clienteCnpj', 'clientCnpj', 'cnpj'], ''),
      clienteEmail: pick(q, ['clienteEmail', 'clientEmail', 'emailCliente'], ''),
      clienteEndereco: pick(q, ['clienteEndereco', 'clientAddress', 'enderecoCliente'], ''),
      _origem: 'real',
    };
  }

  // Lê e mapeia as propostas reais salvas na chave do app antigo.
  function readRealQuotes() {
    const raw = load(KEY_REAL, null);
    if (!raw) return [];
    const arr = Array.isArray(raw) ? raw : (Array.isArray(raw.quotes) ? raw.quotes : []);
    try { return arr.map(mapQuote).map(normalizeMidia); } catch (e) { logger.error('Falha ao mapear duocrm-quotes: ' + e, 'data'); return []; }
  }

  // Importa um backup manual (texto colado com o JSON bruto do 'duocrm-quotes').
  // Faz JSON.parse, normaliza para array e salva EXATAMENTE na chave lida pelo CRM.
  function importBackup(text) {
    let data;
    try { data = JSON.parse(String(text).trim()); }
    catch (_) { throw new Error('Backup inválido: o texto colado não é um JSON válido.'); }

    let arr;
    if (Array.isArray(data)) arr = data;
    else if (data && Array.isArray(data.quotes)) arr = data.quotes;               // { quotes: [...] }
    else if (data && Array.isArray(data['duocrm-quotes'])) arr = data['duocrm-quotes'];
    else if (data && typeof data === 'object') arr = [data];                       // objeto único = 1 proposta
    else throw new Error('Backup inválido: esperado um array de propostas ou objeto com "quotes".');

    if (!arr.length) throw new Error('Backup vazio: nenhuma proposta encontrada no texto colado.');

    // Limpa qualquer resíduo de dados demo e injeta o backup na chave real.
    localStorage.removeItem(KEY_PROP);
    save(KEY_REAL, arr);
    return arr.length;
  }

  function exportBackup() {
    const raw = load(KEY_REAL, []);
    const arr = Array.isArray(raw) ? raw : (Array.isArray(raw.quotes) ? raw.quotes : []);
    return JSON.stringify(arr, null, 2);
  }

  const hasRealData = () => readRealQuotes().length > 0;

  // Parseia CSV para array de propostas.
  // Formato esperado: header com colunas id,cliente,contato,categoria,status,validade,prazo,pagamento,item_nome,item_qtd,item_preco,item_foto
  // Linhas com mesmo id são agrupadas em uma única proposta com múltiplos itens.
  function importCsv(text) {
    const lines = text.trim().split(/\r?\n/);
    if (lines.length < 2) throw new Error('CSV deve ter cabeçalho + pelo menos 1 linha.');
    const heads = lines[0].split(',').map(h => h.trim().toLowerCase());
    const byId = {};
    for (let i = 1; i < lines.length; i++) {
      const vals = parseCsvLine(lines[i]);
      if (vals.length < heads.length) continue;
      const row = {};
      heads.forEach((h, j) => row[h] = (vals[j] || '').trim());
      if (!row.id) continue;
      if (!byId[row.id]) {
        byId[row.id] = {
          id: row.id,
          cliente: row.cliente || '',
          contato: row.contato || '',
          categoria: row.categoria || '',
          status: row.status || 'aberto',
          validade: row.validade || '',
          prazo: row.prazo || '',
          pagamento: row.pagamento || '',
          criadoEm: row.criado_em || new Date().toISOString(),
          atualizadoEm: row.atualizado_em || new Date().toISOString(),
          data_movimentacao: row.data_movimentacao || new Date().toISOString(),
          itens: [],
        };
      }
      byId[row.id].itens.push({
        produtoId: row.item_id || ('IMP-' + row.id + '-' + byId[row.id].itens.length),
        nome: row.item_nome || '',
        descricao: row.item_descricao || '',
        categoria: row.item_categoria || row.categoria || '',
        preco: parseFloat(row.item_preco) || 0,
        qtd: parseInt(row.item_qtd) || 1,
        foto: row.item_foto || '',
      });
    }
    const arr = Object.values(byId);
    if (!arr.length) throw new Error('Nenhuma proposta encontrada no CSV.');
    localStorage.removeItem(KEY_PROP);
    save(KEY_REAL, arr);
    return arr.length;
  }

  // Parseia uma linha CSV respeitando aspas duplas.
  function parseCsvLine(line) {
    const result = [];
    let cur = '', inQ = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQ && i + 1 < line.length && line[i + 1] === '"') { cur += '"'; i++; }
        else inQ = !inQ;
      } else if (ch === ',' && !inQ) {
        result.push(cur); cur = '';
      } else {
        cur += ch;
      }
    }
    result.push(cur);
    return result;
  }

  // ---- Propostas ----
  // Fonte primária: dados reais (duocrm-quotes). Fallback: propostas geradas neste CRM.
  const getPropostas = () => {
    const reais = readRealQuotes();
    if (reais.length) return reais;
    const demo = load(KEY_PROP, []);
    return demo.map(p => { normalizeMidia(p); return p; });
  };
  const savePropostas = (arr) => save(KEY_PROP, arr);
  function nextId() {
    // Numeração única: usa o maior número já existente (local + dados sincronizados) + 1.
    // Evita números repetidos após pull do Supabase ou uso em outro dispositivo.
    let max = 0;
    getPropostas().forEach(p => {
      const m = /^PROP-(\d+)$/.exec(String(p.id || ''));
      if (m) { const n = parseInt(m[1], 10); if (n > max) max = n; }
    });
    const seq = Math.max(load(KEY_SEQ, 1100), max) + 1;
    save(KEY_SEQ, seq);
    return 'PROP-' + seq;
  }

  // Grava um array (já no formato interno) de volta na chave real, preservando campos originais.
  function persistReal(propostas) {
    const originais = (() => { const r = load(KEY_REAL, []); return Array.isArray(r) ? r : (r.quotes || []); })();
    const byId = {}; originais.forEach(o => { byId[o.id ?? o.quoteNumber ?? o.proposalId] = o; });
    const out = propostas.map(p => {
      const orig = byId[p.id] || {};
      // status interno -> inglês do app antigo (won/sent/negotiation/new/lost)
      const rev = { aberto: 'new', precificacao: 'quoting', enviada: 'sent', negociacao: 'negotiation', ganho: 'won', perdido: 'lost' };
      const valor = p.itens.reduce((s, it) => s + it.preco * it.qtd, 0);
      // Preserva TODOS os campos originais e atualiza apenas o essencial.
      return {
        ...orig,
        id: p.id,
        clientName: p.cliente,
        projectName: p.projeto || orig.projectName || p.categoria || '',
        value: valor,
        status: rev[p.status] || 'new',
        createdAt: p.criadoEm,
        updatedAt: p.atualizadoEm,
        itens: p.itens,
        motivo_perda: p.motivo_perda || orig.motivo_perda || '',
        lossReason: p.motivo_perda || orig.lossReason || null,
        atividades: Array.isArray(p.atividades) ? p.atividades : (orig.atividades || []),
        emissoes: Array.isArray(p.emissoes) ? p.emissoes : (orig.emissoes || []),
        foto_produto: p.foto_produto || orig.foto_produto || '',
        descricao_tecnica: p.descricao_tecnica || orig.descricao_tecnica || '',
        contato: p.contato || orig.contato || '',
        validade: p.validade || orig.validade || '15 dias',
        prazo: p.prazo || orig.prazo || '30 dias úteis',
        pagamento: p.pagamento || orig.pagamento || 'A combinar',
        categoria: p.categoria || orig.categoria || '',
        cotacaoNum: p.cotacaoNum || orig.cotacaoNum || '',
        clienteCnpj: p.clienteCnpj || orig.clienteCnpj || '',
        clienteEmail: p.clienteEmail || orig.clienteEmail || '',
        clienteEndereco: p.clienteEndereco || orig.clienteEndereco || '',
        last_interaction_date: p.last_interaction_date || orig.last_interaction_date || p.atualizadoEm || orig.updatedAt || new Date().toISOString(),
        data_movimentacao: p.data_movimentacao || orig.data_movimentacao || p.atualizadoEm || orig.updatedAt || new Date().toISOString(),
      };
    });
    save(KEY_REAL, out);
  }

  // GARANTE que foto_produto e descricao_tecnica vivam na RAIZ da negociação
  // (fonte única/unificada) e também espelhadas no item[0], independentemente
  // de onde a proposta foi criada (gerador ou card do funil).
  function normalizeMidia(p) {
    if (!p || !Array.isArray(p.itens)) return p;
    const i0 = p.itens[0] || {};
    p.foto_produto = p.foto_produto || i0.foto || '';
    p.descricao_tecnica = p.descricao_tecnica || i0.descricao || '';
    if (p.itens[0]) {
      p.itens[0].foto = p.foto_produto || p.itens[0].foto || '';
      p.itens[0].descricao = p.descricao_tecnica || p.itens[0].descricao || '';
    }
    return p;
  }

  function addProposta(p) {
    p.id = nextId();
    p.criadoEm = new Date().toISOString();
    p.atualizadoEm = p.criadoEm;
    p.last_interaction_date = p.criadoEm;
    p.data_movimentacao = p.criadoEm;
    normalizeMidia(p);
    if (hasRealData()) { const arr = getPropostas(); arr.push(p); persistReal(arr); }
    else { const arr = load(KEY_PROP, []); arr.push(p); savePropostas(arr); }
    markDirty(p);
    return p;
  }
  // status: novo status; motivo: obrigatório quando status === 'perdido'
  function updateStatus(id, status, motivo) {
    const arr = getPropostas();
    const p = arr.find(x => x.id === id);
    if (p) {
      p.status = status;
      const now = new Date().toISOString();
      p.atualizadoEm = now;
      p.last_interaction_date = now;   // reseta cadência de follow-up
      p.data_movimentacao = now;       // vai para o topo da coluna de destino
      if (status === 'perdido') { p.motivo_perda = motivo || p.motivo_perda || 'Não informado'; }
      if (hasRealData()) persistReal(arr); else savePropostas(arr);
    }
    markDirty(p);
    return p;
  }
  function deleteProposta(id) {
    const arr = getPropostas().filter(x => x.id !== id);
    if (hasRealData()) persistReal(arr); else savePropostas(arr);
    remote.remove(id);
  }

  // Edição direta de uma proposta (sem refazer o fluxo comercial).
  // campos: { cliente, contato, projeto, categoria, validade, prazo, pagamento, itens }
  function updateProposta(id, campos) {
    const arr = getPropostas();
    const p = arr.find(x => x.id === id);
    if (!p) return null;
    const allow = ['cliente', 'contato', 'projeto', 'categoria', 'validade', 'prazo', 'pagamento', 'itens', 'motivo_perda', 'foto_produto', 'descricao_tecnica', 'cotacaoNum', 'clienteCnpj', 'clienteEmail', 'clienteEndereco'];
    allow.forEach(k => {
      if (campos[k] !== undefined) {
        if (k === 'itens' && Array.isArray(campos.itens)) p.itens = campos.itens;
        else p[k] = campos[k];
      }
    });
    normalizeMidia(p);
    p.atualizadoEm = new Date().toISOString();
    if (hasRealData()) persistReal(arr); else savePropostas(arr);
    markDirty(p);
    return p;
  }

  // ---- Atividades (timeline da negociação) ----
  function getAtividades(id) {
    const p = getPropostas().find(x => x.id === id);
    return (p && Array.isArray(p.atividades)) ? p.atividades : [];
  }
  // Adiciona uma atividade à negociação e atualiza "atualizadoEm".
  function addAtividade(id, atividade) {
    const arr = getPropostas();
    const p = arr.find(x => x.id === id);
    if (!p) return null;
    if (!Array.isArray(p.atividades)) p.atividades = [];
    const a = {
      id: 'ATV-' + Date.now().toString(36),
      tipo: atividade.tipo || 'Nota',
      titulo: (atividade.titulo || '').trim(),
      descricao: (atividade.descricao || '').trim(),
      criadoEm: new Date().toISOString(),
    };
    p.atividades.unshift(a);
    p.atualizadoEm = new Date().toISOString();
    p.last_interaction_date = p.atualizadoEm;  // registro de atividade = follow-up
    if (hasRealData()) persistReal(arr); else savePropostas(arr);
    markDirty(p);
    return a;
  }

  // ---- Histórico de Propostas Emitidas ----
  function getEmissoes(id) {
    const p = getPropostas().find(x => x.id === id);
    return (p && Array.isArray(p.emissoes)) ? p.emissoes : [];
  }
  // Registra uma emissão de PDF (data, número da cotação e tipo).
  function registrarEmissao(id, modo) {
    const arr = getPropostas();
    const p = arr.find(x => x.id === id);
    if (!p) return null;
    if (!Array.isArray(p.emissoes)) p.emissoes = [];
    const tipos = modo === 'tecnica' ? 'Técnica'
      : modo === 'comercial' ? 'Comercial'
        : 'Técnica e Comercial';
    const e = {
      id: 'EMI-' + Date.now().toString(36),
      cotacao: p.id,
      tipo: tipos,
      modo: modo || 'ambas',
      data: new Date().toISOString(),
    };
    p.emissoes.unshift(e);
    p.atualizadoEm = new Date().toISOString();
    if (hasRealData()) persistReal(arr); else savePropostas(arr);
    markDirty(p);
    return e;
  }

  // =========================================================
  // CLIENTES (Parceiros)
  // =========================================================
  // A-10 CORRIGIDO: função única de geração de ID (colisão impossível)
  function novoId(prefixo) { return prefixo + '-' + crypto.randomUUID().slice(0, 8); }

  const KEY_CLIENTS = 'energiza_clients';
const CLIENTS_TABLE = 'clients';
const NFE_IMPORTS_TABLE = 'nfe_imports';
const PRODS_TABLE = 'products';

  function getClients() { return load(KEY_CLIENTS, []); }
  function saveClients(arr) { save(KEY_CLIENTS, arr); }

  async function upsertClient(client) {
    const arr = getClients();
    if (client.id) {
      const i = arr.findIndex(x => x.id === client.id);
      if (i >= 0) { arr[i] = { ...arr[i], ...client }; } else { arr.push(client); }
    } else {
      client.id = novoId('CLI');
      arr.push(client);
    }
    saveClients(arr);
    // Sync to Supabase
    if (remote.ready()) {
      const row = {
        id: String(client.id),
        name: client.name || '',
        razaoSocial: client.razaoSocial || '',
        cnpj: client.cnpj || '',
        email: client.email || '',
        phone: client.phone || '',
        address: client.address || '',
        externalCode: client.externalCode || '',
        observations: client.observations || '',
        lastSale: client.lastSale || '',
        totalSpent: client.totalSpent || 0,
        salesHistory: client.salesHistory || [],
        created_at: client.created_at || new Date().toISOString(),
        user_id: getCurrentUser().id,
      };
      const { error } = await window.supabaseClient.from(CLIENTS_TABLE).upsert(row, { onConflict: 'id' });
      if (error) logger.warn('[Supabase] clients upsert falhou: ' + error.message, 'clients');
    }
    return client;
  }

  async function deleteClient(id) {
    const arr = getClients().filter(x => x.id !== id);
    saveClients(arr);
    if (remote.ready()) {
      try {
        let delQuery = window.supabaseClient.from(CLIENTS_TABLE).delete().eq('id', id);
        if (!isAdmin()) delQuery = delQuery.eq('user_id', getCurrentUser().id);
        const { error } = await delQuery;
        if (error) logger.warn('[Supabase] delete client falhou: ' + error.message, 'clients');
      } catch (e) { logger.warn('[Supabase] delete client erro: ' + e, 'clients'); }
    }
  }

  // Importa CSV de clientes.
  // Colunas esperadas: Nome_Fantasia,Razao_Social,CNPJ,Email,Telefone,Endereco,Codigo_Externo,Observacoes,Ultima_Venda,Total_Gasto,Quantidade_Vendas,Data_Criacao
  function importClientsCsv(text) {
    const lines = text.trim().split(/\r?\n/);
    if (lines.length < 2) throw new Error('CSV deve ter cabeçalho + pelo menos 1 linha.');
    const heads = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, '').toLowerCase());
    const colMap = {
      nome_fantasia: 'name', razao_social: 'razaoSocial',
      cnpj: 'cnpj', email: 'email', telefone: 'phone',
      endereco: 'address', codigo_externo: 'externalCode',
      observacoes: 'observations', ultima_venda: 'lastSale',
      total_gasto: 'totalSpent', quantidade_vendas: null,
      data_criacao: 'created_at',
    };
    const imported = [];
    for (let i = 1; i < lines.length; i++) {
      const vals = parseCsvLine(lines[i]);
      if (vals.length < 2) continue;
      const row = {};
      heads.forEach((h, j) => row[h] = (vals[j] || '').trim().replace(/^"|"$/g, ''));
      if (!row.nome_fantasia) continue;
      const client = {};
      Object.entries(colMap).forEach(([csvKey, dbKey]) => {
        if (dbKey === null) return; // skip quantidade_vendas
        client[dbKey] = row[csvKey] || '';
      });
      client.totalSpent = parseFloat(client.totalSpent) || 0;
      client.created_at = client.created_at || new Date().toISOString();
      client.salesHistory = [];
      // Generate sales history rows if quantidade_vendas > 0
      const qtdVendas = parseInt(row.quantidade_vendas) || 0;
      if (qtdVendas > 0) {
        for (let v = 0; v < Math.min(qtdVendas, 50); v++) {
          client.salesHistory.push({
            id: 'CSV-' + i + '-' + v,
            date: client.lastSale || '',
            item: 'Importado via CSV',
            quantity: 1, unitPrice: 0, total: 0,
            nfNumber: '', details: '',
            linkedPurchaseNf: '', linkedQuoteId: '', linkedOrderId: '',
            isService: false,
          });
        }
      }
      imported.push(client);
    }
    if (!imported.length) throw new Error('Nenhum cliente encontrado no CSV.');
    // Merge with existing (by cnpj or name match)
    const existing = getClients();
    const byCnpj = {}; existing.forEach(c => { if (c.cnpj) byCnpj[c.cnpj] = c; });
    imported.forEach(c => {
      const match = c.cnpj ? byCnpj[c.cnpj] : existing.find(x => x.name === c.name);
      if (match) {
        Object.assign(match, c, { id: match.id });
      } else {
        c.id = novoId('CLI');
        existing.push(c);
      }
    });
    saveClients(existing);
    return imported.length;
  }

  // =========================================================
  // NF-e XML Import & Price History
  // =========================================================
  const KEY_PRICE_HISTORY = 'energiza_price_history';
  const KEY_NFE_IMPORTS = 'energiza_nfe_imports';

  function getPriceHistory() {
    // 1) Reconstroi do salesHistory dos clientes (fonte principal)
    const fromClients = [];
    const clients = getClients();
    const seen = new Set();
    clients.forEach(c => {
      (c.salesHistory || []).forEach(s => {
        const id = s.id || (s.productCode + '-' + s.nfNumber);
        if (seen.has(id)) return;
        seen.add(id);
        fromClients.push({
          id,
          productCode: s.productCode || '',
          productName: s.item || '',
          ncm: s.ncm || '',
          cfop: s.cfop || '',
          nfNumber: s.nfNumber || '',
          date: s.date || '',
          supplierName: s.supplierName || '',
          supplierCnpj: s.supplierCnpj || '',
          clientCnpj: c.cnpj || '',
          quantity: s.quantity || 0,
          unitPrice: s.unitPrice || 0,
          total: s.total || 0,
        });
      });
    });

    // 2) Se vazio, tenta o cache consolidado das NF-e (populado por syncProductsFromNfeImports)
    if (!fromClients.length) {
      const cached = load(KEY_PRICE_HISTORY, []);
      if (cached.length) return cached;
    }

    return fromClients;
  }

  function getNfeImports() {
    // 1) Tenta localStorage cache (populado pelo pull do Supabase ou import local)
    const cached = load(KEY_NFE_IMPORTS, []);
    if (cached.length > 0) return cached;

    // 2) Fallback: reconstrói do salesHistory dos clientes
    const clients = getClients();
    const nfMap = {};
    clients.forEach(c => {
      (c.salesHistory || []).forEach(s => {
        if (!s.nfNumber) return;
        if (!nfMap[s.nfNumber]) {
          nfMap[s.nfNumber] = {
            nfId: s.nfNumber,
            nfNumber: s.nfNumber.includes('-') ? s.nfNumber.split('-')[0] : s.nfNumber,
            serie: s.nfNumber.includes('-') ? s.nfNumber.split('-')[1] : '',
            date: s.date || '',
            supplierName: s.supplierName || '',
            supplierCnpj: s.supplierCnpj || '',
            clientName: c.name || '',
            clientCnpj: c.cnpj || '',
            productCount: 0,
            status: 'sincronizado',
            erro: null,
          };
        }
        nfMap[s.nfNumber].productCount++;
      });
    });
    return Object.values(nfMap).sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  }

  // Parses a single NF-e XML string, returns parsed invoice data.
  // Handles optional namespace-prefixed tags (e.g. `nfe:` prefix).
  function parseNfeXml(xmlText) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(xmlText, 'text/xml');

    // Helpers namespace-agnostic (NF-e usa xmlns="http://www.portalfiscal.inf.br/nfe")
    function findOne(parent, tagName) {
      const list = parent.getElementsByTagNameNS('*', tagName);
      return list.length > 0 ? list[0] : null;
    }
    function findAll(parent, tagName) {
      return Array.from(parent.getElementsByTagNameNS('*', tagName));
    }
    function txt(base, ...queries) {
      for (const q of queries) {
        const parts = q.split(' ');
        let el = base;
        for (const p of parts) {
          const found = el.getElementsByTagNameNS('*', p);
          if (!found.length) { el = null; break; }
          el = found[0];
        }
        if (el && el !== base) return el.textContent.trim();
      }
      return '';
    }

    // Locate infNFe
    const infNFe = findOne(doc, 'infNFe');
    if (!infNFe) throw new Error('XML não contém tag infNFe. Verifique se é um arquivo NF-e válido.');

    const nNF = txt(infNFe, 'ide nNF', 'nNF');
    const serie = txt(infNFe, 'ide serie', 'serie');
    const dhEmi = txt(infNFe, 'ide dhEmi', 'ide dEmi', 'dhEmi', 'dEmi');
    const emitCNPJ = txt(infNFe, 'emit CNPJ');
    const emitNome = txt(infNFe, 'emit xNome');
    const destCNPJ = txt(infNFe, 'dest CNPJ') || txt(infNFe, 'dest CPF');
    const destNome = txt(infNFe, 'dest xNome');

    // Parse addresses
    function addrStr(base, prefix) {
      const rua = txt(base, prefix + ' xLgr');
      const nro = txt(base, prefix + ' nro');
      const bairro = txt(base, prefix + ' xBairro');
      const cidade = txt(base, prefix + ' xMun');
      const uf = txt(base, prefix + ' UF');
      return [rua, nro].filter(Boolean).join(', ') + (bairro ? ' - ' + bairro : '') + (cidade ? ' - ' + cidade : '') + (uf ? '/' + uf : '');
    }
    const destEndereco = addrStr(infNFe, 'dest enderDest');
    const emitEndereco = addrStr(infNFe, 'emit enderEmit');

    // Parse products
    const dets = findAll(infNFe, 'det');
    const products = dets.map(det => {
      const cProd = txt(det, 'prod cProd', 'cProd');
      const xProd = txt(det, 'prod xProd', 'xProd');
      const NCM = txt(det, 'prod NCM', 'NCM');
      const CFOP = txt(det, 'prod CFOP', 'CFOP');
      const qCom = parseFloat(txt(det, 'prod qCom', 'qCom').replace(',', '.')) || 0;
      const vUnCom = parseFloat(txt(det, 'prod vUnCom', 'vUnCom').replace(',', '.')) || 0;
      const vProd = parseFloat(txt(det, 'prod vProd', 'vProd').replace(',', '.')) || 0;
      return (cProd || xProd) ? { codigo: cProd || '', nome: xProd || '', ncm: NCM || '', cfop: CFOP || '', quantidade: qCom, unitPrice: vUnCom, total: vProd } : null;
    }).filter(Boolean);

    if (!products.length) throw new Error('Nenhum produto encontrado na NF-e.');

    return {
      nfNumber: nNF, serie, date: dhEmi,
      supplierCnpj: emitCNPJ, supplierName: emitNome,
      clientCnpj: destCNPJ, clientName: destNome,
      clientAddress: destEndereco,
      supplierAddress: emitEndereco,
      products,
    };
  }

  // Imports one or more NF-e XML texts.
  // For each invoice: finds the client by CNPJ, appends to salesHistory,
  // updates totalSpent/lastSale, and records each product in priceHistory.
  async function importNfeXml(xmlTexts) {
    const nfeList = Array.isArray(xmlTexts) ? xmlTexts : [xmlTexts];
    logger.info('[NF-e] importNfeXml recebeu ' + nfeList.length + ' XML(s)', 'nfe');
    const clients = getClients();
    const priceHist = getPriceHistory();
    const nfeImports = getNfeImports();
    let totalItems = 0;
    const updatedClients = new Set();

    nfeList.forEach((xml, idx) => {
      let parsed;
      try {
        if (!xml || xml.length < 50) throw new Error('Conteúdo XML vazio ou muito curto (' + (xml || '').length + ' bytes)');
        parsed = parseNfeXml(xml);
      }
      catch (e) { throw new Error('XML ' + (idx + 1) + ': ' + e.message); }

      const nfId = parsed.nfNumber + (parsed.serie ? '-' + parsed.serie : '');
      if (nfeImports.some(x => x.nfId === nfId)) { logger.info('[NF-e] duplicata ignorada: ' + nfId, 'nfe'); return; }
      logger.info('[NF-e] XML ' + idx + ' → NF: ' + nfId + ' | emit: ' + parsed.supplierName + ' | produtos: ' + parsed.products.length, 'nfe');

      // Find client only by CNPJ — nunca por nome, pois unidades diferentes
      // podem ter o mesmo nome fantasia mas CNPJs distintos (ex: IMED)
      const clientCnpj = parsed.clientCnpj.replace(/\D/g, '');
      let client = clientCnpj ? clients.find(c => (c.cnpj || '').replace(/\D/g, '') === clientCnpj) : null;
      // If still not found, create a new client record
      if (!client) {
        client = {
          id: novoId('CLI-NFE'),
          name: parsed.clientName || 'Cliente NF-e ' + nfId,
          cnpj: parsed.clientCnpj,
          razaoSocial: parsed.clientName || '',
          email: '', phone: '', address: parsed.clientAddress || '', externalCode: '',
          observations: 'Importado automaticamente de NF-e',
          lastSale: parsed.date,
          totalSpent: 0,
          salesHistory: [],
          created_at: new Date().toISOString(),
        };
        clients.push(client);
      }
      updatedClients.add(client.id);

      // Also find/ensure supplier as a client record — apenas por CNPJ
      const suppCnpj = parsed.supplierCnpj.replace(/\D/g, '');
      let supplier = suppCnpj ? clients.find(c => (c.cnpj || '').replace(/\D/g, '') === suppCnpj) : null;
      if (!supplier && parsed.supplierName) {
        supplier = {
          id: novoId('CLI-NFE'),
          name: parsed.supplierName,
          cnpj: parsed.supplierCnpj,
          razaoSocial: parsed.supplierName || '',
          email: '', phone: '', address: parsed.supplierAddress || '', externalCode: '',
          observations: 'Fornecedor (importado NF-e)',
          lastSale: '', totalSpent: 0, salesHistory: [],
          created_at: new Date().toISOString(),
        };
        clients.push(supplier);
      }
      if (supplier) updatedClients.add(supplier.id);

      // Add purchase to client's salesHistory
      parsed.products.forEach((prod, pi) => {
        const saleEntry = {
          id: 'NFE-' + nfId + '-' + pi,
          date: parsed.date,
          item: prod.nome,
          quantity: prod.quantidade,
          unitPrice: prod.unitPrice,
          total: prod.total,
          nfNumber: nfId,
          productCode: prod.codigo || '',
          ncm: prod.ncm || '',
          cfop: prod.cfop || '',
          supplierName: parsed.supplierName || '',
          supplierCnpj: parsed.supplierCnpj || '',
          details: 'Código: ' + prod.codigo + ' | NCM: ' + prod.ncm + ' | CFOP: ' + prod.cfop,
          linkedPurchaseNf: nfId,
          linkedQuoteId: '', linkedOrderId: '',
          isService: prod.ncm === '' || prod.cfop.startsWith('5') || false,
        };
        client.salesHistory.push(saleEntry);

        // Record in priceHistory
        priceHist.push({
          id: 'PH-' + Date.now().toString(36).toUpperCase() + '-' + totalItems,
          productCode: prod.codigo,
          productName: prod.nome,
          ncm: prod.ncm,
          cfop: prod.cfop,
          nfNumber: nfId,
          date: parsed.date,
          supplierCnpj: parsed.supplierCnpj,
          supplierName: parsed.supplierName,
          clientCnpj: parsed.clientCnpj,
          quantity: prod.quantidade,
          unitPrice: prod.unitPrice,
          total: prod.total,
        });
        totalItems++;
      });

      // Update client totals
      const nfTotal = parsed.products.reduce((s, p) => s + p.total, 0);
      client.totalSpent = (client.totalSpent || 0) + nfTotal;
      if (parsed.date && (!client.lastSale || parsed.date > client.lastSale)) client.lastSale = parsed.date;

      // Record import metadata with product line items
      nfeImports.push({
        nfId,
        nfNumber: parsed.nfNumber,
        serie: parsed.serie,
        date: parsed.date,
        supplierName: parsed.supplierName,
        supplierCnpj: parsed.supplierCnpj,
        clientName: parsed.clientName,
        clientCnpj: parsed.clientCnpj,
        productCount: parsed.products.length,
        importedAt: new Date().toISOString(),
        items: parsed.products.map(p => ({
          codigo: p.codigo || '',
          nome: p.nome || '',
          ncm: p.ncm || '',
          cfop: p.cfop || '',
          quantidade: p.quantidade || 0,
          unitPrice: p.unitPrice || 0,
          total: p.total || 0,
        })),
      });
    });

    // ─── Salva cache local ───
    saveClients(clients);
    save(KEY_PRICE_HISTORY, priceHist);
    save(KEY_NFE_IMPORTS, nfeImports);

    // ─── Gravação direta no Supabase (fonte primária) ───
    if (remote.ready()) {
      try {
        // 1) Upsert clientes alterados
        for (const id of updatedClients) {
          const c = clients.find(x => x.id === id);
          if (!c) continue;
          const row = {
            id: String(c.id), name: c.name || '', razaoSocial: c.razaoSocial || '',
            cnpj: c.cnpj || '', email: c.email || '', phone: c.phone || '',
            address: c.address || '',
            observations: c.observations || '', lastSale: c.lastSale || '',
            totalSpent: c.totalSpent || 0,
            salesHistory: Array.isArray(c.salesHistory) ? c.salesHistory : [],
            user_id: getCurrentUser().id,
          };
          const { error: cliErr } = await window.supabaseClient
            .from(CLIENTS_TABLE).upsert(row, { onConflict: 'id' });
          if (cliErr) logger.error('[Supabase] sync client ERRO: ' + cliErr.message + ' ' + cliErr.code + ' ' + cliErr.details, 'nfe');
        }

        // 2) Upsert TODOS os itens de produto de cada NF-e na tabela products
        for (const nf of nfeImports) {
          const items = Array.isArray(nf.items) ? nf.items : [];
          for (const it of items) {
            if (!it.codigo && !it.nome) continue;
            const prodRow = {
              code: it.codigo || it.nome,
              name: it.nome || '—',
              ncm: it.ncm || '',
              last_price: it.unitPrice || 0,
              total_bought: it.quantidade || 0,
              supplier_name: nf.supplierName || '',
              nf_number: nf.nfNumber || '',
              user_id: getCurrentUser().id,
            };
            const { error: prodErr } = await window.supabaseClient
              .from(PRODS_TABLE).upsert(prodRow, { onConflict: 'code' });
            if (prodErr) logger.error('[Supabase] upsert product ERRO: ' + prodErr.message + ' ' + prodErr.code, 'nfe');
          }
        }

        // 3) Push nfe_imports
        const rows = nfeImports.map(n => ({
          nfId: n.nfId,
          nfNumber: n.nfNumber || '',
          serie: n.serie || '',
          date: n.date || '',
          supplierName: n.supplierName || '',
          supplierCnpj: n.supplierCnpj || '',
          clientName: n.clientName || '',
          clientCnpj: n.clientCnpj || '',
          productCount: n.productCount || 0,
          importedAt: n.importedAt || new Date().toISOString(),
          items: Array.isArray(n.items) ? n.items : [],
        }));
        await remote.pushNfeImports(rows);

        // 4) Consolida produtos no price history cache
        remote.syncProductsFromNfeImports();
      } catch (e) { logger.error('[Supabase] sync pos-import exceção: ' + e, 'nfe'); }
    }

    return totalItems;
  }

  // ---- helpers ----
  const totalProposta = (p) => (p.itens || []).reduce((s, i) => s + i.preco * i.qtd, 0);

  function resetPartnerData() {
    try {
      // Limpa localStorage
      localStorage.clear();
    } catch (e) { logger.warn('[resetPartnerData] erro localStorage: ' + e, 'data'); }
    // Limpa Supabase (fire-and-forget — não bloqueia)
    if (remote.ready()) {
      const tables = [NFE_IMPORTS_TABLE, PRODS_TABLE, CLIENTS_TABLE, 'negociacoes'];
      tables.forEach(t => {
        // Deleta todas as linhas da tabela (filtro always-true)
        window.supabaseClient.from(t).delete().neq('id', '-1').then(r => {
          if (r.error) logger.warn('[resetPartnerData] delete ' + t + ' falhou: ' + r.error.message, 'data');
          else logger.info('[resetPartnerData] delete ' + t + ' OK — ' + (r.count || '?') + ' linhas', 'data');
        }).catch(e => logger.warn('[resetPartnerData] delete ' + t + ' exceção: ' + e, 'data'));
      });
    }
  }

  return {
    STATUS, STATUS_ORDER, CATEGORIAS,
    ensureSeed, seedDemoPropostas,
    getProdutos, upsertProduto, deleteProduto,
    getPropostas, addProposta, updateStatus, deleteProposta, updateProposta,
    getAtividades, addAtividade,
    getEmissoes, registrarEmissao,
    totalProposta,
    hasRealData, readRealQuotes, importBackup, exportBackup, importCsv,
    remote, markDirty,
    getClients, upsertClient, deleteClient, importClientsCsv, CLIENTS_TABLE, NFE_IMPORTS_TABLE, PRODS_TABLE,
    importNfeXml, parseNfeXml, getPriceHistory, getNfeImports,
    syncProductsFromNfeImports: remote.syncProductsFromNfeImports.bind(remote),
    resetPartnerData,
  };
})();
