
import React, { useState, useRef, useEffect } from 'react';
import { TransportRequest, Asset, RequestStatus, LogisticsStatus, RequestType, RequestAsset } from '../types';
import { StatusBadge } from './Dashboard';
import { generateLogisticsEmailDraft, generateEmailDraft } from '../services/geminiService';

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

  // Estados para edição assistida com senha de alteração
  const [requestToEditPassword, setRequestToEditPassword] = useState<TransportRequest | null>(null);
  const [editPassword, setEditPassword] = useState('');
  const [editingRequest, setEditingRequest] = useState<TransportRequest | null>(null);
  const [editTab, setEditTab] = useState<'origin' | 'destination' | 'general' | 'assets'>('origin');
  
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
  const [showFolderCopyToast, setShowFolderCopyToast] = useState(false);
  const [showFileCopyToast, setShowFileCopyToast] = useState(false);
  const [showClearToast, setShowClearToast] = useState(false);
  const [showLocalExcelToast, setShowLocalExcelToast] = useState(false);
  const [draftHtml, setDraftHtml] = useState('');
  const [showFolderModal, setShowFolderModal] = useState(false);

  useEffect(() => {
    if (previewRequest) {
      setDraftHtml((previewRequest.mode === 'LOGISTICS' ? previewRequest.req.logisticsDraft : previewRequest.req.emailDraft) || '');
    } else {
      setDraftHtml('');
    }
  }, [previewRequest?.req?.id, previewRequest?.mode]);

  const copyFolderPath = async () => {
    try {
      await navigator.clipboard.writeText("https://xyzlatam-my.sharepoint.com/:f:/r/personal/gilberto_araujo_ext_ciriontechnologies_com/Documents/Documentos/NF%20REMESSA%20SOLICITADA/NF%20CORRIGIDA");
      setShowFolderCopyToast(true);
      setTimeout(() => setShowFolderCopyToast(false), 3000);
    } catch (err) {
      console.error(err);
    }
  };

  const copyExcelFilePath = async () => {
    try {
      await navigator.clipboard.writeText("https://xyzlatam-my.sharepoint.com/:x:/r/personal/gilberto_araujo_ext_ciriontechnologies_com/Documents/Documentos/NF%20REMESSA%20SOLICITADA/NF%20CORRIGIDA/Nota%20de%20Remessa%20-%20corrigida.xlsx?d=w5737ab1bf4de48f8b64748ac469500cd&csf=1&web=1&e=A7hbwJ");
      setShowFileCopyToast(true);
      setTimeout(() => setShowFileCopyToast(false), 3000);
    } catch (err) {
      console.error(err);
    }
  };
  
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
    const isNfRequest = String(req.type || '').toUpperCase().includes('NF');
    const isTransportRequest = String(req.type || '').toUpperCase().includes('TRANSPORTE') || !isNfRequest;

    const systemCurrentDateStr = formatDateSimple(Date.now());

    const solicitacaoNfData = isNfRequest ? systemCurrentDateStr : '';

    // 10. SOLICITAÇÃO DE TRANSPORTE (DATA)
    const solicitacaoTransporteData = isTransportRequest ? systemCurrentDateStr : '';

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

  const handleEditPasswordConfirmed = () => {
    if (editPassword !== 'AlterarDados') {
      alert('Senha incorreta!');
      return;
    }

    if (requestToEditPassword) {
      setEditingRequest({
        ...requestToEditPassword,
        originDetails: {
          cep: requestToEditPassword.originDetails?.cep || '',
          bp: requestToEditPassword.originDetails?.bp || '',
          state: requestToEditPassword.originDetails?.state || '',
          plant: requestToEditPassword.originDetails?.plant || '',
          city: requestToEditPassword.originDetails?.city || '',
          neighborhood: requestToEditPassword.originDetails?.neighborhood || '',
          address: requestToEditPassword.originDetails?.address || '',
          attentionTo: requestToEditPassword.originDetails?.attentionTo || 'Cirion Technologies'
        },
        destinationDetails: {
          cep: requestToEditPassword.destinationDetails?.cep || '',
          bp: requestToEditPassword.destinationDetails?.bp || '',
          state: requestToEditPassword.destinationDetails?.state || '',
          plant: requestToEditPassword.destinationDetails?.plant || '',
          city: requestToEditPassword.destinationDetails?.city || '',
          neighborhood: requestToEditPassword.destinationDetails?.neighborhood || '',
          address: requestToEditPassword.destinationDetails?.address || '',
          attentionTo: requestToEditPassword.destinationDetails?.attentionTo || 'Cirion Technologies'
        },
        requestAssets: requestToEditPassword.requestAssets ? requestToEditPassword.requestAssets.map(item => ({
          ...item,
          sapCode: item.sapCode || '',
          ncm: item.ncm || '',
          nfeReference: item.nfeReference || '',
          unitValue: item.unitValue || 0,
          quantity: item.quantity || 1
        })) : []
      });
      setRequestToEditPassword(null);
      setEditPassword('');
      setEditTab('origin');
    }
  };

  const handleSaveChanges = async () => {
    if (!editingRequest) return;

    // Mascarar campos de Origem e Destino com padrões caso estejam nulos, impedindo campos em branco
    const origin = editingRequest.originDetails;
    const dest = editingRequest.destinationDetails;

    if (!origin.state || !origin.state.trim() || !dest.state || !dest.state.trim()) {
      alert("Por favor, garanta que os campos de Estado de Origem e Destino estejam preenchidos.");
      return;
    }

    if (!origin.plant || !origin.plant.trim() || !dest.plant || !dest.plant.trim()) {
      alert("Por favor, preencha o Centro / Plant de Origem e Destino.");
      return;
    }

    if (!origin.city || !origin.city.trim() || !dest.city || !dest.city.trim()) {
      alert("Por favor, garanta que Cidade de Origem e Destino estejam preenchidas.");
      return;
    }

    if (!origin.address || !origin.address.trim() || !dest.address || !dest.address.trim()) {
      alert("Por favor, forneça o Endereço Completo de Origem e Destino.");
      return;
    }

    if (!origin.attentionTo || !origin.attentionTo.trim() || !dest.attentionTo || !dest.attentionTo.trim()) {
      alert("Por favor, preencha os campos A/C de Origem e Destino.");
      return;
    }

    // Validar Peso Total
    if (!editingRequest.totalWeight || !editingRequest.totalWeight.trim()) {
      alert("Por favor, forneça o Peso Total.");
      return;
    }

    // Validar Volumes
    if (editingRequest.totalVolume <= 0) {
      alert("A quantidade de Volumes deve ser superior a zero.");
      return;
    }

    // Validar itens SAP
    for (let i = 0; i < editingRequest.requestAssets.length; i++) {
      const sa = editingRequest.requestAssets[i];
      const asset = assets.find(a => a.id === sa.assetId);
      const assetName = asset ? asset.name : `Item ${i + 1}`;

      if (!sa.sapCode || !sa.sapCode.trim()) {
        alert(`Por favor, preencha o Cód. SAP para o item "${assetName}".`);
        return;
      }
      if (!sa.ncm || !sa.ncm.trim() || sa.ncm.trim() === '0') {
        alert(`Por favor, insira um NCM válido para o item "${assetName}".`);
        return;
      }
      if (!sa.nfeReference || !sa.nfeReference.trim()) {
        alert(`Por favor, insira a NFe Ref. (Nota de Origem) para o item "${assetName}".`);
        return;
      }
      if (sa.unitValue <= 0) {
        alert(`O Valor Unitário do item "${assetName}" deve ser maior que R$ 0,00.`);
        return;
      }
      if (sa.quantity <= 0) {
        alert(`A quantidade do item "${assetName}" deve ser maior que zero.`);
        return;
      }
    }

    try {
      // Regenerar rascunhos para refletir as alterações salvas
      const assetList = assets.filter(a => (editingRequest.requestAssets || []).map(ra => ra.assetId).includes(a.id));
      
      const emailDraft = await generateEmailDraft(
        editingRequest.type,
        assetList,
        `${editingRequest.originDetails.city || ''} (Plant ${editingRequest.originDetails.plant || 'N/D'})`,
        `${editingRequest.destinationDetails.city || ''} (Plant ${editingRequest.destinationDetails.plant || 'N/D'})`,
        editingRequest.requestAssets,
        editingRequest.totalWeight,
        editingRequest.totalVolume,
        editingRequest.requesterEmail
      );

      const logisticsDraft = await generateLogisticsEmailDraft(
        editingRequest,
        assetList,
        userRole === 'admin' || !!hasContributed
      );

      // Salva na base de dados chamando nossa API
      onUpdate(editingRequest.id, {
        originDetails: editingRequest.originDetails,
        destinationDetails: editingRequest.destinationDetails,
        totalWeight: editingRequest.totalWeight,
        totalVolume: editingRequest.totalVolume,
        invoiceNumber: editingRequest.invoiceNumber || '',
        trackingNumber: editingRequest.trackingNumber || '',
        status: editingRequest.status,
        logisticsStatus: editingRequest.logisticsStatus,
        method: editingRequest.method,
        requestAssets: editingRequest.requestAssets,
        emailDraft,
        logisticsDraft
      });
      
      setEditingRequest(null);
      alert("Cadastro de Solicitação atualizado com sucesso na base de dados!");
    } catch (e) {
      console.error(e);
      alert("Erro ao salvar as edições na base de dados.");
    }
  };

  const updateRequestAssetField = (index: number, field: keyof RequestAsset, value: any) => {
    if (!editingRequest) return;
    const updatedAssets = [...editingRequest.requestAssets];
    updatedAssets[index] = {
      ...updatedAssets[index],
      [field]: value
    };
    setEditingRequest({
      ...editingRequest,
      requestAssets: updatedAssets
    });
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
              <th className="px-6 md:px-10 py-5 text-right min-w-[240px] md:min-w-[320px]">Ações</th>
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
                <td className="px-6 md:px-10 py-6 md:py-8 text-right min-w-[240px] md:min-w-[320px] whitespace-nowrap">
                  <div className="flex items-center justify-end gap-2 md:gap-3 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                    {req.status !== RequestStatus.COMPLETED && (
                      <button 
                        onClick={() => setCompletionRequest(req)}
                        className="w-8 h-8 md:w-10 md:h-10 flex shrink-0 items-center justify-center bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-800 rounded-lg md:rounded-xl hover:bg-emerald-600 hover:text-white transition-all shadow-sm"
                        title="Marcar como Concluído e Gerar Coleta"
                      >
                        <i className="fas fa-check text-xs md:text-base"></i>
                      </button>
                    )}
                    {req.emailDraft && (
                      <button 
                         onClick={() => setPreviewRequest({ req, mode: 'SAP' })}
                         className="w-8 h-8 md:w-10 md:h-10 flex shrink-0 items-center justify-center bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-800 rounded-lg md:rounded-xl hover:bg-blue-600 hover:text-white transition-all shadow-sm"
                         title="Ver Rascunho SAP"
                      >
                        <i className="fas fa-file-invoice text-xs md:text-base"></i>
                      </button>
                    )}
                    {req.logisticsDraft && (
                      <button 
                         onClick={() => setPreviewRequest({ req, mode: 'LOGISTICS' })}
                         className="w-8 h-8 md:w-10 md:h-10 flex shrink-0 items-center justify-center bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-800 rounded-lg md:rounded-xl hover:bg-indigo-600 hover:text-white transition-all shadow-sm"
                         title={`Ver E-mail para ${req.method === 'Carrier' ? 'PHL' : 'Correios'}`}
                      >
                        <i className="fas fa-truck-fast text-xs md:text-base"></i>
                      </button>
                    )}
                    <button 
                       onClick={() => handleOpenExcelAndCopy(req)}
                       className="w-8 h-8 md:w-10 md:h-10 flex shrink-0 items-center justify-center bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-800 rounded-lg md:rounded-xl hover:bg-emerald-600 hover:text-white transition-all shadow-sm animate-pulse-subtle"
                       title="Copiar Itens NF e Abrir Planilha Excel de Controle de Transportes"
                    >
                      <i className="fas fa-file-excel text-xs md:text-base"></i>
                    </button>
                    <button 
                      onClick={() => {
                        setRequestToEditPassword(req);
                        setEditPassword('');
                      }}
                      className="w-8 h-8 md:w-10 md:h-10 flex shrink-0 items-center justify-center bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 border border-amber-100 dark:border-amber-800 rounded-lg md:rounded-xl hover:bg-amber-600 hover:text-white transition-all shadow-sm"
                      title="Alterar Dados (Editar Solicitação)"
                    >
                      <i className="fas fa-edit text-xs md:text-base"></i>
                    </button>
                    <button 
                      onClick={() => {
                        setRequestToDelete(req);
                        setDeletePassword('');
                      }}
                      className="w-8 h-8 md:w-10 md:h-10 flex shrink-0 items-center justify-center bg-rose-50 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 border border-rose-100 dark:border-rose-800 rounded-lg md:rounded-xl hover:bg-rose-600 hover:text-white transition-all shadow-sm"
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
            {showFolderCopyToast && (
               <div className="absolute bottom-20 left-1/2 -translate-x-1/2 z-50 bg-slate-900 text-white px-6 py-4 rounded-xl shadow-2xl flex items-center gap-4 animate-in slide-in-from-bottom-5 fade-in duration-300 border border-slate-700">
                  <div className="bg-blue-500 p-2 rounded-full">
                     <i className="fas fa-folder text-white"></i>
                  </div>
                  <div>
                     <p className="font-bold text-sm">Caminho da pasta copiado!</p>
                     <p className="text-xs text-slate-400">Cole no Windows Explorer</p>
                  </div>
               </div>
            )}
            {showFileCopyToast && (
               <div className="absolute bottom-20 left-1/2 -translate-x-1/2 z-50 bg-slate-900 text-white px-6 py-4 rounded-xl shadow-2xl flex items-center gap-4 animate-in slide-in-from-bottom-5 fade-in duration-300 border border-slate-700">
                  <div className="bg-emerald-500 p-2 rounded-full">
                     <i className="fas fa-file-excel text-white"></i>
                  </div>
                  <div>
                     <p className="font-bold text-sm">Link do SharePoint copiado!</p>
                     <p className="text-xs text-slate-400">Pronto para ser colado onde preferir</p>
                  </div>
               </div>
            )}
            {showClearToast && (
               <div className="absolute bottom-20 left-1/2 -translate-x-1/2 z-50 bg-slate-900 text-white px-6 py-4 rounded-xl shadow-2xl flex items-center gap-4 animate-in slide-in-from-bottom-5 fade-in duration-300 border border-slate-700">
                  <div className="bg-rose-500 p-2 rounded-full text-white">
                     <i className="fas fa-eraser"></i>
                  </div>
                  <div>
                     <p className="font-bold text-sm">Área de rascunho limpa!</p>
                     <p className="text-xs text-slate-400">Imagens e planilhas externas foram removidas.</p>
                   </div>
                </div>
            )}

            {previewRequest.mode === 'SAP' && (
              <div className="mx-6 mt-4 p-4 md:p-5 bg-emerald-50/55 dark:bg-emerald-950/10 border border-emerald-200 dark:border-emerald-900/40 rounded-2xl flex flex-col md:flex-row items-start md:items-center gap-4 transition-all">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                  <i className="fas fa-file-excel text-lg text-emerald-600 dark:text-emerald-400 animate-bounce"></i>
                </div>
                <div className="flex-1 min-w-0 font-sans">
                  <h4 className="text-[11px] font-black uppercase text-emerald-800 dark:text-emerald-400 tracking-wider flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block animate-pulse"></span>
                    Planilha Excel OneDrive (Caminho Corporativo)
                  </h4>
                  <p className="text-xs text-emerald-700 dark:text-emerald-300 font-mono mt-1 select-all break-all bg-emerald-100/30 dark:bg-emerald-950/40 px-2 py-1 rounded">
                    C:\Users\BR23636\OneDrive - Cirion Technologies\Documentos\NF REMESSA SOLICITADA\NF CORRIGIDA\Nota de Remessa - corrigida.xlsx
                  </p>
                  <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold mt-1.5 leading-relaxed font-sans">
                    Instrução: Ao clicar em <strong>Abrir Planilha</strong>, o arquivo será aberto diretamente no <strong>Microsoft Excel</strong> local do seu computador e o caminho será copiado! Após editar, salve a planilha, copie seus dados e dê um <strong>Ctrl+V</strong> na área de rascunho interativa logo abaixo.
                  </p>
                </div>
                <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto shrink-0 mt-3 md:mt-0">
                  <button
                    onClick={async () => {
                      try {
                        await navigator.clipboard.writeText("C:\\Users\\BR23636\\OneDrive - Cirion Technologies\\Documentos\\NF REMESSA SOLICITADA\\NF CORRIGIDA\\Nota de Remessa - corrigida.xlsx");
                        setShowLocalExcelToast(true);
                        setTimeout(() => setShowLocalExcelToast(false), 3000);
                      } catch (err) {
                        console.error(err);
                      }
                    }}
                    type="button"
                    className="flex-1 md:flex-none px-3.5 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-[10px] font-black uppercase rounded-xl transition-all flex items-center justify-center gap-1 border border-slate-200 dark:border-slate-700"
                    title="Copiar caminho de arquivo local"
                  >
                    <i className="fas fa-copy"></i> Copiar Caminho
                  </button>
                  <button
                    onClick={() => {
                      const officeUri = `ms-excel:ofe|u|https://xyzlatam-my.sharepoint.com/personal/gilberto_araujo_ext_ciriontechnologies_com/Documents/Documentos/NF%20REMESSA%20SOLICITADA/NF%20CORRIGIDA/Nota%20de%20Remessa%20-%20corrigida.xlsx`;
                      
                      // Also copy local path to clipboard as a courtesy
                      navigator.clipboard.writeText("C:\\Users\\BR23636\\OneDrive - Cirion Technologies\\Documentos\\NF REMESSA SOLICITADA\\NF CORRIGIDA\\Nota de Remessa - corrigida.xlsx").then(() => {
                        setShowLocalExcelToast(true);
                        setTimeout(() => setShowLocalExcelToast(false), 3000);
                      }).catch(console.error);

                      window.location.href = officeUri;
                    }}
                    type="button"
                    className="flex-1 md:flex-none px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-extrabold uppercase rounded-xl transition-all flex items-center justify-center gap-2 shadow-md shadow-emerald-600/20 active:scale-95"
                  >
                    <i className="fas fa-file-excel text-xs"></i> Abrir Planilha
                  </button>
                </div>
              </div>
            )}

            <div className="p-6 overflow-y-auto flex-1 bg-slate-100/30 dark:bg-slate-950/30 flex flex-col gap-2">
              <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 font-sans">
                <span className="text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 text-blue-600 dark:text-blue-400">
                  <i className="fas fa-pen-fancy animate-pulse text-blue-500"></i> 
                  ✏️ Área de rascunho interativa - Você pode clicar, apagar e colar (Ctrl+V) a planilha aqui:
                </span>
                <button
                  type="button"
                  onClick={() => {
                    if (emailRef.current) {
                      if (previewRequest.mode === 'LOGISTICS') {
                        // Logistics mode - Keep the greeting and introductory message
                        const isCarrier = previewRequest.req.method === 'Carrier';
                        emailRef.current.innerHTML = `
                          <div style="font-family: Arial, sans-serif; color: #333; padding: 10px;">
                            <p>Prezados,</p>
                            <p>Solicitamos a ${isCarrier ? 'coleta' : 'postagem'} da encomenda conforme dados abaixo:</p>
                          </div>
                        `;
                      } else {
                        // SAP mode - Reconstruct greeting dynamically (keep existing if customized, otherwise generate)
                        let greetingText = "Bom dia Tiago,";
                        const currentHour = new Date().getHours();
                        const defaultGreeting = currentHour < 12 ? "Bom dia" : "Boa tarde";

                        const currentText = emailRef.current.innerText || "";
                        if (currentText.includes("Boa tarde Tiago")) {
                          greetingText = "Boa tarde Tiago,";
                        } else if (currentText.includes("Boa noite Tiago")) {
                          greetingText = "Boa noite Tiago,";
                        } else if (currentText.includes("Bom dia Tiago")) {
                          greetingText = "Bom dia Tiago,";
                        } else {
                          // Check if the user has custom greeting before "Tiago" (e.g. Olá Tiago, Caro Tiago, etc.)
                          const customMatch = currentText.match(/^([^\n,]+Tiago,?)/i);
                          if (customMatch && customMatch[1]) {
                            greetingText = customMatch[1].trim();
                          } else {
                            greetingText = `${defaultGreeting} Tiago,`;
                          }
                        }

                        emailRef.current.innerHTML = `
                          <div style="font-family: Arial, sans-serif; color: #333; padding: 10px;">
                            <p>${greetingText}</p>
                            <p>Segue solicitação de NF Remessa conforme dados abaixo:</p>
                          </div>
                        `;
                      }

                      // Update react state so the change is persisted across re-renders
                      const finalCleanHtml = emailRef.current.innerHTML;
                      setDraftHtml(finalCleanHtml);

                      // Show toast confirmation
                      setShowClearToast(true);
                      setTimeout(() => setShowClearToast(false), 3000);
                    }
                  }}
                  className="text-[9px] font-black uppercase text-rose-500 hover:text-rose-700 hover:underline flex items-center gap-1 transition-colors"
                >
                  <i className="fas fa-trash-can"></i> Limpar Área
                </button>
              </div>
              <div 
                ref={emailRef}
                contentEditable={true}
                suppressContentEditableWarning={true}
                className="border-2 border-dashed border-blue-200 focus:border-blue-500 dark:border-slate-700 focus:ring-4 focus:ring-blue-100 dark:focus:ring-blue-900/10 p-8 rounded-xl bg-white overflow-x-auto shadow-inner min-h-[400px] outline-none text-slate-800 transition-all leading-normal text-sm"
                dangerouslySetInnerHTML={{ 
                   __html: draftHtml 
                }}
              />
            </div>
            <div className="p-4 md:p-6 bg-slate-50 dark:bg-slate-900 border-t border-slate-100 dark:border-slate-700 flex flex-col sm:flex-row sm:justify-end gap-3 transition-colors">
              <button 
                onClick={openInOutlook}
                className={`w-full sm:w-auto px-4 py-2.5 ${previewRequest.mode === 'LOGISTICS' ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-slate-800 hover:bg-black dark:bg-slate-700 dark:hover:bg-slate-600'} text-white rounded-xl text-xs font-extrabold transition-colors flex items-center justify-center gap-2 shadow-lg active:scale-95`}
              >
                <i className="fas fa-paper-plane"></i> {previewRequest.mode === 'LOGISTICS' ? `Enviar para ${previewRequest.req.method === 'Carrier' ? 'PHL Log' : 'Correios'} (Baixar NF)` : 'Outlook (Novo E-mail)'}
              </button>
              <button 
                onClick={copyRichHtml}
                className="w-full sm:w-auto px-4 py-2.5 bg-blue-600 text-white rounded-xl text-xs font-extrabold hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 shadow-lg active:scale-95"
              >
                <i className="fas fa-paste"></i> Copiar Formatação (Ctrl+V no Outlook)
              </button>
              <button 
                onClick={() => setPreviewRequest(null)}
                className="w-full sm:w-auto px-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 rounded-xl text-xs font-extrabold hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors active:scale-95"
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

      {/* Visual Guide Modal for Opening Local folders in Windows */}
      {showFolderModal && (
        <div className="fixed inset-0 z-[140] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 border border-amber-100 dark:border-slate-800 w-full max-w-lg rounded-3xl shadow-2xl p-6 md:p-8 relative overflow-hidden transition-colors">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-850 pb-4 mb-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                  <i className="fas fa-file-excel text-lg"></i>
                </div>
                <div>
                  <h4 className="text-sm font-black uppercase text-slate-800 dark:text-slate-100 tracking-tight">Como Abrir a Planilha Local</h4>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">Atalho de Abertura Direta (Windows)</p>
                </div>
              </div>
              <button 
                onClick={() => setShowFolderModal(false)} 
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-2 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                <i className="fas fa-times"></i>
              </button>
            </div>

            {/* Instruction Body */}
            <div className="space-y-6">
              <div className="p-4 bg-amber-50/50 dark:bg-amber-950/10 rounded-2xl border border-amber-100 dark:border-amber-900/30 font-sans">
                <p className="text-xs text-amber-800 dark:text-amber-300 font-semibold leading-relaxed">
                  Por segurança dos navegadores, arquivos locais do seu computador não podem ser iniciados de forma invisível. Mas já automatizamos! O caminho completo direto da planilha Excel já está na sua área de transferência:
                </p>
                <div className="mt-3 flex items-center gap-2 font-mono text-[11px] text-slate-700 dark:text-slate-300 bg-amber-100/50 dark:bg-amber-900/20 px-3 py-2 rounded-xl select-all border border-amber-200/50">
                  <i className="fas fa-link text-amber-600 shrink-0"></i>
                  <span className="truncate">C:\...\NF CORRIGIDA\Nota de Remessa - corrigida.xlsx</span>
                  <span className="shrink-0 text-[10px] bg-amber-200 text-amber-800 dark:bg-amber-800 dark:text-amber-200 px-1.5 py-0.5 rounded font-sans font-bold">Copiado!</span>
                </div>
              </div>

              <div className="space-y-4 font-sans">
                <h5 className="text-[11px] font-black uppercase text-slate-700 dark:text-slate-350 tracking-wider">Como abrir em 3 segundos no Windows:</h5>
                
                {/* Step 1 */}
                <div className="flex gap-3">
                  <div className="w-6 h-6 rounded-full bg-slate-105 dark:bg-slate-800 text-slate-750 dark:text-slate-300 flex items-center justify-center font-bold text-xs shrink-0 self-start mt-0.5">
                    1
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-850 dark:text-slate-200">Abra o Executar do Windows</p>
                    <p className="text-[11px] text-slate-500 mt-1 flex items-center gap-1.5">
                      Pressione: <kbd className="bg-slate-100 dark:bg-slate-850 border border-slate-300 dark:border-slate-700 px-1.5 py-0.5 rounded shadow text-[10px] font-mono font-bold">[Win ⊞]</kbd> + <kbd className="bg-slate-100 dark:bg-slate-850 border border-slate-300 dark:border-slate-700 px-1.5 py-0.5 rounded shadow text-[10px] font-mono font-bold">[R]</kbd>
                    </p>
                  </div>
                </div>

                {/* Step 2 */}
                <div className="flex gap-3">
                  <div className="w-6 h-6 rounded-full bg-slate-105 dark:bg-slate-800 text-slate-750 dark:text-slate-300 flex items-center justify-center font-bold text-xs shrink-0 self-start mt-0.5">
                    2
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-850 dark:text-slate-200">Cole o caminho do arquivo</p>
                    <p className="text-[11px] text-slate-500 mt-1 flex items-center gap-1.5">
                      Pressione: <kbd className="bg-slate-100 dark:bg-slate-850 border border-slate-300 dark:border-slate-700 px-1.5 py-0.5 rounded shadow text-[10px] font-mono font-bold">[Ctrl]</kbd> + <kbd className="bg-slate-100 dark:bg-slate-850 border border-slate-300 dark:border-slate-700 px-1.5 py-0.5 rounded shadow text-[10px] font-mono font-bold">[V]</kbd>
                    </p>
                  </div>
                </div>

                {/* Step 3 */}
                <div className="flex gap-3">
                  <div className="w-6 h-6 rounded-full bg-slate-105 dark:bg-slate-800 text-slate-750 dark:text-slate-300 flex items-center justify-center font-bold text-xs shrink-0 self-start mt-0.5">
                    3
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-850 dark:text-slate-200">Aperte Enter para abrir o Excel</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Aperte a tecla <kbd className="bg-slate-100 dark:bg-slate-850 border border-slate-300 dark:border-slate-700 px-1.5 py-0.5 rounded shadow text-[10px] font-mono font-bold">[Enter]</kbd> e o seu Excel abrirá diretamente a planilha!
                    </p>
                  </div>
                </div>

                {/* Step 4 */}
                <div className="flex gap-3">
                  <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/20 dark:text-emerald-300 flex items-center justify-center font-bold text-xs shrink-0 self-start mt-0.5">
                    4
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-850 dark:text-slate-200">Copie e Cole de Volta no Rascunho</p>
                    <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                      Após realizar suas edições no Excel, selecione a tabela, copie-a (ou use a ferramenta de captura do Windows) e simplesmente <strong>pressione Ctrl+V em nosso rascunho interativo</strong> para que a alteração seja integrada ao e-mail!
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="border-t border-slate-100 dark:border-slate-800 pt-4 mt-6 flex justify-end font-sans">
              <button
                type="button"
                onClick={() => setShowFolderModal(false)}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all active:scale-95 flex items-center gap-2 shadow-lg shadow-emerald-600/10"
              >
                <i className="fas fa-check"></i> OK, Entendi!
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Password Confirmation Modal for AlterarDados */}
      {requestToEditPassword && (
        <div className="fixed inset-0 z-[130] flex items-center justify-center p-4 bg-slate-900/90 backdrop-blur-md animate-in zoom-in-95 duration-200">
          <div className="bg-white dark:bg-slate-800 w-full max-w-sm rounded-3xl shadow-2xl overflow-hidden flex flex-col border border-amber-100 dark:border-amber-900 transition-colors">
             <div className="p-6 bg-amber-600 text-white flex items-center gap-4">
                <div className="bg-amber-500 p-2 rounded-lg">
                   <i className="fas fa-lock text-xl"></i>
                </div>
                <div>
                   <h3 className="font-black uppercase tracking-tight text-sm">Segurança</h3>
                   <p className="text-[10px] text-amber-100 font-bold uppercase tracking-widest">Alterar Dados do Registro</p>
                </div>
             </div>
             <div className="p-6 text-center space-y-4">
                <p className="text-slate-600 dark:text-slate-300 text-sm font-medium">
                  Para alterar as informações do protocolo <span className="font-black text-slate-900 dark:text-white">{requestToEditPassword.id}</span>, informe a senha de acesso:
                </p>
                <input 
                  type="password"
                  value={editPassword}
                  onChange={e => setEditPassword(e.target.value)}
                  placeholder="Senha de Ajuste"
                  className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 outline-none focus:ring-2 focus:ring-amber-400 font-bold text-center text-slate-700 dark:text-slate-200 transition-colors"
                  autoFocus
                  onKeyDown={e => {
                    if (e.key === 'Enter') handleEditPasswordConfirmed();
                  }}
                />
             </div>
             <div className="p-6 bg-slate-50 dark:bg-slate-900/50 border-t border-slate-100 dark:border-slate-700 flex gap-3 transition-colors">
                <button 
                   onClick={() => {
                     setRequestToEditPassword(null);
                     setEditPassword('');
                   }}
                   className="flex-1 py-3 text-xs font-black uppercase text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all"
                >
                   Cancelar
                </button>
                <button 
                   onClick={handleEditPasswordConfirmed}
                   className="flex-[2] py-3 bg-amber-600 text-white text-xs font-black uppercase rounded-xl shadow-lg shadow-amber-600/20 hover:bg-amber-700 transition-all active:scale-95"
                >
                   Confirmar
                </button>
             </div>
          </div>
        </div>
      )}

      {/* Complete Edit Request Modal */}
      {editingRequest && (
        <div className="fixed inset-0 z-[140] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 border border-slate-205 dark:border-slate-800 w-full max-w-4xl rounded-3xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden transition-colors">
            
            {/* Header */}
            <div className="p-6 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center border border-amber-500/20">
                  <i className="fas fa-edit text-lg"></i>
                </div>
                <div>
                  <h4 className="text-sm font-black uppercase tracking-tight">Editar Dados</h4>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">Protocolo: {editingRequest.id} | {editingRequest.type}</p>
                </div>
              </div>
              <button 
                onClick={() => setEditingRequest(null)} 
                className="text-slate-400 hover:text-white transition-colors"
                type="button"
              >
                <i className="fas fa-times text-lg"></i>
              </button>
            </div>

            {/* Navigation tabs inside Modal */}
            <div className="flex border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 transition-colors px-6 py-2 overflow-x-auto no-scrollbar gap-2">
              <button
                type="button"
                onClick={() => setEditTab('origin')}
                className={`px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wide transition-all ${editTab === 'origin' ? 'bg-emerald-500/10 text-emerald-600' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'}`}
              >
                <i className="fas fa-arrow-up-from-bracket mr-1.5"></i> Origem
              </button>
              <button
                type="button"
                onClick={() => setEditTab('destination')}
                className={`px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wide transition-all ${editTab === 'destination' ? 'bg-blue-500/10 text-blue-600' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'}`}
              >
                <i className="fas fa-arrow-down-to-bracket mr-1.5"></i> Destino
              </button>
              <button
                type="button"
                onClick={() => setEditTab('general')}
                className={`px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wide transition-all ${editTab === 'general' ? 'bg-amber-500/10 text-amber-600' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'}`}
              >
                <i className="fas fa-circle-info mr-1.5"></i> Dados Gerais
              </button>
              <button
                type="button"
                onClick={() => setEditTab('assets')}
                className={`px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wide transition-all ${editTab === 'assets' ? 'bg-indigo-500/10 text-indigo-600' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'}`}
              >
                <i className="fas fa-barcode-read mr-1.5"></i> Itens SAP ({editingRequest.requestAssets?.length || 0})
              </button>
            </div>

            {/* Content Container */}
            <div className="p-6 md:p-8 overflow-y-auto flex-1 bg-white dark:bg-slate-900 transition-colors">
              
              {/* Tab: Origin Details */}
              {editTab === 'origin' && (
                <div className="space-y-5 animate-in fade-in duration-200 text-left">
                  <h3 className="text-xs font-black uppercase text-emerald-650 tracking-wider flex items-center gap-2 mb-4 border-b pb-2 border-emerald-500/10">
                    <i className="fas fa-arrow-up-from-bracket"></i> Informações do Remetente / Origem
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    <div>
                      <label className="block text-[10px] font-black uppercase text-slate-505 mb-1.5">A/C de (Destinatário/Contato) <span className="text-rose-500">*</span></label>
                      <input 
                        className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-705 outline-none focus:ring-2 focus:ring-emerald-400 text-sm font-bold text-slate-800 dark:text-white"
                        value={editingRequest.originDetails.attentionTo || ''}
                        onChange={e => setEditingRequest({...editingRequest, originDetails: {...editingRequest.originDetails, attentionTo: e.target.value}})}
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black uppercase text-slate-505 mb-1.5">Centro / Plant <span className="text-rose-500">*</span></label>
                      <input 
                        className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-705 outline-none focus:ring-2 focus:ring-emerald-400 text-sm font-bold text-slate-800 dark:text-white"
                        value={editingRequest.originDetails.plant || ''}
                        onChange={e => setEditingRequest({...editingRequest, originDetails: {...editingRequest.originDetails, plant: e.target.value}})}
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black uppercase text-slate-505 mb-1.5">CEP</label>
                      <input 
                        className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-705 outline-none focus:ring-2 focus:ring-emerald-400 text-sm font-bold text-slate-800 dark:text-white"
                        value={editingRequest.originDetails.cep || ''}
                        onChange={e => setEditingRequest({...editingRequest, originDetails: {...editingRequest.originDetails, cep: e.target.value}})}
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black uppercase text-slate-505 mb-1.5">BP</label>
                      <input 
                        className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-755 outline-none focus:ring-2 focus:ring-emerald-400 text-sm font-bold text-slate-800 dark:text-white"
                        value={editingRequest.originDetails.bp || ''}
                        onChange={e => setEditingRequest({...editingRequest, originDetails: {...editingRequest.originDetails, bp: e.target.value}})}
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black uppercase text-slate-505 mb-1.5">Estado (UF) <span className="text-rose-500">*</span></label>
                      <input 
                        className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-755 outline-none focus:ring-2 focus:ring-emerald-400 text-sm font-bold text-slate-800 dark:text-white"
                        maxLength={2}
                        placeholder="Ex: SP"
                        value={editingRequest.originDetails.state || ''}
                        onChange={e => setEditingRequest({...editingRequest, originDetails: {...editingRequest.originDetails, state: e.target.value.toUpperCase()}})}
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black uppercase text-slate-505 mb-1.5">Cidade <span className="text-rose-500">*</span></label>
                      <input 
                        className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-755 outline-none focus:ring-2 focus:ring-emerald-400 text-sm font-bold text-slate-800 dark:text-white"
                        value={editingRequest.originDetails.city || ''}
                        onChange={e => setEditingRequest({...editingRequest, originDetails: {...editingRequest.originDetails, city: e.target.value}})}
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black uppercase text-slate-555 mb-1.5">Bairro / Setor</label>
                      <input 
                        className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-705 outline-none focus:ring-2 focus:ring-emerald-400 text-sm font-bold text-slate-800 dark:text-white"
                        value={editingRequest.originDetails.neighborhood || ''}
                        onChange={e => setEditingRequest({...editingRequest, originDetails: {...editingRequest.originDetails, neighborhood: e.target.value}})}
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-[10px] font-black uppercase text-slate-505 mb-1.5">Endereço Completo <span className="text-rose-500">*</span></label>
                      <input 
                        className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-705 outline-none focus:ring-2 focus:ring-emerald-400 text-sm font-bold text-slate-800 dark:text-white"
                        value={editingRequest.originDetails.address || ''}
                        onChange={e => setEditingRequest({...editingRequest, originDetails: {...editingRequest.originDetails, address: e.target.value}})}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Tab: Destination Details */}
              {editTab === 'destination' && (
                <div className="space-y-5 animate-in fade-in duration-200 text-left">
                  <h3 className="text-xs font-black uppercase text-blue-600 tracking-wider flex items-center gap-2 mb-4 border-b pb-2 border-blue-500/10">
                    <i className="fas fa-arrow-down-to-bracket"></i> Informações do Destinatário / Destino
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    <div>
                      <label className="block text-[10px] font-black uppercase text-slate-505 mb-1.5">A/C de (Destinatário/Contato) <span className="text-rose-500">*</span></label>
                      <input 
                        className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 outline-none focus:ring-2 focus:ring-blue-400 text-sm font-bold text-slate-800 dark:text-white"
                        value={editingRequest.destinationDetails.attentionTo || ''}
                        onChange={e => setEditingRequest({...editingRequest, destinationDetails: {...editingRequest.destinationDetails, attentionTo: e.target.value}})}
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black uppercase text-slate-505 mb-1.5">Centro / Plant <span className="text-rose-500">*</span></label>
                      <input 
                        className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 outline-none focus:ring-2 focus:ring-blue-405 text-sm font-bold text-slate-800 dark:text-white"
                        value={editingRequest.destinationDetails.plant || ''}
                        onChange={e => setEditingRequest({...editingRequest, destinationDetails: {...editingRequest.destinationDetails, plant: e.target.value}})}
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black uppercase text-slate-505 mb-1.5">CEP</label>
                      <input 
                        className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-805 border border-slate-200 dark:border-slate-700 outline-none focus:ring-2 focus:ring-blue-400 text-sm font-bold text-slate-800 dark:text-white"
                        value={editingRequest.destinationDetails.cep || ''}
                        onChange={e => setEditingRequest({...editingRequest, destinationDetails: {...editingRequest.destinationDetails, cep: e.target.value}})}
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black uppercase text-slate-505 mb-1.5">BP</label>
                      <input 
                        className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 outline-none focus:ring-2 focus:ring-blue-400 text-sm font-bold text-slate-800 dark:text-white"
                        value={editingRequest.destinationDetails.bp || ''}
                        onChange={e => setEditingRequest({...editingRequest, destinationDetails: {...editingRequest.destinationDetails, bp: e.target.value}})}
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black uppercase text-slate-505 mb-1.5">Estado (UF) <span className="text-rose-500">*</span></label>
                      <input 
                        className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-202 dark:border-slate-700 outline-none focus:ring-2 focus:ring-blue-400 text-sm font-bold text-slate-800 dark:text-white"
                        maxLength={2}
                        placeholder="Ex: SP"
                        value={editingRequest.destinationDetails.state || ''}
                        onChange={e => setEditingRequest({...editingRequest, destinationDetails: {...editingRequest.destinationDetails, state: e.target.value.toUpperCase()}})}
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black uppercase text-slate-505 mb-1.5">Cidade <span className="text-rose-500">*</span></label>
                      <input 
                        className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-202 dark:border-slate-700 outline-none focus:ring-2 focus:ring-blue-455 text-sm font-bold text-slate-800 dark:text-white"
                        value={editingRequest.destinationDetails.city || ''}
                        onChange={e => setEditingRequest({...editingRequest, destinationDetails: {...editingRequest.destinationDetails, city: e.target.value}})}
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black uppercase text-slate-505 mb-1.5">Bairro / Setor</label>
                      <input 
                        className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-850 border border-slate-202 dark:border-slate-700 outline-none focus:ring-2 focus:ring-blue-400 text-sm font-bold text-slate-800 dark:text-white"
                        value={editingRequest.destinationDetails.neighborhood || ''}
                        onChange={e => setEditingRequest({...editingRequest, destinationDetails: {...editingRequest.destinationDetails, neighborhood: e.target.value}})}
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-[10px] font-black uppercase text-slate-500 mb-1.5">Endereço Completo <span className="text-rose-500">*</span></label>
                      <input 
                        className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-202 dark:border-slate-700 outline-none focus:ring-2 focus:ring-blue-400 text-sm font-bold text-slate-800 dark:text-white"
                        value={editingRequest.destinationDetails.address || ''}
                        onChange={e => setEditingRequest({...editingRequest, destinationDetails: {...editingRequest.destinationDetails, address: e.target.value}})}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Tab: General Details */}
              {editTab === 'general' && (
                <div className="space-y-5 animate-in fade-in duration-200 text-left">
                  <h3 className="text-xs font-black uppercase text-amber-500 tracking-wider flex items-center gap-2 mb-4 border-b pb-2 border-amber-500/10">
                    <i className="fas fa-circle-info"></i> Aspectos Logísticos do Cadastro
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    <div>
                      <label className="block text-[10px] font-black uppercase text-slate-500 mb-1.5">Peso Total <span className="text-rose-500">*</span></label>
                      <input 
                        className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-202 dark:border-slate-700 outline-none focus:ring-2 focus:ring-amber-400 text-sm font-bold text-slate-800 dark:text-white"
                        placeholder="Ex: 2kg"
                        value={editingRequest.totalWeight || ''}
                        onChange={e => setEditingRequest({...editingRequest, totalWeight: e.target.value})}
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black uppercase text-slate-505 mb-1.5">Volumes <span className="text-rose-500">*</span></label>
                      <input 
                        type="number"
                        className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-202 dark:border-slate-700 outline-none focus:ring-2 focus:ring-amber-400 text-sm font-bold text-slate-800 dark:text-white"
                        value={editingRequest.totalVolume || 1}
                        onChange={e => setEditingRequest({...editingRequest, totalVolume: parseInt(e.target.value) || 1})}
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black uppercase text-slate-500 mb-1.5">Método de Transporte</label>
                      <select 
                        className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-850 border border-slate-202 dark:border-slate-700 outline-none focus:ring-2 focus:ring-amber-400 text-sm font-bold text-slate-800 dark:text-white"
                        value={editingRequest.method}
                        onChange={e => setEditingRequest({...editingRequest, method: e.target.value as 'Carrier' | 'Mail'})}
                      >
                        <option value="Carrier">Transportadora (PHL Log)</option>
                        <option value="Mail">Correios / ECT</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-black uppercase text-slate-500 mb-1.5">Número da NF (Opcional)</label>
                      <input 
                        className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-202 dark:border-slate-700 outline-none focus:ring-2 focus:ring-amber-400 text-sm font-bold text-slate-800 dark:text-white"
                        placeholder="Ex: 272071"
                        value={editingRequest.invoiceNumber || ''}
                        onChange={e => setEditingRequest({...editingRequest, invoiceNumber: e.target.value})}
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black uppercase text-slate-500 mb-1.5">Código de Rastreamento (Opcional)</label>
                      <input 
                        className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-202 dark:border-slate-700 outline-none focus:ring-2 focus:ring-amber-400 text-sm font-bold text-slate-800 dark:text-white"
                        placeholder="Ex: PM123456789BR"
                        value={editingRequest.trackingNumber || ''}
                        onChange={e => setEditingRequest({...editingRequest, trackingNumber: e.target.value})}
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black uppercase text-slate-555 mb-1.5">Status Geral SAP</label>
                      <select
                        className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-202 dark:border-slate-700 outline-none focus:ring-2 focus:ring-amber-400 text-sm font-bold text-slate-800 dark:text-white"
                        value={editingRequest.status}
                        onChange={e => setEditingRequest({...editingRequest, status: e.target.value as RequestStatus})}
                      >
                        {Object.values(RequestStatus).map(s => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-black uppercase text-slate-505 mb-1.5">Status Logística Física</label>
                      <select
                        className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 outline-none focus:ring-2 focus:ring-amber-400 text-sm font-bold text-slate-800 dark:text-white"
                        value={editingRequest.logisticsStatus}
                        onChange={e => setEditingRequest({...editingRequest, logisticsStatus: e.target.value as LogisticsStatus})}
                      >
                        {Object.values(LogisticsStatus).map(s => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {/* Tab: Asset / Items SAP */}
              {editTab === 'assets' && (
                <div className="space-y-6 animate-in fade-in duration-200 text-left">
                  <h3 className="text-xs font-black uppercase text-indigo-500 tracking-wider flex items-center gap-2 mb-4 border-b pb-2 border-indigo-500/10">
                    <i className="fas fa-barcode-read"></i> Cadastro e Detalhes SAP Fiori dos Itens
                  </h3>
                  
                  {editingRequest.requestAssets && editingRequest.requestAssets.length > 0 ? (
                    <div className="space-y-6">
                      {editingRequest.requestAssets.map((item, index) => {
                        const originalAsset = assets.find(a => a.id === item.assetId);
                        const assetName = originalAsset ? originalAsset.name : "Equipamento Desconhecido";
                        const assetType = originalAsset ? originalAsset.type : "TI";
                        const serialNum = originalAsset ? originalAsset.serialNumber : "";

                        return (
                          <div key={item.assetId || index} className="p-5 md:p-6 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-4 relative transition-colors">
                            <div className="flex items-center gap-2.5">
                              <div className="w-8 h-8 rounded-lg bg-indigo-500/10 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center text-xs">
                                <i className="fas fa-microchip"></i>
                              </div>
                              <div>
                                <h4 className="text-xs font-black text-slate-800 dark:text-slate-100 leading-none">{assetName}</h4>
                                <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-1">Tipo: {assetType} | Serial: {serialNum || 'N/D'}</p>
                              </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                              <div>
                                <label className="block text-[9px] font-black uppercase text-slate-505 mb-1">Cód. SAP Fiori <span className="text-rose-500">*</span></label>
                                <input 
                                  className="w-full px-3 py-2 text-xs font-bold rounded-lg bg-white dark:bg-slate-900 border border-slate-202 dark:border-slate-700 outline-none focus:ring-2 focus:ring-indigo-400 text-slate-800 dark:text-white"
                                  placeholder="Ex: 50... ou 40..."
                                  value={item.sapCode || ''}
                                  onChange={e => updateRequestAssetField(index, 'sapCode', e.target.value)}
                                />
                              </div>
                              <div>
                                <label className="block text-[9px] font-black uppercase text-slate-505 mb-1">NCM <span className="text-rose-500">*</span></label>
                                <input 
                                  className="w-full px-3 py-2 text-xs font-bold rounded-lg bg-white dark:bg-slate-900 border border-slate-202 dark:border-slate-700 outline-none focus:ring-2 focus:ring-indigo-400 text-slate-800 dark:text-white"
                                  placeholder="Ex: 84713012"
                                  value={item.ncm || ''}
                                  onChange={e => updateRequestAssetField(index, 'ncm', e.target.value)}
                                />
                              </div>
                              <div>
                                <label className="block text-[9px] font-black uppercase text-slate-505 mb-1">NFe Ref. (Origem) <span className="text-rose-500">*</span></label>
                                <input 
                                  className="w-full px-3 py-2 text-xs font-bold rounded-lg bg-white dark:bg-slate-900 border border-slate-202 dark:border-slate-700 outline-none focus:ring-2 focus:ring-indigo-400 text-slate-800 dark:text-white"
                                  placeholder="Ex: 123456"
                                  value={item.nfeReference || ''}
                                  onChange={e => updateRequestAssetField(index, 'nfeReference', e.target.value)}
                                />
                              </div>
                              <div>
                                <label className="block text-[9px] font-black uppercase text-slate-505 mb-1">Valor Unitário (R$) <span className="text-rose-500">*</span></label>
                                <input 
                                  type="number"
                                  step="0.01"
                                  className="w-full px-3 py-2 text-xs font-bold rounded-lg bg-white dark:bg-slate-900 border border-slate-202 dark:border-slate-700 outline-none focus:ring-2 focus:ring-indigo-400 text-slate-800 dark:text-white"
                                  value={item.unitValue || 0}
                                  onChange={e => updateRequestAssetField(index, 'unitValue', parseFloat(e.target.value) || 0)}
                                />
                              </div>
                              <div>
                                <label className="block text-[9px] font-black uppercase text-slate-500 mb-1">Qtd. <span className="text-rose-500">*</span></label>
                                <input 
                                  type="number"
                                  className="w-full px-3 py-2 text-xs font-bold rounded-lg bg-white dark:bg-slate-900 border border-slate-202 dark:border-slate-700 outline-none focus:ring-2 focus:ring-indigo-400 text-slate-800 dark:text-white"
                                  value={item.quantity || 1}
                                  onChange={e => updateRequestAssetField(index, 'quantity', parseInt(e.target.value) || 1)}
                                />
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="p-8 text-center bg-slate-50 dark:bg-slate-800 rounded-2xl border border-dashed border-slate-202 dark:border-slate-800 text-slate-400 text-xs italic">
                      Não há itens associados especificamente no array requestAssets desta solicitação antiga.
                    </div>
                  )}
                </div>
              )}

            </div>

            {/* Footer */}
            <div className="p-6 bg-slate-50 dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3 transition-colors">
              <button 
                type="button"
                onClick={() => setEditingRequest(null)}
                className="px-5 py-3 text-xs font-black uppercase text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all"
              >
                Descartar Alt.
              </button>
              <button 
                type="button"
                onClick={handleSaveChanges}
                className="px-6 py-3 bg-amber-600 hover:bg-amber-700 text-white text-xs font-black uppercase rounded-xl shadow-lg shadow-amber-600/10 active:scale-95 transition-all"
              >
                <i className="fas fa-check mr-2"></i> Gravar Alterações
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RequestList;
