import { useNavigate } from 'react-router-dom';
import { FileText, Receipt, ArrowLeft, ChevronRight, Info } from 'lucide-react';

export default function MobileBillingPage() {
  const navigate = useNavigate();
  const lastEstimateId = localStorage.getItem('last_estimate_id');
  const lastInvoiceId = localStorage.getItem('last_invoice_id');

  const handleEstimatesClick = () => {
     navigate(lastEstimateId ? `/estimates/${lastEstimateId}` : '/estimates');
  }

  const handleInvoicesClick = () => {
     navigate(lastInvoiceId ? `/invoices/${lastInvoiceId}` : '/invoices');
  }

  return (
    <div className="flex flex-col min-h-full bg-background pb-10">
      <div className="flex items-center gap-3 px-2 py-4 border-b border-border/60 mb-6">
        <button 
          onClick={() => navigate(-1)}
          className="p-2 rounded-xl hover:bg-muted transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-xl font-bold">Billing & Financials</h1>
      </div>

      <div className="px-5 space-y-6">
        <div className="bg-primary/5 border border-primary/10 rounded-3xl p-6 flex gap-4">
            <div className="h-12 w-12 rounded-2xl bg-primary/20 flex items-center justify-center shrink-0">
                <Info className="h-6 w-6 text-primary" />
            </div>
            <div>
                <h2 className="text-sm font-bold text-primary mb-1">Billing Overview</h2>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                    Manage your invoices and estimates. You can track payments and collections from the respective detail pages.
                </p>
            </div>
        </div>

        <div className="space-y-3">
            <button
                onClick={handleEstimatesClick}
                className="w-full flex items-center gap-4 px-5 py-6 bg-card border border-border/60 rounded-[32px] hover:bg-muted/30 transition-all active:scale-[0.98] group shadow-sm"
            >
                <div className="h-14 w-14 rounded-2xl bg-blue-500/10 flex items-center justify-center group-hover:bg-blue-500/20 transition-colors">
                    <FileText className="h-7 w-7 text-blue-500" />
                </div>
                <div className="flex-1 text-left">
                    <h3 className="text-base font-black text-foreground tracking-tight">Estimates</h3>
                    <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-widest mt-0.5">Quotations & Proposals</p>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground/30" />
            </button>

            <button
                onClick={handleInvoicesClick}
                className="w-full flex items-center gap-4 px-5 py-6 bg-card border border-border/60 rounded-[32px] hover:bg-muted/30 transition-all active:scale-[0.98] group shadow-sm"
            >
                <div className="h-14 w-14 rounded-2xl bg-emerald-500/10 flex items-center justify-center group-hover:bg-emerald-500/20 transition-colors">
                    <Receipt className="h-7 w-7 text-emerald-500" />
                </div>
                <div className="flex-1 text-left">
                    <h3 className="text-base font-black text-foreground tracking-tight">Invoices</h3>
                    <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-widest mt-0.5">Billing & Payments</p>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground/30" />
            </button>
        </div>

        <div className="pt-10 text-center">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/40">Secure Financial Management</p>
        </div>
      </div>
    </div>
  );
}
