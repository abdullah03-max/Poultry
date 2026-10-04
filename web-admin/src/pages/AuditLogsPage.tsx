// =============================================================================
// SHAN POULTRY PROTEIN - Security Audit Trail Page
// Daylight B2B Clean Palette Edition
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
      <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-6 shadow-card flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-blue-50 text-blue-600">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">Security Audit Trail</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Immutable log of record insertions, deletions, status changes, and administrative actions.
            </p>
          </div>
        </div>

        <button
          onClick={fetchLogs}
          className="p-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-slate-600 hover:text-slate-900 transition"
          title="Refresh Logs"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-card">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[650px] text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                <th className="py-3 px-4">Timestamp</th>
                <th className="py-3 px-4">User</th>
                <th className="py-3 px-4">Action</th>
                <th className="py-3 px-4">Target Table</th>
                <th className="py-3 px-4 font-mono">Record ID</th>
                <th className="py-3 px-4 text-center">Inspect</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono">
              {logs.map(log => {
                const actionColors: Record<string, string> = {
                  INSERT: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
                  UPDATE: 'bg-blue-50 text-blue-700 border border-blue-200',
                  DELETE: 'bg-rose-50 text-rose-700 border border-rose-200',
                  SETTINGS_UPDATE: 'bg-amber-50 text-amber-800 border border-amber-200',
                };

                return (
                  <tr key={log.id} className="hover:bg-slate-50/70 transition">
                    <td className="py-3 px-4 text-slate-500 font-sans text-xs">
                      {formatDateTime(log.created_at)}
                    </td>
                    <td className="py-3 px-4 text-slate-900 font-sans font-semibold">
                      {log.profile?.full_name || 'System Admin'}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase font-sans ${actionColors[log.action] || 'bg-slate-100 text-slate-700'}`}>
                        {log.action}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-600 font-sans">{log.table_name}</td>
                    <td className="py-3 px-4 text-slate-400 text-[11px] truncate max-w-[120px]">{log.record_id}</td>
                    <td className="py-3 px-4 text-center font-sans">
                      <button
                        onClick={() => setSelectedLog(log)}
                        className="p-1.5 text-slate-400 hover:text-blue-600 rounded-lg hover:bg-blue-50 transition"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}

              {logs.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400 font-sans">
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
            <div className="p-3.5 bg-slate-50 rounded-xl text-xs space-y-1.5 border border-slate-100">
              <p><span className="text-slate-500 font-semibold">User: </span><span className="font-semibold text-slate-900">{selectedLog.profile?.full_name || 'Admin'}</span></p>
              <p><span className="text-slate-500 font-semibold">Recorded At: </span><span className="text-slate-700">{formatDateTime(selectedLog.created_at)}</span></p>
              <p><span className="text-slate-500 font-semibold">Record ID: </span><span className="font-mono text-slate-700">{selectedLog.record_id}</span></p>
            </div>

            {selectedLog.old_data && (
              <div>
                <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">Previous State (Old Data):</p>
                <pre className="p-3 bg-slate-50 rounded-xl text-[11px] font-mono text-rose-700 overflow-x-auto border border-rose-200">
                  {JSON.stringify(selectedLog.old_data, null, 2)}
                </pre>
              </div>
            )}

            {selectedLog.new_data && (
              <div>
                <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">New State (Updated Data):</p>
                <pre className="p-3 bg-slate-50 rounded-xl text-[11px] font-mono text-emerald-700 overflow-x-auto border border-emerald-200">
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
