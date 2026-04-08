'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Alert, Button, Card, Col, Container, Form, Row } from 'react-bootstrap';
import api from '@/lib/api';
import { getSession, updateSession } from '@/lib/auth';

export default function ChangePasswordPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    old_password: '',
    new_password: '',
    confirm_password: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [sessionReady, setSessionReady] = useState(false);

  useEffect(() => {
    const session = getSession();
    if (!session?.token) {
      router.replace('/login');
      return;
    }
    setSessionReady(true);
  }, [router]);

  const onChange = (e) => {
    const { name, value } = e.target;
    setForm((s) => ({ ...s, [name]: value }));
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (form.new_password !== form.confirm_password) {
      setError('New password and confirm password do not match');
      return;
    }

    setLoading(true);
    try {
      await api.post('/auth/change-password', {
        old_password: form.old_password,
        new_password: form.new_password
      });

      updateSession({ must_change_password: false });
      router.replace('/dashboard');
    } catch (err) {
      setError(err?.response?.data?.detail || 'Unable to change password');
    } finally {
      setLoading(false);
    }
  };

  if (!sessionReady) return null;

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #edf4ff 0%, #dfe9ff 100%)',
        display: 'flex',
        alignItems: 'center'
      }}
    >
      <Container>
        <Row className="justify-content-center">
          <Col md={8} lg={5}>
            <Card className="card-soft border-0">
              <Card.Body className="p-4 p-md-5">
                <div className="text-center mb-4">
                  <div style={{ fontSize: 30, fontWeight: 800, color: '#1d3557' }}>Set New Password</div>
                  <div style={{ color: '#667085' }}>
                    Your first login needs a fresh password before entering the portal
                  </div>
                </div>

                {error ? <Alert variant="danger">{error}</Alert> : null}

                <Form onSubmit={onSubmit}>
                  <Form.Group className="mb-3">
                    <Form.Label>Current Password</Form.Label>
                    <Form.Control
                      type="password"
                      name="old_password"
                      value={form.old_password}
                      onChange={onChange}
                      placeholder="Enter current password"
                    />
                  </Form.Group>

                  <Form.Group className="mb-3">
                    <Form.Label>New Password</Form.Label>
                    <Form.Control
                      type="password"
                      name="new_password"
                      value={form.new_password}
                      onChange={onChange}
                      placeholder="Enter new password"
                    />
                  </Form.Group>

                  <Form.Group className="mb-4">
                    <Form.Label>Confirm New Password</Form.Label>
                    <Form.Control
                      type="password"
                      name="confirm_password"
                      value={form.confirm_password}
                      onChange={onChange}
                      placeholder="Confirm new password"
                    />
                  </Form.Group>

                  <Button type="submit" className="w-100" disabled={loading}>
                    {loading ? 'Updating...' : 'Update Password'}
                  </Button>
                </Form>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      </Container>
    </div>
  );
}
