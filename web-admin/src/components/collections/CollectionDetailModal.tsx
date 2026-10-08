// =============================================================================
// SHAN POULTRY PROTEIN - Collection Detail Modal
// =============================================================================

import React from 'react';
import { Collection } from '../../types/database';
import { Modal } from '../common/Modal';
import { formatDate, formatTime, formatWeight, formatCurrency } from '../../utils/formatters';
import { Printer, Trash2, User, Phone, MapPin, Scale, Clock, FileText, MessageSquare } from 'lucide-react';
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

  const hasBreakdown = (collection.charbi_net != null && collection.charbi_net > 0) ||
                       (collection.kachara_net != null && collection.kachara_net > 0) ||
                       (collection.charbi_gross != null && collection.charbi_gross > 0) ||
                       (collection.kachara_gross != null && collection.kachara_gross > 0);

  const openWhatsApp = () => {
    const charbiGross = collection.charbi_gross ?? 0;
    const charbiTare = collection.charbi_tare ?? 0;
    const charbiNet = collection.charbi_net ?? 0;
    const charbiRate = collection.charbi_rate ?? 55;
    const charbiTotal = collection.charbi_total ?? Math.round(charbiNet * charbiRate);

    const kacharaGross = collection.kachara_gross ?? 0;
    const kacharaTare = collection.kachara_tare ?? 0;
    const kacharaNet = collection.kachara_net ?? (collection.charbi_net ? 0 : collection.total_net_weight);
    const kacharaRate = collection.kachara_rate ?? (collection.rate_per_kg || 45);
    const kacharaTotal = collection.kachara_total ?? Math.round(kacharaNet * kacharaRate);

    const receiptTitle =
      (typeof window !== 'undefined' ? localStorage.getItem('spp_receipt_title') : null) ||
      '🐔 SHAN POULTRY PROTEIN - رسید 🐔';

    let text = `*${receiptTitle}*\n`;
    text += `*شان پولٹری پروٹین - وصولی رسید*\n`;
    text += `────────────────────\n`;
    text += `*رسید نمبر (Slip #):* ${collection.receipt_no}\n`;
    text += `*دکان / گاہک (Shop):* ${collection.customer?.name || 'Customer'}\n`;
    if (collection.customer?.area) text += `*علاقہ (Area):* ${collection.customer?.area}\n`;
    text += `*تاریخ اور وقت:* ${formatDate(collection.collection_date)} ${formatTime(collection.collection_time)}\n`;
    text += `*کلیکٹر (Collector):* ${collection.worker?.full_name || 'System / Admin'}\n`;
    text += `────────────────────\n`;

    if (charbiGross > 0 || charbiNet > 0) {
      text += `*🟢 چربی وزن (Charbi Weight):*\n`;
      text += `• کل وزن (Gross): ${charbiGross} KG\n`;
      text += `• تار / برتن (Tare): ${charbiTare} KG\n`;
      text += `• خالص وزن (Net): ${charbiNet} KG\n`;
      text += `• ریٹ (Rate): Rs. ${charbiRate}/KG\n`;
      text += `• چربی بل: Rs. ${charbiTotal.toLocaleString()}\n`;
      text += `────────────────────\n`;
    }

    if (kacharaGross > 0 || kacharaNet > 0) {
      text += `*🟠 کچرا وزن (Kachara Weight):*\n`;
      text += `• کل وزن (Gross): ${kacharaGross} KG\n`;
      text += `• تار / برتن (Tare): ${kacharaTare} KG\n`;
      text += `• خالص وزن (Net): ${kacharaNet} KG\n`;
      text += `• ریٹ (Rate): Rs. ${kacharaRate}/KG\n`;
      text += `• کچرا بل: Rs. ${kacharaTotal.toLocaleString()}\n`;
      text += `────────────────────\n`;
    }

    if (!charbiNet && !kacharaNet && collection.total_net_weight > 0) {
      text += `*کل وزن (Gross):* ${collection.gross_weight} KG\n`;
      text += `*تار / برتن (Tare):* ${collection.tare_weight} KG\n`;
      text += `*خالص وزن (Net):* ${collection.total_net_weight} KG\n`;
      text += `*ریٹ (Rate):* Rs. ${collection.rate_per_kg}/KG\n`;
      text += `────────────────────\n`;
    }

    text += `*⚖️ کل خالص وزن (TOTAL NET):* ${collection.total_net_weight} KG\n`;
    text += `*💰 کل بل (TOTAL BILL): Rs. ${collection.total_amount.toLocaleString()}*\n`;
    text += `────────────────────\n`;
    if (collection.notes) text += `*نوٹ (Note):* ${collection.notes}\n`;
    const phoneSetting =
      (typeof window !== 'undefined' ? localStorage.getItem('spp_business_phone') : null) ||
      '0300-0000000';
    text += `Shan Contact: ${phoneSetting}\n`;

    let phone = (collection.customer?.phone || '').replace(/[^0-9]/g, '');
    if (phone.startsWith('03')) {
      phone = '92' + phone.substring(1);
    } else if (phone.startsWith('3') && phone.length === 10) {
      phone = '92' + phone;
    }

    const encoded = encodeURIComponent(text);
    const url = phone.length >= 10
      ? `https://api.whatsapp.com/send?phone=${phone}&text=${encoded}`
      : `https://api.whatsapp.com/send?text=${encoded}`;

    window.open(url, '_blank');
  };

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

          {hasBreakdown ? (
            <div className="space-y-3">
              {/* Charbi Card */}
              <div className="p-3.5 bg-emerald-50/60 rounded-xl border border-emerald-200">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-emerald-800 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-600"></span>
                    چربی وزن (Charbi Weight)
                  </span>
                  <span className="text-xs font-semibold text-emerald-700 font-mono">
                    Rs. {collection.charbi_rate || 55}/KG
                  </span>
                </div>
                <div className="grid grid-cols-4 gap-2 text-center text-xs">
                  <div className="bg-white/80 p-2 rounded-lg border border-emerald-100">
                    <span className="block text-[10px] text-slate-500 uppercase font-medium">Gross</span>
                    <span className="font-bold text-slate-800 font-mono">{formatWeight(collection.charbi_gross || 0)}</span>
                  </div>
                  <div className="bg-white/80 p-2 rounded-lg border border-emerald-100">
                    <span className="block text-[10px] text-slate-500 uppercase font-medium">Tare</span>
                    <span className="font-bold text-rose-600 font-mono">-{formatWeight(collection.charbi_tare || 0)}</span>
                  </div>
                  <div className="bg-white/80 p-2 rounded-lg border border-emerald-100">
                    <span className="block text-[10px] text-emerald-700 uppercase font-bold">Net</span>
                    <span className="font-black text-emerald-800 font-mono">{formatWeight(collection.charbi_net || 0)}</span>
                  </div>
                  <div className="bg-white/80 p-2 rounded-lg border border-emerald-100">
                    <span className="block text-[10px] text-emerald-700 uppercase font-bold">Subtotal</span>
                    <span className="font-black text-emerald-800 font-mono">Rs. {(collection.charbi_total ?? Math.round((collection.charbi_net || 0) * (collection.charbi_rate || 55))).toLocaleString()}</span>
                  </div>
                </div>
              </div>

              {/* Kachara Card */}
              <div className="p-3.5 bg-amber-50/60 rounded-xl border border-amber-200">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-amber-800 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-amber-600"></span>
                    کچرا وزن (Kachara Weight)
                  </span>
                  <span className="text-xs font-semibold text-amber-700 font-mono">
                    Rs. {collection.kachara_rate || 45}/KG
                  </span>
                </div>
                <div className="grid grid-cols-4 gap-2 text-center text-xs">
                  <div className="bg-white/80 p-2 rounded-lg border border-amber-100">
                    <span className="block text-[10px] text-slate-500 uppercase font-medium">Gross</span>
                    <span className="font-bold text-slate-800 font-mono">{formatWeight(collection.kachara_gross || 0)}</span>
                  </div>
                  <div className="bg-white/80 p-2 rounded-lg border border-amber-100">
                    <span className="block text-[10px] text-slate-500 uppercase font-medium">Tare</span>
                    <span className="font-bold text-rose-600 font-mono">-{formatWeight(collection.kachara_tare || 0)}</span>
                  </div>
                  <div className="bg-white/80 p-2 rounded-lg border border-amber-100">
                    <span className="block text-[10px] text-amber-700 uppercase font-bold">Net</span>
                    <span className="font-black text-amber-800 font-mono">{formatWeight(collection.kachara_net || 0)}</span>
                  </div>
                  <div className="bg-white/80 p-2 rounded-lg border border-amber-100">
                    <span className="block text-[10px] text-amber-700 uppercase font-bold">Subtotal</span>
                    <span className="font-black text-amber-800 font-mono">Rs. {(collection.kachara_total ?? Math.round((collection.kachara_net || 0) * (collection.kachara_rate || 45))).toLocaleString()}</span>
                  </div>
                </div>
              </div>

              {/* Totals Banner */}
              <div className="grid grid-cols-2 gap-3 text-center pt-1">
                <div className="p-3 bg-brand-50 rounded-xl border border-brand-200">
                  <p className="text-[10px] text-brand-700 uppercase font-bold">Total Net Weight</p>
                  <p className="text-xl font-black text-brand-800 font-mono mt-0.5">{formatWeight(collection.total_net_weight)}</p>
                </div>
                <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200">
                  <p className="text-[10px] text-emerald-700 uppercase font-bold">Total Bill</p>
                  <p className="text-xl font-black text-emerald-800 font-mono mt-0.5">{formatCurrency(collection.total_amount)}</p>
                </div>
              </div>
            </div>
          ) : (
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
          )}

          {/* Dynamic Weight Category Breakdown */}
          {collection.items && collection.items.length > 0 && !hasBreakdown && (
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
            {collection.attachments && collection.attachments.length > 0 && (collection.attachments[0].public_url || collection.attachments[0].file_path) ? (
              <div className="h-28 bg-slate-100 rounded-lg overflow-hidden border border-slate-200 flex items-center justify-center">
                <img
                  src={collection.attachments[0].public_url || collection.attachments[0].file_path}
                  alt="Collection Attachment"
                  className="w-full h-full object-cover cursor-pointer hover:opacity-90 transition"
                  onClick={() => {
                    const url = collection.attachments![0].public_url || collection.attachments![0].file_path;
                    if (url) window.open(url, '_blank');
                  }}
                  title="Click to view full photo"
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
        <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-4 border-t border-slate-100">
          <div>
            {onDelete && (
              <button
                onClick={() => {
                  if (confirm(`Are you sure you want to delete slip ${collection.receipt_no}?`)) {
                    onDelete(collection.id);
                    onClose();
                  }
                }}
                className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 rounded-xl transition"
              >
                <Trash2 className="w-4 h-4" />
                <span>Delete Slip</span>
              </button>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={openWhatsApp}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl shadow-sm transition"
              title="Share receipt via WhatsApp"
            >
              <MessageSquare className="w-4 h-4" />
              <span>WhatsApp Receipt</span>
            </button>
            <button
              onClick={triggerPrint}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-4 py-2 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-xl border border-slate-300 shadow-sm transition"
            >
              <Printer className="w-4 h-4" />
              <span>Print Slip</span>
            </button>
            <button
              onClick={onClose}
              className="flex-1 sm:flex-initial px-5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold rounded-xl border border-slate-300 transition text-center"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
};
