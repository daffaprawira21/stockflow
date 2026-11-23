import { AdjustStockForm } from './adjust-stock-form';

export default function AdjustStockPage() {
  return (
    <div>
      <div className="card" style={{ marginBottom: '1rem' }}>
        <h1 style={{ fontSize: '1.25rem', fontWeight: 600, margin: 0 }}>Adjust stock</h1>
      </div>
      <div className="card">
        <AdjustStockForm />
      </div>
    </div>
  );
}
