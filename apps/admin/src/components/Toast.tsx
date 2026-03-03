import { useEffect, useState } from 'react';
import { X, AlertCircle, CheckCircle, Info } from 'lucide-react';

export type ToastType = 'error' | 'success' | 'info';

export interface Toast {
    id: string;
    type: ToastType;
    message: string;
}

let addToastFn: ((toast: Omit<Toast, 'id'>) => void) | null = null;

export function toast(message: string, type: ToastType = 'error') {
    addToastFn?.({ message, type });
}

export function ToastContainer() {
    const [toasts, setToasts] = useState<Toast[]>([]);

    useEffect(() => {
        addToastFn = (t) => {
            const id = Math.random().toString(36).slice(2);
            setToasts((prev) => [...prev, { ...t, id }]);
            setTimeout(() => {
                setToasts((prev) => prev.filter((x) => x.id !== id));
            }, 5000);
        };
        return () => { addToastFn = null; };
    }, []);

    const remove = (id: string) => setToasts((prev) => prev.filter((x) => x.id !== id));

    if (toasts.length === 0) return null;

    return (
        <div className="fixed bottom-4 right-4 z-[9999] flex flex-col gap-2 max-w-sm w-full pointer-events-none">
            {toasts.map((t) => (
                <div
                    key={t.id}
                    className={`flex items-start gap-3 px-4 py-3 rounded-xl shadow-lg border pointer-events-auto animate-in slide-in-from-right text-sm
            ${t.type === 'error' ? 'bg-destructive/10 border-destructive/30 text-destructive' : ''}
            ${t.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-400' : ''}
            ${t.type === 'info' ? 'bg-blue-500/10 border-blue-500/30 text-blue-700 dark:text-blue-400' : ''}
          `}
                >
                    {t.type === 'error' && <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />}
                    {t.type === 'success' && <CheckCircle className="h-4 w-4 mt-0.5 shrink-0" />}
                    {t.type === 'info' && <Info className="h-4 w-4 mt-0.5 shrink-0" />}
                    <span className="flex-1">{t.message}</span>
                    <button onClick={() => remove(t.id)} className="opacity-60 hover:opacity-100 transition-opacity">
                        <X className="h-3.5 w-3.5" />
                    </button>
                </div>
            ))}
        </div>
    );
}
