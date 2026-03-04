import { X, AlertTriangle, Info } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

const sizeMap = {
  sm: 'max-w-md',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
};

export function Modal({ isOpen, onClose, title, description, children, size = 'md' }: ModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Dialog */}
      <div className={cn(
        'relative bg-background border border-border rounded-xl shadow-xl w-full',
        sizeMap[size],
        'animate-fade-in max-h-[90vh] flex flex-col'
      )}>
        {/* Header */}
        <div className="flex items-start justify-between p-6 border-b border-border shrink-0">
          <div>
            <h2 className="text-lg font-semibold text-foreground">{title}</h2>
            {description && <p className="text-sm text-muted-foreground mt-0.5">{description}</p>}
          </div>
          <button
            onClick={onClose}
            className="ml-4 p-1.5 rounded-md hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {children}
        </div>
      </div>
    </div>
  );
}

// Confirm dialog
interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  danger?: boolean;
  loading?: boolean;
}

export function ConfirmModal({
  isOpen, onClose, onConfirm, title, message,
  confirmLabel = 'Confirm', danger = false, loading = false
}: ConfirmModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} size="sm">
      <div className="flex flex-col items-center text-center py-2">
        <div className={cn(
          "w-12 h-12 rounded-full flex items-center justify-center mb-4 animate-in zoom-in duration-300",
          danger ? "bg-red-50 text-red-600" : "bg-blue-50 text-blue-600"
        )}>
          {danger ? <AlertTriangle className="h-6 w-6" /> : <Info className="h-6 w-6" />}
        </div>
        <p className="text-sm text-muted-foreground mb-8 leading-relaxed px-2">
          {message}
        </p>
      </div>

      <div className="flex flex-col sm:flex-row justify-center gap-3 w-full">
        <button
          onClick={onClose}
          className="order-2 sm:order-1 flex-1 px-4 py-2.5 text-sm font-medium border border-border rounded-xl hover:bg-muted transition-all active:scale-95"
        >
          Cancel
        </button>
        <button
          onClick={onConfirm}
          disabled={loading}
          className={cn(
            'order-1 sm:order-2 flex-1 px-4 py-2.5 text-sm font-semibold rounded-xl transition-all active:scale-95 disabled:opacity-60 shadow-sm',
            danger
              ? 'bg-red-600 text-white hover:bg-red-700 shadow-red-200'
              : 'bg-primary text-primary-foreground hover:bg-primary/90 shadow-primary/20'
          )}
        >
          {loading ? 'Processing...' : confirmLabel}
        </button>
      </div>
    </Modal>
  );
}
