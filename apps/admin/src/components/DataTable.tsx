import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
} from '@tanstack/react-table';
import { useState, useEffect } from 'react';
import { ChevronUp, ChevronDown, ChevronsUpDown, ChevronLeft, ChevronRight, Search, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Modal } from './Modal';

interface DataTableProps<TData> {
  data: TData[];
  columns: ColumnDef<TData, unknown>[];
  searchKey?: string;
  searchPlaceholder?: string;
  onRowClick?: (row: TData) => void;
  pageSize?: number;
  footerRow?: React.ReactNode;
}

export function DataTable<TData>({
  data,
  columns,
  searchKey,
  searchPlaceholder = 'Search...',
  onRowClick,
  pageSize = 10,
  footerRow,
}: DataTableProps<TData>) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = useState('');
  const [isMobile, setIsMobile] = useState(false);
  const [selectedRow, setSelectedRow] = useState<TData | null>(null);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const table = useReactTable({
    data,
    columns,
    state: { sorting, globalFilter },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize } },
  });

  const getRowTitle = (row: TData) => {
    const r = row as any;
    // Check nested ledger category first, then fallback to common fields
    const nestedCategory = r.ledger_entries?.category;
    return nestedCategory || r.title || r.name || r.category || r.invoice_number || r.method || r.id || 'Details';
  };

  const handleRowClick = (row: any) => {
    if (isMobile) {
      setSelectedRow(row.original);
    } else {
      onRowClick?.(row.original);
    }
  };

  return (
    <div className="space-y-3">
      {searchKey !== undefined && (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            value={globalFilter}
            onChange={(e) => setGlobalFilter(e.target.value)}
            placeholder={searchPlaceholder}
            className="w-full pl-9 pr-4 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
      )}

      <div className="border border-border rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id} className="bg-muted/30 border-b border-border">
                  {headerGroup.headers.map((header) => {
                    // Hide actions column on mobile
                    if (isMobile && header.column.id === 'actions') return null;
                    
                    return (
                      <th
                        key={header.id}
                        className="text-left px-4 py-3.5 font-semibold text-muted-foreground whitespace-nowrap"
                      >
                        {header.isPlaceholder ? null : (
                          <div
                            className={cn(
                              'flex items-center gap-1',
                              header.column.getCanSort() && 'cursor-pointer select-none hover:text-foreground transition-colors'
                            )}
                            onClick={header.column.getToggleSortingHandler()}
                          >
                            {flexRender(header.column.columnDef.header, header.getContext())}
                            {header.column.getCanSort() && (
                              <span className="text-muted-foreground/30">
                                {header.column.getIsSorted() === 'asc' ? <ChevronUp className="h-3.5 w-3.5" /> :
                                  header.column.getIsSorted() === 'desc' ? <ChevronDown className="h-3.5 w-3.5" /> :
                                    <ChevronsUpDown className="h-3.5 w-3.5" />}
                              </span>
                            )}
                          </div>
                        )}
                      </th>
                    );
                  })}
                </tr>
              ))}
            </thead>
            <tbody>
              {table.getRowModel().rows.length === 0 ? (
                <tr>
                  <td colSpan={columns.length} className="text-center py-12 text-muted-foreground">
                    No results found.
                  </td>
                </tr>
              ) : (
                table.getRowModel().rows.map((row, i) => (
                  <tr
                    key={row.id}
                    className={cn(
                      'border-b border-border last:border-0 transition-all active:bg-primary/10',
                      i % 2 === 0 ? 'bg-background' : 'bg-muted/10',
                      onRowClick && 'cursor-pointer hover:bg-primary/5'
                    )}
                    onClick={() => handleRowClick(row)}
                  >
                    {row.getVisibleCells().map((cell) => {
                      // Hide actions column on mobile
                      if (isMobile && cell.column.id === 'actions') return null;
                      
                      return (
                        <td key={cell.id} className="px-4 py-3.5 whitespace-nowrap">
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </td>
                      );
                    })}
                  </tr>
                ))
              )}
              {footerRow}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-muted-foreground pt-2">
        <p>
          Showing {table.getState().pagination.pageIndex * pageSize + 1}–
          {Math.min((table.getState().pagination.pageIndex + 1) * pageSize, table.getFilteredRowModel().rows.length)} of{' '}
          {table.getFilteredRowModel().rows.length} results
        </p>
        <div className="flex items-center gap-2">
          <button
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
            className="p-1.5 rounded-lg border border-border disabled:opacity-40 hover:bg-muted transition-all active:scale-90"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="text-foreground font-semibold px-2">
             {table.getState().pagination.pageIndex + 1} <span className="font-normal text-muted-foreground mx-1">/</span> {table.getPageCount()}
          </span>
          <button
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
            className="p-1.5 rounded-lg border border-border disabled:opacity-40 hover:bg-muted transition-all active:scale-90"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Mobile Action Popup */}
      {selectedRow && (
        <Modal
          isOpen={!!selectedRow}
          onClose={() => setSelectedRow(null)}
          title="Row Options"
          size="sm"
        >
          {/* Custom Header Area in Modal Body for better style */}
          <div className="space-y-6">
            <div className="bg-gradient-to-br from-muted/40 to-muted/10 p-5 rounded-2xl border border-border/50 backdrop-blur-sm">
              <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] mb-4 opacity-60">Record Details</p>
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                  <ExternalLink className="h-6 w-6" />
                </div>
                <div>
                  <h4 className="font-bold text-lg text-foreground leading-tight">{getRowTitle(selectedRow)}</h4>
                  <p className="text-xs text-muted-foreground mt-1">Ref ID: {(selectedRow as any).id?.slice(0, 8)}</p>
                </div>
              </div>
            </div>

            <div className="space-y-3">

              <div className="pt-2">
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-4 px-1 opacity-70">Manage Record</p>
                <div 
                  className="grid grid-cols-1 gap-3"
                  onClick={() => setSelectedRow(null)}
                >
                  {table.getRowModel().rows.find(r => r.original === selectedRow)?.getVisibleCells().map(cell => {
                    if (cell.column.id === 'actions') {
                      return (
                        <div key={cell.id} className="mobile-action-buttons-container">
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </div>
                      );
                    }
                    return null;
                  })}
                </div>
              </div>
            </div>

            <button
              onClick={() => setSelectedRow(null)}
              className="w-full py-4 text-sm font-semibold text-muted-foreground hover:text-foreground border border-dashed border-border rounded-xl transition-all active:bg-muted"
            >
              Close Menu
            </button>
          </div>
        </Modal>
      )}

      {/* Premium styles for mobile UI */}
      <style>{`
        @media (max-width: 767px) {
          .mobile-action-buttons-container > div {
            display: grid !important;
            grid-template-columns: 1fr 1fr !important;
            gap: 12px !important;
            width: 100% !important;
          }
          
          .mobile-action-buttons-container button {
            display: flex !important;
            flex-direction: row !important;
            align-items: center !important;
            justify-content: center !important;
            gap: 14px !important;
            padding: 16px 20px !important;
            height: auto !important;
            width: 100% !important;
            background: rgba(255, 255, 255, 0.05) !important;
            backdrop-filter: blur(8px) !important;
            border: 1px solid rgba(var(--primary-rgb), 0.1) !important;
            border-radius: 18px !important;
            font-size: 15px !important;
            font-weight: 700 !important;
            color: var(--foreground) !important;
            box-shadow: 0 4px 12px -2px rgb(0 0 0 / 0.1) !important;
            transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1) !important;
          }
          
          /* Glass color overlays */
          .mobile-action-buttons-container button[class*="bg-blue-500/10"] {
            background: rgba(59, 130, 246, 0.08) !important;
            border-color: rgba(59, 130, 246, 0.2) !important;
            color: #3b82f6 !important;
          }
          .mobile-action-buttons-container button[class*="bg-red-500/10"] {
            background: rgba(239, 68, 68, 0.08) !important;
            border-color: rgba(239, 68, 68, 0.2) !important;
            color: #ef4444 !important;
          }
          .mobile-action-buttons-container button[class*="bg-emerald-500/10"] {
            background: rgba(16, 185, 129, 0.08) !important;
            border-color: rgba(16, 185, 129, 0.2) !important;
            color: #10b981 !important;
          }

          .mobile-action-buttons-container button:active {
            scale: 0.97;
            background: rgba(var(--primary-rgb), 0.15) !important;
          }

          .mobile-action-buttons-container button svg {
            width: 22px !important;
            height: 22px !important;
            stroke-width: 2.5px !important;
          }
        }
      `}</style>
    </div>
  );
}
