'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Badge,
  Button,
  Card,
  Col,
  Form,
  InputGroup,
  Modal,
  Row,
  Table,
  Alert,
  Spinner
} from 'react-bootstrap';
import AdminLayout from '@/components/AdminLayout';

const emptyForm = {
  name: '',
  sectionsText: '',
  classTeacher: '',
  status: 'Active',
};

function getApiBase() {
  return (process.env.NEXT_PUBLIC_API_BASE || '').replace(/\/$/, '');
}

function getAuthToken() {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem('ss_admin_token') || '';
}

function authHeaders(extra = {}) {
  const token = getAuthToken();
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...extra,
  };
}

export default function ClassesPage() {
  const API_BASE = getApiBase();

  const [classes, setClasses] = useState([]);
  const [query, setQuery] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  async function readJsonSafe(res) {
    const text = await res.text();
    try {
      return text ? JSON.parse(text) : {};
    } catch {
      return { detail: text || 'Unexpected server response' };
    }
  }

  async function loadClasses() {
    if (!API_BASE) {
      setError('NEXT_PUBLIC_API_BASE is missing');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await fetch(`${API_BASE}/admin/classes`, {
        method: 'GET',
        headers: authHeaders(),
        cache: 'no-store',
      });

      const data = await readJsonSafe(res);
      if (!res.ok) throw new Error(data?.detail || 'Failed to load classes');

      setClasses(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(e.message || 'Failed to load classes');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadClasses();
  }, []);

  const filteredClasses = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return classes;

    return classes.filter((item) =>
      [
        item.name,
        ...(item.sections || []),
        item.class_teacher,
        item.status,
      ]
        .join(' ')
        .toLowerCase()
        .includes(q)
    );
  }, [classes, query]);

  const openAddModal = () => {
    setEditingId(null);
    setForm(emptyForm);
    setShowModal(true);
  };

  const openEditModal = (item) => {
    setEditingId(item.id);
    setForm({
      name: item.name || '',
      sectionsText: Array.isArray(item.sections) ? item.sections.join(', ') : '',
      classTeacher: item.class_teacher || '',
      status: item.status || 'Active',
    });
    setShowModal(true);
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!API_BASE) {
      setError('NEXT_PUBLIC_API_BASE is missing');
      return;
    }

    setSaving(true);

    try {
      const payload = {
        name: form.name.trim(),
        sections: form.sectionsText
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
        class_teacher: form.classTeacher.trim(),
        status: form.status,
      };

      const url = editingId
        ? `${API_BASE}/admin/classes/${editingId}`
        : `${API_BASE}/admin/classes`;

      const method = editingId ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: authHeaders(),
        body: JSON.stringify(payload),
      });

      const data = await readJsonSafe(res);
      if (!res.ok) throw new Error(data?.detail || 'Failed to save class');

      await loadClasses();
      setShowModal(false);
    } catch (err) {
      alert(err?.message || 'Failed to save class');
    } finally {
      setSaving(false);
    }
  };

  const deleteClass = async (id) => {
    if (!confirm('Delete class?')) return;
    if (!API_BASE) {
      setError('NEXT_PUBLIC_API_BASE is missing');
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/admin/classes/${id}`, {
        method: 'DELETE',
        headers: authHeaders(),
      });

      const data = await readJsonSafe(res);
      if (!res.ok) throw new Error(data?.detail || 'Failed to delete class');

      await loadClasses();
    } catch (err) {
      alert(err?.message || 'Failed to delete class');
    }
  };

  return (
    <AdminLayout title="Classes" subtitle="Create classes, sections, and class teachers.">
      {error ? <Alert variant="danger">{error}</Alert> : null}

      <Card>
        <Card.Body>
          <Row className="mb-3">
            <Col md={8}>
              <InputGroup>
                <InputGroup.Text>Search</InputGroup.Text>
                <Form.Control
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search class, section, teacher"
                />
              </InputGroup>
            </Col>

            <Col md={4} className="text-end">
              <Button onClick={openAddModal}>Add Class</Button>
            </Col>
          </Row>

          {loading ? (
            <div className="text-center py-4">
              <Spinner />
            </div>
          ) : (
            <Table hover responsive>
              <thead>
                <tr>
                  <th>Class</th>
                  <th>Sections</th>
                  <th>Teacher</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredClasses.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center py-4">No classes found</td>
                  </tr>
                ) : (
                  filteredClasses.map((c) => (
                    <tr key={c.id}>
                      <td>{c.name}</td>
                      <td>{(c.sections || []).join(', ')}</td>
                      <td>{c.class_teacher}</td>
                      <td>
                        <Badge bg={c.status === 'Active' ? 'success' : 'secondary'}>
                          {c.status}
                        </Badge>
                      </td>
                      <td>
                        <Button size="sm" onClick={() => openEditModal(c)}>Edit</Button>{' '}
                        <Button size="sm" variant="danger" onClick={() => deleteClass(c.id)}>
                          Delete
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </Table>
          )}
        </Card.Body>
      </Card>

      <Modal show={showModal} onHide={() => setShowModal(false)} centered>
        <Form onSubmit={onSubmit}>
          <Modal.Header closeButton>
            <Modal.Title>{editingId ? 'Edit Class' : 'Add Class'}</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <Form.Group className="mb-3">
              <Form.Label>Class Name</Form.Label>
              <Form.Control
                value={form.name}
                onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))}
                required
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Sections</Form.Label>
              <Form.Control
                value={form.sectionsText}
                onChange={(e) => setForm((s) => ({ ...s, sectionsText: e.target.value }))}
                placeholder="A, B, C"
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Class Teacher</Form.Label>
              <Form.Control
                value={form.classTeacher}
                onChange={(e) => setForm((s) => ({ ...s, classTeacher: e.target.value }))}
              />
            </Form.Group>

            <Form.Group>
              <Form.Label>Status</Form.Label>
              <Form.Select
                value={form.status}
                onChange={(e) => setForm((s) => ({ ...s, status: e.target.value }))}
              >
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </Form.Select>
            </Form.Group>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowModal(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? 'Saving...' : editingId ? 'Update' : 'Create'}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </AdminLayout>
  );
}
