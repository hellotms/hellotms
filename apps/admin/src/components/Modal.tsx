import { X, AlertTriangle, Info, Trash2 } from 'lucide-react';
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
        <div className="flex items-start justify-between p-4 sm:p-6 border-b border-border shrink-0">
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
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 text-foreground">
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
          danger ? "bg-red-50 dark:bg-red-500/10 text-red-600 text-red-600 dark:text-red-400" : "bg-blue-50 dark:bg-blue-500/10 text-blue-600 text-blue-600 dark:text-blue-400"
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

// ─── Cascade Confirm Modal ────────────────────────────────────────────────────
export interface CascadeItem {
  icon: string;
  label: string;
  description?: string;
}

interface CascadeConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  targetName: string;
  targetType: string;
  cascadeItems: CascadeItem[];
  confirmLabel?: string;
  loading?: boolean;
}

export function CascadeConfirmModal({
  isOpen, onClose, onConfirm, title, targetName, targetType,
  cascadeItems, confirmLabel = 'Delete', loading = false,
}: CascadeConfirmModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} size="sm">
      <div className="space-y-4">
        <div className="flex items-center gap-3 p-3 bg-red-50 dark:bg-red-500/10 dark:bg-red-950/30 border border-red-200 border-red-200 dark:border-red-500/30 dark:border-red-800 rounded-xl">
          <div className="h-9 w-9 rounded-full bg-red-100 dark:bg-red-500/20 dark:bg-red-900/50 flex items-center justify-center shrink-0">
            <Trash2 className="h-4 w-4 text-red-600 text-red-600 dark:text-red-400" />
          </div>
          <div>
            <p className="text-sm font-semibold text-red-800 dark:text-red-300">
              Permanently delete {targetType}
            </p>
            <p className="text-xs text-red-600 text-red-600 dark:text-red-400 dark:text-red-400 mt-0.5 font-medium truncate max-w-[220px]">
              "{targetName}"
            </p>
          </div>
        </div>

        {cascadeItems.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              This will also permanently delete:
            </p>
            <div className="space-y-1.5">
              {cascadeItems.map((item, i) => (
                <div key={i} className="flex items-start gap-2.5 p-2.5 bg-muted/50 rounded-lg border border-border/60">
                  <span className="text-base leading-none mt-0.5 shrink-0">{item.icon}</span>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground">{item.label}</p>
                    {item.description && (
                      <p className="text-xs text-muted-foreground mt-0.5">{item.description}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex items-start gap-2 text-xs text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-2.5">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
          <span>This action <strong>cannot be undone</strong>. All data will be permanently removed.</span>
        </div>

        <div className="flex gap-3 pt-1">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 text-sm font-medium border border-border rounded-xl hover:bg-muted transition-all active:scale-95"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="flex-1 px-4 py-2.5 text-sm font-semibold rounded-xl bg-red-600 text-white hover:bg-red-700 transition-all active:scale-95 disabled:opacity-60 shadow-sm shadow-red-200"
          >
            {loading ? 'Deleting...' : confirmLabel}
          </button>
        </div>
      </div>
    </Modal>
  );
}
