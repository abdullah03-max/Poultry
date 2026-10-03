// =============================================================================
// SHAN POULTRY PROTEIN - Export Utilities (CSV & Print)
// =============================================================================

import { MonthlyRegisterCustomerRow } from '../types/database';

export const exportToCSV = (filename: string, headers: string[], rows: (string | number)[][]) => {
  const escapeCell = (cell: string | number | null | undefined): string => {
    if (cell === null || cell === undefined) return '""';
    const str = String(cell);
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const csvContent = [
    headers.map(escapeCell).join(','),
    ...rows.map(row => row.map(escapeCell).join(',')),
  ].join('\r\n');

  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

export const exportMonthlyRegisterToCSV = (
  monthName: string,
  year: number,
  daysInMonth: number,
  registerRows: MonthlyRegisterCustomerRow[],
  emptySymbol: string = 'X'
) => {
  const headers = [
    'Customer Code',
    'Customer / Shop Name',
    'Area',
    ...Array.from({ length: daysInMonth }, (_, i) => `Day ${i + 1}`),
    'Monthly Total (KG)',
    'Collection Days Count',
    'Total Amount (PKR)',
  ];

  const dataRows: (string | number)[][] = registerRows.map(row => {
    const dayCells = Array.from({ length: daysInMonth }, (_, i) => {
      const weight = row.dailyWeights[i + 1];
      return weight !== null && weight !== undefined ? weight : emptySymbol;
    });

    return [
      row.customer.customer_code,
      row.customer.name,
      row.customer.area,
      ...dayCells,
      row.totalWeight,
      row.collectionDaysCount,
      row.totalAmount,
    ];
  });

  // Calculate daily column totals for the footer
  const dailyTotals = Array.from({ length: daysInMonth }, (_, i) => {
    const day = i + 1;
    return registerRows.reduce((acc, row) => acc + (row.dailyWeights[day] || 0), 0);
  });
  const grandTotalWeight = registerRows.reduce((acc, row) => acc + row.totalWeight, 0);
  const grandTotalAmount = registerRows.reduce((acc, row) => acc + row.totalAmount, 0);

  dataRows.push([
    'TOTAL',
    'ALL CUSTOMERS DAILY TOTAL (KG)',
    '—',
    ...dailyTotals,
    grandTotalWeight,
    '—',
    grandTotalAmount,
  ]);

  exportToCSV(`SHAN_POULTRY_REGISTER_${monthName}_${year}`, headers, dataRows);
};

export const triggerPrint = () => {
  window.print();
};
