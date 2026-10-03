// =============================================================================
// SHAN POULTRY PROTEIN - Field Workers Management Page
// =============================================================================

import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { Profile, Collection } from '../types/database';
import { formatWeight, formatDate } from '../utils/formatters';
import { HardHat, Phone, Shield, CheckCircle } from 'lucide-react';

export const WorkersPage: React.FC = () => {
  const [workers, setWorkers] = useState<Profile[]>([]);
  const [collections, setCollections] = useState<Collection[]>([]);

  useEffect(() => {
    Promise.all([api.getWorkers(), api.getCollections({ limit: 1000 })]).then(([w, c]) => {
      setWorkers(w);
      setCollections(c.collections);
    });
  }, []);

  return (
    <div className="space-y-6">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <HardHat className="w-5 h-5 text-amber-400" />
            <h2 className="text-lg font-bold text-white tracking-tight">Field Collectors & Workers</h2>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Manage mobile field employees responsible for daily poultry waste pickups and scale weigh-ins.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {workers.map(w => {
          const workerSlips = collections.filter(c => c.worker_id === w.id);
          const totalWeight = workerSlips.reduce((acc, c) => acc + c.total_net_weight, 0);

          return (
            <div
              key={w.id}
              className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col justify-between space-y-4 hover:border-slate-700 transition"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center justify-center font-bold text-sm">
                      {w.full_name.substring(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <h3 className="font-bold text-sm text-white">{w.full_name}</h3>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">
                        {w.role}
                      </span>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-emerald-500/20 text-emerald-400 flex items-center gap-1">
                    <CheckCircle className="w-3 h-3" /> Active
                  </span>
                </div>

                <div className="text-xs text-slate-300 space-y-1.5 pt-1">
                  <div className="flex items-center gap-2">
                    <Phone className="w-3.5 h-3.5 text-slate-400" />
                    <span>{w.phone || 'No phone set'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Shield className="w-3.5 h-3.5 text-slate-400" />
                    <span>Mobile App Access: Enabled</span>
                  </div>
                </div>

                {/* Worker Metrics */}
                <div className="grid grid-cols-2 gap-2 pt-2 text-center">
                  <div className="p-2.5 bg-slate-800/60 rounded-xl border border-slate-700/60">
                    <p className="text-[10px] text-slate-400 uppercase font-semibold">Total Slips</p>
                    <p className="text-base font-bold text-white font-mono mt-0.5">{workerSlips.length}</p>
                  </div>
                  <div className="p-2.5 bg-emerald-950/20 rounded-xl border border-emerald-500/20">
                    <p className="text-[10px] text-emerald-400 uppercase font-semibold">Total Weight</p>
                    <p className="text-base font-bold text-emerald-300 font-mono mt-0.5">{formatWeight(totalWeight)}</p>
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-800/80 text-[11px] text-slate-500 flex justify-between items-center">
                <span>Joined {formatDate(w.created_at)}</span>
                <span className="text-emerald-400 font-semibold">2-Hr Edit Lock Active</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
