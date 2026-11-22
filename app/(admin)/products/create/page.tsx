import { CreateProductForm } from './create-product-form';

export default function CreateProductPage() {
  return (
    <div>
      <div className="card" style={{ marginBottom: '1rem' }}>
        <h1 style={{ fontSize: '1.25rem', fontWeight: 600, margin: 0 }}>Create product</h1>
      </div>
      <div className="card">
        <CreateProductForm />
      </div>
    </div>
  );
}
