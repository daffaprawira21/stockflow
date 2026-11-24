import Link from 'next/link';
import { CreateOrderForm } from './create-order-form';
import { XIcon } from '@/components/ui/Icons';

export default function CreateOrderPage() {
  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Create order</h1>
        <Link href="/orders" className="btn btn-ghost">
          <XIcon style={{ width: 14, height: 14 }} />
          Back to orders
        </Link>
      </div>
      <div className="card card-flat" style={{ maxWidth: 720 }}>
        <CreateOrderForm />
      </div>
    </div>
  );
}
