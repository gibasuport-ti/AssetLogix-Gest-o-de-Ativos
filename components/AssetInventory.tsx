
import React from 'react';
import { Asset, AssetType } from '../types';

interface Props {
  assets: Asset[];
}

const AssetInventory: React.FC<Props> = ({ assets }) => {
  const getIcon = (type: AssetType) => {
    switch (type) {
      case AssetType.NOTEBOOK: return 'fa-laptop';
      case AssetType.PC: return 'fa-desktop';
      case AssetType.SWITCH: return 'fa-network-wired';
      case AssetType.ACCESS_POINT: return 'fa-wifi';
      case AssetType.SERVER: return 'fa-server';
      default: return 'fa-box-open';
    }
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-8 animate-in zoom-in-95 duration-700">
      {assets.map(asset => (
        <div key={asset.id} className="bg-white dark:bg-slate-800 p-5 md:p-8 rounded-2xl md:rounded-[2rem] border border-blue-50 dark:border-slate-700 shadow-lg shadow-blue-900/5 hover:shadow-2xl transition-all group relative overflow-hidden">
          <div className="absolute top-0 right-0 w-16 h-16 md:w-24 md:h-24 bg-blue-50 dark:bg-slate-700/50 rounded-bl-full -mr-6 -mt-6 md:-mr-8 md:-mt-8 transition-all group-hover:scale-110"></div>
          
          <div className="flex items-start justify-between mb-4 md:mb-8 relative z-10">
            <div className="bg-gradient-to-br from-blue-50 to-blue-100/50 dark:from-slate-700 dark:to-slate-600/50 p-3 md:p-4 rounded-xl md:rounded-2xl text-blue-600 dark:text-blue-400 group-hover:from-blue-600 group-hover:to-indigo-700 group-hover:text-white transition-all duration-300">
              <i className={`fas ${getIcon(asset.type)} text-lg md:text-2xl`}></i>
            </div>
            <span className="text-[9px] md:text-[10px] font-black px-2 py-1 md:px-3 md:py-1.5 bg-slate-900 dark:bg-black text-white rounded-md md:rounded-lg uppercase tracking-widest shadow-lg">
              {asset.tag}
            </span>
          </div>

          <div className="relative z-10">
            <h4 className="font-black text-slate-900 dark:text-white text-base md:text-lg mb-1 leading-tight">{asset.name}</h4>
            <div className="flex items-center gap-1.5 mb-4 md:mb-6">
               <span className="w-1.5 h-1.5 rounded-full bg-blue-400"></span>
               <p className="text-slate-400 dark:text-slate-400 text-[10px] font-bold uppercase truncate">{asset.type}</p>
            </div>
            
            <div className="pt-4 md:pt-6 border-t border-slate-50 dark:border-slate-700 flex flex-col gap-2 md:gap-3 transition-colors">
              <div className="flex items-center justify-between">
                 <span className="text-[9px] font-bold text-slate-400 uppercase">Serial</span>
                 <span className="text-[10px] font-mono font-bold text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-700/50 px-2 py-0.5 rounded-md truncate max-w-[100px]">{asset.serialNumber}</span>
              </div>
              <div className="flex items-center justify-between">
                 <span className="text-[9px] font-bold text-slate-400 uppercase">Status</span>
                 <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-bold text-[9px] uppercase">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                    Estoque
                 </span>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default AssetInventory;
