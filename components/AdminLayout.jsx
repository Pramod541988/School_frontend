'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Button, Card, Col, Container, Row } from 'react-bootstrap';
import RequireAuth from '@/components/RequireAuth';
import { clearSession, getSession } from '@/lib/auth';
import menu from '@/lib/menu';

export default function AdminLayout({ title, subtitle, children }) {
  const pathname = usePathname();
  const router = useRouter();
  const session = typeof window !== 'undefined' ? getSession() : null;

  const handleLogout = () => {
    clearSession();
    router.replace('/login');
  };

  const roleLabel =
    session?.role ? `${session.role.charAt(0).toUpperCase()}${session.role.slice(1)}` : 'User';

  return (
    <RequireAuth>
      <div className="page-shell">
        <Container fluid>
          <Row>
            <Col md={3} lg={2} className="p-0">
              <div
                style={{
                  minHeight: '100vh',
                  background: 'linear-gradient(180deg, #16213e 0%, #243b72 100%)',
                  padding: '24px 18px',
                  color: '#fff',
                  position: 'sticky',
                  top: 0
                }}
              >
                <div className="mb-4">
                  <div style={{ fontSize: 22, fontWeight: 700 }}>Smart School</div>
                  <div style={{ fontSize: 13, color: '#dbe6ff' }}>{roleLabel} Portal</div>
                </div>

                {menu.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`sidebar-link ${pathname === item.href ? 'active' : ''}`}
                  >
                    {item.label}
                  </Link>
                ))}
              </div>
            </Col>

            <Col md={9} lg={10} className="p-4">
              <Card className="card-soft mb-4">
                <Card.Body className="d-flex justify-content-between align-items-center flex-wrap gap-3">
                  <div>
                    <div style={{ fontSize: 28, fontWeight: 700 }}>{title}</div>
                    <div style={{ color: '#667085' }}>{subtitle}</div>
                  </div>

                  <div className="d-flex align-items-center gap-3">
                    <div className="text-end">
                      <div style={{ fontWeight: 600 }}>{session?.name || 'User'}</div>
                      <div style={{ fontSize: 13, color: '#667085' }}>{session?.role || 'role'}</div>
                    </div>
                    <Button variant="outline-danger" onClick={handleLogout}>
                      Logout
                    </Button>
                  </div>
                </Card.Body>
              </Card>

              {children}
            </Col>
          </Row>
        </Container>
      </div>
    </RequireAuth>
  );
}
