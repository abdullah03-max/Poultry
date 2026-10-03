// =============================================================================
// SHAN POULTRY PROTEIN - Security Audit Trail Page
// =============================================================================

import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { AuditLog } from '../types/database';
import { formatDateTime } from '../utils/formatters';
import { ShieldAlert, RefreshCw, Eye } from 'lucide-react';
import { Modal } from '../components/common/Modal';

export const AuditLogsPage: React.FC = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const data = await api.getAuditLogs();
      setLogs(data);
    } catch (err) {
      console.error('Failed to load audit logs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  return (
    <div className="space-y-6">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-emerald-400" />
            <h2 className="text-lg font-bold text-white tracking-tight">Security Audit Trail</h2>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Immutable log of record insertions, deletions, status changes, and administrative actions.
          </p>
        </div>

        <button
          onClick={fetchLogs}
          className="p-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl text-slate-300 transition"
          title="Refresh Logs"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-800/80 text-[11px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-700">
                <th className="py-3 px-4">Timestamp</th>
                <th className="py-3 px-4">User</th>
                <th className="py-3 px-4">Action</th>
                <th className="py-3 px-4">Target Table</th>
                <th className="py-3 px-4 font-mono">Record ID</th>
                <th className="py-3 px-4 text-center">Inspect</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80 font-mono">
              {logs.map(log => {
                const actionColors: Record<string, string> = {
                  INSERT: 'bg-emerald-500/20 text-emerald-400',
                  UPDATE: 'bg-blue-500/20 text-blue-400',
                  DELETE: 'bg-rose-500/20 text-rose-400',
                  SETTINGS_UPDATE: 'bg-amber-500/20 text-amber-400',
                };

                return (
                  <tr key={log.id} className="hover:bg-slate-800/40 transition">
                    <td className="py-3 px-4 text-slate-400 font-sans text-xs">
                      {formatDateTime(log.created_at)}
                    </td>
                    <td className="py-3 px-4 text-white font-sans font-medium">
                      {log.profile?.full_name || 'System Admin'}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase font-sans ${actionColors[log.action] || 'bg-slate-800 text-slate-300'}`}>
                        {log.action}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-300 font-sans">{log.table_name}</td>
                    <td className="py-3 px-4 text-slate-500 text-[11px] truncate max-w-[120px]">{log.record_id}</td>
                    <td className="py-3 px-4 text-center font-sans">
                      <button
                        onClick={() => setSelectedLog(log)}
                        className="p-1.5 text-slate-400 hover:text-emerald-400 rounded-lg hover:bg-slate-800 transition"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}

              {logs.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-500 font-sans">
                    No audit records registered yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Log Inspector Modal */}
      <Modal
        isOpen={!!selectedLog}
        onClose={() => setSelectedLog(null)}
        title="Audit Event Details"
        subtitle={`Action: ${selectedLog?.action} on ${selectedLog?.table_name}`}
        maxWidth="lg"
      >
        {selectedLog && (
          <div className="space-y-4">
            <div className="p-3 bg-slate-800/60 rounded-xl text-xs space-y-1">
              <p><span className="text-slate-400 font-semibold">User: </span>{selectedLog.profile?.full_name || 'Admin'}</p>
              <p><span className="text-slate-400 font-semibold">Recorded At: </span>{formatDateTime(selectedLog.created_at)}</p>
              <p><span className="text-slate-400 font-semibold">Record ID: </span><span className="font-mono">{selectedLog.record_id}</span></p>
            </div>

            {selectedLog.old_data && (
              <div>
                <p className="text-[11px] font-bold text-slate-400 uppercase mb-1">Previous State (Old Data):</p>
                <pre className="p-3 bg-slate-950 rounded-xl text-[11px] font-mono text-rose-300 overflow-x-auto border border-slate-800">
                  {JSON.stringify(selectedLog.old_data, null, 2)}
                </pre>
              </div>
            )}

            {selectedLog.new_data && (
              <div>
                <p className="text-[11px] font-bold text-slate-400 uppercase mb-1">New State (New Data):</p>
                <pre className="p-3 bg-slate-950 rounded-xl text-[11px] font-mono text-emerald-300 overflow-x-auto border border-slate-800">
                  {JSON.stringify(selectedLog.new_data, null, 2)}
                </pre>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
};
