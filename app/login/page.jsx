'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Alert, Button, Card, Col, Container, Form, Row } from 'react-bootstrap';
import api from '@/lib/api';
import { saveSession } from '@/lib/auth';

const ROLE_DEFAULT_PASSWORDS = {
  admin: '',
  student: 'Student@123',
  parent: 'Parent@123',
  teacher: 'Teacher@123'
};

export default function LoginPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    role: 'admin',
    username: '',
    password: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const defaultHint = useMemo(() => {
    return ROLE_DEFAULT_PASSWORDS[form.role] || '';
  }, [form.role]);

  const onChange = (e) => {
    const { name, value } = e.target;
    setForm((s) => ({ ...s, [name]: value }));
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const payload = {
        role: form.role,
        username: form.username.trim(),
        password: form.password
      };

      const res = await api.post('/auth/login', payload);
      saveSession(res.data);

      if (res?.data?.must_change_password) {
        router.replace('/change-password');
        return;
      }

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
          <Col md={8} lg={5}>
            <Card className="card-soft border-0">
              <Card.Body className="p-4 p-md-5">
                <div className="text-center mb-4">
                  <div style={{ fontSize: 34, fontWeight: 800, color: '#1d3557' }}>Smart School</div>
                  <div style={{ color: '#667085' }}>Role-based Login</div>
                </div>

                {error ? <Alert variant="danger">{error}</Alert> : null}

                <Form onSubmit={onSubmit}>
                  <Form.Group className="mb-3">
                    <Form.Label>Role</Form.Label>
                    <Form.Select name="role" value={form.role} onChange={onChange}>
                      <option value="admin">Admin</option>
                      <option value="student">Student</option>
                      <option value="parent">Parent</option>
                      <option value="teacher">Teacher</option>
                    </Form.Select>
                  </Form.Group>

                  <Form.Group className="mb-3">
                    <Form.Label>Username</Form.Label>
                    <Form.Control
                      name="username"
                      value={form.username}
                      onChange={onChange}
                      placeholder={
                        form.role === 'student'
                          ? 'Enter roll number'
                          : form.role === 'teacher'
                            ? 'Enter employee ID'
                            : form.role === 'parent'
                              ? 'Enter phone number'
                              : 'Enter username'
                      }
                    />
                  </Form.Group>

                  <Form.Group className="mb-2">
                    <Form.Label>Password</Form.Label>
                    <Form.Control
                      type="password"
                      name="password"
                      value={form.password}
                      onChange={onChange}
                      placeholder="Enter password"
                    />
                  </Form.Group>

                  {defaultHint ? (
                    <div className="mb-3" style={{ fontSize: 13, color: '#667085' }}>
                      Default {form.role} password: <strong>{defaultHint}</strong>
                    </div>
                  ) : (
                    <div className="mb-3" style={{ fontSize: 13, color: '#667085' }}>
                      Use admin credentials configured in backend.
                    </div>
                  )}

                  <Button type="submit" className="w-100" disabled={loading}>
                    {loading ? 'Signing in...' : 'Login'}
                  </Button>
                </Form>

                <div className="mt-3 text-center">
                  <Link
                    href={`/forgot-password?role=${encodeURIComponent(form.role)}`}
                    style={{ textDecoration: 'none', fontWeight: 500 }}
                  >
                    Forgot password?
                  </Link>
                </div>

                <div className="mt-4" style={{ fontSize: 14, color: '#667085' }}>
                  First login will ask users to set a new password.
                </div>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      </Container>
    </div>
  );
}
