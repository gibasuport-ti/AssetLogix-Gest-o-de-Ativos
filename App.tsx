
import React, { useState, useMemo, useEffect } from 'react';
import { 
  Asset, 
  TransportRequest, 
  RequestType, 
  RequestStatus, 
  DashboardStats,
  UserRole,
  UserAccount
} from './types';
import { fetchAssets, fetchRequests, createRequest, updateRequest, deleteRequest, testConnection, seedDatabase, fetchUserRole } from './services/api';
import { auth, googleProvider } from './firebase';
import { onAuthStateChanged, signInWithPopup, signOut, User } from 'firebase/auth';
import Dashboard from './components/Dashboard';
import RequestList from './components/RequestList';
import AssetInventory from './components/AssetInventory';
import NewRequestModal from './components/NewRequestModal';
import UserManagement from './components/UserManagement';
import ContributionModal from './components/ContributionModal';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [userRole, setUserRole] = useState<UserRole>(UserRole.UNAUTHORIZED);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [currentUserAccount, setCurrentUserAccount] = useState<UserAccount | null>(null);
  const [isContributionModalOpen, setIsContributionModalOpen] = useState(false);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [requests, setRequests] = useState<TransportRequest[]>([]);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'requests' | 'assets' | 'users'>('dashboard');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Carregar dados da API
  const loadData = async () => {
    try {
      setIsLoading(true);
      const [assetsData, requestsData] = await Promise.all([
        fetchAssets(),
        fetchRequests()
      ]);
      setAssets(assetsData);
      setRequests(requestsData);
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      setIsAuthReady(true);
      
      if (currentUser) {
        await testConnection();
        await seedDatabase();
        
        const userEmail = currentUser.email || '';
        
        // Bloqueio de ambiente de desenvolvimento para não-admins
        const isDevEnv = window.location.hostname.startsWith('ais-dev-');
        if (isDevEnv && userEmail !== "gibasuporte@gmail.com") {
          setUserRole(UserRole.UNAUTHORIZED);
          setIsLoading(false);
          return;
        }

        const role = await fetchUserRole(userEmail);
        // Forçar papel de administrador para o e-mail padrão
        const finalRole = userEmail === "gibasuporte@gmail.com" ? UserRole.ADMIN : role;
        setUserRole(finalRole);
        
        if (finalRole !== UserRole.UNAUTHORIZED) {
          try {
            const { db } = await import('./firebase');
            const { doc, getDoc } = await import('firebase/firestore');
            const userDocSnap = await getDoc(doc(db, 'users', userEmail));
            if (userDocSnap.exists()) {
              const uData = userDocSnap.data() as UserAccount;
              setCurrentUserAccount({
                ...uData,
                hasContributed: finalRole === UserRole.ADMIN ? true : !!uData.hasContributed
              });
            } else {
              setCurrentUserAccount({
                uid: currentUser.uid,
                email: userEmail,
                displayName: currentUser.displayName || userEmail.split('@')[0],
                role: finalRole,
                createdAt: Date.now(),
                hasContributed: finalRole === UserRole.ADMIN
              });
            }
          } catch (err) {
            console.error("Erro hydratando conta do usuário:", err);
            setCurrentUserAccount({
              uid: currentUser.uid,
              email: userEmail,
              displayName: currentUser.displayName || userEmail.split('@')[0],
              role: finalRole,
              createdAt: Date.now(),
              hasContributed: finalRole === UserRole.ADMIN
            });
          }
          await loadData();
        } else {
          setIsLoading(false);
        }
      } else {
        setIsLoading(false);
      }
    });

    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);

    // Check local storage or system preference
    const savedTheme = localStorage.getItem('theme');
    const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    if (savedTheme === 'dark' || (!savedTheme && systemPrefersDark)) {
      setIsDarkMode(true);
      document.documentElement.classList.add('dark');
    } else {
      setIsDarkMode(false);
      document.documentElement.classList.remove('dark');
    }

    return () => {
      unsubscribe();
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  const handleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error("Erro no login:", error);
      alert("Falha ao autenticar com Google.");
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setAssets([]);
      setRequests([]);
      setUserRole(UserRole.UNAUTHORIZED);
    } catch (error) {
      console.error("Erro no logout:", error);
    }
  };

  const toggleTheme = () => {
    if (isDarkMode) {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
      setIsDarkMode(false);
    } else {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
      setIsDarkMode(true);
    }
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch((e) => {
        console.error(`Error attempting to enable fullscreen: ${e.message}`);
      });
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
      setIsFullscreen(false);
    }
  };

  const checkStatus = (request: TransportRequest): RequestStatus => {
    const twoDaysInMs = 2 * 24 * 60 * 60 * 1000;
    if (request.status !== RequestStatus.COMPLETED && (Date.now() - request.createdAt > twoDaysInMs)) {
      return RequestStatus.DELAYED;
    }
    return request.status;
  };

  const updatedRequests = useMemo(() => {
    return requests.map(req => ({
      ...req,
      status: checkStatus(req)
    }));
  }, [requests]);

  const stats: DashboardStats = useMemo(() => {
    return {
      totalRequests: updatedRequests.length,
      pendingNF: updatedRequests.filter(r => r.type === RequestType.NF_REMESSA && r.status !== RequestStatus.COMPLETED).length,
      pendingTransport: updatedRequests.filter(r => r.type === RequestType.TRANSPORT && r.status !== RequestStatus.COMPLETED).length,
      delayedCount: updatedRequests.filter(r => r.status === RequestStatus.DELAYED).length,
    };
  }, [updatedRequests]);

  const handleAddRequest = async (newReq: TransportRequest) => {
    try {
      await createRequest(newReq);
      await loadData(); 
      setIsModalOpen(false);
    } catch (error) {
      console.error("Erro ao criar requisição:", error);
      alert("Erro ao salvar dados.");
    }
  };

  const handleUpdateContent = async (id: string, updates: Partial<TransportRequest>) => {
    try {
      setRequests(prev => prev.map(r => r.id === id ? { ...r, ...updates } : r));
      await updateRequest(id, updates);
    } catch (error) {
      console.error("Erro ao atualizar:", error);
      loadData(); 
    }
  };

  const handleDeleteRequest = async (id: string) => {
    try {
      await deleteRequest(id);
      setRequests(prev => prev.filter(r => r.id !== id));
    } catch (error) {
      console.error("Erro ao excluir:", error);
      alert("Erro ao excluir registro.");
    }
  };

  if (!isAuthReady || isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white transition-colors">
        <i className="fas fa-database text-4xl text-blue-600 mb-4 animate-bounce"></i>
        <p className="font-bold">Sincronizando com a Nuvem...</p>
      </div>
    );
  }

  // 1. Tela de Login (Usuário não autenticado)
  if (!user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#0f172a] text-white p-6">
        <div className="bg-slate-800 p-10 rounded-[2.5rem] shadow-2xl border border-slate-700 max-w-md w-full text-center space-y-8 animate-in zoom-in-95 duration-300">
           <div className="bg-blue-600 w-20 h-20 rounded-3xl flex items-center justify-center mx-auto shadow-2xl shadow-blue-500/20">
              <i className="fas fa-truck-fast text-4xl"></i>
           </div>
           <div>
              <h1 className="text-3xl font-black tracking-tighter uppercase mb-2">AssetLogix</h1>
              <p className="text-slate-400 font-medium text-sm">Gestão Profissional de Ativos e Logística</p>
           </div>
           <div className="space-y-4">
              <p className="text-slate-300 text-sm">Para acessar os dados protegidos, por favor realize o login com sua conta corporativa.</p>
              <button 
                onClick={handleLogin}
                className="w-full bg-white text-slate-900 font-black py-4 rounded-2xl hover:bg-blue-50 transition-all flex items-center justify-center gap-3 shadow-xl active:scale-95"
              >
                <img src="https://www.google.com/favicon.ico" alt="Google" className="w-5 h-5" />
                Entrar com Google
              </button>
           </div>
           <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">Segurança Cirion Technologies</p>
        </div>
      </div>
    );
  }

  // 2. Tela de Acesso Restrito (Usuário logado mas sem permissão)
  if (userRole === UserRole.UNAUTHORIZED) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#0f172a] text-white p-6">
        <div className="bg-slate-800 p-10 rounded-[2.5rem] shadow-2xl border border-slate-700 max-w-md w-full text-center space-y-8 animate-in zoom-in-95 duration-300">
           <div className="bg-rose-600 w-20 h-20 rounded-3xl flex items-center justify-center mx-auto shadow-2xl shadow-blue-500/20">
              <i className="fas fa-lock text-4xl"></i>
           </div>
           <div>
              <h1 className="text-3xl font-black tracking-tighter uppercase mb-2">Acesso Restrito</h1>
              <p className="text-slate-400 font-medium text-sm">Você não tem permissão para acessar esta área.</p>
           </div>
           <div className="space-y-4">
              <p className="text-slate-300 text-sm">
                Se você é um operador, por favor use o link de acesso compartilhado. Se o problema persistir, contate o administrador.
              </p>
              <button 
                onClick={handleLogout}
                className="w-full bg-slate-700 text-white font-black py-4 rounded-2xl hover:bg-slate-600 transition-all flex items-center justify-center gap-3 shadow-xl active:scale-95"
              >
                <i className="fas fa-sign-out-alt"></i>
                Sair da Conta
              </button>
           </div>
           <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">Segurança Cirion Technologies</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-[#f8faff] dark:bg-slate-950 transition-colors duration-300">
      {/* Sidebar - Professional Deep Blue */}
      <aside className="w-full md:w-72 bg-[#0f172a] text-white flex-shrink-0 shadow-2xl z-20 flex flex-col">
        <div className="p-6 md:p-8 flex items-center justify-between md:justify-start gap-4">
          <div className="flex items-center gap-3">
            <div className="bg-blue-600 p-2 md:p-2.5 rounded-xl shadow-lg shadow-blue-500/20">
              <i className="fas fa-truck-fast text-xl md:text-2xl"></i>
            </div>
            <div>
              <h1 className="text-lg md:text-xl font-black tracking-tighter uppercase leading-none">AssetLogix</h1>
              <span className="text-[9px] md:text-[10px] text-blue-400 font-bold uppercase tracking-widest">Cloud Sync Active</span>
            </div>
          </div>
          <div className="flex gap-2">
            <button 
              onClick={toggleTheme}
              className="md:hidden bg-slate-800 p-2 rounded-lg text-slate-400 hover:text-white transition-colors"
              title={isDarkMode ? "Modo Claro" : "Modo Escuro"}
            >
              <i className={`fas ${isDarkMode ? 'fa-sun' : 'fa-moon'}`}></i>
            </button>
            <button 
              onClick={handleLogout}
              className="md:hidden bg-rose-600/20 p-2 rounded-lg text-rose-400 hover:bg-rose-600 hover:text-white transition-colors"
              title="Sair"
            >
              <i className="fas fa-sign-out-alt"></i>
            </button>
          </div>
        </div>
        
        <nav className="px-4 md:px-5 pb-4 md:pb-0 space-y-1 md:space-y-2 flex flex-row md:flex-col overflow-x-auto md:overflow-x-visible no-scrollbar">
          <button 
            onClick={() => setActiveTab('dashboard')}
            className={`flex-1 md:w-full flex items-center justify-center md:justify-start gap-3 md:gap-4 px-4 md:px-5 py-3 md:py-3.5 rounded-xl font-semibold transition-all duration-200 whitespace-nowrap ${activeTab === 'dashboard' ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}
          >
            <i className={`fas fa-chart-pie w-5 text-center ${activeTab === 'dashboard' ? 'text-white' : 'text-slate-500'}`}></i>
            <span className="text-sm md:text-base">Dashboard</span>
          </button>
          <button 
            onClick={() => setActiveTab('requests')}
            className={`flex-1 md:w-full flex items-center justify-center md:justify-start gap-3 md:gap-4 px-4 md:px-5 py-3 md:py-3.5 rounded-xl font-semibold transition-all duration-200 whitespace-nowrap ${activeTab === 'requests' ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}
          >
            <i className={`fas fa-exchange-alt w-5 text-center ${activeTab === 'requests' ? 'text-white' : 'text-slate-500'}`}></i>
            <span className="text-sm md:text-base">Solicitações</span>
          </button>
          {userRole === UserRole.ADMIN && (
            <button 
              onClick={() => setActiveTab('assets')}
              className={`flex-1 md:w-full flex items-center justify-center md:justify-start gap-3 md:gap-4 px-4 md:px-5 py-3 md:py-3.5 rounded-xl font-semibold transition-all duration-200 whitespace-nowrap ${activeTab === 'assets' ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}
            >
              <i className={`fas fa-layer-group w-5 text-center ${activeTab === 'assets' ? 'text-white' : 'text-slate-500'}`}></i>
              <span className="text-sm md:text-base">Inventário</span>
            </button>
          )}
          {userRole === UserRole.ADMIN && (
            <button 
              onClick={() => setActiveTab('users')}
              className={`flex-1 md:w-full flex items-center justify-center md:justify-start gap-3 md:gap-4 px-4 md:px-5 py-3 md:py-3.5 rounded-xl font-semibold transition-all duration-200 whitespace-nowrap ${activeTab === 'users' ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}
            >
              <i className={`fas fa-users-cog w-5 text-center ${activeTab === 'users' ? 'text-white' : 'text-slate-500'}`}></i>
              <span className="text-sm md:text-base">Usuários</span>
            </button>
          )}
        </nav>

        <div className="mt-auto p-6 hidden md:block border-t border-slate-800/50 space-y-3">
          {userRole !== UserRole.ADMIN && !currentUserAccount?.hasContributed && (
            <div className="p-4 bg-gradient-to-br from-amber-500/10 to-amber-600/5 border border-amber-500/20 rounded-2xl space-y-1.5 mb-2 relative overflow-hidden group">
              <div className="flex items-center gap-2">
                <i className="fas fa-crown text-amber-500 text-xs animate-pulse"></i>
                <h5 className="text-[10px] uppercase font-black tracking-wider text-amber-500">Acesso Básico</h5>
              </div>
              <p className="text-[10px] text-slate-400 font-bold leading-tight">
                Você pode enviar apenas 1 item por solicitação. Contribua para liberar tudo!
              </p>
              <button 
                onClick={() => setIsContributionModalOpen(true)}
                className="w-full bg-amber-500 hover:bg-amber-600 text-[#0f172a] font-extrabold text-[10px] py-1.5 rounded-xl transition-all shadow-md active:scale-95"
              >
                Contribuir R$ 10,00
              </button>
            </div>
          )}
          {currentUserAccount?.hasContributed && userRole !== UserRole.ADMIN && (
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex items-center gap-2.5 mb-2">
              <div className="w-6 h-6 rounded-lg bg-emerald-500/20 flex items-center justify-center text-emerald-500 text-xs">
                <i className="fas fa-crown animate-bounce"></i>
              </div>
              <div>
                <h5 className="text-[10px] uppercase font-black tracking-wider text-emerald-400 leading-none">Apoiador Premium</h5>
                <p className="text-[9px] text-[#0f172a] dark:text-emerald-500 font-bold leading-none mt-1">Acesso Total Ativo</p>
              </div>
            </div>
          )}

          <div className="flex items-center gap-3 p-3 bg-slate-800/50 rounded-2xl border border-slate-700/50 mb-2">
             <img src={user.photoURL || ''} alt="" className="w-10 h-10 rounded-xl border-2 border-blue-500" />
             <div className="overflow-hidden">
                <p className="text-xs font-black truncate">{user.displayName}</p>
                <p className="text-[10px] text-slate-500 font-bold truncate">{user.email}</p>
             </div>
          </div>
          <div className="flex gap-2">
            <button 
              onClick={toggleTheme}
              className="flex-1 flex items-center justify-center gap-2 px-3 py-3 rounded-xl font-semibold text-slate-400 hover:bg-slate-800 hover:text-white transition-all border border-slate-800"
            >
              <i className={`fas ${isDarkMode ? 'fa-sun' : 'fa-moon'}`}></i>
              {isDarkMode ? 'Light' : 'Dark'}
            </button>
            <button 
              onClick={handleLogout}
              className="flex-1 flex items-center justify-center gap-2 px-3 py-3 rounded-xl font-semibold text-rose-400 hover:bg-rose-600 hover:text-white transition-all border border-slate-800"
            >
              <i className="fas fa-sign-out-alt"></i>
              Sair
            </button>
          </div>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="w-full bg-blue-50 text-blue-700 font-bold py-4 rounded-xl hover:bg-white transition-all flex items-center justify-center gap-3 shadow-xl hover:-translate-y-1 active:translate-y-0"
          >
            <i className="fas fa-plus-circle"></i>
            Nova Requisição
          </button>
        </div>
      </aside>

      <main className="flex-1 p-4 md:p-12 overflow-y-auto overflow-x-hidden">
        <header className="mb-6 md:mb-10 flex flex-col md:flex-row md:items-end justify-between gap-4 md:gap-6 border-b border-blue-100 dark:border-slate-800 pb-6 md:pb-8 transition-colors">
          <div className="text-center md:text-left">
            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight capitalize transition-colors">{activeTab}</h2>
            <p className="text-slate-500 dark:text-slate-400 font-medium mt-1 text-sm md:text-base transition-colors">Gerenciamento centralizado de ativos TI.</p>
          </div>
          <div className="flex items-center gap-3 md:gap-4 w-full md:w-auto">
             <div className="flex flex-1 items-center bg-white dark:bg-slate-800 px-4 py-2 rounded-lg border border-blue-100 dark:border-slate-700 shadow-sm gap-3 transition-colors">
                <i className="fas fa-search text-slate-400"></i>
                <input type="text" placeholder="Buscar..." className="bg-transparent outline-none text-sm w-full md:w-48 text-slate-600 dark:text-slate-200 placeholder-slate-400" />
             </div>
             <button 
              onClick={() => setIsModalOpen(true)}
              className="hidden md:flex bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-8 rounded-xl shadow-xl shadow-blue-600/20 transition-all active:scale-95 items-center gap-2"
            >
              <i className="fas fa-plus"></i> Novo
            </button>
          </div>
        </header>

        <div className="max-w-7xl mx-auto">
          {activeTab === 'dashboard' && <Dashboard stats={stats} recentRequests={updatedRequests.slice(0, 5)} onComplete={(id) => handleUpdateContent(id, { status: RequestStatus.COMPLETED })} />}
          {activeTab === 'requests' && (
            <RequestList 
              requests={updatedRequests} 
              assets={assets} 
              onUpdate={handleUpdateContent} 
              onDelete={handleDeleteRequest} 
              userRole={userRole}
              hasContributed={currentUserAccount?.hasContributed}
              onOpenContributionModal={() => setIsContributionModalOpen(true)}
            />
          )}
          {activeTab === 'assets' && userRole === UserRole.ADMIN && <AssetInventory assets={assets} />}
          {activeTab === 'users' && userRole === UserRole.ADMIN && <UserManagement />}
        </div>

        {isModalOpen && (
          <NewRequestModal 
            assets={assets} 
            onClose={() => setIsModalOpen(false)} 
            onSubmit={handleAddRequest} 
            userRole={userRole}
            hasContributed={currentUserAccount?.hasContributed}
            onOpenContributionModal={() => setIsContributionModalOpen(true)}
          />
        )}

        {isContributionModalOpen && currentUserAccount && (
          <ContributionModal
            userEmail={currentUserAccount.email}
            onClose={() => setIsContributionModalOpen(false)}
            onSuccess={() => {
              setCurrentUserAccount(prev => prev ? { ...prev, hasContributed: true } : null);
              setIsContributionModalOpen(false);
            }}
          />
        )}
      </main>
    </div>
  );
};

export default App;
