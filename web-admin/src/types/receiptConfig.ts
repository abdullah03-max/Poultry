// =============================================================================
// SHAN POULTRY PROTEIN - Monthly Register Receipt Customization Configuration
// Fully configurable header, customer box, weight table, advance settlement & footer
// =============================================================================

export interface MonthlyReceiptHeaderConfig {
  showLogo: boolean;
  logoUrl: string;
  companyNameEn: string;
  companyNameUrdu: string;
  receiptTitleUrdu: string;
  taglineEn: string;
  contactPhone: string;
  showPrintDate: boolean;
  printDateLabel: string;
  monthBadgeLabel: string;
}

export interface MonthlyReceiptCustomerInfoConfig {
  showBox: boolean;
  shopNameLabel: string;
  customerCodeLabel: string;
  contactPersonLabel: string;
  phoneLabel: string;
  areaAddressLabel: string;
  activeDaysLabel: string;
  showContactPerson: boolean;
  showPhone: boolean;
  showAreaAddress: boolean;
  showActiveDays: boolean;
}

export interface MonthlyReceiptWeightTableConfig {
  showTable: boolean;
  categoryColumnLabel: string;
  weightColumnLabel: string;
  rateColumnLabel: string;
  amountColumnLabel: string;
  charbiRowLabel: string;
  kacharaRowLabel: string;
  grandTotalRowLabel: string;
  showCharbiRow: boolean;
  showKacharaRow: boolean;
  showRates: boolean;
}

export interface MonthlyReceiptAdvanceBoxConfig {
  showSection: boolean;
  sectionTitle: string;
  paymentMethodLabel: string;
  dateLabel: string;
  totalAdvanceCardTitle: string;
  totalAdvanceSubtext: string;
  monthlyBillCardTitle: string;
  monthlyBillSubtext: string;
  remainingAdvanceCardTitle: string;
  advanceActiveBadge: string;
  advanceExhaustedBadge: string;
  showFormulaBar: boolean;
  showReminderAlerts: boolean;
  activeReminderText: string;
  exhaustedAlertText: string;
  noAdvanceNoticeText: string;
  showNotes: boolean;
  notesLabel: string;
}

export interface MonthlyReceiptFooterConfig {
  showSignatures: boolean;
  customerSignatureLabel: string;
  authorizedSignatureLabel: string;
  // NOTE: Left EMPTY by default to remove "Haji Shan / Administrator"
  authorizedPersonTitle: string;
  customerSubtitle: string;
  showCustomFooterNote: boolean;
  customFooterText: string;
  additionalTerms: string;
}

export interface MonthlyReceiptConfig {
  header: MonthlyReceiptHeaderConfig;
  customerInfo: MonthlyReceiptCustomerInfoConfig;
  weightTable: MonthlyReceiptWeightTableConfig;
  advanceBox: MonthlyReceiptAdvanceBoxConfig;
  footer: MonthlyReceiptFooterConfig;
}

export const DEFAULT_MONTHLY_RECEIPT_CONFIG: MonthlyReceiptConfig = {
  header: {
    showLogo: true,
    logoUrl: '/app_icon.png',
    companyNameEn: 'SHAN POULTRY PROTEIN',
    companyNameUrdu: 'شان پولٹری پروٹین',
    receiptTitleUrdu: 'ماہانہ بل و کھاتہ رسید',
    taglineEn: 'B2B Poultry Protein Materials',
    contactPhone: '0300-0000000',
    showPrintDate: true,
    printDateLabel: 'تاریخ پرنٹ:',
    monthBadgeLabel: '',
  },
  customerInfo: {
    showBox: true,
    shopNameLabel: 'دکان / گاہک:',
    customerCodeLabel: 'کوڈ (Code):',
    contactPersonLabel: 'رابطہ شخص:',
    phoneLabel: 'فون نمبر:',
    areaAddressLabel: 'علاقہ و پتہ:',
    activeDaysLabel: 'وصولی کے کل دن:',
    showContactPerson: true,
    showPhone: true,
    showAreaAddress: true,
    showActiveDays: true,
  },
  weightTable: {
    showTable: true,
    categoryColumnLabel: 'قسم (Category)',
    weightColumnLabel: 'کل وزن (Weight)',
    rateColumnLabel: 'ریٹ فی کلو (Rate)',
    amountColumnLabel: 'کل رقم (Amount)',
    charbiRowLabel: 'چربی وزن (Charbi)',
    kacharaRowLabel: 'کچرا وزن (Kachara)',
    grandTotalRowLabel: 'گرینڈ ٹوٹل بل (Grand Total)',
    showCharbiRow: true,
    showKacharaRow: true,
    showRates: true,
  },
  advanceBox: {
    showSection: true,
    sectionTitle: 'پیشگی ایڈوانس و بل کا حساب کتاب (Advance Settlement & Reminder)',
    paymentMethodLabel: 'طریقہ ادائیگی:',
    dateLabel: 'تاریخ:',
    totalAdvanceCardTitle: 'کل پیشگی ایڈوانس دیا گیا',
    totalAdvanceSubtext: 'کل پیشگی ادائیگی',
    monthlyBillCardTitle: 'اس ماہ کا ویسٹ بل کٹوتی',
    monthlyBillSubtext: 'ماہانہ بل کٹوتی',
    remainingAdvanceCardTitle: 'موجودہ باقی ایڈوانس بیلنس',
    advanceActiveBadge: '✓ ایڈوانس کریڈٹ فعال',
    advanceExhaustedBadge: '⚠️ ایڈوانس ختم (بقایا بل واجب)',
    showFormulaBar: true,
    showReminderAlerts: true,
    activeReminderText:
      'گاہک کا پیشگی ایڈوانس ابھی باقی ہے۔ اس ماہ کا کل بل پیشگی ایڈوانس سے منہا ہو چکا ہے۔ گاہک کے کھاتے میں باقی ایڈوانس محفوظ ہے جو آئندہ کی ویسٹ وصولیوں میں کٹتا رہے گا۔',
    exhaustedAlertText:
      'اہم الرٹ: پیشگی ایڈوانس مکمل ختم ہو چکا ہے۔ ایڈوانس سے زائد مال اٹھایا جا چکا ہے۔ برائے مہربانی نیا ایڈوانس شامل کریں یا یہ بقایا بل وصول کریں۔',
    noAdvanceNoticeText:
      'اس گاہک کا کوئی پیشگی ایڈوانس رجسٹرڈ نہیں ہے۔ یہ ماہانہ بل نقد / کیش پر واجب الادا ہے۔',
    showNotes: true,
    notesLabel: 'نوٹس / حوالہ:',
  },
  footer: {
    showSignatures: true,
    customerSignatureLabel: 'دستخط / مہر گاہک (Customer Signature)',
    authorizedSignatureLabel: 'دستخط شان پولٹری (Authorized Signatory)',
    // User requirement: Remove "Haji Shan / Administrator" by default
    authorizedPersonTitle: '',
    customerSubtitle: '',
    showCustomFooterNote: true,
    customFooterText: 'کمپیوٹرائزڈ ماہانہ بل رسید • Shan Poultry Protein Digitized Register System',
    additionalTerms: '',
  },
};

export const MONTHLY_RECEIPT_CONFIG_STORAGE_KEY = 'spp_monthly_receipt_config';
export const PACK_RECEIPT_TAG = '__MONTHLY_RECEIPT_CONFIG__';

/**
 * Deep merge a partial config with default values so that no keys are ever undefined
 */
export function mergeReceiptConfig(partial?: Partial<MonthlyReceiptConfig> | null): MonthlyReceiptConfig {
  if (!partial) return { ...DEFAULT_MONTHLY_RECEIPT_CONFIG };
  return {
    header: { ...DEFAULT_MONTHLY_RECEIPT_CONFIG.header, ...(partial.header || {}) },
    customerInfo: { ...DEFAULT_MONTHLY_RECEIPT_CONFIG.customerInfo, ...(partial.customerInfo || {}) },
    weightTable: { ...DEFAULT_MONTHLY_RECEIPT_CONFIG.weightTable, ...(partial.weightTable || {}) },
    advanceBox: { ...DEFAULT_MONTHLY_RECEIPT_CONFIG.advanceBox, ...(partial.advanceBox || {}) },
    footer: { ...DEFAULT_MONTHLY_RECEIPT_CONFIG.footer, ...(partial.footer || {}) },
  };
}

/**
 * Read the current Monthly Receipt Configuration with instant fallback to localStorage and defaults
 */
export function getStoredMonthlyReceiptConfig(): MonthlyReceiptConfig {
  if (typeof window === 'undefined') {
    return { ...DEFAULT_MONTHLY_RECEIPT_CONFIG };
  }
  try {
    const raw = localStorage.getItem(MONTHLY_RECEIPT_CONFIG_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return mergeReceiptConfig(parsed);
    }
  } catch (err) {
    console.warn('Error reading stored monthly receipt config:', err);
  }
  return { ...DEFAULT_MONTHLY_RECEIPT_CONFIG };
}

/**
 * Save Monthly Receipt Configuration to localStorage and broadcast an update event
 */
export function saveStoredMonthlyReceiptConfig(config: MonthlyReceiptConfig): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(MONTHLY_RECEIPT_CONFIG_STORAGE_KEY, JSON.stringify(config));
    window.dispatchEvent(new CustomEvent('spp_monthly_receipt_config_updated', { detail: config }));
  } catch (err) {
    console.warn('Error saving monthly receipt config:', err);
  }
}

/**
 * Pack the config into receipt_tagline for cloud persistence without altering Supabase schema
 */
export function packReceiptTaglineWithConfig(userTagline: string, config: MonthlyReceiptConfig): string {
  const clean = (userTagline || '').split(PACK_RECEIPT_TAG)[0].trim();
  return `${clean}\n${PACK_RECEIPT_TAG}\n${JSON.stringify(config)}`;
}

/**
 * Unpack the config from receipt_tagline
 */
export function unpackReceiptTaglineWithConfig(rawTagline: string | null | undefined): {
  userTagline: string;
  config: MonthlyReceiptConfig | null;
} {
  if (!rawTagline) {
    return { userTagline: '', config: null };
  }
  const parts = rawTagline.split(PACK_RECEIPT_TAG);
  const userTagline = parts[0].trim();
  if (parts.length > 1) {
    try {
      const parsed = JSON.parse(parts[1].trim());
      return { userTagline, config: mergeReceiptConfig(parsed) };
    } catch {
      // ignore JSON parse error
    }
  }
  return { userTagline, config: null };
}
