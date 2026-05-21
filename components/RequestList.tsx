
import React, { useState, useRef } from 'react';
import { TransportRequest, Asset, RequestStatus, LogisticsStatus, RequestType } from '../types';
import { StatusBadge } from './Dashboard';
import { generateLogisticsEmailDraft } from '../services/geminiService';

interface Props {
  requests: TransportRequest[];
  assets: Asset[];
  onUpdate: (id: string, updates: Partial<TransportRequest>) => void;
  onDelete: (id: string) => void;
  userRole?: string;
  hasContributed?: boolean;
  onOpenContributionModal?: () => void;
}

const RequestList: React.FC<Props> = ({ requests, assets, onUpdate, onDelete, userRole, hasContributed, onOpenContributionModal }) => {
  const [filter, setFilter] = useState<RequestStatus | 'ALL'>('ALL');
  const [previewRequest, setPreviewRequest] = useState<{ req: TransportRequest, mode: 'SAP' | 'LOGISTICS' } | null>(null);
  const [completionRequest, setCompletionRequest] = useState<TransportRequest | null>(null);
  const [requestToDelete, setRequestToDelete] = useState<TransportRequest | null>(null);
  const [deletePassword, setDeletePassword] = useState('');
  
  // Novos estados para autenticação de logística
  const [logisticsAuthRequest, setLogisticsAuthRequest] = useState<TransportRequest | null>(null);
  const [logisticsPassword, setLogisticsPassword] = useState('');
  
  const toLocalDateString = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const [logisticsDate, setLogisticsDate] = useState<string>(toLocalDateString(new Date()));
  const [logisticsAction, setLogisticsAction] = useState<'ADVANCE' | 'EDIT_ONLY'>('ADVANCE');

  const updateLogisticsDateByAction = (req: TransportRequest, action: 'ADVANCE' | 'EDIT_ONLY') => {
    let date = new Date();
    if (action === 'EDIT_ONLY') {
      if (req.logisticsStatus === LogisticsStatus.COLLECTED && req.collectionDate) {
        date = new Date(req.collectionDate);
      } else if (req.logisticsStatus === LogisticsStatus.DELIVERED && req.deliveryDate) {
        date = new Date(req.deliveryDate);
      }
    }
    setLogisticsDate(toLocalDateString(date));
  };

  const DEFAULT_EXCEL_URL = "https://xyzlatam.sharepoint.com/:x:/r/sites/LATAMEndUserServices-EndUserSupportBrasil/Documentos%20compartidos/End%20User%20Support%2520Brasil/4%20-%20CONTROLE%20DE%20TRANSPORTES/Controle%20de%20movimenta%25C3%25A7%25C3%25A3o%2520de%2520remessas.xlsx?d=w9be1bdcdd9114c8e9d8f3773488b05ef&csf=1&web=1&e=LSTYHK";

  const [excelUrl, setExcelUrl] = useState(() => {
    return localStorage.getItem('excel_control_url') || DEFAULT_EXCEL_URL;
  });
  const [isEditingExcelUrl, setIsEditingExcelUrl] = useState(false);
  const [tempExcelUrl, setTempExcelUrl] = useState('');

  const [nfNumber, setNfNumber] = useState('');
  const [nfMethod, setNfMethod] = useState<'Carrier' | 'Mail'>('Carrier');
  const [nfFileName, setNfFileName] = useState('');
  const [nfFileUrl, setNfFileUrl] = useState('');
  const [isFinishing, setIsFinishing] = useState(false);
  const [showCopyToast, setShowCopyToast] = useState(false);
  const [showExcelCopyToast, setShowExcelCopyToast] = useState(false);
  
  const emailRef = useRef<HTMLDivElement>(null);

  const filtered = requests.filter(r => filter === 'ALL' || r.status === filter);

  const getAssetNames = (ids: string[]) => {
    return assets.filter(a => ids.includes(a.id)).map(a => a.name).join(', ');
  };

  const copyRichHtml = async () => {
    if (!emailRef.current) return;
    try {
      const html = emailRef.current.innerHTML;
      const text = emailRef.current.innerText;
      
      const blobHtml = new Blob([html], { type: 'text/html' });
      const blobText = new Blob([text], { type: 'text/plain' });
      
      const data = [new ClipboardItem({
        'text/html': blobHtml,
        'text/plain': blobText,
      })];
      
      await navigator.clipboard.write(data);
      
      // Exibe o balão de confirmação
      setShowCopyToast(true);
      setTimeout(() => setShowCopyToast(false), 3000);
      
    } catch (err) {
      console.error(err);
      alert('Erro ao copiar formatação rica. Tente selecionar o texto manualmente.');
    }
  };

  const openInOutlook = () => {
    if (!previewRequest) return;
    const req = previewRequest.req;

    // Tenta baixar o arquivo automaticamente se existir
    if (req.invoiceFileUrl) {
      try {
        const link = document.createElement('a');
        link.href = req.invoiceFileUrl;
        link.download = req.invoiceFileName || `NF_${req.invoiceNumber}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        // Alerta o usuário para anexar manualmente
        alert(`O arquivo "${req.invoiceFileName}" foi baixado para o seu computador.\n\nPor restrições de segurança do navegador, não é possível anexar arquivos automaticamente no Outlook.\n\nPor favor, arraste o arquivo baixado para a janela do e-mail que será aberta.`);
      } catch (e) {
        console.error("Erro ao baixar arquivo", e);
      }
    }
    
    if (previewRequest.mode === 'LOGISTICS') {
      let to = "";
      let cc = "IT.EUS.Brasil.Tier2@ciriontechnologies.com";
      let subject = "";
      
      if (req.method === 'Carrier') {
         // Destinatários para PHL Log
         to = "fernanda.nogueira@phllog.com.br; atendimento@phllog.com.br; antonio.castro@ciriontechnologies.com";
         subject = `SOLICITAÇÃO DE COLETA - PHL LOG - NF ${req.invoiceNumber} - ${req.originDetails.city} -> ${req.destinationDetails.city}`;
      } else {
         // Destinatários para Correios (Geralmente setor interno ou solicitação direta)
         to = "expedicao@ciriontechnologies.com; antonio.castro@ciriontechnologies.com";
         subject = `SOLICITAÇÃO DE POSTAGEM CORREIOS - NF ${req.invoiceNumber} - ${req.destinationDetails.city}`;
      }

      const body = encodeURIComponent(`Prezados,\n\nSolicitamos o transporte conforme dados da tabela anexa.\n\nNF emitida: ${req.invoiceNumber}\nSolicitante: ${req.requesterEmail}\n\n[POR FAVOR COLE O CONTEÚDO COPIADO AQUI]\n\n[ANEXAR A NF BAIXADA AQUI]`);
      window.location.href = `mailto:${to}?cc=${cc}&subject=${encodeURIComponent(subject)}&body=${body}`;
    } else {
      const to = "tiago.rodrigues.ext@ciriontechnologies.com; antonio.castro@ciriontechnologies.com";
      const cc = "IT.EUS.Brasil.Tier2@ciriontechnologies.com";
      const subject = encodeURIComponent(`${req.type} - Protocolo ${req.id}`);
      
      const body = encodeURIComponent(`[Favor colar o conteúdo copiado aqui]\n\nAtenciosamente,\n${req.requesterEmail}`);
      window.location.href = `mailto:${to}?cc=${cc}&subject=${subject}&body=${body}`;
    }
  };

  const handleOpenExcelAndCopy = async (req: TransportRequest) => {
    const isFreeUser = userRole !== 'admin' && !hasContributed;
    if (isFreeUser) {
      if (onOpenContributionModal) {
        onOpenContributionModal();
      } else {
        alert("Acesso Básico Gratuito: A integração com a Planilha Excel de Controle de Transportes é um recurso exclusivo para apoiadores. Contribua com R$ 10,00 para desbloquear!");
      }
      return;
    }

    const formatDateSimple = (ts?: number) => {
      if (!ts) return '';
      const date = new Date(ts);
      const day = String(date.getDate()).padStart(2, '0');
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const year = date.getFullYear();
      return `${day}/${month}/${year}`;
    };

    const formatAddressSimple = (addr: any) => {
      if (!addr) return '';
      return addr.city || '';
    };

    const cleanField = (val: any) => {
      if (val === undefined || val === null) return '';
      return String(val).replace(/[\t\r\n]+/g, ' ').trim();
    };

    // 1. STATUS GERAL
    const statusGeral = req.logisticsStatus || req.status;

    // 2. ORIGEM
    const origem = formatAddressSimple(req.originDetails);

    // 3. DESTINO 
    const destino = formatAddressSimple(req.destinationDetails);

    // 4. REMETENTE
    const remetente = req.originDetails?.attentionTo || 'Cirion Technologies';

    // 5. DESTINATARIO
    const destinatario = req.destinationDetails?.attentionTo || 'Cirion Technologies';

    // 6. DESCRIÇÃO DE ITENS
    let descricaoItens = '';
    if (req.requestAssets && req.requestAssets.length > 0) {
      descricaoItens = req.requestAssets.map(item => {
        const asset = assets.find(a => a.id === item.assetId);
        return `${item.quantity || 1}x ${asset ? asset.name : 'Equipamento'}`;
      }).join(', ');
    } else if (req.assetIds && req.assetIds.length > 0) {
      const counts: { [key: string]: number } = {};
      req.assetIds.forEach(id => {
        const asset = assets.find(a => a.id === id);
        const name = asset ? asset.name : 'Equipamento';
        counts[name] = (counts[name] || 0) + 1;
      });
      descricaoItens = Object.entries(counts).map(([name, count]) => `${count}x ${name}`).join(', ');
    }

    // 7. NUMERO NF
    const numeroNf = req.invoiceNumber || '';

    // 8. VOLUME
    const volume = req.totalVolume || 1;

    // 9. SOLICITAÇÃO DA NF (DATA)
    const solicitacaoNfData = req.type === RequestType.NF_REMESSA ? formatDateSimple(req.createdAt) : '';

    // 10. SOLICITAÇÃO DE TRANSPORTE (DATA)
    const solicitacaoTransporteData = formatDateSimple(req.createdAt);

    // 11. CONCLUSÃO (DATA)
    const conclusaoData = req.status === RequestStatus.COMPLETED && req.deliveryDate ? formatDateSimple(req.deliveryDate) : '';

    // 12. OBSERVAÇÕES\INFORMAÇÕES RELEVANTES
    const obsParts = [];
    if (req.method) obsParts.push(`Método: ${req.method === 'Carrier' ? 'Transportadora' : 'Correios'}`);
    if (req.totalWeight) obsParts.push(`Peso: ${req.totalWeight}`);
    if (req.trackingNumber) obsParts.push(`Rastreio: ${req.trackingNumber}`);
    if (req.id) obsParts.push(`Protocolo App: ${req.id}`);
    const observacoes = obsParts.join(' | ');

    // Montando a linha com colunas tabuladas prontas para colar na planilha Excel
    const tsvLine = [
      cleanField(statusGeral),
      cleanField(origem),
      cleanField(destino),
      cleanField(remetente),
      cleanField(destinatario),
      cleanField(descricaoItens),
      cleanField(numeroNf),
      cleanField(volume),
      cleanField(solicitacaoNfData),
      cleanField(solicitacaoTransporteData),
      cleanField(conclusaoData),
      cleanField(observacoes)
    ].join('\t');

    try {
      await navigator.clipboard.writeText(tsvLine);
      setShowExcelCopyToast(true);
      setTimeout(() => setShowExcelCopyToast(false), 3000);
      window.open(excelUrl, "_blank");
    } catch (err) {
      console.error("Erro ao copiar para clipboard:", err);
      window.open(excelUrl, "_blank");
    }
  };

  const handleFinishRequest = async () => {
    if (!completionRequest || !nfNumber) return;
    
    setIsFinishing(true);
    const assetList = assets.filter(a => completionRequest.assetIds.includes(a.id));
    
    // Atualiza o objeto de requisição com o método selecionado no modal de conclusão
    const updatedReq = { 
      ...completionRequest, 
      invoiceNumber: nfNumber, 
      method: nfMethod, 
      invoiceFileName: nfFileName, 
      invoiceFileUrl: nfFileUrl 
    };
    
    // Gera o draft considerando o método selecionado (PHL ou Correios)
    const logisticsDraft = await generateLogisticsEmailDraft(updatedReq, assetList, userRole === 'admin' || !!hasContributed);

    onUpdate(completionRequest.id, {
      status: RequestStatus.COMPLETED,
      logisticsStatus: LogisticsStatus.WAITING_COLLECTION,
      invoiceNumber: nfNumber,
      invoiceDate: Date.now(),
      method: nfMethod, // Atualiza o método caso tenha mudado
      invoiceFileName: nfFileName,
      invoiceFileUrl: nfFileUrl,
      logisticsDraft
    });

    setIsFinishing(false);
    setCompletionRequest(null);
    setNfNumber('');
    setNfFileName('');
    setNfFileUrl('');
  };

  const handleDeleteConfirmed = () => {
    if (deletePassword !== 'excluiritem') {
      alert('Senha incorreta!');
      return;
    }

    if (requestToDelete) {
      onDelete(requestToDelete.id);
      setRequestToDelete(null);
      setDeletePassword('');
    }
  };

  const handleLogisticsAuth = () => {
    if (logisticsPassword !== 'Avançar') {
      alert('Senha incorreta!');
      return;
    }

    if (logisticsAuthRequest) {
      const selectedDate = new Date(logisticsDate + 'T12:00:00'); // Meio-dia para evitar problemas de fuso horário
      const timestamp = selectedDate.getTime();
      
      if (logisticsAction === 'ADVANCE') {
        toggleLogisticsStatus(logisticsAuthRequest, timestamp);
      } else {
        // Apenas atualizar a data do status atual
        const updates: Partial<TransportRequest> = {};
        if (logisticsAuthRequest.logisticsStatus === LogisticsStatus.COLLECTED) {
          updates.collectionDate = timestamp;
        } else if (logisticsAuthRequest.logisticsStatus === LogisticsStatus.DELIVERED) {
          updates.deliveryDate = timestamp;
        }
        onUpdate(logisticsAuthRequest.id, updates);
      }
      
      setLogisticsAuthRequest(null);
      setLogisticsPassword('');
      setLogisticsDate(toLocalDateString(new Date()));
      setLogisticsAction('ADVANCE');
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setNfFileName(file.name);
      const reader = new FileReader();
      reader.onload = (ev) => {
        setNfFileUrl(ev.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const toggleLogisticsStatus = (req: TransportRequest, timestamp: number) => {
    let nextStatus: LogisticsStatus = req.logisticsStatus;
    const updates: Partial<TransportRequest> = {};
    
    if (req.logisticsStatus === LogisticsStatus.WAITING_COLLECTION) {
      nextStatus = LogisticsStatus.COLLECTED;
      updates.collectionDate = timestamp;
    } else if (req.logisticsStatus === LogisticsStatus.COLLECTED) {
      nextStatus = LogisticsStatus.DELIVERED;
      updates.deliveryDate = timestamp;
    } else if (req.logisticsStatus === LogisticsStatus.DELIVERED) {
      nextStatus = LogisticsStatus.WAITING_COLLECTION;
      updates.collectionDate = undefined;
      updates.deliveryDate = undefined;
    }

    onUpdate(req.id, { ...updates, logisticsStatus: nextStatus });
  };

  const getLogisticsStyle = (status: LogisticsStatus) => {
    switch (status) {
      case LogisticsStatus.WAITING_NF: return 'text-slate-300 dark:text-slate-600';
      case LogisticsStatus.WAITING_COLLECTION: return 'text-amber-500 bg-amber-50 dark:bg-amber-900/20 border-amber-100 dark:border-amber-800';
      case LogisticsStatus.COLLECTED: return 'text-blue-600 bg-blue-50 dark:bg-blue-900/20 border-blue-100 dark:border-blue-800';
      case LogisticsStatus.DELIVERED: return 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 border-emerald-100 dark:border-emerald-800';
      default: return 'text-slate-400';
    }
  };

  const getDisplayLogisticsStatus = (request: TransportRequest) => {
    if (request.method === 'Mail') {
      if (request.logisticsStatus === LogisticsStatus.WAITING_COLLECTION) {
        return 'Aguardando Postagem';
      } else if (request.logisticsStatus === LogisticsStatus.COLLECTED) {
        return LogisticsStatus.WAITING_MAIL_DELIVERY;
      }
    }
    return request.logisticsStatus;
  };

  const formatDate = (ts?: number) => {
    if (!ts) return '';
    return new Date(ts).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl md:rounded-[2.5rem] shadow-2xl shadow-blue-900/5 border border-blue-50/50 dark:border-slate-700 overflow-hidden animate-in slide-in-from-bottom-6 duration-700 transition-colors">
      <div className="p-6 md:p-10 border-b border-blue-50 dark:border-slate-700 flex flex-col lg:flex-row lg:items-center justify-between gap-6 bg-white dark:bg-slate-800 transition-colors">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <div>
            <h3 className="text-lg md:text-xl font-black text-slate-800 dark:text-white tracking-tight">Registro Logístico</h3>
            <p className="text-slate-400 dark:text-slate-500 text-[10px] md:text-xs font-medium mt-1 uppercase tracking-widest">Protocolos de Movimentação</p>
          </div>
          <button
            onClick={() => {
              setTempExcelUrl(excelUrl);
              setIsEditingExcelUrl(true);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-wider bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900 rounded-lg md:rounded-xl hover:bg-emerald-600 hover:text-white active:scale-95 transition-all self-start shadow-sm"
            title="Alterar endereço da Planilha de Controle"
            id="configure-excel-btn"
          >
            <i className="fas fa-gear text-[11px]"></i>
            Link da Planilha
          </button>
        </div>
        <div className="flex gap-2 overflow-x-auto pb-2 lg:pb-0 no-scrollbar">
          {(['ALL', ...Object.values(RequestStatus)] as const).map(s => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`px-4 md:px-6 py-1.5 md:py-2 rounded-lg md:rounded-xl text-[10px] md:text-xs font-bold whitespace-nowrap transition-all duration-200 ${filter === s ? 'bg-blue-600 text-white shadow-lg' : 'bg-blue-50/50 dark:bg-slate-700/50 text-blue-600 dark:text-slate-300 border border-blue-100/50 dark:border-slate-600 hover:bg-blue-100 dark:hover:bg-slate-700'}`}
            >
              {s === 'ALL' ? 'Todos' : s}
            </button>
          ))}
        </div>
      </div>
      
      <div className="overflow-x-auto">
        <table className="w-full text-left min-w-[900px]">
          <thead className="bg-slate-50/80 dark:bg-slate-750 text-slate-400 dark:text-slate-500 text-[10px] uppercase font-black tracking-widest transition-colors">
            <tr>
              <th className="px-6 md:px-10 py-5">Protocolo</th>
              <th className="px-6 md:px-10 py-5">Especificação</th>
              <th className="px-6 md:px-10 py-5">Fluxo</th>
              <th className="px-6 md:px-10 py-5">Logística Física</th>
              <th className="px-6 md:px-10 py-5">Status SAP</th>
              <th className="px-6 md:px-10 py-5 text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50 dark:divide-slate-700 text-sm transition-colors">
            {filtered.map(req => (
              <tr key={req.id} className="hover:bg-blue-50/20 dark:hover:bg-slate-700/30 transition-all group">
                <td className="px-6 md:px-10 py-6 md:py-8">
                  <div className="font-black text-slate-900 dark:text-white text-sm md:text-base">{req.id}</div>
                  <div className="text-[9px] md:text-[10px] font-bold text-slate-400 uppercase tracking-wider">{new Date(req.createdAt).toLocaleDateString('pt-BR')}</div>
                </td>
                <td className="px-6 md:px-10 py-6 md:py-8">
                  <div className="font-bold text-slate-700 dark:text-slate-300 text-xs md:text-sm">{req.type}</div>
                  <div className="text-[9px] font-bold text-blue-500 uppercase mt-1">Via {req.method === 'Carrier' ? 'Transp. PHL Log' : 'Correios'}</div>
                  <div className="max-w-[150px] truncate text-[10px] text-slate-400 font-medium mt-1">{getAssetNames(req.assetIds)}</div>
                </td>
                <td className="px-6 md:px-10 py-6 md:py-8">
                  <div className="flex flex-col gap-1 text-[10px] md:text-[11px] font-bold">
                    <span className="text-slate-500 uppercase truncate max-w-[120px]">{req.originDetails.city || 'Origem N/D'}</span>
                    <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold block truncate max-w-[140px]" title={`A/C Origem: ${req.originDetails.attentionTo || 'Cirion Technologies'}`}>
                      <span className="font-extrabold text-slate-400 mr-1">A/C:</span>
                      {req.originDetails.attentionTo || 'Cirion Technologies'}
                    </span>
                    <span className="text-indigo-700 dark:text-indigo-400 uppercase truncate mt-1 block max-w-[120px]">→ {req.destinationDetails.city || 'Destino N/D'}</span>
                    <span className="text-[10px] text-blue-600 dark:text-blue-400 font-semibold block truncate max-w-[140px]" title={`A/C Destino: ${req.destinationDetails.attentionTo || 'Cirion Technologies'}`}>
                      <span className="font-extrabold text-slate-400 mr-1">A/C:</span>
                      {req.destinationDetails.attentionTo || 'Cirion Technologies'}
                    </span>
                  </div>
                </td>
                <td className="px-6 md:px-10 py-6 md:py-8">
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-3">
                      <div className={`px-3 py-1.5 rounded-lg border text-[10px] font-black uppercase tracking-tight flex items-center gap-2 ${getLogisticsStyle(req.logisticsStatus)}`}>
                        <i className={`fas ${req.logisticsStatus === LogisticsStatus.DELIVERED ? 'fa-house-circle-check' : req.logisticsStatus === LogisticsStatus.COLLECTED ? 'fa-truck-ramp-box' : 'fa-clock'}`}></i>
                        {getDisplayLogisticsStatus(req)}
                      </div>
                      {req.status === RequestStatus.COMPLETED && (
                        <button 
                          onClick={() => {
                            setLogisticsAuthRequest(req);
                            setLogisticsAction('ADVANCE');
                            // Ao abrir, se estiver avançando, sugerimos a data de hoje
                            setLogisticsDate(toLocalDateString(new Date()));
                          }}
                          className="w-8 h-8 flex items-center justify-center bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 hover:bg-blue-600 hover:text-white rounded-lg transition-all shadow-sm"
                          title="Gerenciar Status/Data de Logística"
                        >
                          <i className="fas fa-arrow-right-arrow-left text-xs"></i>
                        </button>
                      )}
                    </div>
                    {req.collectionDate && (
                      <div className="text-[9px] font-bold text-blue-500 uppercase flex items-center gap-1">
                        <i className="fas fa-calendar-check"></i>
                        Coleta: {formatDate(req.collectionDate)}
                      </div>
                    )}
                    {req.deliveryDate && (
                      <div className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400 uppercase flex items-center gap-1">
                        <i className="fas fa-calendar-check"></i>
                        Entrega: {formatDate(req.deliveryDate)}
                      </div>
                    )}
                  </div>
                </td>
                <td className="px-6 md:px-10 py-6 md:py-8">
                  <div className="flex flex-col gap-1.5 items-start">
                    <StatusBadge status={req.status} />
                    {req.status === RequestStatus.COMPLETED && req.invoiceNumber && (
                      <div className="flex flex-col gap-1 mt-1">
                        <div className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-tight flex items-center gap-1.5 bg-emerald-50/50 dark:bg-emerald-900/20 px-2 py-1 rounded border border-emerald-100/50 dark:border-emerald-800">
                            <i className="fas fa-file-circle-check text-[9px]"></i>
                            NF: {req.invoiceNumber}
                        </div>
                        {req.invoiceDate && (
                           <div className="text-[9px] font-bold text-emerald-500 dark:text-emerald-500 pl-1">
                             Emitida em: {new Date(req.invoiceDate).toLocaleDateString('pt-BR')}
                           </div>
                        )}
                      </div>
                    )}
                  </div>
                </td>
                <td className="px-6 md:px-10 py-6 md:py-8 text-right">
                  <div className="flex items-center justify-end gap-2 md:gap-3 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                    {req.status !== RequestStatus.COMPLETED && (
                      <button 
                        onClick={() => setCompletionRequest(req)}
                        className="w-8 h-8 md:w-10 md:h-10 flex items-center justify-center bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-800 rounded-lg md:rounded-xl hover:bg-emerald-600 hover:text-white transition-all shadow-sm"
                        title="Marcar como Concluído e Gerar Coleta"
                      >
                        <i className="fas fa-check text-xs md:text-base"></i>
                      </button>
                    )}
                    {req.emailDraft && (
                      <button 
                         onClick={() => setPreviewRequest({ req, mode: 'SAP' })}
                         className="w-8 h-8 md:w-10 md:h-10 flex items-center justify-center bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-800 rounded-lg md:rounded-xl hover:bg-blue-600 hover:text-white transition-all shadow-sm"
                         title="Ver Rascunho SAP"
                      >
                        <i className="fas fa-file-invoice text-xs md:text-base"></i>
                      </button>
                    )}
                    {req.logisticsDraft && (
                      <button 
                         onClick={() => setPreviewRequest({ req, mode: 'LOGISTICS' })}
                         className="w-8 h-8 md:w-10 md:h-10 flex items-center justify-center bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-800 rounded-lg md:rounded-xl hover:bg-indigo-600 hover:text-white transition-all shadow-sm"
                         title={`Ver E-mail para ${req.method === 'Carrier' ? 'PHL' : 'Correios'}`}
                      >
                        <i className="fas fa-truck-fast text-xs md:text-base"></i>
                      </button>
                    )}
                    <button 
                       onClick={() => handleOpenExcelAndCopy(req)}
                       className="w-8 h-8 md:w-10 md:h-10 flex items-center justify-center bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-800 rounded-lg md:rounded-xl hover:bg-emerald-600 hover:text-white transition-all shadow-sm animate-pulse-subtle"
                       title="Copiar Itens NF e Abrir Planilha Excel de Controle de Transportes"
                    >
                      <i className="fas fa-file-excel text-xs md:text-base"></i>
                    </button>
                    <button 
                      onClick={() => {
                        setRequestToDelete(req);
                        setDeletePassword('');
                      }}
                      className="w-8 h-8 md:w-10 md:h-10 flex items-center justify-center bg-rose-50 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 border border-rose-100 dark:border-rose-800 rounded-lg md:rounded-xl hover:bg-rose-600 hover:text-white transition-all shadow-sm"
                      title="Excluir Solicitação"
                    >
                      <i className="fas fa-trash-can text-xs md:text-base"></i>
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
                <tr>
                    <td colSpan={6} className="px-10 py-20 text-center text-slate-300 dark:text-slate-600 text-xs italic">
                        Nenhum registro encontrado.
                    </td>
                </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Delete Confirmation Modal */}
      {requestToDelete && (
        <div className="fixed inset-0 z-[130] flex items-center justify-center p-4 bg-slate-900/90 backdrop-blur-md animate-in zoom-in-95 duration-200">
          <div className="bg-white dark:bg-slate-800 w-full max-w-sm rounded-3xl shadow-2xl overflow-hidden flex flex-col border border-rose-100 dark:border-rose-900 transition-colors">
             <div className="p-6 bg-rose-600 text-white flex items-center gap-4">
                <div className="bg-rose-500 p-2 rounded-lg">
                   <i className="fas fa-lock text-xl"></i>
                </div>
                <div>
                   <h3 className="font-black uppercase tracking-tight text-sm">Segurança</h3>
                   <p className="text-[10px] text-rose-100 font-bold uppercase tracking-widest">Confirmação de Exclusão</p>
                </div>
             </div>
             <div className="p-6 text-center space-y-4">
                <p className="text-slate-600 dark:text-slate-300 text-sm font-medium">
                  Para excluir o protocolo <span className="font-black text-slate-900 dark:text-white">{requestToDelete.id}</span>, informe a senha de administrador:
                </p>
                <input 
                  type="password"
                  value={deletePassword}
                  onChange={e => setDeletePassword(e.target.value)}
                  placeholder="Senha de Exclusão"
                  className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 outline-none focus:ring-2 focus:ring-rose-400 font-bold text-center text-slate-700 dark:text-slate-200 transition-colors"
                  autoFocus
                />
             </div>
             <div className="p-6 bg-slate-50 dark:bg-slate-900/50 border-t border-slate-100 dark:border-slate-700 flex gap-3 transition-colors">
                <button 
                   onClick={() => {
                     setRequestToDelete(null);
                     setDeletePassword('');
                   }}
                   className="flex-1 py-3 text-xs font-black uppercase text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all"
                >
                   Cancelar
                </button>
                <button 
                   onClick={handleDeleteConfirmed}
                   className="flex-[2] py-3 bg-rose-600 text-white text-xs font-black uppercase rounded-xl shadow-lg shadow-rose-600/20 hover:bg-rose-700 transition-all active:scale-95"
                >
                   Sim, Excluir
                </button>
             </div>
          </div>
        </div>
      )}

      {/* Logistics Auth Modal */}
      {logisticsAuthRequest && (
        <div className="fixed inset-0 z-[130] flex items-center justify-center p-4 bg-slate-900/90 backdrop-blur-md animate-in zoom-in-95 duration-200">
          <div className="bg-white dark:bg-slate-800 w-full max-w-sm rounded-3xl shadow-2xl overflow-hidden flex flex-col border border-blue-100 dark:border-blue-900 transition-colors">
             <div className="p-6 bg-blue-600 text-white flex items-center gap-4">
                <div className="bg-blue-500 p-2 rounded-lg">
                   <i className="fas fa-shield-alt text-xl"></i>
                </div>
                <div>
                   <h3 className="font-black uppercase tracking-tight text-sm">Gerenciamento Logístico</h3>
                   <p className="text-[10px] text-blue-100 font-bold uppercase tracking-widest">Status: {logisticsAuthRequest.logisticsStatus}</p>
                </div>
             </div>
             <div className="p-6 space-y-4">
                <div className="flex bg-slate-100 dark:bg-slate-900 p-1 rounded-xl">
                   <button 
                      onClick={() => {
                        setLogisticsAction('ADVANCE');
                        updateLogisticsDateByAction(logisticsAuthRequest, 'ADVANCE');
                      }}
                      className={`flex-1 py-2 text-[10px] font-black uppercase rounded-lg transition-all ${logisticsAction === 'ADVANCE' ? 'bg-white dark:bg-slate-800 text-blue-600 shadow-sm' : 'text-slate-400'}`}
                   >
                      Avançar Status
                   </button>
                   <button 
                      onClick={() => {
                        setLogisticsAction('EDIT_ONLY');
                        updateLogisticsDateByAction(logisticsAuthRequest, 'EDIT_ONLY');
                      }}
                      className={`flex-1 py-2 text-[10px] font-black uppercase rounded-lg transition-all ${logisticsAction === 'EDIT_ONLY' ? 'bg-white dark:bg-slate-800 text-blue-600 shadow-sm' : 'text-slate-400'}`}
                      disabled={logisticsAuthRequest.logisticsStatus === LogisticsStatus.WAITING_COLLECTION}
                   >
                      Ajustar Data Atual
                   </button>
                </div>

                <div>
                  <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase mb-1 block">
                    {logisticsAction === 'ADVANCE' 
                      ? (logisticsAuthRequest.logisticsStatus === LogisticsStatus.WAITING_COLLECTION ? 'Data da Coleta' : 'Data da Entrega')
                      : (logisticsAuthRequest.logisticsStatus === LogisticsStatus.COLLECTED ? 'Nova Data da Coleta' : 'Nova Data da Entrega')
                    }
                  </label>
                  <input 
                    type="date"
                    value={logisticsDate}
                    onChange={e => setLogisticsDate(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 outline-none focus:ring-2 focus:ring-blue-400 font-bold text-slate-700 dark:text-slate-200 transition-colors"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase mb-1 block">Senha de Autorização</label>
                  <input 
                    type="password"
                    value={logisticsPassword}
                    onChange={e => setLogisticsPassword(e.target.value)}
                    placeholder="Senha de Autorização"
                    className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 outline-none focus:ring-2 focus:ring-blue-400 font-bold text-center text-slate-700 dark:text-slate-200 transition-colors"
                    autoFocus
                  />
                </div>
             </div>
             <div className="p-6 bg-slate-50 dark:bg-slate-900/50 border-t border-slate-100 dark:border-slate-700 flex gap-3 transition-colors">
                <button 
                   onClick={() => {
                     setLogisticsAuthRequest(null);
                     setLogisticsPassword('');
                     setLogisticsAction('ADVANCE');
                   }}
                   className="flex-1 py-3 text-xs font-black uppercase text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all"
                >
                   Cancelar
                </button>
                <button 
                   onClick={handleLogisticsAuth}
                   className="flex-[2] py-3 bg-blue-600 text-white text-xs font-black uppercase rounded-xl shadow-lg shadow-blue-600/20 hover:bg-blue-700 transition-all active:scale-95"
                >
                   {logisticsAction === 'ADVANCE' ? 'Confirmar Avanço' : 'Salvar Nova Data'}
                </button>
             </div>
          </div>
        </div>
      )}

      {/* Completion Modal */}
      {completionRequest && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/90 backdrop-blur-md animate-in zoom-in-95 duration-200">
           <div className="bg-white dark:bg-slate-800 w-full max-w-md rounded-3xl shadow-2xl overflow-hidden flex flex-col border border-blue-100 dark:border-slate-700 transition-colors">
              <div className="p-6 bg-[#0f172a] dark:bg-slate-950 text-white flex items-center gap-4">
                 <div className="bg-emerald-500 p-2 rounded-lg">
                    <i className="fas fa-shield-check text-xl"></i>
                 </div>
                 <div>
                    <h3 className="font-black uppercase tracking-tight text-sm">Finalizar Processamento</h3>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Confirmar NF e Solicitar Coleta</p>
                 </div>
              </div>
              <div className="p-6 space-y-5">
                 <div>
                    <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase mb-1 block">Número da Nota Fiscal (NF)</label>
                    <input 
                       className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 outline-none focus:ring-2 focus:ring-blue-400 font-bold text-sm text-slate-900 dark:text-white transition-colors"
                       placeholder="Ex: 272071"
                       value={nfNumber}
                       onChange={e => setNfNumber(e.target.value)}
                       autoFocus
                    />
                 </div>
                 <div>
                    <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase mb-1 block">Método de Transporte</label>
                    <select 
                       className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 outline-none focus:ring-2 focus:ring-blue-400 font-bold text-sm text-slate-900 dark:text-white transition-colors"
                       value={nfMethod}
                       onChange={e => setNfMethod(e.target.value as 'Carrier' | 'Mail')}
                    >
                       <option value="Carrier">Transportadora (PHL Log)</option>
                       <option value="Mail">Correios / ECT</option>
                    </select>
                 </div>
                 <div>
                    <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase mb-1 block">Upload da NF (PDF/Imagem)</label>
                    <div className="relative border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl p-4 text-center hover:bg-blue-50/50 dark:hover:bg-slate-800/50 transition-colors group">
                       <input 
                          type="file" 
                          className="absolute inset-0 opacity-0 cursor-pointer" 
                          onChange={handleFileChange}
                       />
                       <i className="fas fa-cloud-arrow-up text-slate-300 dark:text-slate-600 text-2xl mb-2 group-hover:text-blue-400 transition-colors"></i>
                       <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase truncate px-2">
                          {nfFileName || 'Arraste ou clique para anexar'}
                       </p>
                    </div>
                 </div>
              </div>
              <div className="p-6 bg-slate-50 dark:bg-slate-900/50 border-t border-slate-100 dark:border-slate-700 flex gap-3 transition-colors">
                 <button 
                    onClick={() => setCompletionRequest(null)}
                    className="flex-1 py-3 text-xs font-black uppercase text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all"
                 >
                    Voltar
                 </button>
                 <button 
                    onClick={handleFinishRequest}
                    disabled={!nfNumber || isFinishing}
                    className="flex-[2] py-3 bg-blue-600 text-white text-xs font-black uppercase rounded-xl shadow-lg shadow-blue-600/20 hover:bg-blue-700 transition-all active:scale-95 disabled:opacity-50"
                 >
                    {isFinishing ? <i className="fas fa-spinner fa-spin"></i> : 'Gerar Solicitação de Coleta'}
                 </button>
              </div>
           </div>
        </div>
      )}

      {/* Email Preview Modal */}
      {previewRequest && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-800 w-full max-w-5xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] relative transition-colors">
            
            {/* Copy Toast - Centered over modal content */}
            {showCopyToast && (
               <div className="absolute bottom-20 left-1/2 -translate-x-1/2 z-50 bg-slate-800 text-white px-6 py-4 rounded-xl shadow-2xl flex items-center gap-4 animate-in slide-in-from-bottom-5 fade-in duration-300 border border-slate-700">
                  <div className="bg-emerald-500 p-2 rounded-full">
                     <i className="fas fa-check text-white"></i>
                  </div>
                  <div>
                     <p className="font-bold text-sm">Informação copiada!</p>
                     <p className="text-xs text-slate-400">Ctrl+V no Outlook</p>
                  </div>
               </div>
            )}

            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between bg-slate-50 dark:bg-slate-900 transition-colors">
              <div className="flex items-center gap-3">
                 <i className={`fas ${previewRequest.mode === 'LOGISTICS' ? 'fa-truck-fast text-indigo-500' : 'fa-envelope text-blue-500'}`}></i>
                 <h3 className="font-bold text-slate-800 dark:text-white">
                    Preview {previewRequest.mode === 'LOGISTICS' ? (previewRequest.req.method === 'Carrier' ? 'Coleta PHL Log' : 'Postagem Correios') : 'Solicitação SAP'}
                 </h3>
              </div>
              <button onClick={() => setPreviewRequest(null)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                <i className="fas fa-times"></i>
              </button>
            </div>
            <div className="p-6 overflow-y-auto flex-1 bg-slate-100/30 dark:bg-slate-950/30">
              <div 
                ref={emailRef}
                className="border border-slate-200 dark:border-slate-700 p-8 rounded-lg bg-white overflow-x-auto shadow-inner min-h-[400px]"
                dangerouslySetInnerHTML={{ 
                   __html: (previewRequest.mode === 'LOGISTICS' ? previewRequest.req.logisticsDraft : previewRequest.req.emailDraft) || '' 
                }}
              />
            </div>
            <div className="p-4 md:p-6 bg-slate-50 dark:bg-slate-900 border-t border-slate-100 dark:border-slate-700 flex flex-wrap justify-end gap-3 transition-colors">
              <button 
                onClick={openInOutlook}
                className={`px-4 py-2.5 ${previewRequest.mode === 'LOGISTICS' ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-slate-800 hover:bg-black dark:bg-slate-700 dark:hover:bg-slate-600'} text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-2 shadow-lg`}
              >
                <i className="fas fa-paper-plane"></i> {previewRequest.mode === 'LOGISTICS' ? `Enviar para ${previewRequest.req.method === 'Carrier' ? 'PHL Log' : 'Correios'} (Baixar NF)` : 'Outlook (Novo E-mail)'}
              </button>
              <button 
                onClick={copyRichHtml}
                className="px-4 py-2.5 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 transition-colors flex items-center gap-2 shadow-lg"
              >
                <i className="fas fa-paste"></i> Copiar Formatação (Ctrl+V no Outlook)
              </button>
              <button 
                onClick={() => setPreviewRequest(null)}
                className="px-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 rounded-xl text-xs font-bold hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
      {showExcelCopyToast && (
        <div className="fixed bottom-10 right-10 z-[150] bg-slate-900 dark:bg-slate-950 border border-slate-700 text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-4 animate-in slide-in-from-bottom-5 fade-in duration-300">
          <div className="bg-emerald-500 p-2.5 rounded-xl flex items-center justify-center">
            <i className="fas fa-file-excel text-lg text-white"></i>
          </div>
          <div>
            <p className="font-extrabold text-xs uppercase tracking-wider text-emerald-400">Excel Integrado</p>
            <p className="text-xs text-slate-300 font-bold mt-0.5">Itens copiados para colar na planilha!</p>
          </div>
        </div>
      )}

      {/* Edit Excel Link Modal */}
      {isEditingExcelUrl && (
        <div className="fixed inset-0 z-[130] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 border border-emerald-100 dark:border-slate-800 w-full max-w-lg rounded-3xl shadow-2xl p-6 md:p-8 relative overflow-hidden transition-colors">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4 mb-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                  <i className="fas fa-file-excel text-lg"></i>
                </div>
                <div>
                  <h4 className="text-sm font-black uppercase text-slate-800 dark:text-slate-100 tracking-tight">Endereço da Planilha Excel</h4>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">Configuração do Controle de Movimentação</p>
                </div>
              </div>
              <button 
                onClick={() => setIsEditingExcelUrl(false)} 
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <i className="fas fa-times"></i>
              </button>
            </div>

            <div className="space-y-4">
              <p className="text-xs text-slate-550 dark:text-slate-400 leading-relaxed font-semibold">
                Insira o novo link (URL) do SharePoint para onde o botão do Excel deverá redirecionar. Os dados copiados continuarão prontos para colar na planilha!
              </p>

              <div>
                <label className="block text-[10px] font-black uppercase text-slate-500 tracking-wider mb-2">Link da Planilha (URL Completa)</label>
                <textarea 
                  className="w-full bg-slate-50 dark:bg-slate-850 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 text-xs font-mono font-medium focus:border-emerald-500 outline-none text-slate-800 dark:text-white transition-all h-28 leading-normal focus:bg-white resize-none"
                  placeholder="https://xyzlatam.sharepoint.com/..."
                  value={tempExcelUrl}
                  onChange={e => setTempExcelUrl(e.target.value)}
                />
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setTempExcelUrl(DEFAULT_EXCEL_URL)}
                  className="px-3.5 py-2 hover:bg-slate-200/60 dark:hover:bg-slate-800/80 bg-slate-100 dark:bg-slate-805 font-bold text-slate-700 dark:text-slate-300 rounded-xl text-[10px] uppercase tracking-wide transition-all"
                >
                  Restaurar Padrão
                </button>
                <div className="flex-1"></div>
              </div>
            </div>

            <div className="border-t border-slate-100 dark:border-slate-800 pt-4 mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setIsEditingExcelUrl(false)}
                className="px-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 rounded-xl text-xs font-bold hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!tempExcelUrl.trim()) {
                    alert('Por favor, informe uma URL válida.');
                    return;
                  }
                  localStorage.setItem('excel_control_url', tempExcelUrl.trim());
                  setExcelUrl(tempExcelUrl.trim());
                  setIsEditingExcelUrl(false);
                }}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-extrabold transition-all active:scale-95 shadow-md shadow-emerald-600/10"
              >
                Salvar Configuração
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RequestList;
