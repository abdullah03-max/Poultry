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
      title={`Weight Slip: ${collection.receipt_no}`}
      subtitle={`Recorded on ${formatDate(collection.collection_date)} at ${formatTime(collection.collection_time)}`}
      maxWidth="2xl"
    >
      <div className="space-y-5 text-slate-800">
        {/* Customer & Worker Header Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Customer Card */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/90 space-y-1.5">
            <div className="flex items-center gap-1.5 text-xs font-bold text-brand-700 uppercase tracking-wider">
              <User className="w-3.5 h-3.5" /> Customer Details
            </div>
            <p className="font-bold text-slate-900 text-base">{collection.customer?.name}</p>
            <p className="text-xs text-slate-500 font-mono">Code: {collection.customer?.customer_code}</p>
            <div className="text-xs text-slate-600 flex items-center gap-1.5">
              <Phone className="w-3 h-3 text-slate-400" /> {collection.customer?.phone}
            </div>
            <div className="text-xs text-slate-600 flex items-center gap-1.5">
              <MapPin className="w-3 h-3 text-slate-400" /> {collection.customer?.area} — {collection.customer?.address || 'Standard Location'}
            </div>
          </div>

          {/* Worker & Time Card */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/90 space-y-1.5">
            <div className="flex items-center gap-1.5 text-xs font-bold text-poultry-amber uppercase tracking-wider">
              <Clock className="w-3.5 h-3.5" /> Collection Information
            </div>
            <p className="font-semibold text-slate-900 text-sm">
              Collector: {collection.worker?.full_name || 'System / Admin'}
            </p>
            <p className="text-xs text-slate-500">Date: {formatDate(collection.collection_date)}</p>
            <p className="text-xs text-slate-500">Time: {formatTime(collection.collection_time)}</p>
            <div className="pt-1">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200">
                {collection.status}
              </span>
            </div>
          </div>
        </div>

        {/* Weight & Billing Summary */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
              <Scale className="w-4 h-4 text-brand-600" /> Weight & Billing Summary
            </span>
            <span className="text-xs text-slate-500 font-mono font-medium">Rate: {formatCurrency(collection.rate_per_kg)} / KG</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80">
              <p className="text-[10px] text-slate-500 uppercase font-semibold">Gross Weight</p>
              <p className="text-base font-bold text-slate-900 font-mono mt-1">{formatWeight(collection.gross_weight)}</p>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80">
              <p className="text-[10px] text-slate-500 uppercase font-semibold">Tare Weight</p>
              <p className="text-base font-bold text-rose-600 font-mono mt-1">-{formatWeight(collection.tare_weight)}</p>
            </div>
            <div className="p-3 bg-brand-50 rounded-xl border border-brand-200">
              <p className="text-[10px] text-brand-700 uppercase font-bold">Net Weight</p>
              <p className="text-lg font-black text-brand-700 font-mono mt-1">{formatWeight(collection.total_net_weight)}</p>
            </div>
            <div className="p-3 bg-amber-50 rounded-xl border border-amber-200">
              <p className="text-[10px] text-amber-700 uppercase font-bold">Total Amount</p>
              <p className="text-lg font-black text-amber-700 font-mono mt-1">{formatCurrency(collection.total_amount)}</p>
            </div>
          </div>

          {/* Dynamic Weight Category Breakdown */}
          {collection.items && collection.items.length > 0 && (
            <div className="mt-3 pt-3 border-t border-slate-100">
              <p className="text-xs font-semibold text-slate-700 mb-2">Category Breakdown:</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {collection.items.map((it, i) => (
                  <div key={i} className="flex items-center justify-between p-2.5 bg-slate-50 rounded-lg border border-slate-200 text-xs">
                    <span className="text-slate-700 font-medium">
                      {it.category?.name || `Category ${i + 1}`}
                      {it.category?.urdu_name && <span className="text-[10px] text-slate-400 ml-1 font-urdu">({it.category.urdu_name})</span>}
                    </span>
                    <span className="font-mono font-bold text-slate-900">{formatWeight(it.weight)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Signature & Scale Photos */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Signature */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
            <p className="text-xs font-semibold text-slate-700 mb-2 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-slate-500" /> Signee / Customer Signature
            </p>
            {collection.signature_url ? (
              <div className="bg-white p-2 rounded-lg flex items-center justify-center h-28 border border-slate-200">
                <img
                  src={collection.signature_url}
                  alt="Customer Signature"
                  className="max-h-full object-contain"
                />
              </div>
            ) : (
              <div className="h-28 bg-white rounded-lg border border-dashed border-slate-300 flex items-center justify-center text-xs text-slate-400">
                No signature captured
              </div>
            )}
            {collection.signee_name && (
              <p className="text-[11px] text-slate-500 mt-2 text-center font-medium">Signee: {collection.signee_name}</p>
            )}
          </div>

          {/* Scale Photo / Attachments */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
            <p className="text-xs font-semibold text-slate-700 mb-2 flex items-center gap-1.5">
              <Scale className="w-3.5 h-3.5 text-slate-500" /> Scale / Slip Photo
            </p>
            {collection.attachments && collection.attachments.length > 0 ? (
              <div className="h-28 bg-slate-100 rounded-lg overflow-hidden border border-slate-200">
                <img
                  src={collection.attachments[0].public_url || 'https://images.unsplash.com/photo-1596524430615-b46475ddff6e?auto=format&fit=crop&w=400&q=80'}
                  alt="Collection Attachment"
                  className="w-full h-full object-cover"
                />
              </div>
            ) : (
              <div className="h-28 bg-white rounded-lg border border-dashed border-slate-300 flex items-center justify-center text-xs text-slate-400">
                No photo attached
              </div>
            )}
            <p className="text-[11px] text-slate-500 mt-2 text-center">Photo verification</p>
          </div>
        </div>

        {/* Notes */}
        {collection.notes && (
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-700">
            <span className="font-semibold text-slate-900">Notes: </span>
            {collection.notes}
          </div>
        )}

        {/* Modal Actions */}
        <div className="flex items-center justify-between pt-4 border-t border-slate-100">
          <div>
            {onDelete && (
              <button
                onClick={() => {
                  if (confirm(`Are you sure you want to delete slip ${collection.receipt_no}?`)) {
                    onDelete(collection.id);
                    onClose();
                  }
                }}
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 rounded-xl transition"
              >
                <Trash2 className="w-4 h-4" />
                <span>Delete Slip</span>
              </button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={triggerPrint}
              className="flex items-center gap-1.5 px-4 py-2 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-xl border border-slate-300 shadow-sm transition"
            >
              <Printer className="w-4 h-4" />
              <span>Print Slip</span>
            </button>
            <button
              onClick={onClose}
              className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl transition"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
};
