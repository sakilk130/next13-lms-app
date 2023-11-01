import { UserButton } from '@clerk/nextjs';

export default function HomePage() {
  return (
    <div>
      <h1>Dashboard</h1>
      <UserButton afterSignOutUrl="/" />
    </div>
  );
}
