import os

filepath = r'g:\hellotms.com.bd\apps\admin\src\pages\ProjectDetailPage.tsx'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Update ledgerForm defaults
old_defaults = """    defaultValues: {
      project_id: id!,
      type: 'expense',
      paid_status: 'unpaid',
      entry_date: new Date().toISOString().split('T')[0],
      paid_amount: 0,
      due_amount: 0,
    },"""
new_defaults = """    defaultValues: {
      project_id: id!,
      type: 'expense',
      paid_status: 'unpaid',
      entry_date: new Date().toISOString().split('T')[0],
      paid_amount: 0,
      due_amount: 0,
      day_month: 1,
      quantity: 1,
    },"""

# Use string replace to avoid regex issues with large files
content = content.replace(old_defaults, new_defaults)

# 2. Update useEffect and watch variables
old_watch = """  const watchPaidStatus = ledgerForm.watch('paid_status');
  const watchAmount = ledgerForm.watch('amount');

  useEffect(() => {
    const amount = Number(watchAmount) || 0;"""

new_watch = """  const watchPaidStatus = ledgerForm.watch('paid_status');
  const watchAmountTotal = ledgerForm.watch('amount');
  const watchQty = ledgerForm.watch('quantity');
  const watchMultiplier = ledgerForm.watch('day_month');
  const watchFaceValue = ledgerForm.watch('face_value');

  useEffect(() => {
    const qty = Number(watchQty) || 1;
    const multi = Number(watchMultiplier) || 1;
    const rate = Number(watchFaceValue) || 0;
    if (rate > 0) {
      ledgerForm.setValue('amount', qty * multi * rate);
    }
  }, [watchQty, watchMultiplier, watchFaceValue, ledgerForm]);

  useEffect(() => {
    const amount = Number(watchAmountTotal) || 0;"""

content = content.replace(old_watch, new_watch)

# 3. Update watchAmount in the second useEffect (it was watchAmount before)
content = content.replace("}, [watchPaidStatus, watchAmount, ledgerForm]);", "}, [watchPaidStatus, watchAmountTotal, ledgerForm]);")

# 4. Update UI fields
old_ui = """          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className={`block text-sm font-medium mb-1 ${ledgerForm.watch('is_external') ? 'opacity-50' : ''}`}>Qty <span className="text-xs text-muted-foreground font-normal">(optional)</span></label>
              <input
                type="number"
                step="1"
                min="1"
                placeholder="1"
                disabled={ledgerForm.watch('is_external')}
                {...ledgerForm.register('quantity', { valueAsNumber: true })}
                className={`w-full border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50 disabled:bg-muted disabled:cursor-not-allowed ${ledgerForm.formState.errors.quantity ? 'border-red-500' : 'border-border'
                  }`}
              />
              {ledgerForm.formState.errors.quantity && (
                <p className="text-xs text-red-500 mt-1">{(ledgerForm.formState.errors.quantity as any)?.message}</p>
              )}
            </div>
            <div>
              <label className={`block text-sm font-medium mb-1 ${ledgerForm.watch('is_external') ? 'opacity-50' : ''}`}>Face Value / Sell Price <span className="text-xs text-muted-foreground font-normal">(optional)</span></label>
              <input
                type="number"
                step="0.01"
                min="0"
                placeholder="৳ 0"
                disabled={ledgerForm.watch('is_external')}
                {...ledgerForm.register('face_value', { valueAsNumber: true })}
                className={`w-full border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50 disabled:bg-muted disabled:cursor-not-allowed ${ledgerForm.formState.errors.face_value ? 'border-red-500' : 'border-border'
                  }`}
              />
              {ledgerForm.formState.errors.face_value && (
                <p className="text-xs text-red-500 mt-1">{(ledgerForm.formState.errors.face_value as any)?.message}</p>
              )}
            </div>
          </div>"""

new_ui = """          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className={`block text-sm font-medium mb-1 ${ledgerForm.watch('is_external') ? 'opacity-50' : ''}`}>Qty</label>
              <input
                type="number"
                step="1"
                min="1"
                placeholder="1"
                disabled={ledgerForm.watch('is_external')}
                {...ledgerForm.register('quantity', { valueAsNumber: true })}
                className={`w-full border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50 disabled:bg-muted disabled:cursor-not-allowed ${ledgerForm.formState.errors.quantity ? 'border-red-500' : 'border-border'
                  }`}
              />
            </div>
            <div>
              <label className={`block text-sm font-medium mb-1 ${ledgerForm.watch('is_external') ? 'opacity-50' : ''}`}>Day/Month</label>
              <input
                type="number"
                step="0.01"
                min="0.1"
                placeholder="1"
                disabled={ledgerForm.watch('is_external')}
                {...ledgerForm.register('day_month', { valueAsNumber: true })}
                className={`w-full border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50 disabled:bg-muted disabled:cursor-not-allowed ${ledgerForm.formState.errors.day_month ? 'border-red-500' : 'border-border'
                  }`}
              />
            </div>
            <div>
              <label className={`block text-sm font-medium mb-1 ${ledgerForm.watch('is_external') ? 'opacity-50' : ''}`}>Unit Price / Rate</label>
              <input
                type="number"
                step="0.01"
                min="0"
                placeholder="৳ 0"
                disabled={ledgerForm.watch('is_external')}
                {...ledgerForm.register('face_value', { valueAsNumber: true })}
                className={`w-full border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50 disabled:bg-muted disabled:cursor-not-allowed ${ledgerForm.formState.errors.face_value ? 'border-red-500' : 'border-border'
                  }`}
              />
            </div>
          </div>"""

content = content.replace(old_ui, new_ui)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
