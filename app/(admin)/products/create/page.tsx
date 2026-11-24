import Link from 'next/link';
import { CreateProductForm } from './create-product-form';
import { XIcon } from '@/components/ui/Icons';

export default function CreateProductPage() {
  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Create product</h1>
        <Link href="/products" className="btn btn-ghost">
          <XIcon style={{ width: 14, height: 14 }} />
          Back to products
        </Link>
      </div>
      <div className="card card-flat" style={{ maxWidth: 640 }}>
        <CreateProductForm />
      </div>
    </div>
  );
}
