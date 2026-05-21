
import React from 'react';
import { DashboardStats, TransportRequest, RequestStatus } from '../types';

interface Props {
  stats: DashboardStats;
  recentRequests: TransportRequest[];
  onComplete: (id: string) => void;
}

const Dashboard: React.FC<Props> = ({ stats, recentRequests, onComplete }) => {
  return (
    <div className="space-y-6 md:space-y-10 animate-in fade-in slide-in-from-top-2 duration-700">
      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-8">
        <StatCard 
          title="Total Pedidos" 
          value={stats.totalRequests} 
          icon="fa-folder-tree" 
          color="blue"
        />
        <StatCard 
          title="NF Pendentes" 
          value={stats.pendingNF} 
          icon="fa-file-invoice" 
          color="amber"
        />
        <StatCard 
          title="Em Trânsito" 
          value={stats.pendingTransport} 
          icon="fa-shipping-fast" 
          color="indigo"
        />
        <StatCard 
          title="Em Atraso" 
          value={stats.delayedCount} 
          icon="fa-clock" 
          color="red"
          alert={stats.delayedCount > 0}
        />
      </div>

      {/* Delayed Reminders Section */}
      {stats.delayedCount > 0 && (
        <div className="bg-rose-50 dark:bg-rose-900/20 border border-rose-100 dark:border-rose-800 p-4 md:p-5 rounded-xl md:rounded-2xl flex items-center gap-4 md:gap-5 shadow-sm transition-colors">
          <div className="bg-rose-500 text-white p-2.5 md:p-3 rounded-lg md:rounded-xl shadow-lg">
            <i className="fas fa-exclamation-triangle text-base md:text-xl"></i>
          </div>
          <div>
            <h3 className="font-bold text-rose-900 dark:text-rose-100 text-sm md:text-base">Ação Necessária</h3>
            <p className="text-rose-700 dark:text-rose-300 text-xs md:text-sm leading-relaxed"><strong>{stats.delayedCount} solicitações</strong> pendentes há mais de 48h.</p>
          </div>
        </div>
      )}

      {/* Recent Activity */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl md:rounded-3xl shadow-xl shadow-blue-900/5 border border-blue-50/50 dark:border-slate-700 overflow-hidden transition-colors">
        <div className="p-5 md:p-8 border-b border-blue-50 dark:border-slate-700 flex items-center justify-between bg-white dark:bg-slate-800 transition-colors">
          <h3 className="text-base md:text-lg font-bold text-slate-800 dark:text-white">Atividades</h3>
          <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-2 py-0.5 rounded-full uppercase">Recentes</span>
        </div>
        <div className="overflow-x-auto overflow-y-hidden">
          <table className="w-full text-left min-w-[600px] md:min-w-full">
            <thead className="bg-slate-50/80 dark:bg-slate-750 text-slate-500 dark:text-slate-400 text-[10px] uppercase font-bold tracking-widest transition-colors">
              <tr>
                <th className="px-6 md:px-8 py-4 md:py-5">Código</th>
                <th className="px-6 md:px-8 py-4 md:py-5">Categoria</th>
                <th className="px-6 md:px-8 py-4 md:py-5">Status</th>
                <th className="px-6 md:px-8 py-4 md:py-5 text-right">Controle</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 dark:divide-slate-700 text-sm transition-colors">
              {recentRequests.map(req => (
                <tr key={req.id} className="hover:bg-blue-50/30 dark:hover:bg-slate-700/50 transition-all group">
                  <td className="px-6 md:px-8 py-5 md:py-6 font-bold text-slate-900 dark:text-white">{req.id}</td>
                  <td className="px-6 md:px-8 py-5 md:py-6 text-slate-600 dark:text-slate-300 font-medium truncate max-w-[150px]">{req.type}</td>
                  <td className="px-6 md:px-8 py-5 md:py-6">
                    <StatusBadge status={req.status} />
                  </td>
                  <td className="px-6 md:px-8 py-5 md:py-6 text-right">
                    {req.status !== RequestStatus.COMPLETED ? (
                      <button 
                        onClick={() => onComplete(req.id)}
                        className="bg-white dark:bg-slate-700 border border-blue-100 dark:border-slate-600 text-blue-600 dark:text-blue-400 hover:bg-blue-600 hover:text-white dark:hover:bg-blue-500 px-3 md:px-4 py-1.5 md:py-2 rounded-lg font-bold text-xs transition-all"
                      >
                        OK
                      </button>
                    ) : (
                      <span className="text-emerald-500 font-bold text-xs">Pronto</span>
                    )}
                  </td>
                </tr>
              ))}
              {recentRequests.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-8 py-16 text-center text-slate-300 dark:text-slate-600">
                    <i className="fas fa-inbox text-3xl mb-2"></i>
                    <p className="text-xs">Sem registros.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

const StatCard: React.FC<{ title: string, value: number, icon: string, color: string, alert?: boolean }> = ({ title, value, icon, color, alert }) => {
  const colorMap: Record<string, string> = {
    blue: 'from-blue-500 to-blue-600',
    amber: 'from-amber-400 to-amber-500',
    indigo: 'from-indigo-500 to-indigo-600',
    red: 'from-rose-500 to-rose-600',
  };
  return (
    <div className={`bg-white dark:bg-slate-800 p-4 md:p-7 rounded-xl md:rounded-[2rem] border border-blue-50 dark:border-slate-700 shadow-lg shadow-blue-900/5 transition-all ${alert ? 'ring-1 ring-rose-500/20' : ''}`}>
      <div className="flex items-center justify-between mb-3 md:mb-6">
        <div className={`bg-gradient-to-br ${colorMap[color]} p-2.5 md:p-4 rounded-lg md:rounded-2xl text-white shadow-md`}>
          <i className={`fas ${icon} text-sm md:text-xl`}></i>
        </div>
        <span className="text-xl md:text-3xl font-black text-slate-900 dark:text-white">{value}</span>
      </div>
      <h4 className="text-slate-500 dark:text-slate-400 text-[9px] md:text-xs font-bold uppercase tracking-widest truncate">{title}</h4>
    </div>
  );
};

export const StatusBadge: React.FC<{ status: RequestStatus }> = ({ status }) => {
  const styles: Record<RequestStatus, string> = {
    [RequestStatus.PENDING]: 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 border-blue-100 dark:border-blue-800',
    [RequestStatus.IN_PROGRESS]: 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300 border-indigo-100 dark:border-indigo-800',
    [RequestStatus.COMPLETED]: 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 border-emerald-100 dark:border-emerald-800',
    [RequestStatus.DELAYED]: 'bg-rose-50 dark:bg-rose-900/20 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800 font-bold',
  };
  return (
    <span className={`px-2 md:px-3 py-1 md:py-1.5 rounded-lg text-[9px] md:text-[11px] font-bold border ${styles[status]}`}>
      {status}
    </span>
  );
};

export default Dashboard;
