
import { generateInvoicePdf, InvoicePdfData } from '../workers/api/src/services/pdf.js';
import fs from 'fs';

const items = Array.from({ length: 50 }, (_, i) => ({
  description: `Bulk Service Item #${i + 1}\nTesting multiline and pagination logic for very long lists to ensure stability.`,
  quantity: 1,
  dayMonth: 1,
  unitPrice: 1000,
  amount: 1000,
}));

const testData: InvoicePdfData = {
  invoiceNumber: 'PAGINATION-TEST',
  invoiceDate: '20-Apr-2026',
  type: 'invoice',
  company: {
    name: 'Long List Enterprises',
    address: 'Pagination Avenue, Dhaka',
  },
  project: {
    title: '50-Item Stress Test',
    eventStartDate: '2026-06-01',
  },
  items,
  totalAmount: 50000,
  advanceReceived: 10000,
  payments: [
      { date: '10-Apr-26', amount: 5000, method: 'Cash' }
  ],
  multiplierLabel: 'Day',
  ownerName: 'The Marketing Solution',
  ownerUrl: 'https://themarketingsolution.com.bd'
};

async function test() {
  try {
    console.log('Generating 50-item PDF...');
    const pdfBytes = await generateInvoicePdf(testData);
    fs.writeFileSync('g:/hellotms.com.bd/scratch/multipage_test.pdf', pdfBytes);
    console.log('SUCCESS: Multipage PDF generated at scratch/multipage_test.pdf');
  } catch (err) {
    console.error('Error:', err);
  }
}

test();
