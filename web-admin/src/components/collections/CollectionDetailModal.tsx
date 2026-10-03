// =============================================================================
// SHAN POULTRY PROTEIN - Collection Detail Modal
// =============================================================================

import React from 'react';
import { Collection } from '../../types/database';
import { Modal } from '../common/Modal';
import { formatDate, formatTime, formatWeight, formatCurrency } from '../../utils/formatters';
import { Printer, Trash2, User, Phone, MapPin, Scale, Clock, FileText } from 'lucide-react';
import { triggerPrint } from '../../utils/exportUtils';

interface CollectionDetailModalProps {
  collection: Collection | null;
  isOpen: boolean;
  onClose: () => void;
  onDelete?: (id: string) => void;
}

export const CollectionDetailModal: React.FC<CollectionDetailModalProps> = ({
  collection,
  isOpen,
  onClose,
  onDelete,
}) => {
  if (!collection) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Collection Slip: ${collection.receipt_no}`}
      subtitle={`Recorded on ${formatDate(collection.collection_date)} at ${formatTime(collection.collection_time)}`}
      maxWidth="2xl"
    >
      <div className="space-y-6">
        {/* Customer & Worker Header Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Customer Card */}
          <div className="bg-slate-800/60 p-4 rounded-xl border border-slate-700/60 space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold text-emerald-400 uppercase tracking-wider">
              <User className="w-3.5 h-3.5" /> Customer Details
            </div>
            <p className="font-bold text-white text-base">{collection.customer?.name}</p>
            <p className="text-xs text-slate-400 font-mono">Code: {collection.customer?.customer_code}</p>
            <div className="text-xs text-slate-300 flex items-center gap-1.5">
              <Phone className="w-3 h-3 text-slate-400" /> {collection.customer?.phone}
            </div>
            <div className="text-xs text-slate-300 flex items-center gap-1.5">
              <MapPin className="w-3 h-3 text-slate-400" /> {collection.customer?.area} — {collection.customer?.address || 'No address'}
            </div>
          </div>

          {/* Worker & Time Card */}
          <div className="bg-slate-800/60 p-4 rounded-xl border border-slate-700/60 space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold text-amber-400 uppercase tracking-wider">
              <Clock className="w-3.5 h-3.5" /> Collection Information
            </div>
            <p className="font-bold text-white text-sm">Collected By: {collection.worker?.full_name}</p>
            <p className="text-xs text-slate-400">Date: {formatDate(collection.collection_date)}</p>
            <p className="text-xs text-slate-400">Time: {formatTime(collection.collection_time)}</p>
            <div className="mt-2">
              <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                {collection.status}
              </span>
            </div>
          </div>
        </div>

        {/* Weight & Billing Summary */}
        <div className="bg-slate-950/60 p-5 rounded-xl border border-slate-800 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
              <Scale className="w-4 h-4 text-emerald-400" /> Weight & Billing Summary
            </span>
            <span className="text-xs text-slate-400 font-mono">Rate: {formatCurrency(collection.rate_per_kg)} / KG</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
            <div className="p-3 bg-slate-900 rounded-lg border border-slate-800">
              <p className="text-[10px] text-slate-400 uppercase">Gross Weight</p>
              <p className="text-base font-bold text-white font-mono mt-1">{formatWeight(collection.gross_weight)}</p>
            </div>
            <div className="p-3 bg-slate-900 rounded-lg border border-slate-800">
              <p className="text-[10px] text-slate-400 uppercase">Tare Weight</p>
              <p className="text-base font-bold text-rose-400 font-mono mt-1">-{formatWeight(collection.tare_weight)}</p>
            </div>
            <div className="p-3 bg-emerald-950/30 rounded-lg border border-emerald-500/30">
              <p className="text-[10px] text-emerald-400 uppercase font-semibold">Net Weight</p>
              <p className="text-lg font-black text-emerald-300 font-mono mt-1">{formatWeight(collection.total_net_weight)}</p>
            </div>
            <div className="p-3 bg-amber-950/30 rounded-lg border border-amber-500/30">
              <p className="text-[10px] text-amber-400 uppercase font-semibold">Total Amount</p>
              <p className="text-lg font-black text-amber-300 font-mono mt-1">{formatCurrency(collection.total_amount)}</p>
            </div>
          </div>

          {/* Dynamic Weight Category Breakdown */}
          {collection.items && collection.items.length > 0 && (
            <div className="mt-4 pt-4 border-t border-slate-800/80">
              <p className="text-xs font-semibold text-slate-300 mb-2">Category Breakdown:</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {collection.items.map((it, i) => (
                  <div key={i} className="flex items-center justify-between p-2.5 bg-slate-900/90 rounded-lg border border-slate-800 text-xs">
                    <span className="text-slate-300 font-medium">
                      {it.category?.name || `Category ${i + 1}`}
                      {it.category?.urdu_name && <span className="text-[10px] text-slate-500 ml-1">({it.category.urdu_name})</span>}
                    </span>
                    <span className="font-mono font-bold text-emerald-400">{formatWeight(it.weight)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Signature & Scale Photos */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Signature */}
          <div className="bg-slate-800/40 p-4 rounded-xl border border-slate-700/50">
            <p className="text-xs font-semibold text-slate-300 mb-2 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-slate-400" /> Signee / Customer Signature
            </p>
            {collection.signature_url ? (
              <div className="bg-white p-2 rounded-lg flex items-center justify-center h-28 border border-slate-300">
                <img
                  src={collection.signature_url}
                  alt="Customer Signature"
                  className="max-h-full object-contain filter invert"
                />
              </div>
            ) : (
              <div className="h-28 bg-slate-900/80 rounded-lg border border-dashed border-slate-700 flex items-center justify-center text-xs text-slate-500">
                No signature captured
              </div>
            )}
            {collection.signee_name && (
              <p className="text-[11px] text-slate-400 mt-2 text-center">Signee: {collection.signee_name}</p>
            )}
          </div>

          {/* Scale Photo / Attachments */}
          <div className="bg-slate-800/40 p-4 rounded-xl border border-slate-700/50">
            <p className="text-xs font-semibold text-slate-300 mb-2 flex items-center gap-1.5">
              <Scale className="w-3.5 h-3.5 text-slate-400" /> Scale / Slip Photo
            </p>
            {collection.attachments && collection.attachments.length > 0 ? (
              <div className="h-28 bg-slate-900 rounded-lg overflow-hidden border border-slate-800">
                <img
                  src={collection.attachments[0].public_url || 'https://images.unsplash.com/photo-1596524430615-b46475ddff6e?auto=format&fit=crop&w=400&q=80'}
                  alt="Collection Attachment"
                  className="w-full h-full object-cover"
                />
              </div>
            ) : (
              <div className="h-28 bg-slate-900/80 rounded-lg border border-dashed border-slate-700 flex items-center justify-center text-xs text-slate-500">
                No photo attached
              </div>
            )}
            <p className="text-[11px] text-slate-400 mt-2 text-center">Photo verification</p>
          </div>
        </div>

        {/* Notes */}
        {collection.notes && (
          <div className="p-3 bg-slate-800/40 rounded-xl border border-slate-700/40 text-xs text-slate-300">
            <span className="font-semibold text-slate-400">Notes: </span>
            {collection.notes}
          </div>
        )}

        {/* Modal Actions */}
        <div className="flex items-center justify-between pt-4 border-t border-slate-800">
          <div>
            {onDelete && (
              <button
                onClick={() => {
                  if (confirm(`Are you sure you want to delete slip ${collection.receipt_no}?`)) {
                    onDelete(collection.id);
                    onClose();
                  }
                }}
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-rose-400 hover:bg-rose-500/10 rounded-xl transition"
              >
                <Trash2 className="w-4 h-4" />
                <span>Delete Slip</span>
              </button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={triggerPrint}
              className="flex items-center gap-1.5 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl border border-slate-700 transition"
            >
              <Printer className="w-4 h-4" />
              <span>Print Slip</span>
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl transition"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
};
