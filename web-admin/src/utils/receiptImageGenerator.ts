// =============================================================================
// SHAN POULTRY PROTEIN - High Resolution Receipt Image Generator & WhatsApp Sharer
// Renders professional collection invoice PNG on HTML5 Canvas & shares via Web Share API
// =============================================================================

import { OfflineCollectionItem } from '../mobile/mobileStorage';
import { Collection, Factory, FactoryTransaction } from '../types/database';
import { formatDate, formatCurrency } from './formatters';
import appIconSrc from '../assets/app_icon.png';

export interface ReceiptData {
  receipt_no: string;
  customer_name: string;
  customer_phone?: string | null;
  customer_area?: string | null;
  worker_name?: string | null;
  collection_date: string;
  collection_time?: string | null;
  charbi_gross?: number | null;
  charbi_tare?: number | null;
  charbi_net?: number | null;
  charbi_rate?: number | null;
  charbi_total?: number | null;
  kachara_gross?: number | null;
  kachara_tare?: number | null;
  kachara_net?: number | null;
  kachara_rate?: number | null;
  kachara_total?: number | null;
  gross_weight?: number;
  tare_weight?: number;
  total_net_weight: number;
  rate_per_kg?: number;
  total_amount: number;
  notes?: string | null;
  signature_base64?: string | null;
}

/**
 * Normalizes input slip to uniform ReceiptData
 */
export function normalizeSlipData(slip: OfflineCollectionItem | Collection | any): ReceiptData {
  const charbiGross = slip.charbi_gross ?? 0;
  const charbiTare = slip.charbi_tare ?? 0;
  const charbiNet = slip.charbi_net ?? 0;
  const charbiRate = slip.charbi_rate ?? 55;
  const charbiTotal = slip.charbi_total ?? Math.round(charbiNet * charbiRate);

  const kacharaGross = slip.kachara_gross ?? 0;
  const kacharaTare = slip.kachara_tare ?? 0;
  const kacharaNet = slip.kachara_net ?? 0;
  const kacharaRate = slip.kachara_rate ?? (slip.rate_per_kg || 45);
  const kacharaTotal = slip.kachara_total ?? Math.round(kacharaNet * kacharaRate);

  return {
    receipt_no: slip.receipt_no || 'SPP-000000',
    customer_name: slip.customer_name || slip.customer?.name || 'Customer Shop',
    customer_phone: slip.customer_phone || slip.customer?.phone || '',
    customer_area: slip.customer_area || slip.customer?.area || 'Burewala / Gaggoo Mandi',
    worker_name: slip.worker_name || slip.worker?.full_name || 'Field Collector',
    collection_date: slip.collection_date || new Date().toISOString().split('T')[0],
    collection_time: slip.collection_time || new Date().toTimeString().split(' ')[0],
    charbi_gross: charbiGross,
    charbi_tare: charbiTare,
    charbi_net: charbiNet,
    charbi_rate: charbiRate,
    charbi_total: charbiTotal,
    kachara_gross: kacharaGross,
    kachara_tare: kacharaTare,
    kachara_net: kacharaNet,
    kachara_rate: kacharaRate,
    kachara_total: kacharaTotal,
    gross_weight: slip.gross_weight || (charbiGross + kacharaGross),
    tare_weight: slip.tare_weight || (charbiTare + kacharaTare),
    total_net_weight: slip.total_net_weight || (charbiNet + kacharaNet),
    rate_per_kg: slip.rate_per_kg || kacharaRate,
    total_amount: slip.total_amount || (charbiTotal + kacharaTotal),
    notes: slip.notes || null,
    signature_base64: slip.signature_base64 || null,
  };
}

function dataURLToBlob(dataurl: string): Blob {
  const arr = dataurl.split(',');
  const mime = (arr[0].match(/:(.*?);/) || [])[1] || 'image/png';
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  return new Blob([u8arr], { type: mime });
}

/**
 * Helper to load an image asynchronously without blocking or throwing
 */
function loadImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise(resolve => {
    if (!src) return resolve(null);
    let done = false;
    const img = new Image();

    // Only set crossOrigin for remote absolute URLs, NEVER for data: or local /assets/ URLs
    if (src.startsWith('http:') || src.startsWith('https:')) {
      if (!src.includes('appassets.androidplatform.net') && !src.includes(window.location.hostname)) {
        img.crossOrigin = 'anonymous';
      }
    }

    const timer = setTimeout(() => {
      if (!done) {
        done = true;
        resolve(img.complete && img.naturalWidth > 0 ? img : null);
      }
    }, 600);

    img.onload = () => {
      if (!done) {
        done = true;
        clearTimeout(timer);
        resolve(img);
      }
    };

    img.onerror = () => {
      if (!done) {
        done = true;
        clearTimeout(timer);
        resolve(null);
      }
    };

    img.src = src;

    if (img.complete && img.naturalWidth > 0) {
      done = true;
      clearTimeout(timer);
      resolve(img);
    }
  });
}

/**
 * Generates an HTML5 Canvas receipt image and returns as a PNG Blob
 */
export async function generateReceiptImageBlob(rawSlip: OfflineCollectionItem | Collection | any): Promise<Blob> {
  const slip = normalizeSlipData(rawSlip);

  // Setup Canvas Dimensions (Crisp 2x resolution: 750px wide x 1150px high)
  const width = 750;
  const height = 1150;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Canvas 2D context not available');
  }

  // Pre-load app icon & signature if present
  const [logoImg, sigImg] = await Promise.all([
    loadImage(appIconSrc),
    slip.signature_base64 ? loadImage(slip.signature_base64) : Promise.resolve(null),
  ]);

  // 1. Background (Clean soft daylight paper background)
  ctx.fillStyle = '#F8FAFC'; // slate-50
  ctx.fillRect(0, 0, width, height);

  // 2. Receipt Card Container with rounded corners and border
  const margin = 25;
  const cardW = width - margin * 2;
  const cardH = height - margin * 2;
  const cardRadius = 24;

  ctx.save();
  ctx.shadowColor = 'rgba(15, 23, 42, 0.12)';
  ctx.shadowBlur = 24;
  ctx.shadowOffsetY = 12;
  ctx.fillStyle = '#FFFFFF';
  roundRect(ctx, margin, margin, cardW, cardH, cardRadius);
  ctx.fill();
  ctx.restore();

  // Subtle border
  ctx.strokeStyle = '#E2E8F0';
  ctx.lineWidth = 2;
  roundRect(ctx, margin, margin, cardW, cardH, cardRadius);
  ctx.stroke();

  // 3. Top Decorative Accent Bar (Poultry Brand Gold & Navy)
  ctx.save();
  roundRect(ctx, margin, margin, cardW, 10, { tl: cardRadius, tr: cardRadius, bl: 0, br: 0 });
  ctx.fillStyle = '#2563EB'; // brand blue
  ctx.fill();
  ctx.restore();

  // 4. Header Section: Logo & Titles
  let curY = 55;

  if (logoImg) {
    const logoSize = 64;
    const logoX = width / 2 - logoSize / 2;
    // Circular clipped logo with white background & border
    ctx.save();
    ctx.beginPath();
    ctx.arc(width / 2, curY + logoSize / 2, logoSize / 2, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();
    ctx.drawImage(logoImg, logoX, curY, logoSize, logoSize);
    ctx.restore();

    ctx.beginPath();
    ctx.arc(width / 2, curY + logoSize / 2, logoSize / 2, 0, Math.PI * 2);
    ctx.strokeStyle = '#CBD5E1';
    ctx.lineWidth = 2;
    ctx.stroke();

    curY += logoSize + 14;
  } else {
    curY += 20;
  }

  // Receipt Official Header / Title
  const receiptTitle =
    (typeof window !== 'undefined' ? localStorage.getItem('spp_receipt_title') : null) ||
    '🐔 SHAN POULTRY PROTEIN - رسید 🐔';

  ctx.textAlign = 'center';
  ctx.fillStyle = '#0F172A'; // slate-900
  ctx.font = 'bold 23px system-ui, -apple-system, sans-serif';
  ctx.fillText(receiptTitle, width / 2, curY);
  curY += 26;

  // Urdu Subtitle
  ctx.fillStyle = '#2563EB'; // brand blue
  ctx.font = 'bold 18px "Noto Nastaliq Urdu", "Jameel Noori Nastaleeq", system-ui, sans-serif';
  ctx.fillText('شان پولٹری پروٹین — آفیشل وصولی رسید', width / 2, curY);
  curY += 22;

  // Receipt Tag & Date Pill
  ctx.fillStyle = '#64748B'; // slate-500
  ctx.font = '13px system-ui, sans-serif';
  ctx.fillText('Official B2B Weigh-in Collection Receipt', width / 2, curY);
  curY += 28;

  // Slip Number Badge
  const badgeW = 280;
  const badgeH = 34;
  const badgeX = width / 2 - badgeW / 2;
  ctx.fillStyle = '#EFF6FF';
  roundRect(ctx, badgeX, curY, badgeW, badgeH, 10);
  ctx.fill();
  ctx.strokeStyle = '#BFDBFE';
  ctx.lineWidth = 1.5;
  roundRect(ctx, badgeX, curY, badgeW, badgeH, 10);
  ctx.stroke();

  ctx.fillStyle = '#1D4ED8';
  ctx.font = 'bold 15px monospace';
  ctx.fillText(slip.receipt_no, width / 2, curY + 22);
  curY += badgeH + 20;

  // Dashed separator line
  drawDashedLine(ctx, margin + 20, curY, width - margin - 20, curY);
  curY += 20;

  // 5. Customer & Meta Details (2 Columns)
  ctx.textAlign = 'left';
  const leftX = margin + 30;
  const rightX = width / 2 + 15;

  // Row 1: Customer Name & Date
  drawLabelValue(ctx, leftX, curY, 'گاہک / دکان (Shop):', slip.customer_name, '#0F172A', true);
  drawLabelValue(ctx, rightX, curY, 'تاریخ (Date):', `${slip.collection_date} ${slip.collection_time?.substring(0, 5) || ''}`);
  curY += 40;

  // Row 2: Area & Collector
  drawLabelValue(ctx, leftX, curY, 'علاقہ (Area):', slip.customer_area || 'Burewala');
  drawLabelValue(ctx, rightX, curY, 'کلیکٹر (Collector):', slip.worker_name || 'Staff');
  curY += 40;

  // Row 3: Phone (if available)
  if (slip.customer_phone) {
    drawLabelValue(ctx, leftX, curY, 'فون (Phone):', slip.customer_phone);
    curY += 36;
  }

  // 6. Weight Breakdown Cards (Charbi & Kachara)
  const hasCharbi = (slip.charbi_net || 0) > 0 || (slip.charbi_gross || 0) > 0;
  const hasKachara = (slip.kachara_net || 0) > 0 || (slip.kachara_gross || 0) > 0;

  if (hasCharbi || hasKachara) {
    const boxW = cardW - 40;
    const boxX = margin + 20;

    // Charbi Box (Emerald theme)
    if (hasCharbi) {
      const boxH = 96;
      ctx.fillStyle = '#ECFDF5'; // emerald-50
      roundRect(ctx, boxX, curY, boxW, boxH, 14);
      ctx.fill();
      ctx.strokeStyle = '#A7F3D0'; // emerald-200
      ctx.lineWidth = 1.5;
      roundRect(ctx, boxX, curY, boxW, boxH, 14);
      ctx.stroke();

      // Title header
      ctx.fillStyle = '#065F46'; // emerald-800
      ctx.font = 'bold 15px system-ui, sans-serif';
      ctx.fillText('🟢 چربی وزن (Charbi Weight)', boxX + 16, curY + 26);

      ctx.textAlign = 'right';
      ctx.font = 'bold 14px system-ui, sans-serif';
      ctx.fillText(`ریٹ: Rs. ${slip.charbi_rate}/KG`, boxX + boxW - 16, curY + 26);

      // Grid stats
      ctx.textAlign = 'left';
      ctx.fillStyle = '#475569';
      ctx.font = '13px system-ui, sans-serif';
      ctx.fillText(`Gross: ${slip.charbi_gross} KG`, boxX + 16, curY + 54);
      ctx.fillText(`Tare: -${slip.charbi_tare} KG`, boxX + 180, curY + 54);

      ctx.font = 'bold 14px system-ui, sans-serif';
      ctx.fillStyle = '#065F46';
      ctx.fillText(`خالص: ${slip.charbi_net} KG`, boxX + 330, curY + 54);

      ctx.textAlign = 'right';
      ctx.font = 'bold 15px system-ui, sans-serif';
      ctx.fillStyle = '#047857';
      ctx.fillText(`چربی بل: Rs. ${(slip.charbi_total || 0).toLocaleString()}`, boxX + boxW - 16, curY + 76);

      curY += boxH + 14;
    }

    // Kachara Box (Amber theme)
    if (hasKachara) {
      const boxH = 96;
      ctx.textAlign = 'left';
      ctx.fillStyle = '#FFFBEB'; // amber-50
      roundRect(ctx, boxX, curY, boxW, boxH, 14);
      ctx.fill();
      ctx.strokeStyle = '#FDE68A'; // amber-200
      ctx.lineWidth = 1.5;
      roundRect(ctx, boxX, curY, boxW, boxH, 14);
      ctx.stroke();

      // Title header
      ctx.fillStyle = '#92400E'; // amber-800
      ctx.font = 'bold 15px system-ui, sans-serif';
      ctx.fillText('🟠 کچرا وزن (Kachara Weight)', boxX + 16, curY + 26);

      ctx.textAlign = 'right';
      ctx.font = 'bold 14px system-ui, sans-serif';
      ctx.fillText(`ریٹ: Rs. ${slip.kachara_rate}/KG`, boxX + boxW - 16, curY + 26);

      // Grid stats
      ctx.textAlign = 'left';
      ctx.fillStyle = '#475569';
      ctx.font = '13px system-ui, sans-serif';
      ctx.fillText(`Gross: ${slip.kachara_gross} KG`, boxX + 16, curY + 54);
      ctx.fillText(`Tare: -${slip.kachara_tare} KG`, boxX + 180, curY + 54);

      ctx.font = 'bold 14px system-ui, sans-serif';
      ctx.fillStyle = '#92400E';
      ctx.fillText(`خالص: ${slip.kachara_net} KG`, boxX + 330, curY + 54);

      ctx.textAlign = 'right';
      ctx.font = 'bold 15px system-ui, sans-serif';
      ctx.fillStyle = '#B45309';
      ctx.fillText(`کچرا بل: Rs. ${(slip.kachara_total || 0).toLocaleString()}`, boxX + boxW - 16, curY + 76);

      curY += boxH + 16;
    }
  } else {
    // Single / Legacy Weight Display
    const boxW = cardW - 40;
    const boxH = 75;
    const boxX = margin + 20;

    ctx.textAlign = 'left';
    ctx.fillStyle = '#F8FAFC';
    roundRect(ctx, boxX, curY, boxW, boxH, 12);
    ctx.fill();
    ctx.strokeStyle = '#CBD5E1';
    ctx.stroke();

    ctx.fillStyle = '#475569';
    ctx.font = '13px system-ui, sans-serif';
    ctx.fillText(`Gross: ${slip.gross_weight} KG`, boxX + 16, curY + 30);
    ctx.fillText(`Tare: -${slip.tare_weight} KG`, boxX + 180, curY + 30);
    ctx.fillText(`Rate: Rs. ${slip.rate_per_kg}/KG`, boxX + 340, curY + 30);

    ctx.font = 'bold 15px system-ui, sans-serif';
    ctx.fillStyle = '#0F172A';
    ctx.fillText(`خالص وزن (Net): ${slip.total_net_weight} KG`, boxX + 16, curY + 58);

    curY += boxH + 16;
  }

  // 7. Grand Total Dark Executive Box
  const totalBoxW = cardW - 40;
  const totalBoxH = 100;
  const totalBoxX = margin + 20;

  ctx.fillStyle = '#0F172A'; // Slate-900 high contrast
  roundRect(ctx, totalBoxX, curY, totalBoxW, totalBoxH, 16);
  ctx.fill();

  // Total Net Weight Row
  ctx.textAlign = 'left';
  ctx.fillStyle = '#94A3B8'; // slate-400
  ctx.font = '13px system-ui, sans-serif';
  ctx.fillText('TOTAL NET WEIGHT (کل خالص وزن):', totalBoxX + 20, curY + 36);

  ctx.textAlign = 'right';
  ctx.fillStyle = '#60A5FA'; // blue-400
  ctx.font = 'bold 20px monospace';
  ctx.fillText(`${slip.total_net_weight} KG`, totalBoxX + totalBoxW - 20, curY + 36);

  // Divider
  ctx.strokeStyle = '#334155';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(totalBoxX + 16, curY + 52);
  ctx.lineTo(totalBoxX + totalBoxW - 16, curY + 52);
  ctx.stroke();

  // Total Bill Row
  ctx.textAlign = 'left';
  ctx.fillStyle = '#F8FAFC';
  ctx.font = 'bold 15px system-ui, sans-serif';
  ctx.fillText('TOTAL BILL (کل رقم):', totalBoxX + 20, curY + 82);

  ctx.textAlign = 'right';
  ctx.fillStyle = '#FBBF24'; // amber-400 gold
  ctx.font = 'bold 24px monospace';
  ctx.fillText(`Rs. ${slip.total_amount.toLocaleString()}`, totalBoxX + totalBoxW - 20, curY + 82);

  curY += totalBoxH + 16;

  // 8. Notes (if any)
  if (slip.notes) {
    ctx.textAlign = 'left';
    ctx.fillStyle = '#64748B';
    ctx.font = 'italic 12px system-ui, sans-serif';
    ctx.fillText(`نوٹ / Remarks: "${slip.notes}"`, margin + 25, curY + 12);
    curY += 24;
  }

  // 9. Customer Signature Section
  const sigBoxW = 240;
  const sigBoxH = 75;
  const sigBoxX = width - margin - sigBoxW - 20;

  ctx.textAlign = 'left';
  ctx.fillStyle = '#64748B';
  ctx.font = 'bold 11px system-ui, sans-serif';
  ctx.fillText('گاہک کے دستخط (Customer Signature):', sigBoxX, curY + 12);

  ctx.strokeStyle = '#CBD5E1';
  ctx.lineWidth = 1;
  ctx.fillStyle = '#FFFFFF';
  roundRect(ctx, sigBoxX, curY + 18, sigBoxW, sigBoxH, 8);
  ctx.fill();
  ctx.stroke();

  if (sigImg) {
    ctx.drawImage(sigImg, sigBoxX + 5, curY + 20, sigBoxW - 10, sigBoxH - 5);
  } else {
    ctx.textAlign = 'center';
    ctx.fillStyle = '#94A3B8';
    ctx.font = '12px system-ui, sans-serif';
    ctx.fillText('[ Verified Touch Signature ]', sigBoxX + sigBoxW / 2, curY + 18 + sigBoxH / 2 + 4);
  }

  // Collector stamp on the left
  const stampX = margin + 25;
  ctx.textAlign = 'left';
  ctx.fillStyle = '#64748B';
  ctx.font = 'bold 11px system-ui, sans-serif';
  ctx.fillText('تصدیق کنندہ (Verified Collector):', stampX, curY + 12);

  ctx.fillStyle = '#F1F5F9';
  roundRect(ctx, stampX, curY + 18, 220, sigBoxH, 8);
  ctx.fill();
  ctx.strokeStyle = '#CBD5E1';
  ctx.stroke();

  ctx.fillStyle = '#0F172A';
  ctx.font = 'bold 13px system-ui, sans-serif';
  ctx.fillText(slip.worker_name || 'Field Collector', stampX + 14, curY + 45);

  ctx.fillStyle = '#10B981';
  ctx.font = 'bold 11px system-ui, sans-serif';
  ctx.fillText('✓ DIGITAL RECORDED & SEALED', stampX + 14, curY + 68);

  curY += sigBoxH + 34;

  // 10. Footer Section
  drawDashedLine(ctx, margin + 20, curY, width - margin - 20, curY);
  curY += 22;

  const shanContact =
    (typeof window !== 'undefined' ? localStorage.getItem('spp_business_phone') : null) ||
    '0300-0000000';

  ctx.textAlign = 'center';
  ctx.fillStyle = '#475569';
  ctx.font = 'bold 13px system-ui, sans-serif';
  ctx.fillText(`Shan Contact: ${shanContact}`, width / 2, curY);
  curY += 20;

  ctx.fillStyle = '#94A3B8';
  ctx.font = '11px system-ui, sans-serif';
  ctx.fillText('Shan Poultry Protein ERP • Burewala, Gaggoo Mandi, Vehari', width / 2, curY);

  // Return canvas as PNG Blob with safe fallback
  return new Promise((resolve, reject) => {
    try {
      canvas.toBlob(blob => {
        if (blob) {
          resolve(blob);
        } else {
          try {
            const dataUrl = canvas.toDataURL('image/png');
            resolve(dataURLToBlob(dataUrl));
          } catch (e) {
            reject(new Error('Failed to generate PNG blob: ' + e));
          }
        }
      }, 'image/png');
    } catch (e) {
      try {
        const dataUrl = canvas.toDataURL('image/png');
        resolve(dataURLToBlob(dataUrl));
      } catch (err) {
        reject(new Error('Canvas export failed: ' + e));
      }
    }
  });
}

/**
 * Shares the actual receipt image to WhatsApp (using Web Share API on mobile, or download + chat fallback)
 */
export async function shareReceiptImage(
  rawSlip: OfflineCollectionItem | Collection | any,
  existingBlob?: Blob
): Promise<{ success: boolean; method: string }> {
  const slip = normalizeSlipData(rawSlip);
  const blob = existingBlob || await generateReceiptImageBlob(slip);
  const filename = `Receipt_${slip.receipt_no}.png`;

  // Clean phone number
  let phone = (slip.customer_phone || '').replace(/[^0-9]/g, '');
  if (phone.startsWith('03')) {
    phone = '92' + phone.substring(1);
  } else if (phone.startsWith('3') && phone.length === 10) {
    phone = '92' + phone;
  }

  const caption = `*🐔 SHAN POULTRY PROTEIN - رسید 🐔*\nرسید نمبر: ${slip.receipt_no}\nگاہک: ${slip.customer_name}\nخالص وزن: ${slip.total_net_weight} KG\nٹوٹل بل: Rs. ${slip.total_amount.toLocaleString()}`;

  // PRIORITY 1: Native Android Bridge (Inside Android APK WebView)
  if (
    typeof (window as any).AndroidBridge !== 'undefined' &&
    typeof (window as any).AndroidBridge.shareReceiptImage === 'function'
  ) {
    try {
      const base64Data = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
      (window as any).AndroidBridge.shareReceiptImage(base64Data, filename, phone, caption);
      return { success: true, method: 'android_bridge' };
    } catch (err) {
      console.error('AndroidBridge.shareReceiptImage failed:', err);
      throw err;
    }
  }

  // PRIORITY 2: Modern Mobile Browser Web Share API with Files
  const file = new File([blob], filename, { type: 'image/png' });
  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({
        files: [file],
        title: `Shan Poultry Slip ${slip.receipt_no}`,
        text: caption,
      });
      return { success: true, method: 'web_share' };
    } catch (err: any) {
      if (err.name === 'AbortError') {
        return { success: true, method: 'web_share' };
      }
      console.warn('navigator.share failed, using fallback:', err);
    }
  }

  // PRIORITY 3: Fallback for Desktop Browsers (Download image + Open WhatsApp Web)
  try {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  } catch (e) {
    console.warn('Auto download error:', e);
  }

  // Open customer WhatsApp chat
  const encodedCaption = encodeURIComponent(
    `${caption}\n(رسید کی تصویر محفوظ کر کے بھیج دی گئی ہے)`
  );
  const waUrl = phone.length >= 10
    ? `https://api.whatsapp.com/send?phone=${phone}&text=${encodedCaption}`
    : `https://api.whatsapp.com/send?text=${encodedCaption}`;

  window.open(waUrl, '_blank');
  return { success: true, method: 'download_and_whatsapp' };
}

/**
 * Direct file download helper
 */
export async function downloadReceiptImage(
  rawSlip: OfflineCollectionItem | Collection | any,
  existingBlob?: Blob
): Promise<void> {
  const slip = normalizeSlipData(rawSlip);
  const blob = existingBlob || await generateReceiptImageBlob(slip);
  const filename = `Receipt_${slip.receipt_no}.png`;

  // PRIORITY 1: Native Android Bridge (Direct Save to Public Pictures Gallery)
  if (
    typeof (window as any).AndroidBridge !== 'undefined' &&
    typeof (window as any).AndroidBridge.downloadReceiptImage === 'function'
  ) {
    try {
      const base64Data = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
      (window as any).AndroidBridge.downloadReceiptImage(base64Data, filename);
      return;
    } catch (err) {
      console.warn('AndroidBridge.downloadReceiptImage failed, falling back:', err);
    }
  }

  // PRIORITY 2: Browser download with DataURL & ObjectURL fallback
  try {
    const reader = new FileReader();
    const dataUrl = await new Promise<string>((resolve, reject) => {
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      if (document.body.contains(a)) document.body.removeChild(a);
    }, 1000);
  } catch {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      if (document.body.contains(a)) document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 2000);
  }
}

// -----------------------------------------------------------------------------
// Helper Drawing Functions
// -----------------------------------------------------------------------------

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  radius: number | { tl?: number; tr?: number; bl?: number; br?: number }
) {
  let r = typeof radius === 'number'
    ? { tl: radius, tr: radius, br: radius, bl: radius }
    : { tl: radius.tl || 0, tr: radius.tr || 0, br: radius.br || 0, bl: radius.bl || 0 };

  ctx.beginPath();
  ctx.moveTo(x + r.tl, y);
  ctx.lineTo(x + w - r.tr, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r.tr);
  ctx.lineTo(x + w, y + h - r.br);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r.br, y + h);
  ctx.lineTo(x + r.bl, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r.bl);
  ctx.lineTo(x, y + r.tl);
  ctx.quadraticCurveTo(x, y, x + r.tl, y);
  ctx.closePath();
}

function drawDashedLine(ctx: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number) {
  ctx.save();
  ctx.strokeStyle = '#CBD5E1';
  ctx.lineWidth = 1.5;
  ctx.setLineDash([6, 6]);
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
  ctx.restore();
}

function drawLabelValue(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  label: string,
  value: string,
  valueColor = '#0F172A',
  bold = false
) {
  ctx.font = '12px system-ui, sans-serif';
  ctx.fillStyle = '#64748B';
  ctx.fillText(label, x, y);

  ctx.font = bold ? 'bold 15px system-ui, sans-serif' : '14px system-ui, sans-serif';
  ctx.fillStyle = valueColor;
  ctx.fillText(value, x, y + 20);
}

/**
 * Copies a PNG Blob to the system clipboard (supported on modern Chrome/Edge/Firefox)
 */
export async function copyBlobToClipboard(blob: Blob): Promise<boolean> {
  try {
    if (navigator.clipboard && typeof (window as any).ClipboardItem !== 'undefined') {
      const item = new (window as any).ClipboardItem({ 'image/png': blob });
      await navigator.clipboard.write([item]);
      return true;
    }
  } catch (err) {
    console.warn('[Clipboard] Could not copy image blob:', err);
  }
  return false;
}

// =============================================================================
// FACTORY SLIP RECEIPT IMAGE GENERATOR
// =============================================================================

export interface FactorySlipImageParams {
  slip: FactoryTransaction;
  factory: Factory;
  previousBilled?: number;
  totalAdvance?: number;
}

/**
 * Generates an ultra-crisp, high-resolution PNG receipt image for a factory delivery slip
 */
export async function generateFactorySlipImageBlob(params: FactorySlipImageParams): Promise<Blob> {
  const { slip, factory } = params;

  const width = 750;
  const height = 1200;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D context not available');

  const logoImg = await loadImage(appIconSrc);

  // 1. Background
  ctx.fillStyle = '#F8FAFC';
  ctx.fillRect(0, 0, width, height);

  // 2. Card Container
  const margin = 24;
  const cardW = width - margin * 2;
  const cardH = height - margin * 2;
  const cardRadius = 24;

  ctx.save();
  ctx.shadowColor = 'rgba(15, 23, 42, 0.14)';
  ctx.shadowBlur = 24;
  ctx.shadowOffsetY = 12;
  ctx.fillStyle = '#FFFFFF';
  roundRect(ctx, margin, margin, cardW, cardH, cardRadius);
  ctx.fill();
  ctx.restore();

  // Subtle border
  ctx.strokeStyle = '#E2E8F0';
  ctx.lineWidth = 2;
  roundRect(ctx, margin, margin, cardW, cardH, cardRadius);
  ctx.stroke();

  // 3. Purple Accent Top Bar (Industrial B2B Brand)
  ctx.save();
  roundRect(ctx, margin, margin, cardW, 12, { tl: cardRadius, tr: cardRadius, bl: 0, br: 0 });
  ctx.fillStyle = '#7C3AED'; // purple-600
  ctx.fill();
  ctx.restore();

  // 4. Header: Logo, Company Name & Urdu Subtitle
  let curY = 54;
  if (logoImg) {
    const logoSize = 62;
    const logoX = width / 2 - logoSize / 2;
    ctx.save();
    ctx.beginPath();
    ctx.arc(width / 2, curY + logoSize / 2, logoSize / 2, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();
    ctx.drawImage(logoImg, logoX, curY, logoSize, logoSize);
    ctx.restore();

    ctx.beginPath();
    ctx.arc(width / 2, curY + logoSize / 2, logoSize / 2, 0, Math.PI * 2);
    ctx.strokeStyle = '#CBD5E1';
    ctx.lineWidth = 2;
    ctx.stroke();
    curY += logoSize + 14;
  } else {
    curY += 24;
  }

  const receiptTitle =
    (typeof window !== 'undefined' ? localStorage.getItem('spp_receipt_title') : null) ||
    '🐔 SHAN POULTRY PROTEIN - رسید 🐔';

  ctx.textAlign = 'center';
  ctx.fillStyle = '#0F172A';
  ctx.font = 'bold 23px system-ui, -apple-system, sans-serif';
  ctx.fillText(receiptTitle, width / 2, curY);
  curY += 25;

  ctx.fillStyle = '#7C3AED';
  ctx.font = 'bold 18px "Noto Nastaliq Urdu", "Jameel Noori Nastaleeq", system-ui, sans-serif';
  ctx.fillText('شان پولٹری پروٹین — فیکٹری سپلائی رسید', width / 2, curY);
  curY += 20;

  ctx.fillStyle = '#64748B';
  ctx.font = '12px system-ui, sans-serif';
  ctx.fillText('Official Factory Weigh-in & Delivery Slip', width / 2, curY);
  curY += 26;

  // 5. Slip Number & Date Badge
  const badgeW = 460;
  const badgeH = 34;
  const badgeX = width / 2 - badgeW / 2;
  ctx.save();
  ctx.fillStyle = '#F5F3FF';
  roundRect(ctx, badgeX, curY, badgeW, badgeH, 12);
  ctx.fill();
  ctx.strokeStyle = '#DDD6FE';
  ctx.lineWidth = 1.5;
  roundRect(ctx, badgeX, curY, badgeW, badgeH, 12);
  ctx.stroke();
  ctx.restore();

  ctx.textAlign = 'center';
  ctx.fillStyle = '#5B21B6';
  ctx.font = 'bold 13px system-ui, sans-serif';
  ctx.fillText(`انوائس #: ${slip.invoice_no}  •  تاریخ: ${formatDate(slip.transaction_date)}`, width / 2, curY + 22);
  curY += badgeH + 20;

  // 6. Factory & Vehicle Information Card
  const infoX = margin + 20;
  const infoW = cardW - 40;
  const infoH = 104;

  ctx.save();
  ctx.fillStyle = '#F8FAFC';
  roundRect(ctx, infoX, curY, infoW, infoH, 16);
  ctx.fill();
  ctx.strokeStyle = '#E2E8F0';
  ctx.lineWidth = 1.5;
  roundRect(ctx, infoX, curY, infoW, infoH, 16);
  ctx.stroke();
  ctx.restore();

  ctx.textAlign = 'left';
  // Factory Name
  ctx.font = 'bold 17px system-ui, sans-serif';
  ctx.fillStyle = '#0F172A';
  ctx.fillText(`خریدار فیکٹری: ${factory.name}`, infoX + 18, curY + 28);

  ctx.font = 'bold 12px monospace';
  ctx.fillStyle = '#7C3AED';
  ctx.fillText(`[${factory.factory_code}]`, infoX + infoW - 90, curY + 28);

  // Line 2: Contact, Phone & Area
  ctx.font = '13px system-ui, sans-serif';
  ctx.fillStyle = '#475569';
  ctx.fillText(
    `رابطہ کار: ${factory.contact_person || '—'}  |  فون: ${factory.phone}  |  شہر: ${factory.area}`,
    infoX + 18,
    curY + 58
  );

  // Line 3: Vehicle & Driver
  ctx.font = '13px system-ui, sans-serif';
  ctx.fillStyle = '#64748B';
  ctx.fillText(
    `گاڑی نمبر: ${slip.vehicle_no || '—'}  |  ڈرائیور: ${slip.driver_name || '—'}  |  پتہ: ${factory.address || '—'}`,
    infoX + 18,
    curY + 86
  );
  curY += infoH + 18;

  // 7. Charbi & Kachara Breakdown (Two Columns)
  const colW = (infoW - 16) / 2;
  const colH = 175;

  const cWeight = Number(slip.charbi_weight || 0);
  const cRate = Number(slip.charbi_rate || factory.rate_charbi || 0);
  const cTotal = Number(slip.charbi_total || Math.round(cWeight * cRate));

  const kWeight = Number(slip.kachara_weight || 0);
  const kRate = Number(slip.kachara_rate || factory.rate_kachara || 0);
  const kTotal = Number(slip.kachara_total || Math.round(kWeight * kRate));

  // Left Column: Charbi (Emerald)
  const leftX = infoX;
  ctx.save();
  ctx.fillStyle = '#ECFDF5';
  roundRect(ctx, leftX, curY, colW, colH, 16);
  ctx.fill();
  ctx.strokeStyle = '#A7F3D0';
  ctx.lineWidth = 1.5;
  roundRect(ctx, leftX, curY, colW, colH, 16);
  ctx.stroke();
  ctx.restore();

  ctx.fillStyle = '#065F46';
  ctx.font = 'bold 15px system-ui, sans-serif';
  ctx.fillText('🟢 چربی سپلائی وزن و ریٹ', leftX + 16, curY + 30);

  ctx.fillStyle = '#047857';
  ctx.font = 'bold 28px monospace';
  ctx.fillText(`${cWeight.toFixed(2)} KG`, leftX + 16, curY + 74);

  ctx.fillStyle = '#065F46';
  ctx.font = 'bold 14px system-ui, sans-serif';
  ctx.fillText(`خریداری ریٹ: Rs. ${cRate} / KG`, leftX + 16, curY + 110);

  ctx.fillStyle = '#064E3B';
  ctx.font = 'bold 17px monospace';
  ctx.fillText(`چربی رقم: Rs. ${cTotal.toLocaleString()}`, leftX + 16, curY + 146);

  // Right Column: Kachara (Amber)
  const rightX = leftX + colW + 16;
  ctx.save();
  ctx.fillStyle = '#FFFBEB';
  roundRect(ctx, rightX, curY, colW, colH, 16);
  ctx.fill();
  ctx.strokeStyle = '#FDE68A';
  ctx.lineWidth = 1.5;
  roundRect(ctx, rightX, curY, colW, colH, 16);
  ctx.stroke();
  ctx.restore();

  ctx.fillStyle = '#92400E';
  ctx.font = 'bold 15px system-ui, sans-serif';
  ctx.fillText('🟠 کچرا سپلائی وزن و ریٹ', rightX + 16, curY + 30);

  ctx.fillStyle = '#B45309';
  ctx.font = 'bold 28px monospace';
  ctx.fillText(`${kWeight.toFixed(2)} KG`, rightX + 16, curY + 74);

  ctx.fillStyle = '#92400E';
  ctx.font = 'bold 14px system-ui, sans-serif';
  ctx.fillText(`خریداری ریٹ: Rs. ${kRate} / KG`, rightX + 16, curY + 110);

  ctx.fillStyle = '#78350F';
  ctx.font = 'bold 17px monospace';
  ctx.fillText(`کچرا رقم: Rs. ${kTotal.toLocaleString()}`, rightX + 16, curY + 146);

  curY += colH + 16;

  // 8. Slip Grand Totals Card (Blue)
  const totW = Number(slip.total_weight || (cWeight + kWeight));
  const totAmt = Number(slip.total_amount || (cTotal + kTotal));

  const totalH = 68;
  ctx.save();
  ctx.fillStyle = '#EFF6FF';
  roundRect(ctx, infoX, curY, infoW, totalH, 16);
  ctx.fill();
  ctx.strokeStyle = '#BFDBFE';
  ctx.lineWidth = 2;
  roundRect(ctx, infoX, curY, infoW, totalH, 16);
  ctx.stroke();
  ctx.restore();

  ctx.fillStyle = '#1E40AF';
  ctx.font = 'bold 16px system-ui, sans-serif';
  ctx.fillText(`⚖️ کل سپلائی وزن: ${totW.toFixed(2)} KG`, infoX + 18, curY + 41);

  ctx.textAlign = 'right';
  ctx.fillStyle = '#1D4ED8';
  ctx.font = 'bold 22px monospace';
  ctx.fillText(`اس پرچی کا بل: Rs. ${totAmt.toLocaleString()}`, infoX + infoW - 18, curY + 42);
  ctx.textAlign = 'left';

  curY += totalH + 16;

  // 9. Factory Advance Khata & Net Remaining Balance Box
  const facAdv = params.totalAdvance !== undefined ? params.totalAdvance : Number(factory.advance_amount || 0);
  const prevBill = params.previousBilled || 0;
  const cumulativeDelivered = prevBill + totAmt;
  const remAdvance = facAdv - cumulativeDelivered;
  const hasCredit = remAdvance >= 0;

  const advH = 175;
  ctx.save();
  ctx.fillStyle = hasCredit ? '#F0FDF4' : '#FEF2F2';
  roundRect(ctx, infoX, curY, infoW, advH, 18);
  ctx.fill();
  ctx.strokeStyle = hasCredit ? '#86EFAC' : '#FCA5A5';
  ctx.lineWidth = 2;
  roundRect(ctx, infoX, curY, infoW, advH, 18);
  ctx.stroke();
  ctx.restore();

  ctx.fillStyle = hasCredit ? '#065F46' : '#991B1B';
  ctx.font = 'bold 15px system-ui, sans-serif';
  ctx.fillText('📊 فیکٹری ایڈوانس و کھاتہ پوزیشن (Factory Advance Ledger):', infoX + 18, curY + 30);

  // 3 Columns inside advance box
  const subColW = (infoW - 36) / 3;

  // Sub 1: Advance Pool
  ctx.fillStyle = '#64748B';
  ctx.font = '12px system-ui, sans-serif';
  ctx.fillText('وصول شدہ ایڈوانس:', infoX + 18, curY + 62);
  ctx.fillStyle = '#5B21B6';
  ctx.font = 'bold 18px monospace';
  ctx.fillText(`Rs. ${facAdv.toLocaleString()}`, infoX + 18, curY + 86);

  // Sub 2: Total Delivered (including this slip)
  ctx.fillStyle = '#64748B';
  ctx.font = '12px system-ui, sans-serif';
  ctx.fillText('کل سپلائی شدہ مالیت:', infoX + 18 + subColW, curY + 62);
  ctx.fillStyle = '#1D4ED8';
  ctx.font = 'bold 18px monospace';
  ctx.fillText(`Rs. ${cumulativeDelivered.toLocaleString()}`, infoX + 18 + subColW, curY + 86);

  // Sub 3: Net Remaining Advance
  ctx.fillStyle = '#64748B';
  ctx.font = '12px system-ui, sans-serif';
  ctx.fillText(hasCredit ? 'صافی بقایا ایڈوانس:' : 'فیکٹری کے ذمے بقایا:', infoX + 18 + subColW * 2, curY + 62);
  ctx.fillStyle = hasCredit ? '#047857' : '#B91C1C';
  ctx.font = 'bold 20px monospace';
  ctx.fillText(
    hasCredit ? `+Rs. ${remAdvance.toLocaleString()}` : `-Rs. ${Math.abs(remAdvance).toLocaleString()}`,
    infoX + 18 + subColW * 2,
    curY + 86
  );

  // Advance Status Banner at bottom of card
  const statusBannerY = curY + 116;
  ctx.save();
  ctx.fillStyle = hasCredit ? '#DCFCE7' : '#FEE2E2';
  roundRect(ctx, infoX + 12, statusBannerY, infoW - 24, 42, 10);
  ctx.fill();
  ctx.restore();

  ctx.textAlign = 'center';
  ctx.fillStyle = hasCredit ? '#15803D' : '#B91C1C';
  ctx.font = 'bold 14px system-ui, sans-serif';
  ctx.fillText(
    hasCredit
      ? `✓ اس سپلائی کے بعد فیکٹری کا Rs. ${remAdvance.toLocaleString()} ایڈوانس ابھی باقی ہے (Credit Remaining)`
      : `⚠️ فیکٹری کا ایڈوانس ختم ہو چکا ہے! فیکٹری پر Rs. ${Math.abs(remAdvance).toLocaleString()} واجب الادا ہے`,
    width / 2,
    statusBannerY + 26
  );
  ctx.textAlign = 'left';

  curY += advH + 16;

  // 10. Notes & Remarks
  if (slip.notes) {
    ctx.fillStyle = '#475569';
    ctx.font = '12px system-ui, sans-serif';
    ctx.fillText(`نوٹ: ${slip.notes}`, infoX + 4, curY + 14);
    curY += 24;
  }

  // 11. Signatures
  curY += 14;
  drawDashedLine(ctx, margin + 40, curY, width - margin - 40, curY);
  curY += 24;

  const sigW = 200;
  // Left: Driver / Transporter
  drawDashedLine(ctx, margin + 50, curY + 36, margin + 50 + sigW, curY + 36);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#64748B';
  ctx.font = '12px system-ui, sans-serif';
  ctx.fillText('ترسیل کنندہ / ڈرائیور دستخط', margin + 50 + sigW / 2, curY + 54);

  // Right: Factory Receiver
  drawDashedLine(ctx, width - margin - 50 - sigW, curY + 36, width - margin - 50, curY + 36);
  ctx.fillText('فیکٹری وصول کنندہ مہر و دستخط', width - margin - 50 - sigW / 2, curY + 54);

  curY += 76;

  // 12. Footer
  drawDashedLine(ctx, margin + 20, curY, width - margin - 20, curY);
  curY += 20;

  const shanContact =
    (typeof window !== 'undefined' ? localStorage.getItem('spp_business_phone') : null) ||
    '0300-0000000';

  ctx.textAlign = 'center';
  ctx.fillStyle = '#475569';
  ctx.font = 'bold 13px system-ui, sans-serif';
  ctx.fillText(`Shan Poultry Contact: ${shanContact} • تصدیق شدہ کمپیوٹرائزڈ سپلائی رسید`, width / 2, curY);
  curY += 18;

  ctx.fillStyle = '#94A3B8';
  ctx.font = '11px system-ui, sans-serif';
  ctx.fillText('Shan Poultry Protein ERP • Burewala, Vehari, Lahore, Punjab', width / 2, curY);

  return new Promise((resolve, reject) => {
    try {
      canvas.toBlob(blob => {
        if (blob) resolve(blob);
        else {
          const dataUrl = canvas.toDataURL('image/png');
          resolve(dataURLToBlob(dataUrl));
        }
      }, 'image/png');
    } catch (e) {
      try {
        const dataUrl = canvas.toDataURL('image/png');
        resolve(dataURLToBlob(dataUrl));
      } catch (err) {
        reject(new Error('Canvas export failed: ' + e));
      }
    }
  });
}

// =============================================================================
// FACTORY FULL STATEMENT IMAGE GENERATOR
// =============================================================================

export interface FactoryStatementImageParams {
  factory: Factory;
  transactions: FactoryTransaction[];
}

/**
 * Generates an ultra-crisp, high-resolution PNG statement image for a factory's full ledger
 */
export async function generateFactoryStatementImageBlob(params: FactoryStatementImageParams): Promise<Blob> {
  const { factory, transactions } = params;

  const width = 880;
  const numRows = Math.min(transactions.length, 25);
  const height = Math.max(900, 680 + Math.max(numRows, 1) * 44);

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D context not available');

  const logoImg = await loadImage(appIconSrc);

  // Background
  ctx.fillStyle = '#F8FAFC';
  ctx.fillRect(0, 0, width, height);

  // Card Container
  const margin = 24;
  const cardW = width - margin * 2;
  const cardH = height - margin * 2;
  const cardRadius = 24;

  ctx.save();
  ctx.shadowColor = 'rgba(15, 23, 42, 0.14)';
  ctx.shadowBlur = 24;
  ctx.shadowOffsetY = 12;
  ctx.fillStyle = '#FFFFFF';
  roundRect(ctx, margin, margin, cardW, cardH, cardRadius);
  ctx.fill();
  ctx.restore();

  ctx.strokeStyle = '#E2E8F0';
  ctx.lineWidth = 2;
  roundRect(ctx, margin, margin, cardW, cardH, cardRadius);
  ctx.stroke();

  // Purple Top Bar
  ctx.save();
  roundRect(ctx, margin, margin, cardW, 12, { tl: cardRadius, tr: cardRadius, bl: 0, br: 0 });
  ctx.fillStyle = '#6D28D9';
  ctx.fill();
  ctx.restore();

  // Header
  let curY = 54;
  if (logoImg) {
    const logoSize = 60;
    const logoX = width / 2 - logoSize / 2;
    ctx.save();
    ctx.beginPath();
    ctx.arc(width / 2, curY + logoSize / 2, logoSize / 2, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();
    ctx.drawImage(logoImg, logoX, curY, logoSize, logoSize);
    ctx.restore();

    ctx.beginPath();
    ctx.arc(width / 2, curY + logoSize / 2, logoSize / 2, 0, Math.PI * 2);
    ctx.strokeStyle = '#CBD5E1';
    ctx.lineWidth = 2;
    ctx.stroke();
    curY += logoSize + 14;
  } else {
    curY += 24;
  }

  const receiptTitle =
    (typeof window !== 'undefined' ? localStorage.getItem('spp_receipt_title') : null) ||
    '🐔 SHAN POULTRY PROTEIN 🐔';

  ctx.textAlign = 'center';
  ctx.fillStyle = '#0F172A';
  ctx.font = 'bold 24px system-ui, -apple-system, sans-serif';
  ctx.fillText(receiptTitle, width / 2, curY);
  curY += 26;

  ctx.fillStyle = '#6D28D9';
  ctx.font = 'bold 19px "Noto Nastaliq Urdu", "Jameel Noori Nastaleeq", system-ui, sans-serif';
  ctx.fillText('فیکٹری کھاتہ مکمل اسٹیٹمنٹ و سپلائی لیجر', width / 2, curY);
  curY += 20;

  ctx.fillStyle = '#64748B';
  ctx.font = '12px system-ui, sans-serif';
  ctx.fillText('Official Factory Account Statement & Delivery Ledger', width / 2, curY);
  curY += 24;

  // Factory Info Card
  const infoX = margin + 20;
  const infoW = cardW - 40;
  const infoH = 80;

  ctx.save();
  ctx.fillStyle = '#F8FAFC';
  roundRect(ctx, infoX, curY, infoW, infoH, 14);
  ctx.fill();
  ctx.strokeStyle = '#E2E8F0';
  ctx.lineWidth = 1.5;
  roundRect(ctx, infoX, curY, infoW, infoH, 14);
  ctx.stroke();
  ctx.restore();

  ctx.textAlign = 'left';
  ctx.font = 'bold 17px system-ui, sans-serif';
  ctx.fillStyle = '#0F172A';
  ctx.fillText(`خریدار فیکٹری: ${factory.name}`, infoX + 16, curY + 28);

  ctx.font = 'bold 12px monospace';
  ctx.fillStyle = '#6D28D9';
  ctx.fillText(`[${factory.factory_code}]`, infoX + infoW - 100, curY + 28);

  ctx.font = '13px system-ui, sans-serif';
  ctx.fillStyle = '#475569';
  ctx.fillText(
    `رابطہ کار: ${factory.contact_person || '—'}  |  فون: ${factory.phone}  |  شہر: ${factory.area}  |  تاریخ اسٹیٹمنٹ: ${formatDate(new Date().toISOString())}`,
    infoX + 16,
    curY + 56
  );
  curY += infoH + 16;

  // 3 Summary Badges
  const fAdv = Number(factory.advance_amount || 0);
  const totBilled = transactions.reduce((acc, t) => acc + (t.total_amount || 0), 0);
  const totWeight = transactions.reduce((acc, t) => acc + (t.total_weight || 0), 0);
  const totCharbi = transactions.reduce((acc, t) => acc + (t.charbi_weight || 0), 0);
  const totKachara = transactions.reduce((acc, t) => acc + (t.kachara_weight || 0), 0);
  const remAdvance = fAdv - totBilled;
  const hasCredit = remAdvance >= 0;

  const badgeBoxW = (infoW - 24) / 3;
  const badgeBoxH = 75;

  // Badge 1: Advance
  ctx.save();
  ctx.fillStyle = '#F5F3FF';
  roundRect(ctx, infoX, curY, badgeBoxW, badgeBoxH, 14);
  ctx.fill();
  ctx.strokeStyle = '#DDD6FE';
  ctx.lineWidth = 1.5;
  roundRect(ctx, infoX, curY, badgeBoxW, badgeBoxH, 14);
  ctx.stroke();
  ctx.restore();

  ctx.fillStyle = '#6D28D9';
  ctx.font = 'bold 12px system-ui, sans-serif';
  ctx.fillText('فیکٹری ایڈوانس رقم', infoX + 14, curY + 24);
  ctx.font = 'bold 20px monospace';
  ctx.fillText(`Rs. ${fAdv.toLocaleString()}`, infoX + 14, curY + 54);

  // Badge 2: Total Delivered
  const b2X = infoX + badgeBoxW + 12;
  ctx.save();
  ctx.fillStyle = '#EFF6FF';
  roundRect(ctx, b2X, curY, badgeBoxW, badgeBoxH, 14);
  ctx.fill();
  ctx.strokeStyle = '#BFDBFE';
  ctx.lineWidth = 1.5;
  roundRect(ctx, b2X, curY, badgeBoxW, badgeBoxH, 14);
  ctx.stroke();
  ctx.restore();

  ctx.fillStyle = '#1D4ED8';
  ctx.font = 'bold 12px system-ui, sans-serif';
  ctx.fillText(`کل سپلائی بل (${transactions.length} پرچیاں)`, b2X + 14, curY + 24);
  ctx.font = 'bold 20px monospace';
  ctx.fillText(`Rs. ${totBilled.toLocaleString()}`, b2X + 14, curY + 54);

  // Badge 3: Net Remaining Advance
  const b3X = b2X + badgeBoxW + 12;
  ctx.save();
  ctx.fillStyle = hasCredit ? '#F0FDF4' : '#FEF2F2';
  roundRect(ctx, b3X, curY, badgeBoxW, badgeBoxH, 14);
  ctx.fill();
  ctx.strokeStyle = hasCredit ? '#86EFAC' : '#FCA5A5';
  ctx.lineWidth = 1.5;
  roundRect(ctx, b3X, curY, badgeBoxW, badgeBoxH, 14);
  ctx.stroke();
  ctx.restore();

  ctx.fillStyle = hasCredit ? '#047857' : '#B91C1C';
  ctx.font = 'bold 12px system-ui, sans-serif';
  ctx.fillText(hasCredit ? 'صافی بقایا ایڈوانس (کریڈٹ)' : 'بقایا واجب الادا', b3X + 14, curY + 24);
  ctx.font = 'bold 20px monospace';
  ctx.fillText(
    hasCredit ? `+Rs. ${remAdvance.toLocaleString()}` : `-Rs. ${Math.abs(remAdvance).toLocaleString()}`,
    b3X + 14,
    curY + 54
  );

  curY += badgeBoxH + 18;

  // Slips Table
  const thH = 34;
  ctx.save();
  ctx.fillStyle = '#F1F5F9';
  roundRect(ctx, infoX, curY, infoW, thH, { tl: 10, tr: 10, bl: 0, br: 0 });
  ctx.fill();
  ctx.restore();

  ctx.fillStyle = '#334155';
  ctx.font = 'bold 11px system-ui, sans-serif';

  const colPositions = [
    { label: '#', x: infoX + 10, align: 'left' },
    { label: 'تاریخ', x: infoX + 38, align: 'left' },
    { label: 'انوائس #', x: infoX + 120, align: 'left' },
    { label: 'گاڑی / ڈرائیور', x: infoX + 225, align: 'left' },
    { label: 'چربی (KG @ Rate = Rs)', x: infoX + 375, align: 'left' },
    { label: 'کچرا (KG @ Rate = Rs)', x: infoX + 540, align: 'left' },
    { label: 'کل وزن', x: infoX + 700, align: 'right' },
    { label: 'بل رقم (PKR)', x: infoX + infoW - 12, align: 'right' },
  ];

  colPositions.forEach(cp => {
    ctx.textAlign = cp.align as CanvasTextAlign;
    ctx.fillText(cp.label, cp.x, curY + 21);
  });
  curY += thH;

  const rowH = 38;
  transactions.slice(0, 25).forEach((tx, idx) => {
    ctx.fillStyle = idx % 2 === 0 ? '#FFFFFF' : '#F8FAFC';
    ctx.fillRect(infoX, curY, infoW, rowH);

    ctx.strokeStyle = '#E2E8F0';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(infoX, curY + rowH);
    ctx.lineTo(infoX + infoW, curY + rowH);
    ctx.stroke();

    ctx.fillStyle = '#0F172A';
    ctx.font = '12px monospace';

    // Index
    ctx.textAlign = 'left';
    ctx.fillText(`${idx + 1}`, infoX + 10, curY + 24);

    // Date
    ctx.font = '11px system-ui, sans-serif';
    ctx.fillText(formatDate(tx.transaction_date), infoX + 38, curY + 24);

    // Invoice
    ctx.font = 'bold 12px monospace';
    ctx.fillStyle = '#6D28D9';
    ctx.fillText(tx.invoice_no, infoX + 120, curY + 24);

    // Vehicle
    ctx.font = '11px system-ui, sans-serif';
    ctx.fillStyle = '#475569';
    ctx.fillText(tx.vehicle_no || '—', infoX + 225, curY + 24);

    // Charbi
    ctx.fillStyle = '#065F46';
    ctx.font = 'bold 11px monospace';
    ctx.fillText(`${tx.charbi_weight}k @${tx.charbi_rate}=${(tx.charbi_total || 0).toLocaleString()}`, infoX + 375, curY + 24);

    // Kachara
    ctx.fillStyle = '#92400E';
    ctx.fillText(`${tx.kachara_weight}k @${tx.kachara_rate}=${(tx.kachara_total || 0).toLocaleString()}`, infoX + 540, curY + 24);

    // Net Weight
    ctx.textAlign = 'right';
    ctx.fillStyle = '#0F172A';
    ctx.font = 'bold 12px monospace';
    ctx.fillText(`${tx.total_weight} KG`, infoX + 700, curY + 24);

    // Total Amount
    ctx.fillStyle = '#1D4ED8';
    ctx.fillText(`Rs. ${(tx.total_amount || 0).toLocaleString()}`, infoX + infoW - 12, curY + 24);

    curY += rowH;
  });

  if (transactions.length === 0) {
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(infoX, curY, infoW, 40);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#94A3B8';
    ctx.font = '12px system-ui, sans-serif';
    ctx.fillText('کوئی سپلائی پرچی موجود نہیں', width / 2, curY + 25);
    curY += 40;
  }

  // Summary Card at Bottom
  curY += 14;
  const sumH = 70;
  ctx.save();
  ctx.fillStyle = '#F8FAFC';
  roundRect(ctx, infoX, curY, infoW, sumH, 14);
  ctx.fill();
  ctx.strokeStyle = '#CBD5E1';
  ctx.lineWidth = 1.5;
  roundRect(ctx, infoX, curY, infoW, sumH, 14);
  ctx.stroke();
  ctx.restore();

  ctx.textAlign = 'left';
  ctx.fillStyle = '#334155';
  ctx.font = 'bold 13px system-ui, sans-serif';
  ctx.fillText(
    `کل سپلائی خلاصہ: چربی: ${totCharbi.toFixed(2)} KG  |  کچرا: ${totKachara.toFixed(2)} KG  |  کل وزن: ${totWeight.toFixed(2)} KG`,
    infoX + 16,
    curY + 28
  );

  ctx.fillStyle = '#0F172A';
  ctx.font = 'bold 14px system-ui, sans-serif';
  ctx.fillText(
    `کل سپلائی بل: Rs. ${totBilled.toLocaleString()}  |  ایڈوانس: Rs. ${fAdv.toLocaleString()}  |  ${hasCredit ? 'صافی بقایا ایڈوانس:' : 'بقایا واجب الادا:'} `,
    infoX + 16,
    curY + 52
  );

  ctx.fillStyle = hasCredit ? '#047857' : '#B91C1C';
  ctx.font = 'bold 16px monospace';
  ctx.fillText(
    hasCredit ? `+Rs. ${remAdvance.toLocaleString()}` : `-Rs. ${Math.abs(remAdvance).toLocaleString()}`,
    infoX + infoW - 180,
    curY + 52
  );

  curY += sumH + 18;

  // Signatures
  drawDashedLine(ctx, margin + 40, curY, width - margin - 40, curY);
  curY += 24;

  const sigW = 220;
  drawDashedLine(ctx, margin + 50, curY + 36, margin + 50 + sigW, curY + 36);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#64748B';
  ctx.font = '12px system-ui, sans-serif';
  ctx.fillText('شان پولٹری پروٹین مہر و دستخط', margin + 50 + sigW / 2, curY + 54);

  drawDashedLine(ctx, width - margin - 50 - sigW, curY + 36, width - margin - 50, curY + 36);
  ctx.fillText('فیکٹری مجاز نمائندہ مہر و دستخط', width - margin - 50 - sigW / 2, curY + 54);

  curY += 76;

  // Footer
  drawDashedLine(ctx, margin + 20, curY, width - margin - 20, curY);
  curY += 20;

  const shanContact =
    (typeof window !== 'undefined' ? localStorage.getItem('spp_business_phone') : null) ||
    '0300-0000000';

  ctx.textAlign = 'center';
  ctx.fillStyle = '#475569';
  ctx.font = 'bold 13px system-ui, sans-serif';
  ctx.fillText(`Shan Poultry Contact: ${shanContact} • آفیشل فیکٹری کھاتہ لیجر اسٹیٹمنٹ`, width / 2, curY);
  curY += 18;

  ctx.fillStyle = '#94A3B8';
  ctx.font = '11px system-ui, sans-serif';
  ctx.fillText('Shan Poultry Protein ERP • Burewala, Vehari, Lahore, Punjab', width / 2, curY);

  return new Promise((resolve, reject) => {
    try {
      canvas.toBlob(blob => {
        if (blob) resolve(blob);
        else {
          const dataUrl = canvas.toDataURL('image/png');
          resolve(dataURLToBlob(dataUrl));
        }
      }, 'image/png');
    } catch (e) {
      try {
        const dataUrl = canvas.toDataURL('image/png');
        resolve(dataURLToBlob(dataUrl));
      } catch (err) {
        reject(new Error('Canvas export failed: ' + e));
      }
    }
  });
}

// =============================================================================
// SHARE HELPERS (IMAGE BLOB + CLIPBOARD + WHATSAPP + DOWNLOAD)
// =============================================================================

export interface ShareImageResult {
  blob: Blob;
  url: string;
  copied: boolean;
  filename: string;
  phone: string;
  caption: string;
}

/**
 * Shares a factory delivery slip as an actual PNG image
 */
export async function shareFactorySlipImage(params: FactorySlipImageParams): Promise<ShareImageResult> {
  const blob = await generateFactorySlipImageBlob(params);
  const filename = `Slip_${params.slip.invoice_no}.png`;
  const url = URL.createObjectURL(blob);

  let phone = (params.factory.whatsapp_no || params.factory.phone || '').replace(/[^0-9]/g, '');
  if (phone.startsWith('03')) phone = '92' + phone.substring(1);
  else if (phone.startsWith('3') && phone.length === 10) phone = '92' + phone;

  const cWeight = Number(params.slip.charbi_weight || 0);
  const kWeight = Number(params.slip.kachara_weight || 0);
  const totWeight = Number(params.slip.total_weight || cWeight + kWeight);
  const totAmt = Number(params.slip.total_amount || 0);
  const facAdv = params.totalAdvance !== undefined ? params.totalAdvance : Number(params.factory.advance_amount || 0);
  const prevBill = params.previousBilled || 0;
  const remAdvance = facAdv - (prevBill + totAmt);

  const caption = `*🐔 SHAN POULTRY PROTEIN - رسید 🐔*
*انوائس #:* ${params.slip.invoice_no}
*تاریخ:* ${formatDate(params.slip.transaction_date)}
*فیکٹری:* ${params.factory.name} (${params.factory.area})
*چربی وزن:* ${cWeight} KG @ Rs. ${params.slip.charbi_rate} = Rs. ${(params.slip.charbi_total || 0).toLocaleString()}
*کچرا وزن:* ${kWeight} KG @ Rs. ${params.slip.kachara_rate} = Rs. ${(params.slip.kachara_total || 0).toLocaleString()}
*کل سپلائی وزن:* ${totWeight} KG
*کل رقم بل:* Rs. ${totAmt.toLocaleString()}
*فیکٹری ایڈوانس:* Rs. ${facAdv.toLocaleString()}
${remAdvance >= 0 ? `*صافی بقایا ایڈوانس ریمائنڈر:* Rs. ${remAdvance.toLocaleString()}` : `*فیکٹری کے ذمے بقایا واجب الادا:* Rs. ${Math.abs(remAdvance).toLocaleString()}`}

(رسید کی تصویر کاپی ہو چکی ہے، چیٹ میں Ctrl+V دبائیں)`;

  // 1. Copy image to clipboard so user can simply press Ctrl+V in WhatsApp Web
  const copied = await copyBlobToClipboard(blob);

  // 2. Android APK Native Bridge
  if (
    typeof (window as any).AndroidBridge !== 'undefined' &&
    typeof (window as any).AndroidBridge.shareReceiptImage === 'function'
  ) {
    try {
      const base64Data = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
      (window as any).AndroidBridge.shareReceiptImage(base64Data, filename, phone, caption);
      return { blob, url, copied, filename, phone, caption };
    } catch (e) {
      console.warn('AndroidBridge share failed:', e);
    }
  }

  // 3. Mobile Browser Web Share API with File
  const file = new File([blob], filename, { type: 'image/png' });
  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({
        files: [file],
        title: `Shan Poultry Slip ${params.slip.invoice_no}`,
        text: caption,
      });
      return { blob, url, copied, filename, phone, caption };
    } catch (e: any) {
      if (e.name !== 'AbortError') console.warn('Web Share API error:', e);
    }
  }

  // 4. Desktop auto-download
  try {
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  } catch (e) {
    console.warn('Auto download error:', e);
  }

  // 5. Open WhatsApp Web chat
  const encoded = encodeURIComponent(caption);
  const waUrl = phone.length >= 10
    ? `https://api.whatsapp.com/send?phone=${phone}&text=${encoded}`
    : `https://api.whatsapp.com/send?text=${encoded}`;
  window.open(waUrl, '_blank');

  return { blob, url, copied, filename, phone, caption };
}

/**
 * Shares a factory full statement as an actual PNG image
 */
export async function shareFactoryStatementImage(params: FactoryStatementImageParams): Promise<ShareImageResult> {
  const blob = await generateFactoryStatementImageBlob(params);
  const filename = `Statement_${params.factory.factory_code}_${new Date().toISOString().split('T')[0]}.png`;
  const url = URL.createObjectURL(blob);

  let phone = (params.factory.whatsapp_no || params.factory.phone || '').replace(/[^0-9]/g, '');
  if (phone.startsWith('03')) phone = '92' + phone.substring(1);
  else if (phone.startsWith('3') && phone.length === 10) phone = '92' + phone;

  const fAdv = Number(params.factory.advance_amount || 0);
  const totBilled = params.transactions.reduce((acc, t) => acc + (t.total_amount || 0), 0);
  const totWeight = params.transactions.reduce((acc, t) => acc + (t.total_weight || 0), 0);
  const remAdvance = fAdv - totBilled;

  const caption = `*🐔 SHAN POULTRY PROTEIN - کھاتہ اسٹیٹمنٹ 🐔*
*خریدار فیکٹری:* ${params.factory.name} (${params.factory.area})
*کوڈ:* ${params.factory.factory_code}
*کل سپلائی پرچیاں:* ${params.transactions.length}
*کل سپلائی وزن:* ${totWeight.toFixed(2)} KG
*کل سپلائی بل رقم:* Rs. ${totBilled.toLocaleString()}
*فیکٹری ایڈوانس رقم:* Rs. ${fAdv.toLocaleString()}
${remAdvance >= 0 ? `*صافی بقایا ایڈوانس ریمائنڈر:* Rs. ${remAdvance.toLocaleString()}` : `*فیکٹری کے ذمے بقایا واجب الادا:* Rs. ${Math.abs(remAdvance).toLocaleString()}`}

(اسٹیٹمنٹ کی مکمل تصویر کاپی ہو چکی ہے، چیٹ میں Ctrl+V دبائیں)`;

  // 1. Copy image to clipboard
  const copied = await copyBlobToClipboard(blob);

  // 2. Android APK Native Bridge
  if (
    typeof (window as any).AndroidBridge !== 'undefined' &&
    typeof (window as any).AndroidBridge.shareReceiptImage === 'function'
  ) {
    try {
      const base64Data = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
      (window as any).AndroidBridge.shareReceiptImage(base64Data, filename, phone, caption);
      return { blob, url, copied, filename, phone, caption };
    } catch (e) {
      console.warn('AndroidBridge statement share failed:', e);
    }
  }

  // 3. Mobile Web Share API with File
  const file = new File([blob], filename, { type: 'image/png' });
  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({
        files: [file],
        title: `Shan Poultry Statement ${params.factory.factory_code}`,
        text: caption,
      });
      return { blob, url, copied, filename, phone, caption };
    } catch (e: any) {
      if (e.name !== 'AbortError') console.warn('Web Share API error:', e);
    }
  }

  // 4. Desktop auto-download
  try {
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  } catch (e) {
    console.warn('Auto download error:', e);
  }

  // 5. Open WhatsApp Web chat
  const encoded = encodeURIComponent(caption);
  const waUrl = phone.length >= 10
    ? `https://api.whatsapp.com/send?phone=${phone}&text=${encoded}`
    : `https://api.whatsapp.com/send?text=${encoded}`;
  window.open(waUrl, '_blank');

  return { blob, url, copied, filename, phone, caption };
}

