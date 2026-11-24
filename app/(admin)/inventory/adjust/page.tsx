import Link from 'next/link';
import { AdjustStockForm } from './adjust-stock-form';
import { XIcon } from '@/components/ui/Icons';

export default function AdjustStockPage() {
  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Adjust stock</h1>
        <Link href="/inventory" className="btn btn-ghost">
          <XIcon style={{ width: 14, height: 14 }} />
          Back to inventory
        </Link>
      </div>
      <div className="card card-flat" style={{ maxWidth: 640 }}>
        <AdjustStockForm />
      </div>
    </div>
  );
}
