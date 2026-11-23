import { CreateOrderForm } from './create-order-form';

export default function CreateOrderPage() {
  return (
    <div>
      <div className="card" style={{ marginBottom: '1rem' }}>
        <h1 style={{ fontSize: '1.25rem', fontWeight: 600, margin: 0 }}>Create order</h1>
      </div>
      <div className="card">
        <CreateOrderForm />
      </div>
    </div>
  );
}
