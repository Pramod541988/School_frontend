'use client';

import { useEffect, useState } from 'react';
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

const API_BASE = process.env.NEXT_PUBLIC_API_BASE;

function getToken() {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem('token') || '';
}

export default function ClassesPage() {
  const [classes, setClasses] = useState([]);
  const [query, setQuery] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${getToken()}`
  };

  async function loadClasses() {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/admin/classes`, { headers });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail);
      setClasses(data);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadClasses();
  }, []);

  const openAddModal = () => {
    setEditingId(null);
    setForm(emptyForm);
    setShowModal(true);
  };

  const openEditModal = (item) => {
    setEditingId(item.id);
    setForm({
      name: item.name,
      sectionsText: item.sections.join(', '),
      classTeacher: item.class_teacher,
      status: item.status
    });
    setShowModal(true);
  };

  const onSubmit = async (e) => {
    e.preventDefault();

    const payload = {
      name: form.name,
      sections: form.sectionsText.split(',').map(s => s.trim()),
      class_teacher: form.classTeacher,
      status: form.status
    };

    const url = editingId
      ? `${API_BASE}/admin/classes/${editingId}`
      : `${API_BASE}/admin/classes`;

    const method = editingId ? 'PUT' : 'POST';

    const res = await fetch(url, {
      method,
      headers,
      body: JSON.stringify(payload)
    });

    const data = await res.json();
    if (!res.ok) return alert(data.detail);

    loadClasses();
    setShowModal(false);
  };

  const deleteClass = async (id) => {
    if (!confirm('Delete class?')) return;

    const res = await fetch(`${API_BASE}/admin/classes/${id}`, {
      method: 'DELETE',
      headers
    });

    const data = await res.json();
    if (!res.ok) return alert(data.detail);

    loadClasses();
  };

  return (
    <AdminLayout title="Classes">

      {error && <Alert variant="danger">{error}</Alert>}

      <Card>
        <Card.Body>

          <Row className="mb-3">
            <Col>
              <InputGroup>
                <InputGroup.Text>Search</InputGroup.Text>
                <Form.Control
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </InputGroup>
            </Col>

            <Col className="text-end">
              <Button onClick={openAddModal}>Add Class</Button>
            </Col>
          </Row>

          {loading ? (
            <div className="text-center">
              <Spinner />
            </div>
          ) : (
            <Table hover>
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
                {classes.map(c => (
                  <tr key={c.id}>
                    <td>{c.name}</td>
                    <td>{c.sections.join(', ')}</td>
                    <td>{c.class_teacher}</td>
                    <td>
                      <Badge bg="success">{c.status}</Badge>
                    </td>
                    <td>
                      <Button size="sm" onClick={() => openEditModal(c)}>Edit</Button>{' '}
                      <Button size="sm" variant="danger" onClick={() => deleteClass(c.id)}>Delete</Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}

        </Card.Body>
      </Card>

      <Modal show={showModal} onHide={() => setShowModal(false)}>
        <Form onSubmit={onSubmit}>
          <Modal.Header closeButton>
            <Modal.Title>{editingId ? 'Edit' : 'Add'} Class</Modal.Title>
          </Modal.Header>

          <Modal.Body>

            <Form.Group>
              <Form.Label>Class</Form.Label>
              <Form.Control
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </Form.Group>

            <Form.Group className="mt-2">
              <Form.Label>Sections</Form.Label>
              <Form.Control
                value={form.sectionsText}
                onChange={(e) => setForm({ ...form, sectionsText: e.target.value })}
              />
            </Form.Group>

            <Form.Group className="mt-2">
              <Form.Label>Teacher</Form.Label>
              <Form.Control
                value={form.classTeacher}
                onChange={(e) => setForm({ ...form, classTeacher: e.target.value })}
              />
            </Form.Group>

          </Modal.Body>

          <Modal.Footer>
            <Button type="submit">Save</Button>
          </Modal.Footer>
        </Form>
      </Modal>

    </AdminLayout>
  );
}
