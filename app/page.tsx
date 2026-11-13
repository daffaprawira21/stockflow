import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/modules/auth/current-user';
import { LogoutButton } from './logout-button';

export default async function HomePage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/login');
  }

  return (
    <main>
      <h1>Welcome to StockFlow</h1>
      <p>Inventory and order management for your business.</p>
      <p>Signed in as {user.email}.</p>
      <LogoutButton />
    </main>
  );
}
