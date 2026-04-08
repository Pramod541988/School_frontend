'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Alert, Button, Card, Col, Container, Form, Row } from 'react-bootstrap';
import api from '@/lib/api';
import { saveSession } from '@/lib/auth';

export default function LoginPage() {
  const router = useRouter();
  const [form, setForm] = useState({ username: 'admin1', password: '123456' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const onChange = (e) => {
    setForm((s) => ({ ...s, [e.target.name]: e.target.value }));
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await api.post('/auth/login', form);
      saveSession(res.data);
      router.replace('/dashboard');
    } catch (err) {
      setError(err?.response?.data?.detail || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

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
          <Col md={7} lg={5}>
            <Card className="card-soft border-0">
              <Card.Body className="p-4 p-md-5">
                <div className="text-center mb-4">
                  <div style={{ fontSize: 34, fontWeight: 800, color: '#1d3557' }}>Smart School</div>
                  <div style={{ color: '#667085' }}>Admin Portal Login</div>
                </div>

                {error ? <Alert variant="danger">{error}</Alert> : null}

                <Form onSubmit={onSubmit}>
                  <Form.Group className="mb-3">
                    <Form.Label>Username</Form.Label>
                    <Form.Control
                      name="username"
                      value={form.username}
                      onChange={onChange}
                      placeholder="Enter username"
                    />
                  </Form.Group>

                  <Form.Group className="mb-4">
                    <Form.Label>Password</Form.Label>
                    <Form.Control
                      type="password"
                      name="password"
                      value={form.password}
                      onChange={onChange}
                      placeholder="Enter password"
                    />
                  </Form.Group>

                  <Button type="submit" className="w-100" disabled={loading}>
                    {loading ? 'Signing in...' : 'Login'}
                  </Button>
                </Form>

                <div className="mt-4" style={{ fontSize: 14, color: '#667085' }}>
                  Demo: <strong>admin1</strong> / <strong>123456</strong>
                </div>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      </Container>
    </div>
  );
}
