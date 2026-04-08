'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Spinner } from 'react-bootstrap';
import { getSession } from '@/lib/auth';

export default function RequireAuth({ children }) {
  const router = useRouter();
  const pathname = usePathname();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const session = getSession();

    if (!session?.token) {
      router.replace('/login');
      return;
    }

    if (session.mustChangePassword && pathname !== '/change-password') {
      router.replace('/change-password');
      return;
    }

    setReady(true);
  }, [pathname, router]);

  if (!ready) {
    return (
      <div
        className="d-flex align-items-center justify-content-center"
        style={{ minHeight: '100vh' }}
      >
        <Spinner animation="border" />
      </div>
    );
  }

  return children;
}
