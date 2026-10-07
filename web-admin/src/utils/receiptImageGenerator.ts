// =============================================================================
// SHAN POULTRY PROTEIN - High Resolution Receipt Image Generator & WhatsApp Sharer
// Renders professional collection invoice PNG on HTML5 Canvas & shares via Web Share API
// =============================================================================

import { OfflineCollectionItem } from '../mobile/mobileStorage';
import { Collection } from '../types/database';
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

  // Company Name
  ctx.textAlign = 'center';
  ctx.fillStyle = '#0F172A'; // slate-900
  ctx.font = 'bold 24px system-ui, -apple-system, sans-serif';
  ctx.fillText('SHAN POULTRY PROTEIN', width / 2, curY);
  curY += 26;

  // Urdu Subtitle
  ctx.fillStyle = '#2563EB'; // brand blue
  ctx.font = 'bold 20px "Noto Nastaliq Urdu", "Jameel Noori Nastaleeq", system-ui, sans-serif';
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

  ctx.textAlign = 'center';
  ctx.fillStyle = '#475569';
  ctx.font = 'bold 13px system-ui, sans-serif';
  ctx.fillText('شکریہ! شان پولٹری پروٹین کے ساتھ کاروبار کرنے کا', width / 2, curY);
  curY += 20;

  ctx.fillStyle = '#94A3B8';
  ctx.font = '11px system-ui, sans-serif';
  ctx.fillText('Shan Poultry Protein ERP • Burewala, Gaggoo Mandi, Vehari • Helpline: 0300-0000000', width / 2, curY);

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
