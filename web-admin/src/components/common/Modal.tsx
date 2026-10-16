import React, { useEffect } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '4xl' | '5xl' | '6xl';
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  maxWidth = 'lg',
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const maxWidthClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
    '4xl': 'max-w-4xl',
    '5xl': 'max-w-5xl',
    '6xl': 'max-w-6xl',
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto print:static print:overflow-visible print:z-auto print:inset-auto">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity no-print" 
        onClick={onClose} 
      />

      <div className="flex min-h-full items-center justify-center p-2.5 sm:p-4 print:p-0 print:block">
        <div 
          className={`relative w-full ${maxWidthClasses[maxWidth]} bg-white border border-slate-200 rounded-2xl shadow-dropdown overflow-hidden z-10 print:border-none print:shadow-none print:rounded-none print:max-w-full print:overflow-visible print:p-0`}
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-100 px-4 sm:px-6 py-3.5 sm:py-4 bg-slate-50/80 print:bg-white print:border-b-2 print:border-slate-900 print:px-0 print:py-1">
            <div>
              <h3 className="text-base font-bold text-slate-900">{title}</h3>
              {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
            </div>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-xl transition no-print"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body */}
          <div className="p-4 sm:p-6 max-h-[85vh] overflow-y-auto text-slate-800 print:max-h-none print:overflow-visible print:p-0">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
};
