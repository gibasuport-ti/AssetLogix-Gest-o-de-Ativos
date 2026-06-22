
import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Asset, RequestType, TransportRequest, RequestStatus, AddressDetails, RequestAsset, LogisticsStatus } from '../types';
import { generateEmailDraft } from '../services/geminiService';
import { MOCKED_ADDRESSES } from '../constants';

interface Props {
  assets: Asset[];
  onClose: () => void;
  onSubmit: (req: TransportRequest) => void;
  userRole?: string;
  hasContributed?: boolean;
  onOpenContributionModal?: () => void;
}

const AddressSection = React.memo(({ 
  title, 
  data, 
  onChange, 
  theme 
}: { 
  title: string, 
  data: AddressDetails, 
  onChange: (f: keyof AddressDetails, v: string) => void, 
  theme: 'blue' | 'green' 
}) => {
  const fieldClass = "w-full px-3 py-2 rounded-lg bg-blue-50/50 dark:bg-slate-900/50 border border-blue-100 dark:border-slate-700 focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-blue-400 outline-none transition-all text-xs font-semibold text-slate-700 dark:text-slate-200 shadow-sm";
  const labelClass = "text-[9px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest block mb-1";

  return (
    <div className={`p-4 md:p-6 rounded-2xl border ${theme === 'blue' ? 'border-blue-200 bg-blue-50/20 dark:border-blue-900/30 dark:bg-blue-900/10' : 'border-emerald-200 bg-emerald-50/10 dark:border-emerald-900/30 dark:bg-emerald-900/10'} space-y-4 shadow-sm transition-colors`}>
      <div className="flex items-center justify-between">
        <h4 className={`text-[11px] font-black uppercase tracking-tighter flex items-center gap-2 ${theme === 'blue' ? 'text-blue-700 dark:text-blue-400' : 'text-emerald-700 dark:text-emerald-400'}`}>
          <i className={`fas ${theme === 'blue' ? 'fa-upload' : 'fa-download'}`}></i>
          {title}
        </h4>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="col-span-2">
          <label className={labelClass}>CEP da Unidade <span className="text-rose-500">*</span></label>
          <select 
            id={`${theme}-cep`}
            className={`${fieldClass} font-black text-blue-600 dark:text-blue-400 bg-white dark:bg-slate-800 cursor-pointer`} 
            value={data.cep} 
            onChange={e => onChange('cep', e.target.value)}
          >
            <option value="">Selecione um CEP...</option>
            {Object.keys(MOCKED_ADDRESSES).sort().map(cep => (
              <option key={cep} value={cep}>{cep} - {MOCKED_ADDRESSES[cep].city}</option>
            ))}
            <option value="custom">Outro (Preencher Manual)</option>
          </select>
        </div>
        <div className="col-span-2">
          <label className={labelClass}>BP (Business Partner) <span className="text-rose-500">*</span></label>
          <input id={`${theme}-bp`} className={fieldClass} value={data.bp} onChange={e => onChange('bp', e.target.value)} placeholder="Código BP" />
        </div>
        <div>
          <label className={labelClass}>Estado <span className="text-rose-500">*</span></label>
          <input id={`${theme}-state`} className={fieldClass} value={data.state} onChange={e => onChange('state', e.target.value)} placeholder="Ex: SP" />
        </div>
        <div>
          <label className={labelClass}>Centro / Plant <span className="text-rose-500">*</span></label>
          <input id={`${theme}-plant`} className={fieldClass} value={data.plant || ''} onChange={e => onChange('plant', e.target.value)} placeholder="Ex: 978G" />
        </div>
        <div className="col-span-2">
          <label className={labelClass}>Cidade <span className="text-rose-500">*</span></label>
          <input id={`${theme}-city`} className={fieldClass} value={data.city} onChange={e => onChange('city', e.target.value)} placeholder="Ex: São Paulo" />
        </div>
        <div className="col-span-2">
          <label className={labelClass}>Bairro / Distrito <span className="text-rose-500">*</span></label>
          <input id={`${theme}-neighborhood`} className={fieldClass} value={data.neighborhood} onChange={e => onChange('neighborhood', e.target.value)} placeholder="Bairro" />
        </div>
        <div className="col-span-2">
          <label className={labelClass}>Endereço Completo <span className="text-rose-500">*</span></label>
          <input id={`${theme}-address`} className={fieldClass} value={data.address} onChange={e => onChange('address', e.target.value)} placeholder="Logradouro, número, complemento..." />
        </div>
        <div className="col-span-4">
          <label className={labelClass}>A/C de (Aos cuidados de) <span className="text-rose-500">*</span></label>
          <input id={`${theme}-attentionTo`} className={fieldClass} value={data.attentionTo || ''} onChange={e => onChange('attentionTo', e.target.value)} placeholder="Destinatário / Contato" />
        </div>
      </div>
    </div>
  );
});

const NewRequestModal: React.FC<Props> = ({ assets, onClose, onSubmit, userRole, hasContributed, onOpenContributionModal }) => {
  const [selectedAssets, setSelectedAssets] = useState<RequestAsset[]>([]);
  const [type, setType] = useState<RequestType>(RequestType.NF_REMESSA);
  const [method, setMethod] = useState<'Carrier' | 'Mail'>('Carrier');
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState(false);
  const [totalWeight, setTotalWeight] = useState('0kg');
  const [totalVolume, setTotalVolume] = useState(1);
  const [isGenerating, setIsGenerating] = useState(false);
  const [requesterHistory, setRequesterHistory] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  
  // Refs
  const dropdownRef = useRef<HTMLDivElement>(null);
  const emailInputRef = useRef<HTMLInputElement>(null);

  const [origin, setOrigin] = useState<AddressDetails>({
    cep: '', bp: '', state: '', plant: '', city: '', neighborhood: '', address: '', attentionTo: ''
  });

  const [destination, setDestination] = useState<AddressDetails>({
    cep: '', bp: '', state: '', plant: '', city: '', neighborhood: '', address: '', attentionTo: ''
  });

  // Fecha dropdown ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Load history from localStorage on mount
  useEffect(() => {
    try {
      const history = localStorage.getItem('requester_history');
      if (history) {
        setRequesterHistory(JSON.parse(history));
      }
    } catch (e) {
      console.warn("Failed to load history", e);
    }
  }, []);

  const saveRequesterToHistory = (email: string) => {
    try {
      const updated = Array.from(new Set([email, ...requesterHistory])).slice(0, 10);
      setRequesterHistory(updated);
      localStorage.setItem('requester_history', JSON.stringify(updated));
    } catch (e) {
      console.warn("Failed to save history", e);
    }
  };

  const handleOriginChange = useCallback((field: keyof AddressDetails, val: string) => {
    if (field === 'cep') {
      if (val === 'custom') {
        setOrigin(prev => ({ ...prev, cep: '' }));
        return;
      }
      const found = MOCKED_ADDRESSES[val];
      if (found) {
        setOrigin(found);
        return;
      }
    }
    setOrigin(prev => ({ ...prev, [field]: val }));
  }, []);
  
  const handleDestChange = useCallback((field: keyof AddressDetails, val: string) => {
    if (field === 'cep') {
      if (val === 'custom') {
        setDestination(prev => ({ ...prev, cep: '' }));
        return;
      }
      const found = MOCKED_ADDRESSES[val];
      if (found) {
        setDestination(found);
        return;
      }
    }
    setDestination(prev => ({ ...prev, [field]: val }));
  }, []);

  const toggleAssetSelection = (asset: Asset) => {
    const isSelected = selectedAssets.some(a => a.assetId === asset.id);
    if (isSelected) {
      setSelectedAssets(prev => prev.filter(a => a.assetId !== asset.id));
    } else {
      const isFreeUser = userRole !== 'admin' && !hasContributed;
      if (isFreeUser && selectedAssets.length >= 1) {
        if (onOpenContributionModal) {
          onClose();
          onOpenContributionModal();
        } else {
          alert("Acesso Básico Gratuito: Você só pode adicionar 1 item por solicitação de transporte/remessa. Faça uma contribuição de R$ 10,00 para desbloquear acesso total!");
        }
        return;
      }
      setSelectedAssets(prev => [
        ...prev,
        {
          assetId: asset.id,
          sapCode: asset.defaultSapCode || '',
          ncm: asset.defaultNcm || '',
          nfeReference: asset.defaultNfeReference || '',
          unitValue: asset.defaultUnitValue || 0,
          quantity: 1
        }
      ]);
    }
    setSearchTerm('');
    setIsDropdownOpen(false);
  };

  const updateAssetField = (id: string, field: keyof RequestAsset, val: string | number) => {
    if (field === 'quantity' && typeof val === 'number' && val > 1) {
      const isFreeUser = userRole !== 'admin' && !hasContributed;
      if (isFreeUser) {
        if (onOpenContributionModal) {
          onClose();
          onOpenContributionModal();
        } else {
          alert("Acesso Básico Gratuito: Você só pode solicitar 1 unidade de cada item. Contribua com R$ 10,00 para habilitar múltiplos volumes e quantias!");
        }
        return;
      }
    }
    setSelectedAssets(prev => prev.map(a => a.assetId === id ? { ...a, [field]: val } : a));
  };

  const handleCurrencyChange = (id: string, value: string) => {
    const numericValue = value.replace(/\D/g, '');
    const floatValue = parseFloat(numericValue) / 100;
    updateAssetField(id, 'unitValue', floatValue || 0);
  };

  const formatBRL = (val: number) => {
    return new Intl.NumberFormat('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(val);
  };

  const calculateGrandTotal = () => {
    return selectedAssets.reduce((sum, sa) => sum + (sa.unitValue * sa.quantity), 0);
  };

  const filteredAssets = assets.filter(a => 
    a.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    a.tag.toLowerCase().includes(searchTerm.toLowerCase()) ||
    a.serialNumber.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    
    // Validation: Assets
    if (selectedAssets.length === 0) {
      alert("Por favor, adicione pelo menos um ativo à solicitação antes de continuar.");
      return;
    }
    
    // Validation: Email
    if (!email || !email.trim()) {
      setEmailError(true);
      alert("Por favor, preencha o campo Solicitante / Responsável (SAP Fiori) para prosseguir.");
      // Ensure focus works even if called asynchronously or in weird event loop states
      setTimeout(() => {
        emailInputRef.current?.focus();
      }, 50);
      return;
    }

    // Validation: Origem
    if (!origin.cep || !origin.cep.trim()) {
      alert("Por favor, selecione ou informe o CEP da Unidade de Origem.");
      setTimeout(() => document.getElementById('green-cep')?.focus(), 50);
      return;
    }
    if (!origin.bp || !origin.bp.trim()) {
      alert("Por favor, preencha o campo BP (Business Partner) da Origem.");
      setTimeout(() => document.getElementById('green-bp')?.focus(), 50);
      return;
    }
    if (!origin.state || !origin.state.trim()) {
      alert("Por favor, preencha o Estado da Origem.");
      setTimeout(() => document.getElementById('green-state')?.focus(), 50);
      return;
    }
    if (!origin.plant || !origin.plant.trim()) {
      alert("Por favor, preencha o campo Centro / Plant de Origem.");
      setTimeout(() => document.getElementById('green-plant')?.focus(), 50);
      return;
    }
    if (!origin.city || !origin.city.trim()) {
      alert("Por favor, preencha a Cidade da Origem.");
      setTimeout(() => document.getElementById('green-city')?.focus(), 50);
      return;
    }
    if (!origin.neighborhood || !origin.neighborhood.trim()) {
      alert("Por favor, preencha o Bairro / Distrito da Origem.");
      setTimeout(() => document.getElementById('green-neighborhood')?.focus(), 50);
      return;
    }
    if (!origin.address || !origin.address.trim()) {
      alert("Por favor, preencha o Endereço Completo da Origem.");
      setTimeout(() => document.getElementById('green-address')?.focus(), 50);
      return;
    }
    if (!origin.attentionTo || !origin.attentionTo.trim()) {
      alert("Por favor, preencha o campo A/C de (Aos cuidados de) da Origem.");
      setTimeout(() => document.getElementById('green-attentionTo')?.focus(), 50);
      return;
    }

    // Validation: Destino
    if (!destination.cep || !destination.cep.trim()) {
      alert("Por favor, selecione ou informe o CEP da Unidade de Destino.");
      setTimeout(() => document.getElementById('blue-cep')?.focus(), 50);
      return;
    }
    if (!destination.bp || !destination.bp.trim()) {
      alert("Por favor, preencha o campo BP (Business Partner) do Destino.");
      setTimeout(() => document.getElementById('blue-bp')?.focus(), 50);
      return;
    }
    if (!destination.state || !destination.state.trim()) {
      alert("Por favor, preencha o Estado do Destino.");
      setTimeout(() => document.getElementById('blue-state')?.focus(), 50);
      return;
    }
    if (!destination.plant || !destination.plant.trim()) {
      alert("Por favor, preencha o campo Centro / Plant de Destino.");
      setTimeout(() => document.getElementById('blue-plant')?.focus(), 50);
      return;
    }
    if (!destination.city || !destination.city.trim()) {
      alert("Por favor, preencha a Cidade do Destino.");
      setTimeout(() => document.getElementById('blue-city')?.focus(), 50);
      return;
    }
    if (!destination.neighborhood || !destination.neighborhood.trim()) {
      alert("Por favor, preencha o Bairro / Distrito do Destino.");
      setTimeout(() => document.getElementById('blue-neighborhood')?.focus(), 50);
      return;
    }
    if (!destination.address || !destination.address.trim()) {
      alert("Por favor, preencha o Endereço Completo do Destino.");
      setTimeout(() => document.getElementById('blue-address')?.focus(), 50);
      return;
    }
    if (!destination.attentionTo || !destination.attentionTo.trim()) {
      alert("Por favor, preencha o campo A/C de (Aos cuidados de) do Destino.");
      setTimeout(() => document.getElementById('blue-attentionTo')?.focus(), 50);
      return;
    }

    // Validation: Peso Total
    const parsedWeightNum = totalWeight ? parseFloat(totalWeight.replace(/[^\d.,]/g, '').replace(',', '.')) : 0;
    if (!totalWeight || !totalWeight.trim() || totalWeight === '0kg' || totalWeight === '0' || parsedWeightNum <= 0) {
      alert("Por favor, preencha um Peso Total válido e maior que zero (Ex: 2kg).");
      setTimeout(() => document.getElementById('total-weight')?.focus(), 50);
      return;
    }

    // Validation: Itens da Nota Fiscal e Detalhamento SAP
    for (let i = 0; i < selectedAssets.length; i++) {
      const sa = selectedAssets[i];
      const asset = assets.find(a => a.id === sa.assetId);
      const assetName = asset ? asset.name : `Item ${i+1}`;
      
      if (!sa.sapCode || !sa.sapCode.trim()) {
        alert(`Por favor, preencha o campo Cód. SAP Fiori para o item "${assetName}".`);
        return;
      }
      if (!sa.ncm || !sa.ncm.trim() || sa.ncm.trim() === '0') {
        alert(`Por favor, preencha o campo NCM para o item "${assetName}" com um valor válido.`);
        return;
      }
      if (!sa.nfeReference || !sa.nfeReference.trim()) {
        alert(`Por favor, preencha a NFe Ref. (NFe de Origem) para o item "${assetName}". Caso não possua, digite "Sem nota de origem".`);
        return;
      }
      if (sa.unitValue <= 0) {
        alert(`Por favor, insira um Valor Unitário maior que R$ 0,00 para o item "${assetName}".`);
        return;
      }
      if (!sa.quantity || sa.quantity <= 0) {
        alert(`Por favor, insira uma Quantidade válida e maior que zero para o item "${assetName}".`);
        return;
      }
    }

    try {
      setIsGenerating(true);
      saveRequesterToHistory(email);
      
      // Artificial delay for UX
      await new Promise(resolve => setTimeout(resolve, 800));

      const assetList = assets.filter(a => selectedAssets.some(sa => sa.assetId === a.id));
      
      const formatFullAddress = (addr: AddressDetails) => {
        const parts = [];
        if (addr.city) parts.push(`${addr.city}/${addr.state}`);
        if (addr.address) parts.push(addr.address);
        if (addr.neighborhood) parts.push(addr.neighborhood);
        if (addr.cep) parts.push(`CEP: ${addr.cep}`);
        if (addr.bp) parts.push(`BP: ${addr.bp}`);
        if (addr.attentionTo) parts.push(`A/C de: ${addr.attentionTo}`);
        return parts.join(' - ');
      };

      const draft = await generateEmailDraft(
        type, 
        assetList, 
        formatFullAddress(origin) || origin.city || 'Origem', 
        formatFullAddress(destination) || destination.city || 'Destino',
        selectedAssets,
        totalWeight,
        totalVolume,
        email
      );

      const newRequest: TransportRequest = {
        id: `REQ-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`,
        assetIds: selectedAssets.map(a => a.assetId),
        requestAssets: selectedAssets,
        type,
        status: RequestStatus.PENDING,
        logisticsStatus: LogisticsStatus.WAITING_NF,
        createdAt: Date.now(),
        originDetails: origin,
        destinationDetails: destination,
        method,
        requesterEmail: email,
        totalWeight,
        totalVolume,
        emailDraft: draft
      };

      onSubmit(newRequest);
    } catch (error) {
      console.error("Erro ao processar solicitação:", error);
      alert("Ocorreu um erro ao gerar a solicitação. Verifique o console para mais detalhes.");
    } finally {
      if (isGenerating) setIsGenerating(false); // Only update if still mounted/generating
    }
  };

  const fieldClass = "w-full px-3 py-2 rounded-lg bg-blue-50/50 dark:bg-slate-900/50 border border-blue-100 dark:border-slate-700 focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-blue-400 outline-none transition-all text-xs font-semibold text-slate-700 dark:text-slate-200 shadow-sm";
  const labelClass = "text-[9px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest block mb-1";

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-2 sm:p-6 bg-slate-900/90 backdrop-blur-md animate-in fade-in duration-300">
      <div className="bg-white dark:bg-slate-800 w-full max-w-6xl rounded-[2rem] shadow-2xl overflow-hidden flex flex-col max-h-[95vh] border border-blue-100 dark:border-slate-700 relative transition-colors">
        
        {/* Loading Overlay */}
        {isGenerating && (
          <div className="absolute inset-0 z-[100] bg-white/95 dark:bg-slate-900/95 backdrop-blur-md flex flex-col items-center justify-center rounded-[2rem]">
             <div className="flex flex-col items-center justify-center p-8 text-center animate-in zoom-in-95 duration-300">
                <div className="relative mb-8">
                   <div className="w-24 h-24 border-[6px] border-slate-100 dark:border-slate-800 rounded-full"></div>
                   <div className="w-24 h-24 border-[6px] border-blue-600 rounded-full border-t-transparent animate-spin absolute top-0 left-0"></div>
                   <i className="fas fa-file-signature absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-blue-600 text-3xl animate-pulse"></i>
                </div>
                <h3 className="text-3xl font-black text-slate-800 dark:text-white mb-3 tracking-tight">Protocolando...</h3>
                <p className="text-slate-500 dark:text-slate-400 font-medium text-lg">A solicitação está sendo protocolada e a IA está gerando os documentos necessários.</p>
             </div>
          </div>
        )}

        {/* Modal Header */}
        <div className="px-6 py-4 md:px-10 md:py-6 bg-[#0f172a] dark:bg-slate-950 text-white flex items-center justify-between flex-shrink-0 transition-colors">
          <div className="flex items-center gap-4">
            <div className="bg-blue-600 p-2 rounded-lg">
               <i className="fas fa-file-invoice text-xl"></i>
            </div>
            <div>
              <h3 className="text-lg md:text-xl font-black tracking-tight uppercase">Protocolo NF Remessa / SAP</h3>
              <p className="text-slate-400 text-[10px] font-bold uppercase tracking-[0.2em]">Gerador de Solicitação Logística de Ativos</p>
            </div>
          </div>
          <button onClick={onClose} className="bg-slate-800 hover:bg-slate-700 text-white w-10 h-10 rounded-full flex items-center justify-center transition-all">
            <i className="fas fa-times"></i>
          </button>
        </div>

        <div className="flex flex-col flex-1 overflow-hidden">
        <form className="p-4 md:p-8 overflow-y-auto space-y-6 scrollbar-hide flex-1 bg-slate-50/50 dark:bg-slate-900/50 transition-colors" onSubmit={(e) => e.preventDefault()}>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-white dark:bg-slate-800 p-5 rounded-2xl border border-blue-100 dark:border-slate-700 shadow-sm transition-colors">
            <div>
              <label className={labelClass}>Modalidade</label>
              <select className={fieldClass} value={type} onChange={e => setType(e.target.value as RequestType)}>
                <option value={RequestType.NF_REMESSA}>NF de Remessa (SAP)</option>
                <option value={RequestType.TRANSPORT}>Transporte Simples</option>
              </select>
            </div>
            <div>
              <label className={labelClass}>Meio Logístico</label>
              <select className={fieldClass} value={method} onChange={e => setMethod(e.target.value as 'Carrier' | 'Mail')}>
                <option value="Carrier">Transportadora</option>
                <option value="Mail">Correios / ECT</option>
              </select>
            </div>
            <div className="md:col-span-2 relative">
              <label className={labelClass}>Solicitante / Responsável (SAP Fiori) <span className="text-rose-500">*</span></label>
              <div className="relative">
                <i className={`fas fa-user-circle absolute left-3 top-1/2 -translate-y-1/2 ${emailError ? 'text-rose-400' : 'text-blue-400/50'}`}></i>
                <input 
                  ref={emailInputRef}
                  className={`${fieldClass} pl-9 ${emailError ? 'border-rose-400 bg-rose-50 focus:ring-rose-400' : ''}`}
                  type="text" 
                  list="requester-history"
                  value={email} 
                  onChange={e => {
                    setEmail(e.target.value);
                    if (e.target.value.trim()) setEmailError(false);
                  }} 
                  placeholder="Nome ou e-mail corporativo" 
                  required 
                />
                <datalist id="requester-history">
                  {requesterHistory.map((item, idx) => (
                    <option key={idx} value={item} />
                  ))}
                </datalist>
              </div>
              {emailError && <p className="text-[10px] text-rose-500 font-bold mt-1 animate-in slide-in-from-top-1">Campo obrigatório</p>}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <AddressSection 
              title="Origem (Local de Coleta)" 
              data={origin} 
              onChange={handleOriginChange} 
              theme="green" 
            />
            <AddressSection 
              title="Destino (Local de Entrega)" 
              data={destination} 
              onChange={handleDestChange} 
              theme="blue" 
            />
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden transition-colors">
            <div className="bg-slate-100/80 dark:bg-slate-900/80 px-6 py-4 border-b border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 transition-colors">
              <h4 className="text-[11px] font-black text-slate-800 dark:text-white uppercase tracking-widest flex items-center gap-2">
                <i className="fas fa-boxes-stacked text-blue-500"></i>
                Itens da Nota Fiscal e Detalhamento SAP
              </h4>
              <div className="flex flex-wrap gap-4">
                <div className="flex items-center gap-2">
                  <label className={labelClass + " mb-0"}>Peso Total <span className="text-rose-500">*</span></label>
                  <input id="total-weight" className={`${fieldClass} w-24 bg-white dark:bg-slate-800`} value={totalWeight} onChange={e => setTotalWeight(e.target.value)} placeholder="Ex: 2kg" />
                </div>
                <div className="flex items-center gap-2">
                  <label className={labelClass + " mb-0"}>Volumes</label>
                  <input className={`${fieldClass} w-16 bg-white dark:bg-slate-800`} type="number" value={totalVolume} onChange={e => setTotalVolume(parseInt(e.target.value) || 1)} />
                </div>
              </div>
            </div>
            
            <div className="p-4 md:p-6 space-y-6">
              <div className="space-y-2 relative" ref={dropdownRef}>
                <label className={labelClass}>Pesquisar e Selecionar Ativos:</label>
                <div className="relative">
                  <i className="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs"></i>
                  <input 
                    type="text"
                    className={`${fieldClass} pl-10 h-12 text-sm bg-white dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 focus:border-blue-400`}
                    placeholder="Busque por nome, TAG ou serial..."
                    value={searchTerm}
                    onChange={e => {
                      setSearchTerm(e.target.value);
                      setIsDropdownOpen(true);
                    }}
                    onFocus={() => setIsDropdownOpen(true)}
                  />
                  {isDropdownOpen && (
                    <div className="absolute z-50 top-full left-0 right-0 mt-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-2xl max-h-60 overflow-y-auto animate-in slide-in-from-top-2 duration-200">
                      {filteredAssets.length > 0 ? (
                        <div className="p-2 space-y-1">
                          {filteredAssets.map(asset => {
                            const isSelected = selectedAssets.some(sa => sa.assetId === asset.id);
                            return (
                              <button
                                key={asset.id}
                                type="button"
                                onClick={() => toggleAssetSelection(asset)}
                                className={`w-full text-left p-3 rounded-lg flex items-center justify-between transition-all group ${isSelected ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400' : 'hover:bg-slate-50 dark:hover:bg-slate-700'}`}
                              >
                                <div>
                                  <span className="block text-xs font-black uppercase tracking-tight text-slate-900 dark:text-white">{asset.name}</span>
                                  <div className="flex items-center gap-2 mt-0.5">
                                    <span className="text-[9px] font-mono font-bold bg-slate-100 dark:bg-slate-700 px-1.5 py-0.5 rounded text-slate-500 dark:text-slate-400">{asset.tag}</span>
                                    <span className="text-[9px] text-slate-400 italic">{asset.serialNumber}</span>
                                  </div>
                                </div>
                                {isSelected ? (
                                  <i className="fas fa-check-circle text-blue-500"></i>
                                ) : (
                                  <i className="fas fa-plus text-slate-300 dark:text-slate-600 group-hover:text-blue-400 transition-colors"></i>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="p-8 text-center text-slate-400 text-xs">
                          Nenhum ativo encontrado para "{searchTerm}"
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {selectedAssets.length > 0 ? (
                <div className="overflow-x-auto border border-slate-100 dark:border-slate-700 rounded-xl shadow-inner bg-slate-50/20 dark:bg-slate-900/20">
                  <table className="w-full text-left min-w-[900px]">
                    <thead className="bg-slate-50 dark:bg-slate-750 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest border-b dark:border-slate-700">
                      <tr>
                        <th className="px-4 py-3">Item</th>
                        <th className="px-4 py-3">Cód. SAP Fiori</th>
                        <th className="px-4 py-3">NCM</th>
                        <th className="px-4 py-3">NFe Ref.</th>
                        <th className="px-4 py-3 text-right">Valor Uni. (R$)</th>
                        <th className="px-4 py-3 text-center">Qtd.</th>
                        <th className="px-4 py-3 text-right">Valor Total</th>
                        <th className="px-4 py-3"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                      {selectedAssets.map(sa => {
                        const asset = assets.find(a => a.id === sa.assetId);
                        return (
                          <tr key={sa.assetId} className="hover:bg-blue-50/10 dark:hover:bg-slate-700/30 transition-colors">
                            <td className="px-4 py-3">
                              <span className="text-xs font-black text-slate-800 dark:text-white block uppercase">{asset?.name}</span>
                              <span className="text-[9px] text-slate-400 uppercase font-mono">{asset?.tag}</span>
                            </td>
                            <td className="px-4 py-3">
                              <input className={`${fieldClass} py-1.5`} value={sa.sapCode} onChange={e => updateAssetField(sa.assetId, 'sapCode', e.target.value)} />
                            </td>
                            <td className="px-4 py-3">
                              <input className={`${fieldClass} py-1.5`} value={sa.ncm} onChange={e => updateAssetField(sa.assetId, 'ncm', e.target.value)} />
                            </td>
                            <td className="px-4 py-3">
                              <input className={`${fieldClass} py-1.5`} value={sa.nfeReference} onChange={e => updateAssetField(sa.assetId, 'nfeReference', e.target.value)} placeholder="NF de Origem" />
                            </td>
                            <td className="px-4 py-3">
                              <div className="relative">
                                <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400">R$</span>
                                <input 
                                  className={`${fieldClass} py-1.5 text-right font-bold pl-7`} 
                                  type="text" 
                                  value={formatBRL(sa.unitValue)} 
                                  onChange={e => handleCurrencyChange(sa.assetId, e.target.value)} 
                                />
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <input className={`${fieldClass} py-1.5 text-center w-16 mx-auto`} type="number" value={sa.quantity} onChange={e => updateAssetField(sa.assetId, 'quantity', parseInt(e.target.value) || 1)} />
                            </td>
                            <td className="px-4 py-3 text-right font-black text-blue-600 dark:text-blue-400">
                              R$ {formatBRL(sa.unitValue * sa.quantity)}
                            </td>
                            <td className="px-4 py-3 text-center">
                              <button type="button" onClick={() => toggleAssetSelection(asset!)} className="text-rose-400 hover:text-rose-600 p-1">
                                <i className="fas fa-trash-can"></i>
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                      <tr className="bg-slate-50/50 dark:bg-slate-900/50">
                        <td colSpan={6} className="px-4 py-4 text-right text-[10px] font-black uppercase text-slate-500 dark:text-slate-400 tracking-widest">Valor Total da Solicitação:</td>
                        <td className="px-4 py-4 text-right font-black text-lg text-slate-900 dark:text-white">
                          R$ {formatBRL(calculateGrandTotal())}
                        </td>
                        <td></td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="py-12 flex flex-col items-center justify-center text-slate-300 dark:text-slate-600 bg-slate-50/50 dark:bg-slate-900/50 rounded-xl border border-dashed border-slate-200 dark:border-slate-700">
                  <i className="fas fa-cart-flatbed text-4xl mb-3"></i>
                  <p className="text-sm font-medium">Nenhum item adicionado à solicitação.</p>
                </div>
              )}
            </div>
          </div>
        </form>
        </div>

        <div className="p-6 md:p-8 bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row items-center justify-end gap-4 flex-shrink-0 transition-colors">
          <div className="mr-auto hidden lg:block">
            <span className="text-[10px] font-bold text-slate-400 uppercase flex items-center gap-2">
              <i className="fas fa-info-circle text-blue-400"></i>
              A IA gerará um rascunho de e-mail automático baseado nos dados acima.
            </span>
          </div>
          <button 
            type="button" 
            onClick={onClose} 
            className="w-full sm:w-auto px-8 py-3.5 border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 font-bold rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-700 transition-all active:scale-95 text-sm uppercase tracking-widest"
          >
            Cancelar
          </button>
          <button 
            type="button"
            onClick={(e) => handleSubmit(e)} 
            disabled={isGenerating}
            className="w-full sm:w-auto px-10 py-3.5 bg-blue-600 text-white font-black rounded-2xl hover:bg-blue-700 shadow-xl shadow-blue-600/20 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 uppercase tracking-widest text-sm"
          >
            {isGenerating ? (
              <><i className="fas fa-circle-notch fa-spin"></i> Gerando Protocolo...</>
            ) : (
              <><i className="fas fa-shield-halved"></i> Protocolar Solicitação SAP</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default NewRequestModal;
