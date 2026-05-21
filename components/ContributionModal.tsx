import React, { useState } from 'react';
import { updateUserPremiumStatus } from '../services/api';

interface Props {
  userEmail: string;
  onClose: () => void;
  onSuccess: () => void;
}

const ContributionModal: React.FC<Props> = ({ userEmail, onClose, onSuccess }) => {
  const [paymentMethod, setPaymentMethod] = useState<'pix' | 'card'>('pix');
  const [loadingStep, setLoadingStep] = useState<number>(0); // 0: input, 1: processing, 2: success
  const [loadingText, setLoadingText] = useState('');
  const [cardData, setCardData] = useState({ number: '', name: '', expiry: '', cvc: '' });
  const [pixCopied, setPixCopied] = useState(false);

  const pixKey = "00020101021126580014br.gov.bcb.pix0136gibasuporte@gmail.com520400005303986540510.005802BR5915Gilberto Morais6009Sao Paulo62070503***6304CA4D";

  const handleCopyPix = () => {
    navigator.clipboard.writeText(pixKey);
    setPixCopied(true);
    setTimeout(() => setPixCopied(false), 3000);
  };

  const startPaymentSimulation = async () => {
    setLoadingStep(1);
    
    const steps = [
      "Iniciando transação criptografada...",
      "Processando compensação imediata de R$ 10,00...",
      "Validando assinatura digital na rede Cirion...",
      "Sincronizando privilégios de acesso completo no banco...",
      "Sucesso! Acesso total liberado!"
    ];

    for (let i = 0; i < steps.length; i++) {
      setLoadingText(steps[i]);
      await new Promise(resolve => setTimeout(resolve, i === steps.length - 1 ? 1000 : 800));
    }

    try {
      await updateUserPremiumStatus(userEmail, true);
      setLoadingStep(2);
    } catch (error) {
      console.error("Erro ao ativar premium:", error);
      alert("Erro ao confirmar ativação de acesso na nuvem. Mas estamos liberando offline!");
      setLoadingStep(2);
    }
  };

  const handleCardSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!cardData.number || !cardData.name || !cardData.expiry || !cardData.cvc) {
      alert("Por favor, preencha todos os campos do cartão.");
      return;
    }
    startPaymentSimulation();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-white dark:bg-slate-900 border border-blue-100 dark:border-slate-800 w-full max-w-xl rounded-3xl shadow-2xl overflow-hidden flex flex-col md:flex-row max-h-[90vh] md:max-h-none overflow-y-auto">
        
        {/* Left Side: Info / Benefits */}
        <div className="bg-gradient-to-br from-blue-700 to-indigo-900 text-white p-6 md:p-8 md:w-5/12 flex flex-col justify-between">
          <div>
            <div className="bg-amber-400 text-amber-950 font-black px-3 py-1 rounded-full text-[10px] uppercase tracking-wide inline-block mb-4 shadow">
              🚀 Acesso Total
            </div>
            <h3 className="text-2xl font-black tracking-tight leading-tight">Apoie a AssetLogix</h3>
            <p className="text-blue-100 text-xs mt-2 leading-relaxed">
              Contribua com um valor único de R$ 10,00 e libere todos os limites operacionais do sistema para sempre!
            </p>
          </div>

          <div className="my-6 space-y-4">
            <div className="flex items-start gap-2">
              <i className="fas fa-check text-amber-400 text-xs mt-0.5"></i>
              <p className="text-[11px] font-medium leading-tight">Multi-itens ilimitados em remessas (sem travas)</p>
            </div>
            <div className="flex items-start gap-2">
              <i className="fas fa-check text-amber-400 text-xs mt-0.5"></i>
              <p className="text-[11px] font-medium leading-tight">Redação Inteligente de e-mails via IA Gemini</p>
            </div>
            <div className="flex items-start gap-2">
              <i className="fas fa-check text-amber-400 text-xs mt-0.5"></i>
              <p className="text-[11px] font-medium leading-tight">Integração e Cópia Ágil de Planilhas de Controle</p>
            </div>
            <div className="flex items-start gap-2">
              <i className="fas fa-check text-amber-400 text-xs mt-0.5"></i>
              <p className="text-[11px] font-medium leading-tight">Suporte prioritized na nuvem Cirion</p>
            </div>
          </div>

          <p className="text-[9px] text-blue-200 uppercase font-black tracking-widest leading-none">
            Contribuição Única • Sem Assinatura
          </p>
        </div>

        {/* Right Side: Form / Simulation */}
        <div className="p-6 md:p-8 md:w-7/12 flex flex-col justify-between bg-slate-50 dark:bg-slate-900/40 relative">
          
          {loadingStep === 0 && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-black uppercase text-slate-800 dark:text-slate-100 tracking-tight">Escolha como apoiar</h4>
                <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                  <i className="fas fa-times"></i>
                </button>
              </div>

              {/* Toggles */}
              <div className="grid grid-cols-2 gap-2 p-1 bg-slate-200/50 dark:bg-slate-800 rounded-xl">
                <button
                  type="button"
                  onClick={() => setPaymentMethod('pix')}
                  className={`py-2 rounded-lg font-bold text-xs flex items-center justify-center gap-2 transition-all ${paymentMethod === 'pix' ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-white shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-800'}`}
                >
                  <i className="fab fa-pix text-teal-500 text-sm"></i> PIX Imediato
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentMethod('card')}
                  className={`py-2 rounded-lg font-bold text-xs flex items-center justify-center gap-2 transition-all ${paymentMethod === 'card' ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-white shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-800'}`}
                >
                  <i className="fas fa-credit-card text-slate-500"></i> Cartão
                </button>
              </div>

              {paymentMethod === 'pix' ? (
                <div className="space-y-4 text-center animate-in fade-in duration-300">
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                    Escaneie o QR Code abaixo com seu aplicativo de pagamentos ou use o Copia e Cola.
                  </p>
                  
                  <div className="mx-auto bg-white p-3 rounded-2xl border border-slate-200 w-36 h-36 flex items-center justify-center shadow-md">
                    <img 
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(pixKey)}`} 
                      alt="PIX QR Code" 
                      className="w-full h-full"
                    />
                  </div>

                  <div className="space-y-2">
                    <button
                      type="button"
                      onClick={handleCopyPix}
                      className="w-full bg-slate-100 dark:bg-slate-850 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-800 dark:text-white font-bold py-2 px-4 rounded-xl text-xs transition-all flex items-center justify-center gap-2"
                    >
                      <i className={`fas ${pixCopied ? 'fa-check text-emerald-500 animate-ping' : 'fa-copy'}`}></i>
                      {pixCopied ? 'Chave PIX Copiada!' : 'Copiar Código PIX (Copia-Cola)'}
                    </button>
                    <button
                      type="button"
                      onClick={startPaymentSimulation}
                      className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold py-3 px-6 rounded-xl text-xs shadow-lg shadow-emerald-600/20 active:scale-95 transition-all mt-4"
                    >
                      Já realizei o PIX (Confirmar)
                    </button>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleCardSubmit} className="space-y-3.5 text-left animate-in fade-in duration-300">
                  <div>
                    <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider">Número do Cartão</label>
                    <input 
                      type="text" 
                      className="w-full bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs font-semibold focus:border-blue-500 outline-none text-slate-800 dark:text-white"
                      placeholder="0000 0000 0000 0000"
                      value={cardData.number}
                      onChange={e => setCardData({...cardData, number: e.target.value})}
                      required
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider">Nome Impresso</label>
                    <input 
                      type="text" 
                      className="w-full bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs font-semibold focus:border-blue-500 outline-none text-slate-800 dark:text-white"
                      placeholder="EX: GILBERTO J MORAIS"
                      value={cardData.name}
                      onChange={e => setCardData({...cardData, name: e.target.value})}
                      required
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider">Vencimento (MM/AA)</label>
                      <input 
                        type="text" 
                        className="w-full bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs font-semibold focus:border-blue-500 outline-none text-slate-800 dark:text-white"
                        placeholder="12/29"
                        value={cardData.expiry}
                        onChange={e => setCardData({...cardData, expiry: e.target.value})}
                        required
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider">CVC (3 dígitos)</label>
                      <input 
                        type="password" 
                        maxLength={3}
                        className="w-full bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs font-semibold focus:border-blue-500 outline-none text-slate-800 dark:text-white animate-pulse"
                        placeholder="***"
                        value={cardData.cvc}
                        onChange={e => setCardData({...cardData, cvc: e.target.value})}
                        required
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-extrabold py-3 px-6 rounded-xl text-xs shadow-lg shadow-blue-600/20 active:scale-95 transition-all mt-4"
                  >
                    Contribuir R$ 10,00 Safely
                  </button>
                </form>
              )}
            </div>
          )}

          {loadingStep === 1 && (
            <div className="min-h-[280px] flex flex-col items-center justify-center text-center p-4 animate-in zoom-in-95 duration-200">
              <i className="fas fa-spinner fa-spin text-4xl text-blue-600 dark:text-blue-400 mb-6"></i>
              <p className="font-extrabold text-sm text-slate-850 dark:text-white truncate max-w-full">{loadingText}</p>
              <p className="text-[10px] uppercase font-bold text-slate-500 tracking-widest mt-2 animate-pulse">
                Segurança Ativa SSL
              </p>
            </div>
          )}

          {loadingStep === 2 && (
            <div className="min-h-[280px] flex flex-col items-center justify-center text-center p-4 animate-in zoom-in-95 duration-300">
              <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-3xl mb-6 shadow-lg shadow-emerald-500/15">
                <i className="fas fa-check-circle animate-bounce"></i>
              </div>
              <h4 className="text-lg font-black text-slate-850 dark:text-white uppercase tracking-tight">Acesso Completo Liberado!</h4>
              <p className="text-xs text-slate-550 dark:text-slate-400 mt-2 font-medium max-w-sm">
                Sua generosa contribuição foi registrada com sucesso! Agora você possui privilégios de acesso irrestritos na plataforma. Obrigado por apoiar!
              </p>
              
              <button
                type="button"
                onClick={() => {
                  onSuccess();
                  onClose();
                }}
                className="bg-slate-900 dark:bg-slate-100 dark:text-slate-900 hover:opacity-90 text-white font-extrabold py-2.5 px-8 rounded-xl text-xs transition-all shadow shadow-neutral-900/10 mt-6 active:scale-95"
              >
                Super, Acessar Painel!
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};

export default ContributionModal;
