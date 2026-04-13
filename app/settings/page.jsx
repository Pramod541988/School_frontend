'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Badge,
  Button,
  Card,
  Col,
  Form,
  InputGroup,
  Modal,
  Row,
  Spinner,
  Table,
} from 'react-bootstrap';
import AdminLayout from '@/components/AdminLayout';

const emptySubjectForm = {
  name: '',
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

function statusVariant(status) {
  if (status === 'Active') return 'success';
  if (status === 'Inactive') return 'secondary';
  return 'warning';
}

export default function SettingsPage() {
  const API_BASE = getApiBase();

  const [subjects, setSubjects] = useState([]);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const [showSubjectModal, setShowSubjectModal] = useState(false);
  const [editingSubjectId, setEditingSubjectId] = useState(null);
  const [subjectForm, setSubjectForm] = useState(emptySubjectForm);

  const [pageError, setPageError] = useState('');
  const [loading, setLoading] = useState(false);
  const [savingSubject, setSavingSubject] = useState(false);

  async function readJsonSafe(res) {
    const text = await res.text();
    try {
      return text ? JSON.parse(text) : {};
    } catch {
      return { detail: text || 'Unexpected server response' };
    }
  }

  async function loadSubjects() {
    if (!API_BASE) {
      setPageError('NEXT_PUBLIC_API_BASE is missing');
      return;
    }

    const endpoints = [
      `${API_BASE}/admin/settings/subjects`,
      `${API_BASE}/admin/subjects`,
    ];

    let loaded = false;
    let lastError = 'Failed to load subjects';

    for (const url of endpoints) {
      try {
        const res = await fetch(url, {
          method: 'GET',
          headers: authHeaders(),
          cache: 'no-store',
        });

        const data = await readJsonSafe(res);
        if (!res.ok) {
          lastError = data?.detail || lastError;
          continue;
        }

        const items = Array.isArray(data?.items)
          ? data.items
          : Array.isArray(data)
            ? data
            : [];

        setSubjects(items);
        loaded = true;
        break;
      } catch (err) {
        lastError = err?.message || lastError;
      }
    }

    if (!loaded) {
      setSubjects([]);
      throw new Error(lastError);
    }
  }

  async function refreshAll() {
    if (!API_BASE) {
      setPageError('NEXT_PUBLIC_API_BASE is missing');
      return;
    }

    try {
      setLoading(true);
      setPageError('');
      await loadSubjects();
    } catch (err) {
      setPageError(err?.message || 'Failed to load settings');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refreshAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredSubjects = useMemo(() => {
    return subjects.filter((item) => {
      const matchesQuery = !query.trim()
        || `${item.name || ''} ${item.status || ''}`.toLowerCase().includes(query.trim().toLowerCase());

      const matchesStatus = !statusFilter || item.status === statusFilter;

      return matchesQuery && matchesStatus;
    });
  }, [subjects, query, statusFilter]);

  const stats = useMemo(() => {
    const active = subjects.filter((x) => x.status === 'Active').length;
    const inactive = subjects.filter((x) => x.status === 'Inactive').length;

    return {
      total: subjects.length,
      active,
      inactive,
    };
  }, [subjects]);

  const openAddSubjectModal = () => {
    setEditingSubjectId(null);
    setSubjectForm(emptySubjectForm);
    setShowSubjectModal(true);
  };

  const openEditSubjectModal = (subject) => {
    setEditingSubjectId(subject.id);
    setSubjectForm({
      name: subject.name || '',
      status: subject.status || 'Active',
    });
    setShowSubjectModal(true);
  };

  const closeSubjectModal = () => {
    setEditingSubjectId(null);
    setSubjectForm(emptySubjectForm);
    setShowSubjectModal(false);
  };

  const saveSubject = async (e) => {
    e.preventDefault();

    if (!subjectForm.name.trim()) {
      alert('Subject name is required');
      return;
    }

    try {
      setSavingSubject(true);
      setPageError('');

      const payload = {
        name: subjectForm.name.trim(),
        status: subjectForm.status,
      };

      const endpoints = editingSubjectId
        ? [
            `${API_BASE}/admin/settings/subjects/${editingSubjectId}`,
            `${API_BASE}/admin/subjects/${editingSubjectId}`,
          ]
        : [
            `${API_BASE}/admin/settings/subjects`,
            `${API_BASE}/admin/subjects`,
          ];

      const method = editingSubjectId ? 'PUT' : 'POST';

      let saved = false;
      let lastError = 'Failed to save subject';

      for (const url of endpoints) {
        const res = await fetch(url, {
          method,
          headers: authHeaders(),
          body: JSON.stringify(payload),
        });

        const data = await readJsonSafe(res);
        if (!res.ok) {
          lastError = data?.detail || lastError;
          continue;
        }

        saved = true;
        break;
      }

      if (!saved) {
        throw new Error(lastError);
      }

      await refreshAll();
      closeSubjectModal();
    } catch (err) {
      setPageError(err?.message || 'Failed to save subject');
    } finally {
      setSavingSubject(false);
    }
  };

  const deleteSubject = async (subjectId) => {
    const ok = window.confirm('Delete this subject?');
    if (!ok) return;

    try {
      setPageError('');

      const endpoints = [
        `${API_BASE}/admin/settings/subjects/${subjectId}`,
        `${API_BASE}/admin/subjects/${subjectId}`,
      ];

      let deleted = false;
      let lastError = 'Failed to delete subject';

      for (const url of endpoints) {
        const res = await fetch(url, {
          method: 'DELETE',
          headers: authHeaders(),
        });

        const data = await readJsonSafe(res);
        if (!res.ok) {
          lastError = data?.detail || lastError;
          continue;
        }

        deleted = true;
        break;
      }

      if (!deleted) {
        throw new Error(lastError);
      }

      await refreshAll();
    } catch (err) {
      setPageError(err?.message || 'Failed to delete subject');
    }
  };

  return (
    <AdminLayout
      title="Settings"
      subtitle="Manage flexible master data for your school."
    >
      {pageError ? (
        <Alert variant="danger" className="mb-4">
          {pageError}
        </Alert>
      ) : null}

      <Row className="g-4 mb-4">
        <Col md={4}>
          <Card className="card-soft h-100">
            <Card.Body>
              <div className="metric-label">Total Subjects</div>
              <div className="metric-number">{stats.total}</div>
            </Card.Body>
          </Card>
        </Col>

        <Col md={4}>
          <Card className="card-soft h-100">
            <Card.Body>
              <div className="metric-label">Active Subjects</div>
              <div className="metric-number">{stats.active}</div>
            </Card.Body>
          </Card>
        </Col>

        <Col md={4}>
          <Card className="card-soft h-100">
            <Card.Body>
              <div className="metric-label">Inactive Subjects</div>
              <div className="metric-number">{stats.inactive}</div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <Row className="g-4">
        <Col lg={12}>
          <Card className="card-soft">
            <Card.Header className="bg-white border-0 pt-3">
              <div className="d-flex flex-wrap justify-content-between align-items-center gap-2">
                <div>
                  <h5 className="mb-1">Subjects Master</h5>
                  <div className="text-muted small">
                    Create subjects here so Teachers page can load school-specific subject options.
                  </div>
                </div>

                <Button onClick={openAddSubjectModal}>Add Subject</Button>
              </div>
            </Card.Header>

            <Card.Body>
              <Row className="g-3 align-items-center mb-4">
                <Col md={8} lg={6}>
                  <InputGroup>
                    <InputGroup.Text>Search</InputGroup.Text>
                    <Form.Control
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      placeholder="Search subject name or status"
                    />
                  </InputGroup>
                </Col>

                <Col md={4} lg={3}>
                  <Form.Select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                  >
                    <option value="">All Status</option>
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </Form.Select>
                </Col>
              </Row>

              {loading ? (
                <div className="text-center py-4">
                  <Spinner animation="border" />
                </div>
              ) : (
                <Table responsive hover>
                  <thead>
                    <tr>
                      <th style={{ width: 80 }}>#</th>
                      <th>Subject Name</th>
                      <th>Status</th>
                      <th style={{ width: 180 }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredSubjects.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="text-center py-4">
                          No subjects found
                        </td>
                      </tr>
                    ) : (
                      filteredSubjects.map((subject, index) => (
                        <tr key={subject.id}>
                          <td>{index + 1}</td>
                          <td>{subject.name}</td>
                          <td>
                            <Badge bg={statusVariant(subject.status)}>
                              {subject.status}
                            </Badge>
                          </td>
                          <td>
                            <div className="d-flex gap-2">
                              <Button
                                size="sm"
                                variant="outline-primary"
                                onClick={() => openEditSubjectModal(subject)}
                              >
                                Edit
                              </Button>
                              <Button
                                size="sm"
                                variant="outline-danger"
                                onClick={() => deleteSubject(subject.id)}
                              >
                                Delete
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </Table>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <Modal show={showSubjectModal} onHide={closeSubjectModal} centered>
        <Form onSubmit={saveSubject}>
          <Modal.Header closeButton>
            <Modal.Title>
              {editingSubjectId ? 'Edit Subject' : 'Add Subject'}
            </Modal.Title>
          </Modal.Header>

          <Modal.Body>
            <Form.Group className="mb-3">
              <Form.Label>Subject Name</Form.Label>
              <Form.Control
                value={subjectForm.name}
                onChange={(e) =>
                  setSubjectForm((prev) => ({ ...prev, name: e.target.value }))
                }
                placeholder="Enter subject name"
                required
              />
            </Form.Group>

            <Form.Group>
              <Form.Label>Status</Form.Label>
              <Form.Select
                value={subjectForm.status}
                onChange={(e) =>
                  setSubjectForm((prev) => ({ ...prev, status: e.target.value }))
                }
              >
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </Form.Select>
            </Form.Group>
          </Modal.Body>

          <Modal.Footer>
            <Button variant="outline-secondary" onClick={closeSubjectModal} disabled={savingSubject}>
              Cancel
            </Button>
            <Button type="submit" disabled={savingSubject}>
              {savingSubject
                ? 'Saving...'
                : editingSubjectId
                  ? 'Update Subject'
                  : 'Save Subject'}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </AdminLayout>
  );
}
