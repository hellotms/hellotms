import { useNavigate } from 'react-router-dom';
import { FileText, Receipt } from 'lucide-react';

interface MobileBillingSheetProps {
  isOpen: boolean;
  onClose: () => void;
}

export function MobileBillingSheet({ isOpen, onClose }: MobileBillingSheetProps) {
  const navigate = useNavigate();

  if (!isOpen) return null;

  const goTo = (path: string) => {
    navigate(path);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 md:hidden" onClick={onClose}>
      {/* Tiny popover positioned above Billing tab (4th of 5 = ~70% from left) */}
      <div
        className="absolute bottom-[60px] right-[12%] bg-card border border-border rounded-lg shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 origin-bottom"
        style={{ marginBottom: 'env(safe-area-inset-bottom, 0px)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={() => goTo('/estimates')}
          className="flex items-center gap-2.5 px-3.5 py-2.5 text-[13px] font-medium text-foreground hover:bg-muted/60 transition-colors active:bg-muted border-b border-border w-full"
        >
          <FileText className="h-3.5 w-3.5 text-primary" />
          Estimates
        </button>
        <button
          onClick={() => goTo('/invoices')}
          className="flex items-center gap-2.5 px-3.5 py-2.5 text-[13px] font-medium text-foreground hover:bg-muted/60 transition-colors active:bg-muted w-full"
        >
          <Receipt className="h-3.5 w-3.5 text-primary" />
          Invoices
        </button>
      </div>
    </div>
  );
}
