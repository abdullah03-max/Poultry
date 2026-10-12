// =============================================================================
// SHAN POULTRY PROTEIN - Monthly Register Receipt Customization Section
// Full visual editor for header, customer info, table, advance box, footer & live preview
// =============================================================================

import React, { useState, useId } from 'react';
import {
  MonthlyReceiptConfig,
  DEFAULT_MONTHLY_RECEIPT_CONFIG,
  mergeReceiptConfig,
} from '../../types/receiptConfig';
import {
  FileText,
  Eye,
  Save,
  RotateCcw,
  Check,
  Building,
  User,
  Table,
  Wallet,
  PenTool,
  Printer,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Info,
  Layers,
  ArrowRight,
} from 'lucide-react';

interface MonthlyReceiptSettingsSectionProps {
  initialConfig?: MonthlyReceiptConfig;
  onSave: (config: MonthlyReceiptConfig) => Promise<void>;
  saving?: boolean;
}

export const MonthlyReceiptSettingsSection: React.FC<MonthlyReceiptSettingsSectionProps> = ({
  initialConfig,
  onSave,
  saving = false,
}) => {
  const [config, setConfig] = useState<MonthlyReceiptConfig>(() =>
    mergeReceiptConfig(initialConfig)
  );
  const [activeSubTab, setActiveSubTab] = useState<
    'header' | 'customer' | 'table' | 'advance' | 'footer'
  >('header');
  const [previewScenario, setPreviewScenario] = useState<'active' | 'exhausted' | 'none'>('active');
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);

  // Update nested config safely
  const updateNested = <K extends keyof MonthlyReceiptConfig>(
    section: K,
    fields: Partial<MonthlyReceiptConfig[K]>
  ) => {
    setConfig(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        ...fields,
      },
    }));
  };

  const handleReset = () => {
    if (
      confirm(
        'کیا آپ واقعی تمام پرچی ترتیبات کو اصل فیکٹری ڈیفالٹس پر ری سیٹ کرنا چاہتے ہیں؟\n(Are you sure you want to reset receipt customization to default values?)'
      )
    ) {
      setConfig({ ...DEFAULT_MONTHLY_RECEIPT_CONFIG });
    }
  };

  const handleFormSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    try {
      await onSave(config);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 4000);
    } catch (err) {
      console.error('Failed to save receipt settings:', err);
    }
  };

  // Test Print in new window
  const handleTestPrint = () => {
    const printWindow = window.open('', '_blank', 'width=850,height=900');
    if (!printWindow) return;

    const sampleDate = new Date().toLocaleDateString('en-GB');
    const advBal = previewScenario === 'active' ? 2500 : previewScenario === 'exhausted' ? -3500 : 0;
    const totalAdv = previewScenario === 'none' ? 0 : 17000;
    const isExhausted = advBal <= 0 && previewScenario !== 'none';

    printWindow.document.write(`
      <!DOCTYPE html>
      <html dir="rtl" lang="ur">
      <head>
        <meta charset="utf-8" />
        <title>پرچی پیش منظر (Test Print)</title>
        <style>
          @page { size: A4 portrait; margin: 10mm 14mm; }
          * { box-sizing: border-box; }
          body { font-family: 'Segoe UI', Tahoma, Arial, sans-serif; margin: 0; padding: 15px; color: #0f172a; direction: rtl; background: #fff; font-size: 13px; }
          .header { text-align: center; border-bottom: 2px solid #0f172a; padding-bottom: 12px; margin-bottom: 16px; }
          .header h1 { margin: 0; font-size: 22px; color: #0f172a; font-family: monospace; font-weight: 900; }
          .header h2 { margin: 4px 0; font-size: 16px; color: #1d4ed8; }
          .header p { margin: 2px 0; font-size: 12px; color: #64748b; }
          .badge { display: inline-block; padding: 4px 12px; background: #eff6ff; border: 1px solid #bfdbfe; color: #1e40af; border-radius: 6px; font-weight: bold; font-family: monospace; font-size: 13px; }
          .customer-box { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 10px; padding: 12px; margin-bottom: 16px; font-size: 12px; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
          th { background: #f1f5f9; padding: 8px 12px; border: 1px solid #cbd5e1; font-size: 11px; font-weight: bold; text-align: right; }
          td { padding: 8px 12px; border: 1px solid #e2e8f0; font-size: 12px; text-align: right; }
          .num { font-family: monospace; font-weight: bold; }
          .tot-row { background: #eff6ff; font-weight: bold; border-top: 2px solid #94a3b8; }
          .advance-box { border: 2px solid #0284c7; border-radius: 10px; padding: 14px; margin-bottom: 16px; background: #f0f9ff; }
          .advance-box.exhausted { border-color: #e11d48; background: #fff1f2; }
          .adv-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; text-align: center; margin-bottom: 12px; }
          .adv-card { background: #fff; border: 1px solid #cbd5e1; border-radius: 8px; padding: 10px; }
          .adv-title { font-size: 11px; font-weight: bold; color: #64748b; margin-bottom: 4px; }
          .adv-val { font-size: 16px; font-weight: 900; font-family: monospace; }
          .formula-bar { background: #fff; border: 1px dashed #94a3b8; border-radius: 8px; padding: 8px 12px; text-align: center; font-weight: bold; font-size: 12px; margin-bottom: 12px; }
          .alert-banner { padding: 10px 14px; border-radius: 8px; font-size: 12px; font-weight: bold; line-height: 1.5; }
          .alert-green { background: #dcfce7; border: 1px solid #86efac; color: #14532d; }
          .alert-red { background: #ffe4e6; border: 1px solid #fca5a5; color: #881337; }
          .alert-blue { background: #e0f2fe; border: 1px solid #7dd3fc; color: #0369a1; }
          .signatures { margin-top: 35px; display: grid; grid-template-columns: 1fr 1fr; gap: 40px; text-align: center; font-size: 12px; }
          .sig-line { border-top: 1px solid #475569; padding-top: 6px; font-weight: bold; color: #334155; }
          .footer-note { margin-top: 25px; text-align: center; font-size: 10px; color: #94a3b8; border-top: 1px dashed #cbd5e1; padding-top: 8px; }
        </style>
      </head>
      <body>
        <div class="header">
          ${config.header.showLogo ? `<div style="margin-bottom: 8px;"><img src="${config.header.logoUrl || '/app_icon.png'}" alt="Logo" style="height: 52px; width: 52px; object-fit: contain; border-radius: 10px;" /></div>` : ''}
          <h1>${config.header.companyNameEn || 'SHAN POULTRY PROTEIN'}</h1>
          <h2>${config.header.companyNameUrdu || 'شان پولٹری پروٹین'} — ${config.header.receiptTitleUrdu || 'ماہانہ بل و کھاتہ رسید'}</h2>
          <p>${config.header.taglineEn || 'B2B Poultry Protein Materials'}${config.header.contactPhone ? ` • رابطہ: ${config.header.contactPhone}` : ''}</p>
          <div style="margin-top: 8px;">
            <span class="badge">${config.header.monthBadgeLabel || 'October 2026'}</span>
            ${config.header.showPrintDate ? `<span style="font-size: 11px; color: #64748b; margin-right: 15px;">${config.header.printDateLabel || 'تاریخ پرنٹ:'} ${sampleDate}</span>` : ''}
          </div>
        </div>

        ${config.customerInfo.showBox ? `
        <div class="customer-box">
          <div>
            <div><strong>${config.customerInfo.shopNameLabel}</strong> Shan Chiken Shop</div>
            <div><strong>${config.customerInfo.customerCodeLabel}</strong> <span class="num">CUST-001</span></div>
            ${config.customerInfo.showContactPerson ? `<div><strong>${config.customerInfo.contactPersonLabel}</strong> Shan</div>` : ''}
          </div>
          <div>
            ${config.customerInfo.showPhone ? `<div><strong>${config.customerInfo.phoneLabel}</strong> <span class="num">+92 3100609123</span></div>` : ''}
            ${config.customerInfo.showAreaAddress ? `<div><strong>${config.customerInfo.areaAddressLabel}</strong> General — gaggoo</div>` : ''}
            ${config.customerInfo.showActiveDays ? `<div><strong>${config.customerInfo.activeDaysLabel}</strong> <strong class="num">1 دن</strong></div>` : ''}
          </div>
        </div>
        ` : ''}

        ${config.weightTable.showTable ? `
        <table>
          <thead>
            <tr>
              <th style="width: 35%;">${config.weightTable.categoryColumnLabel}</th>
              <th style="text-align: right; width: 20%;">${config.weightTable.weightColumnLabel}</th>
              ${config.weightTable.showRates ? `<th style="text-align: right; width: 20%;">${config.weightTable.rateColumnLabel}</th>` : ''}
              <th style="text-align: right; width: 25%;">${config.weightTable.amountColumnLabel}</th>
            </tr>
          </thead>
          <tbody>
            ${config.weightTable.showCharbiRow ? `
            <tr>
              <td><strong>${config.weightTable.charbiRowLabel}</strong></td>
              <td class="num" style="text-align: right;">100.00 KG</td>
              ${config.weightTable.showRates ? `<td class="num" style="text-align: right;">55 PKR</td>` : ''}
              <td class="num" style="text-align: right; color: #047857;">Rs. 5,500</td>
            </tr>
            ` : ''}
            ${config.weightTable.showKacharaRow ? `
            <tr>
              <td><strong>${config.weightTable.kacharaRowLabel}</strong></td>
              <td class="num" style="text-align: right;">200.00 KG</td>
              ${config.weightTable.showRates ? `<td class="num" style="text-align: right;">45 PKR</td>` : ''}
              <td class="num" style="text-align: right; color: #b45309;">Rs. 9,000</td>
            </tr>
            ` : ''}
            <tr class="tot-row">
              <td><strong>${config.weightTable.grandTotalRowLabel}</strong></td>
              <td class="num" style="text-align: right; font-size: 14px; color: #1e40af;">300.00 KG</td>
              ${config.weightTable.showRates ? `<td style="text-align: right;">—</td>` : ''}
              <td class="num" style="text-align: right; font-size: 15px; color: #b45309;">Rs. 14,500</td>
            </tr>
          </tbody>
        </table>
        ` : ''}

        ${config.advanceBox.showSection ? `
        <div class="advance-box ${isExhausted ? 'exhausted' : ''}">
          <div style="font-weight: 900; font-size: 14px; color: #0f172a; margin-bottom: 10px; display: flex; justify-content: space-between;">
            <span>💵 ${config.advanceBox.sectionTitle}</span>
            <span style="font-size: 11px; font-weight: normal; color: #64748b;">${config.advanceBox.paymentMethodLabel} CASH • ${config.advanceBox.dateLabel} 2026-12-10</span>
          </div>
          <div class="adv-grid">
            <div class="adv-card">
              <div class="adv-title">${config.advanceBox.totalAdvanceCardTitle}</div>
              <div class="adv-val" style="color: #047857;">Rs. ${totalAdv.toLocaleString()}</div>
              <div style="font-size: 10px; color: #64748b; margin-top: 2px;">${config.advanceBox.totalAdvanceSubtext}</div>
            </div>
            <div class="adv-card">
              <div class="adv-title">${config.advanceBox.monthlyBillCardTitle}</div>
              <div class="adv-val" style="color: #b45309;">Rs. 14,500</div>
              <div style="font-size: 10px; color: #64748b; margin-top: 2px;">300.00 KG ${config.advanceBox.monthlyBillSubtext}</div>
            </div>
            <div class="adv-card" style="${isExhausted ? 'border-color: #f87171; background: #fff5f5;' : 'border-color: #86efac; background: #f0fdf4;'}">
              <div class="adv-title">${config.advanceBox.remainingAdvanceCardTitle}</div>
              <div class="adv-val" style="color: ${isExhausted ? '#be123c' : '#047857'};">Rs. ${advBal.toLocaleString()}</div>
              <div style="font-size: 10px; font-weight: bold; margin-top: 2px; color: ${isExhausted ? '#be123c' : '#047857'};">
                ${isExhausted ? config.advanceBox.advanceExhaustedBadge : config.advanceBox.advanceActiveBadge}
              </div>
            </div>
          </div>
          ${config.advanceBox.showFormulaBar ? `
          <div class="formula-bar">
            <span>حساب: [کل ایڈوانس: Rs. ${totalAdv.toLocaleString()}]</span>
            <span style="margin: 0 8px;">منہا (-)</span>
            <span>[ماہانہ بل: Rs. 14,500]</span>
            <span style="margin: 0 8px;">=</span>
            <span style="color: ${isExhausted ? '#be123c' : '#047857'};">[باقی ایڈوانس: Rs. ${advBal.toLocaleString()}]</span>
          </div>
          ` : ''}
          ${config.advanceBox.showReminderAlerts ? (
            previewScenario === 'active' ? `
            <div class="alert-banner alert-green">
              🟢 <strong>ایڈوانس ریمائنڈر:</strong> ${config.advanceBox.activeReminderText}
            </div>
            ` : previewScenario === 'exhausted' ? `
            <div class="alert-banner alert-red">
              🔴 <strong>${config.advanceBox.advanceExhaustedBadge}:</strong> ${config.advanceBox.exhaustedAlertText}
            </div>
            ` : `
            <div class="alert-banner alert-blue">
              ℹ️ <strong>نوٹس:</strong> ${config.advanceBox.noAdvanceNoticeText}
            </div>
            `
          ) : ''}
          ${config.advanceBox.showNotes ? `<div style="font-size: 11px; color: #64748b; margin-top: 8px;">${config.advanceBox.notesLabel} پیشگی ایڈوانس برائے ویسٹ وصولی</div>` : ''}
        </div>
        ` : ''}

        ${config.footer.showSignatures ? `
        <div class="signatures">
          <div>
            <div class="sig-line">${config.footer.customerSignatureLabel}</div>
            <p style="font-size: 11px; color: #64748b; margin-top: 4px;">Shan Chiken Shop</p>
          </div>
          <div>
            <div class="sig-line">${config.footer.authorizedSignatureLabel}</div>
            ${config.footer.authorizedPersonTitle ? `<p style="font-size: 11px; color: #64748b; margin-top: 4px;">${config.footer.authorizedPersonTitle}</p>` : ''}
          </div>
        </div>
        ` : ''}

        ${config.footer.additionalTerms ? `
        <div style="margin-top: 18px; padding: 8px 12px; background: #f8fafc; border: 1px dashed #cbd5e1; border-radius: 6px; font-size: 11px; color: #475569; text-align: center;">
          ${config.footer.additionalTerms}
        </div>
        ` : ''}

        ${config.footer.showCustomFooterNote && config.footer.customFooterText ? `
        <div class="footer-note">
          ${config.footer.customFooterText}
        </div>
        ` : ''}

        <script>
          window.onload = function() {
            setTimeout(function() { window.print(); }, 250);
          };
        </script>
      </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-7 shadow-card space-y-6 animate-fadeIn">
      {/* Header and Quick Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-5 border-b border-slate-200 gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
            <FileText className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-black text-slate-900 font-urdu tracking-tight">
                ماہانہ رجسٹر پرچی مکمل کسٹمائزیشن (Monthly Register Receipt Editor)
              </h3>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-200">
                100% ایڈمن کنٹرول
              </span>
            </div>
            <p className="text-xs text-slate-500 font-urdu mt-0.5">
              پرچی کا ہیڈر، لوگو، گاہک تفصیل، ریٹ ٹیبل، ایڈوانس کٹوتی، اور دستخط سب کچھ یہاں سے تبدیل کریں
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
          <button
            type="button"
            onClick={handleReset}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-slate-600 hover:text-rose-600 bg-slate-50 hover:bg-rose-50 border border-slate-200 rounded-xl transition font-urdu"
            title="فیکٹری ڈیفالٹ پر ری سیٹ کریں"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>ڈیفالٹ پر ری سیٹ</span>
          </button>
          <button
            type="button"
            onClick={handleTestPrint}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-xl transition font-urdu"
            title="پرنٹر پر ٹیسٹ پرنٹ پرچی دیکھیں"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>ٹیسٹ پرنٹ</span>
          </button>
          <button
            type="button"
            onClick={() => handleFormSubmit()}
            disabled={saving}
            className="flex items-center gap-1.5 px-5 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs font-bold rounded-xl shadow-xs transition active:scale-95 font-urdu disabled:opacity-50"
          >
            {saving ? <Check className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            <span>{saving ? 'محفوظ ہو رہا ہے...' : 'پرچی سیٹنگز محفوظ کریں'}</span>
          </button>
        </div>
      </div>

      {saveSuccess && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>✓ ماہانہ پرچی کی تمام ترتیبات Supabase ڈیٹا بیس میں کامیابی سے محفوظ ہو گئیں اور لائیو لاگو ہو چکی ہیں!</span>
        </div>
      )}

      {/* Main 2-Column Layout: Left Controls, Right Live Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Customization Form Tabs & Controls (7 cols) */}
        <div className="lg:col-span-7 space-y-5">
          {/* Sub Navigation Pills */}
          <div className="flex bg-slate-100 p-1.5 rounded-2xl gap-1 overflow-x-auto text-xs no-scrollbar">
            <button
              type="button"
              onClick={() => setActiveSubTab('header')}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl font-bold whitespace-nowrap transition font-urdu ${
                activeSubTab === 'header'
                  ? 'bg-white text-blue-700 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Building className="w-3.5 h-3.5" />
              <span>1. ہیڈر و لوگو</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveSubTab('customer')}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl font-bold whitespace-nowrap transition font-urdu ${
                activeSubTab === 'customer'
                  ? 'bg-white text-blue-700 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <User className="w-3.5 h-3.5" />
              <span>2. گاہک معلومات</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveSubTab('table')}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl font-bold whitespace-nowrap transition font-urdu ${
                activeSubTab === 'table'
                  ? 'bg-white text-blue-700 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Table className="w-3.5 h-3.5" />
              <span>3. وزن و ریٹ ٹیبل</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveSubTab('advance')}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl font-bold whitespace-nowrap transition font-urdu ${
                activeSubTab === 'advance'
                  ? 'bg-white text-blue-700 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Wallet className="w-3.5 h-3.5" />
              <span>4. ایڈوانس و کٹوتی</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveSubTab('footer')}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl font-bold whitespace-nowrap transition font-urdu ${
                activeSubTab === 'footer'
                  ? 'bg-white text-blue-700 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <PenTool className="w-3.5 h-3.5" />
              <span>5. دستخط و فوٹر</span>
            </button>
          </div>

          {/* TAB 1: HEADER & LOGO */}
          {activeSubTab === 'header' && (
            <div className="space-y-4 bg-slate-50/70 p-4 sm:p-5 rounded-2xl border border-slate-200">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                <h4 className="font-bold text-xs uppercase tracking-wider text-slate-800 font-urdu">
                  📋 ہیڈر اور برانڈنگ ترتیبات (Header Settings)
                </h4>
                <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-700 font-urdu">
                  <input
                    type="checkbox"
                    checked={config.header.showLogo}
                    onChange={e => updateNested('header', { showLogo: e.target.checked })}
                    className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4"
                  />
                  <span>لوگو تصویر دکھائیں</span>
                </label>
              </div>

              {config.header.showLogo && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1 font-urdu">
                    لوگو کا لنک / URL (Logo Image URL):
                  </label>
                  <input
                    type="text"
                    value={config.header.logoUrl}
                    onChange={e => updateNested('header', { logoUrl: e.target.value })}
                    placeholder="/app_icon.png"
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-mono text-slate-800 focus:outline-none focus:border-blue-500"
                  />
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    ڈیفالٹ ایپ لوگو کے لیے <code className="bg-slate-100 px-1 rounded">/app_icon.png</code> رہنے دیں، یا بیرونی امیج کا مکمل لنک پیسٹ کریں۔
                  </p>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1 font-urdu">
                    کمپنی کا انگریزی نام (English Name): *
                  </label>
                  <input
                    type="text"
                    value={config.header.companyNameEn}
                    onChange={e => updateNested('header', { companyNameEn: e.target.value })}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold font-mono text-slate-900 focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1 font-urdu">
                    کمپنی کا اردو نام (Urdu Name): *
                  </label>
                  <input
                    type="text"
                    value={config.header.companyNameUrdu}
                    onChange={e => updateNested('header', { companyNameUrdu: e.target.value })}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold font-urdu text-slate-900 focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1 font-urdu">
                    پرچی کا اردو عنوان (Receipt Urdu Title):
                  </label>
                  <input
                    type="text"
                    value={config.header.receiptTitleUrdu}
                    onChange={e => updateNested('header', { receiptTitleUrdu: e.target.value })}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold font-urdu text-slate-900 focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1 font-urdu">
                    سب ٹائٹل / ٹیگ لائن (English Tagline):
                  </label>
                  <input
                    type="text"
                    value={config.header.taglineEn}
                    onChange={e => updateNested('header', { taglineEn: e.target.value })}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1 font-urdu">
                    آفیشل رابطہ فون نمبر (Contact Phone):
                  </label>
                  <input
                    type="text"
                    value={config.header.contactPhone}
                    onChange={e => updateNested('header', { contactPhone: e.target.value })}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-mono font-bold text-slate-800 focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1 font-urdu">
                    پرنٹ تاریخ کا لیبل (Print Date Label):
                  </label>
                  <input
                    type="text"
                    value={config.header.printDateLabel}
                    onChange={e => updateNested('header', { printDateLabel: e.target.value })}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-urdu text-slate-800 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="pt-2 border-t border-slate-200 flex items-center justify-between">
                <span className="text-xs text-slate-600 font-urdu">پرچی پر پرنٹ تاریخ دکھائیں:</span>
                <input
                  type="checkbox"
                  checked={config.header.showPrintDate}
                  onChange={e => updateNested('header', { showPrintDate: e.target.checked })}
                  className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4"
                />
              </div>
            </div>
          )}

          {/* TAB 2: CUSTOMER INFORMATION */}
          {activeSubTab === 'customer' && (
            <div className="space-y-4 bg-slate-50/70 p-4 sm:p-5 rounded-2xl border border-slate-200">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                <h4 className="font-bold text-xs uppercase tracking-wider text-slate-800 font-urdu">
                  👤 گاہک انفارمیشن باکس (Customer Details Settings)
                </h4>
                <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-700 font-urdu">
                  <input
                    type="checkbox"
                    checked={config.customerInfo.showBox}
                    onChange={e => updateNested('customerInfo', { showBox: e.target.checked })}
                    className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4"
                  />
                  <span>گاہک باکس دکھائیں</span>
                </label>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1 font-urdu">
                    دکان / گاہک لیبل:
                  </label>
                  <input
                    type="text"
                    value={config.customerInfo.shopNameLabel}
                    onChange={e => updateNested('customerInfo', { shopNameLabel: e.target.value })}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-urdu text-slate-800 focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1 font-urdu">
                    کسٹمر کوڈ لیبل:
                  </label>
                  <input
                    type="text"
                    value={config.customerInfo.customerCodeLabel}
                    onChange={e => updateNested('customerInfo', { customerCodeLabel: e.target.value })}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-urdu text-slate-800 focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1 font-urdu">
                    رابطہ شخص لیبل:
                  </label>
                  <input
                    type="text"
                    value={config.customerInfo.contactPersonLabel}
                    onChange={e => updateNested('customerInfo', { contactPersonLabel: e.target.value })}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-urdu text-slate-800 focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1 font-urdu">
                    فون نمبر لیبل:
                  </label>
                  <input
                    type="text"
                    value={config.customerInfo.phoneLabel}
                    onChange={e => updateNested('customerInfo', { phoneLabel: e.target.value })}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-urdu text-slate-800 focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1 font-urdu">
                    علاقہ و پتہ لیبل:
                  </label>
                  <input
                    type="text"
                    value={config.customerInfo.areaAddressLabel}
                    onChange={e => updateNested('customerInfo', { areaAddressLabel: e.target.value })}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-urdu text-slate-800 focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1 font-urdu">
                    وصولی کے کل دن لیبل:
                  </label>
                  <input
                    type="text"
                    value={config.customerInfo.activeDaysLabel}
                    onChange={e => updateNested('customerInfo', { activeDaysLabel: e.target.value })}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-urdu text-slate-800 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Toggles */}
              <div className="pt-2 border-t border-slate-200 grid grid-cols-2 gap-2 text-xs">
                <label className="flex items-center gap-2 cursor-pointer font-urdu text-slate-700">
                  <input
                    type="checkbox"
                    checked={config.customerInfo.showContactPerson}
                    onChange={e => updateNested('customerInfo', { showContactPerson: e.target.checked })}
                    className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4"
                  />
                  <span>رابطہ شخص فیلڈ دکھائیں</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer font-urdu text-slate-700">
                  <input
                    type="checkbox"
                    checked={config.customerInfo.showPhone}
                    onChange={e => updateNested('customerInfo', { showPhone: e.target.checked })}
                    className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4"
                  />
                  <span>فون نمبر فیلڈ دکھائیں</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer font-urdu text-slate-700">
                  <input
                    type="checkbox"
                    checked={config.customerInfo.showAreaAddress}
                    onChange={e => updateNested('customerInfo', { showAreaAddress: e.target.checked })}
                    className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4"
                  />
                  <span>علاقہ اور پتہ فیلڈ دکھائیں</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer font-urdu text-slate-700">
                  <input
                    type="checkbox"
                    checked={config.customerInfo.showActiveDays}
                    onChange={e => updateNested('customerInfo', { showActiveDays: e.target.checked })}
                    className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4"
                  />
                  <span>وصولی کے کل دن دکھائیں</span>
                </label>
              </div>
            </div>
          )}

          {/* TAB 3: WEIGHT & RATES TABLE */}
          {activeSubTab === 'table' && (
            <div className="space-y-4 bg-slate-50/70 p-4 sm:p-5 rounded-2xl border border-slate-200">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                <h4 className="font-bold text-xs uppercase tracking-wider text-slate-800 font-urdu">
                  ⚖️ وزن، ریٹس اور کٹوتی ٹیبل (Weight Table Settings)
                </h4>
                <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-700 font-urdu">
                  <input
                    type="checkbox"
                    checked={config.weightTable.showTable}
                    onChange={e => updateNested('weightTable', { showTable: e.target.checked })}
                    className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4"
                  />
                  <span>ٹیبل دکھائیں</span>
                </label>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1 font-urdu">
                    کالم 1 عنوان (قسم / Category):
                  </label>
                  <input
                    type="text"
                    value={config.weightTable.categoryColumnLabel}
                    onChange={e => updateNested('weightTable', { categoryColumnLabel: e.target.value })}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-urdu text-slate-800 focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1 font-urdu">
                    کالم 2 عنوان (کل وزن / Weight):
                  </label>
                  <input
                    type="text"
                    value={config.weightTable.weightColumnLabel}
                    onChange={e => updateNested('weightTable', { weightColumnLabel: e.target.value })}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-urdu text-slate-800 focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1 font-urdu">
                    کالم 3 عنوان (ریٹ / Rate per KG):
                  </label>
                  <input
                    type="text"
                    value={config.weightTable.rateColumnLabel}
                    onChange={e => updateNested('weightTable', { rateColumnLabel: e.target.value })}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-urdu text-slate-800 focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1 font-urdu">
                    کالم 4 عنوان (کل رقم / Amount):
                  </label>
                  <input
                    type="text"
                    value={config.weightTable.amountColumnLabel}
                    onChange={e => updateNested('weightTable', { amountColumnLabel: e.target.value })}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-urdu text-slate-800 focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1 font-urdu">
                    چربی رو کا نام (Charbi Row):
                  </label>
                  <input
                    type="text"
                    value={config.weightTable.charbiRowLabel}
                    onChange={e => updateNested('weightTable', { charbiRowLabel: e.target.value })}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-urdu text-slate-800 focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1 font-urdu">
                    کچرا رو کا نام (Kachara Row):
                  </label>
                  <input
                    type="text"
                    value={config.weightTable.kacharaRowLabel}
                    onChange={e => updateNested('weightTable', { kacharaRowLabel: e.target.value })}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-urdu text-slate-800 focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1 font-urdu">
                    گرینڈ ٹوٹل رو کا نام (Grand Total Row):
                  </label>
                  <input
                    type="text"
                    value={config.weightTable.grandTotalRowLabel}
                    onChange={e => updateNested('weightTable', { grandTotalRowLabel: e.target.value })}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-urdu text-slate-800 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Toggles */}
              <div className="pt-2 border-t border-slate-200 grid grid-cols-3 gap-2 text-xs">
                <label className="flex items-center gap-2 cursor-pointer font-urdu text-slate-700">
                  <input
                    type="checkbox"
                    checked={config.weightTable.showCharbiRow}
                    onChange={e => updateNested('weightTable', { showCharbiRow: e.target.checked })}
                    className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4"
                  />
                  <span>چربی رو دکھائیں</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer font-urdu text-slate-700">
                  <input
                    type="checkbox"
                    checked={config.weightTable.showKacharaRow}
                    onChange={e => updateNested('weightTable', { showKacharaRow: e.target.checked })}
                    className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4"
                  />
                  <span>کچرا رو دکھائیں</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer font-urdu text-slate-700">
                  <input
                    type="checkbox"
                    checked={config.weightTable.showRates}
                    onChange={e => updateNested('weightTable', { showRates: e.target.checked })}
                    className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4"
                  />
                  <span>ریٹ فی کلو کالم دکھائیں</span>
                </label>
              </div>
            </div>
          )}

          {/* TAB 4: ADVANCE SETTLEMENT & REMINDER BOX */}
          {activeSubTab === 'advance' && (
            <div className="space-y-4 bg-slate-50/70 p-4 sm:p-5 rounded-2xl border border-slate-200">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                <h4 className="font-bold text-xs uppercase tracking-wider text-slate-800 font-urdu">
                  💵 پیشگی ایڈوانس و بل کٹوتی سیکشن (Advance Settlement & Reminder)
                </h4>
                <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-700 font-urdu">
                  <input
                    type="checkbox"
                    checked={config.advanceBox.showSection}
                    onChange={e => updateNested('advanceBox', { showSection: e.target.checked })}
                    className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4"
                  />
                  <span>ایڈوانس سیکشن دکھائیں</span>
                </label>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 font-urdu">
                  سیکشن کا ہیڈر عنوان:
                </label>
                <input
                  type="text"
                  value={config.advanceBox.sectionTitle}
                  onChange={e => updateNested('advanceBox', { sectionTitle: e.target.value })}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-urdu font-bold text-slate-900 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1 font-urdu">
                    کارڈ 1 عنوان (کل پیشگی ایڈوانس):
                  </label>
                  <input
                    type="text"
                    value={config.advanceBox.totalAdvanceCardTitle}
                    onChange={e => updateNested('advanceBox', { totalAdvanceCardTitle: e.target.value })}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-urdu text-slate-800 focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1 font-urdu">
                    کارڈ 2 عنوان (اس ماہ کا ویسٹ بل کٹوتی):
                  </label>
                  <input
                    type="text"
                    value={config.advanceBox.monthlyBillCardTitle}
                    onChange={e => updateNested('advanceBox', { monthlyBillCardTitle: e.target.value })}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-urdu text-slate-800 focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1 font-urdu">
                    کارڈ 3 عنوان (موجودہ باقی ایڈوانس بیلنس):
                  </label>
                  <input
                    type="text"
                    value={config.advanceBox.remainingAdvanceCardTitle}
                    onChange={e => updateNested('advanceBox', { remainingAdvanceCardTitle: e.target.value })}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-urdu text-slate-800 focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1 font-urdu">
                    ایڈوانس فعال بیج ٹیکسٹ:
                  </label>
                  <input
                    type="text"
                    value={config.advanceBox.advanceActiveBadge}
                    onChange={e => updateNested('advanceBox', { advanceActiveBadge: e.target.value })}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-urdu text-emerald-800 font-bold focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1 font-urdu">
                    ایڈوانس ختم بیج ٹیکسٹ:
                  </label>
                  <input
                    type="text"
                    value={config.advanceBox.advanceExhaustedBadge}
                    onChange={e => updateNested('advanceBox', { advanceExhaustedBadge: e.target.value })}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-urdu text-rose-700 font-bold focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1 font-urdu">
                    نوٹس / حوالہ لیبل:
                  </label>
                  <input
                    type="text"
                    value={config.advanceBox.notesLabel}
                    onChange={e => updateNested('advanceBox', { notesLabel: e.target.value })}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-urdu text-slate-800 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Textareas for Reminders */}
              <div className="space-y-3 pt-2 border-t border-slate-200">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1 font-urdu">
                    🟢 فعال ایڈوانس ریمائنڈر میسج (Active Advance Message):
                  </label>
                  <textarea
                    rows={2}
                    value={config.advanceBox.activeReminderText}
                    onChange={e => updateNested('advanceBox', { activeReminderText: e.target.value })}
                    className="w-full bg-white border border-slate-300 rounded-xl p-2.5 text-xs font-urdu text-slate-800 focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1 font-urdu">
                    🔴 ایڈوانس ختم الرٹ میسج (Exhausted Advance Message):
                  </label>
                  <textarea
                    rows={2}
                    value={config.advanceBox.exhaustedAlertText}
                    onChange={e => updateNested('advanceBox', { exhaustedAlertText: e.target.value })}
                    className="w-full bg-white border border-slate-300 rounded-xl p-2.5 text-xs font-urdu text-slate-800 focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1 font-urdu">
                    ℹ️ بغیر ایڈوانس نقد بل میسج (Standard Cash Bill Message):
                  </label>
                  <textarea
                    rows={2}
                    value={config.advanceBox.noAdvanceNoticeText}
                    onChange={e => updateNested('advanceBox', { noAdvanceNoticeText: e.target.value })}
                    className="w-full bg-white border border-slate-300 rounded-xl p-2.5 text-xs font-urdu text-slate-800 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Toggles */}
              <div className="pt-2 border-t border-slate-200 grid grid-cols-3 gap-2 text-xs">
                <label className="flex items-center gap-2 cursor-pointer font-urdu text-slate-700">
                  <input
                    type="checkbox"
                    checked={config.advanceBox.showFormulaBar}
                    onChange={e => updateNested('advanceBox', { showFormulaBar: e.target.checked })}
                    className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4"
                  />
                  <span>حساب فارمولا بار دکھائیں</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer font-urdu text-slate-700">
                  <input
                    type="checkbox"
                    checked={config.advanceBox.showReminderAlerts}
                    onChange={e => updateNested('advanceBox', { showReminderAlerts: e.target.checked })}
                    className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4"
                  />
                  <span>ریمائنڈر الرٹس دکھائیں</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer font-urdu text-slate-700">
                  <input
                    type="checkbox"
                    checked={config.advanceBox.showNotes}
                    onChange={e => updateNested('advanceBox', { showNotes: e.target.checked })}
                    className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4"
                  />
                  <span>نوٹس و حوالہ دکھائیں</span>
                </label>
              </div>
            </div>
          )}

          {/* TAB 5: SIGNATURES & FOOTER */}
          {activeSubTab === 'footer' && (
            <div className="space-y-4 bg-slate-50/70 p-4 sm:p-5 rounded-2xl border border-slate-200">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                <h4 className="font-bold text-xs uppercase tracking-wider text-slate-800 font-urdu">
                  ✍️ دستخط اور فوٹر ترتیبات (Signatures & Footer Settings)
                </h4>
                <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-700 font-urdu">
                  <input
                    type="checkbox"
                    checked={config.footer.showSignatures}
                    onChange={e => updateNested('footer', { showSignatures: e.target.checked })}
                    className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4"
                  />
                  <span>دستخط لائنز دکھائیں</span>
                </label>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1 font-urdu">
                    گاہک دستخط لیبل (Customer Signature Label):
                  </label>
                  <input
                    type="text"
                    value={config.footer.customerSignatureLabel}
                    onChange={e => updateNested('footer', { customerSignatureLabel: e.target.value })}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-urdu text-slate-800 focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1 font-urdu">
                    شان پولٹری دستخط لیبل (Authorized Signatory Label):
                  </label>
                  <input
                    type="text"
                    value={config.footer.authorizedSignatureLabel}
                    onChange={e => updateNested('footer', { authorizedSignatureLabel: e.target.value })}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-urdu text-slate-800 focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div className="sm:col-span-2">
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-bold text-slate-700 font-urdu">
                      دستخط کے نیچے نام / عہدہ (Authorized Signatory Person):
                    </label>
                    <span className="text-[10px] text-amber-700 font-bold font-urdu bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                      ڈیفالٹ: خالی (حاجی شان ہٹا دیا گیا ہے)
                    </span>
                  </div>
                  <input
                    type="text"
                    value={config.footer.authorizedPersonTitle}
                    onChange={e => updateNested('footer', { authorizedPersonTitle: e.target.value })}
                    placeholder="خالی چھوڑیں، یا اگر ضرورت ہو تو کوئی نیا نام/عہدہ لکھیں..."
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-urdu text-slate-800 focus:outline-none focus:border-blue-500"
                  />
                  <p className="text-[10px] text-slate-400 mt-1 font-urdu">
                    نوٹ: یہ باکس خالی رکھنے سے پرچی پر "حاجی شان / ایڈمنسٹریٹر" ہرگز پرنٹ نہیں ہوگا۔ اگر آپ اپنا کوئی خاص نام دینا چاہیں تو یہاں لکھ سکتے ہیں۔
                  </p>
                </div>

                <div className="sm:col-span-2">
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-bold text-slate-700 font-urdu">
                      کمپیوٹرائزڈ فوٹر نوٹ (Footer Note):
                    </label>
                    <label className="flex items-center gap-1.5 cursor-pointer text-xs font-bold text-slate-600 font-urdu">
                      <input
                        type="checkbox"
                        checked={config.footer.showCustomFooterNote}
                        onChange={e => updateNested('footer', { showCustomFooterNote: e.target.checked })}
                        className="rounded text-blue-600 focus:ring-blue-500 w-3.5 h-3.5"
                      />
                      <span>فوٹر نوٹ دکھائیں</span>
                    </label>
                  </div>
                  <input
                    type="text"
                    value={config.footer.customFooterText}
                    onChange={e => updateNested('footer', { customFooterText: e.target.value })}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-urdu text-slate-800 focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1 font-urdu">
                    اضافی شرائط یا نوٹ (Additional Terms / Notes - Optional):
                  </label>
                  <textarea
                    rows={2}
                    value={config.footer.additionalTerms}
                    onChange={e => updateNested('footer', { additionalTerms: e.target.value })}
                    placeholder="مثال: تمام بل ہر ماہ کی 5 تاریخ سے قبل ادا کرنا لازمی ہے۔۔۔"
                    className="w-full bg-white border border-slate-300 rounded-xl p-2.5 text-xs font-urdu text-slate-800 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right: Live Interactive Receipt Preview (5 cols) */}
        <div className="lg:col-span-5 space-y-3 sticky top-4">
          <div className="flex items-center justify-between bg-slate-100 p-2.5 rounded-2xl border border-slate-200">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 font-urdu">
              <Eye className="w-4 h-4 text-blue-600" />
              <span>لائیو پیش منظر (Live Receipt Preview)</span>
            </div>
            <div className="flex items-center gap-1 text-[10px] font-bold">
              <button
                type="button"
                onClick={() => setPreviewScenario('active')}
                className={`px-2 py-1 rounded-lg transition font-urdu ${
                  previewScenario === 'active'
                    ? 'bg-emerald-600 text-white shadow-2xs'
                    : 'bg-white text-slate-600 hover:bg-slate-50'
                }`}
                title="ایڈوانس باقی ہے"
              >
                فعال ایڈوانس
              </button>
              <button
                type="button"
                onClick={() => setPreviewScenario('exhausted')}
                className={`px-2 py-1 rounded-lg transition font-urdu ${
                  previewScenario === 'exhausted'
                    ? 'bg-rose-600 text-white shadow-2xs'
                    : 'bg-white text-slate-600 hover:bg-slate-50'
                }`}
                title="ایڈوانس ختم ہو چکا ہے"
              >
                ایڈوانس ختم
              </button>
              <button
                type="button"
                onClick={() => setPreviewScenario('none')}
                className={`px-2 py-1 rounded-lg transition font-urdu ${
                  previewScenario === 'none'
                    ? 'bg-blue-600 text-white shadow-2xs'
                    : 'bg-white text-slate-600 hover:bg-slate-50'
                }`}
                title="بغیر ایڈوانس نقد بل"
              >
                نقد بل
              </button>
            </div>
          </div>

          {/* Scaled Printable Preview Paper */}
          <div className="bg-white p-5 rounded-2xl border-2 border-slate-300 shadow-lg text-slate-900 text-xs space-y-3.5 max-h-[750px] overflow-y-auto no-scrollbar font-sans select-none">
            {/* Header */}
            <div className="text-center border-b-2 border-slate-900 pb-3 space-y-1">
              {config.header.showLogo && (
                <div className="flex justify-center mb-1">
                  <img
                    src={config.header.logoUrl || '/app_icon.png'}
                    alt="Logo"
                    className="w-11 h-11 object-contain rounded-xl border border-slate-200 p-0.5"
                    onError={e => {
                      (e.target as HTMLElement).style.display = 'none';
                    }}
                  />
                </div>
              )}
              <h1 className="text-base font-black font-mono tracking-tight text-slate-900 leading-tight">
                {config.header.companyNameEn || 'SHAN POULTRY PROTEIN'}
              </h1>
              <h2 className="text-xs font-bold text-blue-700 font-urdu leading-tight">
                {config.header.companyNameUrdu || 'شان پولٹری پروٹین'} — {config.header.receiptTitleUrdu || 'ماہانہ بل و کھاتہ رسید'}
              </h2>
              <p className="text-[10px] text-slate-500">
                {config.header.taglineEn || 'B2B Poultry Protein Materials'}{config.header.contactPhone ? ` • رابطہ: ${config.header.contactPhone}` : ''}
              </p>
              <div className="pt-1 flex items-center justify-center gap-2">
                <span className="px-2.5 py-0.5 bg-blue-50 border border-blue-200 text-blue-800 font-bold rounded text-[10px] font-mono">
                  {config.header.monthBadgeLabel || 'October 2026'}
                </span>
                {config.header.showPrintDate && (
                  <span className="text-[10px] text-slate-400 font-urdu">
                    {config.header.printDateLabel || 'تاریخ پرنٹ:'} {new Date().toLocaleDateString('en-GB')}
                  </span>
                )}
              </div>
            </div>

            {/* Customer Box */}
            {config.customerInfo.showBox && (
              <div className="grid grid-cols-2 gap-2 bg-slate-50 p-3 rounded-xl border border-slate-200 text-[11px] leading-tight">
                <div className="space-y-0.5">
                  <div>
                    <strong className="font-urdu">{config.customerInfo.shopNameLabel}</strong>{' '}
                    <span>Shan Chiken Shop</span>
                  </div>
                  <div>
                    <strong className="font-urdu">{config.customerInfo.customerCodeLabel}</strong>{' '}
                    <span className="font-mono font-bold">CUST-001</span>
                  </div>
                  {config.customerInfo.showContactPerson && (
                    <div>
                      <strong className="font-urdu">{config.customerInfo.contactPersonLabel}</strong>{' '}
                      <span>Shan</span>
                    </div>
                  )}
                </div>
                <div className="space-y-0.5">
                  {config.customerInfo.showPhone && (
                    <div>
                      <strong className="font-urdu">{config.customerInfo.phoneLabel}</strong>{' '}
                      <span className="font-mono">+92 3100609123</span>
                    </div>
                  )}
                  {config.customerInfo.showAreaAddress && (
                    <div>
                      <strong className="font-urdu">{config.customerInfo.areaAddressLabel}</strong>{' '}
                      <span>General — gaggoo</span>
                    </div>
                  )}
                  {config.customerInfo.showActiveDays && (
                    <div>
                      <strong className="font-urdu">{config.customerInfo.activeDaysLabel}</strong>{' '}
                      <strong className="font-mono text-slate-900">1 دن</strong>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Table */}
            {config.weightTable.showTable && (
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full text-[11px]">
                  <thead className="bg-slate-100 font-bold text-slate-700 text-[10px] border-b border-slate-200">
                    <tr>
                      <th className="py-1.5 px-2 text-right font-urdu">{config.weightTable.categoryColumnLabel}</th>
                      <th className="py-1.5 px-2 text-right font-urdu">{config.weightTable.weightColumnLabel}</th>
                      {config.weightTable.showRates && (
                        <th className="py-1.5 px-2 text-right font-urdu">{config.weightTable.rateColumnLabel}</th>
                      )}
                      <th className="py-1.5 px-2 text-right font-urdu">{config.weightTable.amountColumnLabel}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-mono">
                    {config.weightTable.showCharbiRow && (
                      <tr>
                        <td className="py-1.5 px-2 font-urdu font-bold text-slate-800">
                          {config.weightTable.charbiRowLabel}
                        </td>
                        <td className="py-1.5 px-2 text-right">KG 100.00</td>
                        {config.weightTable.showRates && <td className="py-1.5 px-2 text-right">PKR 55</td>}
                        <td className="py-1.5 px-2 text-right font-bold text-emerald-700">Rs. 5,500</td>
                      </tr>
                    )}
                    {config.weightTable.showKacharaRow && (
                      <tr>
                        <td className="py-1.5 px-2 font-urdu font-bold text-slate-800">
                          {config.weightTable.kacharaRowLabel}
                        </td>
                        <td className="py-1.5 px-2 text-right">KG 200.00</td>
                        {config.weightTable.showRates && <td className="py-1.5 px-2 text-right">PKR 45</td>}
                        <td className="py-1.5 px-2 text-right font-bold text-amber-700">Rs. 9,000</td>
                      </tr>
                    )}
                    <tr className="bg-blue-50/70 font-bold border-t-2 border-slate-300">
                      <td className="py-1.5 px-2 font-urdu text-slate-900 font-bold">
                        {config.weightTable.grandTotalRowLabel}
                      </td>
                      <td className="py-1.5 px-2 text-right text-blue-900">KG 300.00</td>
                      {config.weightTable.showRates && <td className="py-1.5 px-2 text-right text-slate-400">—</td>}
                      <td className="py-1.5 px-2 text-right text-amber-900 font-black">Rs. 14,500</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}

            {/* Advance Box */}
            {config.advanceBox.showSection && (
              <div
                className={`p-3 rounded-xl border text-[11px] space-y-2 ${
                  previewScenario === 'exhausted'
                    ? 'bg-rose-50 border-rose-300'
                    : 'bg-sky-50/70 border-sky-300'
                }`}
              >
                <div className="flex items-center justify-between pb-1.5 border-b border-slate-200">
                  <span className="font-black text-slate-900 font-urdu">
                    💵 {config.advanceBox.sectionTitle}
                  </span>
                  <span className="text-[9px] text-slate-500 font-mono">
                    {config.advanceBox.paymentMethodLabel} CASH • 2026-12-10
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-1.5 text-center">
                  <div className="bg-white p-2 rounded-lg border border-slate-200">
                    <div className="text-[9px] font-bold text-slate-500 font-urdu">{config.advanceBox.totalAdvanceCardTitle}</div>
                    <div className="text-xs font-mono font-black text-emerald-700 mt-0.5">
                      Rs. {previewScenario === 'none' ? '0' : '17,000'}
                    </div>
                  </div>
                  <div className="bg-white p-2 rounded-lg border border-slate-200">
                    <div className="text-[9px] font-bold text-slate-500 font-urdu">{config.advanceBox.monthlyBillCardTitle}</div>
                    <div className="text-xs font-mono font-black text-amber-700 mt-0.5">Rs. 14,500</div>
                  </div>
                  <div
                    className={`p-2 rounded-lg border ${
                      previewScenario === 'exhausted'
                        ? 'bg-rose-100 border-rose-300'
                        : 'bg-emerald-100 border-emerald-300'
                    }`}
                  >
                    <div className="text-[9px] font-bold text-slate-700 font-urdu">{config.advanceBox.remainingAdvanceCardTitle}</div>
                    <div
                      className={`text-xs font-mono font-black mt-0.5 ${
                        previewScenario === 'exhausted' ? 'text-rose-700' : 'text-emerald-800'
                      }`}
                    >
                      Rs. {previewScenario === 'active' ? '2,500' : previewScenario === 'exhausted' ? '-3,500' : '0'}
                    </div>
                    <span className="text-[8px] font-bold block font-urdu">
                      {previewScenario === 'exhausted'
                        ? config.advanceBox.advanceExhaustedBadge
                        : config.advanceBox.advanceActiveBadge}
                    </span>
                  </div>
                </div>

                {config.advanceBox.showFormulaBar && (
                  <div className="p-1.5 bg-white border border-dashed border-slate-300 rounded text-center text-[10px] font-mono font-bold text-slate-700">
                    [کل: Rs. {previewScenario === 'none' ? '0' : '17,000'}] - [بل: Rs. 14,500] = [باقی: Rs. {previewScenario === 'active' ? '2,500' : previewScenario === 'exhausted' ? '-3,500' : '0'}]
                  </div>
                )}

                {config.advanceBox.showReminderAlerts && (
                  <div
                    className={`p-2 rounded-lg text-[10px] leading-tight font-urdu ${
                      previewScenario === 'active'
                        ? 'bg-emerald-100 text-emerald-900 border border-emerald-200'
                        : previewScenario === 'exhausted'
                        ? 'bg-rose-100 text-rose-900 border border-rose-200'
                        : 'bg-blue-100 text-blue-900 border border-blue-200'
                    }`}
                  >
                    {previewScenario === 'active'
                      ? `🟢 ${config.advanceBox.activeReminderText}`
                      : previewScenario === 'exhausted'
                      ? `🔴 ${config.advanceBox.exhaustedAlertText}`
                      : `ℹ️ ${config.advanceBox.noAdvanceNoticeText}`}
                  </div>
                )}

                {config.advanceBox.showNotes && (
                  <div className="text-[9px] text-slate-500 font-urdu pt-0.5">
                    {config.advanceBox.notesLabel} پیشگی ایڈوانس برائے ویسٹ وصولی
                  </div>
                )}
              </div>
            )}

            {/* Signatures */}
            {config.footer.showSignatures && (
              <div className="pt-4 grid grid-cols-2 gap-4 text-center text-[10px]">
                <div>
                  <div className="border-t border-slate-600 pt-1 font-bold text-slate-800 font-urdu">
                    {config.footer.customerSignatureLabel}
                  </div>
                  <p className="text-[9px] text-slate-400 mt-0.5">Shan Chiken Shop</p>
                </div>
                <div>
                  <div className="border-t border-slate-600 pt-1 font-bold text-slate-800 font-urdu">
                    {config.footer.authorizedSignatureLabel}
                  </div>
                  {/* Clean: Only render if user customized it. Haji Shan is removed by default! */}
                  {config.footer.authorizedPersonTitle ? (
                    <p className="text-[9px] text-slate-500 mt-0.5 font-urdu">
                      {config.footer.authorizedPersonTitle}
                    </p>
                  ) : null}
                </div>
              </div>
            )}

            {/* Additional Terms */}
            {config.footer.additionalTerms && (
              <div className="p-2 bg-slate-50 border border-dashed border-slate-300 rounded text-[9px] text-slate-600 font-urdu text-center">
                {config.footer.additionalTerms}
              </div>
            )}

            {/* Footer Note */}
            {config.footer.showCustomFooterNote && config.footer.customFooterText && (
              <div className="pt-2 text-center text-[9px] text-slate-400 border-t border-dashed border-slate-200 font-urdu">
                {config.footer.customFooterText}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
