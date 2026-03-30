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

const SUBJECT_OPTIONS = [
  'Kannada',
  'English',
  'Hindi',
  'Mathematics',
  'Science',
  'EVS',
];

const emptyForm = {
  teacherName: '',
  employeeId: '',
  phone: '',
  email: '',
  subjects: [],
  status: 'Active',
  selectedClassId: '',
  linkedClasses: [],
  setAsPrimaryTeacher: true,
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

function parseSubjects(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value.filter(Boolean);
  return String(value)
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

export default function TeachersPage() {
  const API_BASE = getApiBase();

  const [teachers, setTeachers] = useState([]);
  const [classes, setClasses] = useState([]);

  const [query, setQuery] = useState('');
  const [classFilter, setClassFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState({});
  const [pageError, setPageError] = useState('');
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
    const res = await fetch(`${API_BASE}/admin/classes`, {
      method: 'GET',
      headers: authHeaders(),
      cache: 'no-store',
    });
    const data = await readJsonSafe(res);
    if (!res.ok) throw new Error(data?.detail || 'Failed to load classes');
    setClasses(Array.isArray(data) ? data : []);
  }

  async function loadTeachers() {
    const params = new URLSearchParams();
    if (query.trim()) params.set('search', query.trim());
    if (classFilter) params.set('class_id', classFilter);
    if (statusFilter) params.set('status', statusFilter);

    const qs = params.toString();
    const res = await fetch(`${API_BASE}/admin/teachers${qs ? `?${qs}` : ''}`, {
      method: 'GET',
      headers: authHeaders(),
      cache: 'no-store',
    });
    const data = await readJsonSafe(res);
    if (!res.ok) throw new Error(data?.detail || 'Failed to load teachers');
    setTeachers(Array.isArray(data?.items) ? data.items : []);
  }

  async function refreshAll() {
    if (!API_BASE) {
      setPageError('NEXT_PUBLIC_API_BASE is missing');
      return;
    }

    try {
      setLoading(true);
      setPageError('');
      await Promise.all([loadClasses(), loadTeachers()]);
    } catch (err) {
      setPageError(err?.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refreshAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!API_BASE) return;
    const t = setTimeout(() => {
      loadTeachers().catch((err) => {
        setPageError(err?.message || 'Failed to load teachers');
      });
    }, 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, classFilter, statusFilter]);

  const stats = useMemo(() => {
    const active = teachers.filter((x) => x.status === 'Active').length;
    const inactive = teachers.filter((x) => x.status === 'Inactive').length;
    const linkedClasses = teachers.reduce((sum, item) => sum + (item.class_count || 0), 0);
    return {
      total: teachers.length,
      active,
      inactive,
      linkedClasses,
    };
  }, [teachers]);

  const openAddModal = () => {
    setEditingId(null);
    setForm(emptyForm);
    setErrors({});
    setShowModal(true);
  };

  const openEditModal = (teacher) => {
    setEditingId(teacher.id);
    setForm({
      teacherName: teacher.teacher_name || '',
      employeeId: teacher.employee_id || '',
      phone: teacher.phone || '',
      email: teacher.email || '',
      subjects: parseSubjects(teacher.subjects),
      status: teacher.status || 'Active',
      selectedClassId: '',
      linkedClasses: (teacher.classes || []).map((c) => ({
        id: c.id,
        name: c.name,
        sections: c.sections || [],
        is_primary: !!c.is_primary,
      })),
      setAsPrimaryTeacher: (teacher.classes || []).some((x) => x.is_primary),
    });
    setErrors({});
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingId(null);
    setForm(emptyForm);
    setErrors({});
  };

  const onChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
    setErrors((prev) => ({ ...prev, [name]: '' }));
  };

  const addSelectedClass = () => {
    const chosen = classes.find((x) => String(x.id) === String(form.selectedClassId));
    if (!chosen) return;

    const alreadyExists = form.linkedClasses.some((x) => x.id === chosen.id);
    if (alreadyExists) return;

    setForm((prev) => ({
      ...prev,
      linkedClasses: [
        ...prev.linkedClasses,
        {
          id: chosen.id,
          name: chosen.name,
          sections: chosen.sections || [],
          is_primary: prev.linkedClasses.length === 0,
        },
      ],
      selectedClassId: '',
    }));
  };

  const removeLinkedClass = (classId) => {
    setForm((prev) => {
      const nextLinked = prev.linkedClasses.filter((x) => x.id !== classId);
      const hasPrimary = nextLinked.some((x) => x.is_primary);

      return {
        ...prev,
        linkedClasses: hasPrimary
          ? nextLinked
          : nextLinked.map((x, index) => ({
              ...x,
              is_primary: index === 0,
            })),
      };
    });
  };

  const setPrimaryClass = (classId) => {
    setForm((prev) => ({
      ...prev,
      linkedClasses: prev.linkedClasses.map((x) => ({
        ...x,
        is_primary: x.id === classId,
      })),
    }));
  };

  const validate = () => {
    const nextErrors = {};

    if (!form.teacherName.trim()) nextErrors.teacherName = 'Teacher name is required';
    if (!form.employeeId.trim()) nextErrors.employeeId = 'Employee ID is required';

    if (form.phone.trim() && !/^[0-9]{10}$/.test(form.phone.trim())) {
      nextErrors.phone = 'Phone number must be 10 digits';
    }

    if (form.email.trim() && !/^\S+@\S+\.\S+$/.test(form.email.trim())) {
      nextErrors.email = 'Invalid email address';
    }

    if (form.subjects.length === 0) {
      nextErrors.subjects = 'Please select at least one subject';
    }

    if (form.linkedClasses.length === 0) {
      nextErrors.linkedClasses = 'Please link at least one class';
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    const payload = {
      teacher_name: form.teacherName.trim(),
      employee_id: form.employeeId.trim(),
      phone: form.phone.trim(),
      email: form.email.trim(),
      subjects: form.subjects.join(', '),
      status: form.status,
      set_as_primary_teacher: form.setAsPrimaryTeacher,
      class_links: form.linkedClasses.map((x) => ({
        class_id: x.id,
        is_primary: !!x.is_primary,
      })),
    };

    try {
      setSaving(true);
      setPageError('');

      const url = editingId
        ? `${API_BASE}/admin/teachers/${editingId}`
        : `${API_BASE}/admin/teachers`;

      const method = editingId ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: authHeaders(),
        body: JSON.stringify(payload),
      });

      const data = await readJsonSafe(res);
      if (!res.ok) throw new Error(data?.detail || 'Failed to save teacher');

      await Promise.all([loadTeachers(), loadClasses()]);
      closeModal();
    } catch (err) {
      setPageError(err?.message || 'Failed to save teacher');
    } finally {
      setSaving(false);
    }
  };

  const deleteTeacher = async (id) => {
    const ok = window.confirm('Delete this teacher?');
    if (!ok) return;

    try {
      setPageError('');
      const res = await fetch(`${API_BASE}/admin/teachers/${id}`, {
        method: 'DELETE',
        headers: authHeaders(),
      });

      const data = await readJsonSafe(res);
      if (!res.ok) throw new Error(data?.detail || 'Failed to delete teacher');

      await Promise.all([loadTeachers(), loadClasses()]);
    } catch (err) {
      setPageError(err?.message || 'Failed to delete teacher');
    }
  };

  return (
    <AdminLayout
      title="Teachers"
      subtitle="Manage teacher master and link classes cleanly."
    >
      {pageError ? (
        <Alert variant="danger" className="mb-4">
          {pageError}
        </Alert>
      ) : null}

      <Row className="g-4 mb-4">
        <Col md={3}>
          <Card className="card-soft h-100">
            <Card.Body>
              <div className="metric-label">Total Teachers</div>
              <div className="metric-number">{stats.total}</div>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="card-soft h-100">
            <Card.Body>
              <div className="metric-label">Active</div>
              <div className="metric-number">{stats.active}</div>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="card-soft h-100">
            <Card.Body>
              <div className="metric-label">Inactive</div>
              <div className="metric-number">{stats.inactive}</div>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="card-soft h-100">
            <Card.Body>
              <div className="metric-label">Linked Classes</div>
              <div className="metric-number">{stats.linkedClasses}</div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <Card className="card-soft">
        <Card.Body>
          <Row className="g-3 align-items-center mb-4">
            <Col md={12} lg={4}>
              <InputGroup>
                <InputGroup.Text>Search</InputGroup.Text>
                <Form.Control
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Teacher, employee ID, class..."
                />
              </InputGroup>
            </Col>

            <Col md={6} lg={3}>
              <Form.Select
                value={classFilter}
                onChange={(e) => setClassFilter(e.target.value)}
              >
                <option value="">All Classes</option>
                {classes.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </Form.Select>
            </Col>

            <Col md={6} lg={3}>
              <Form.Select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="">All Status</option>
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </Form.Select>
            </Col>

            <Col lg={2} className="text-lg-end">
              <Button onClick={openAddModal}>Add Teacher</Button>
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
                  <th>Teacher Name</th>
                  <th>Employee ID</th>
                  <th>Phone</th>
                  <th>Subjects</th>
                  <th>Linked Classes</th>
                  <th>Status</th>
                  <th style={{ width: 180 }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {teachers.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-4">
                      No teachers found
                    </td>
                  </tr>
                ) : (
                  teachers.map((teacher) => (
                    <tr key={teacher.id}>
                      <td>{teacher.teacher_name}</td>
                      <td>{teacher.employee_id}</td>
                      <td>{teacher.phone || '-'}</td>
                      <td>
                        {teacher.subjects ? (
                          <div className="d-flex flex-wrap gap-1">
                            {parseSubjects(teacher.subjects).map((subject) => (
                              <Badge key={subject} bg="info">
                                {subject}
                              </Badge>
                            ))}
                          </div>
                        ) : (
                          '-'
                        )}
                      </td>
                      <td>
                        <div className="d-flex flex-wrap gap-1">
                          {(teacher.classes || []).map((c) => (
                            <Badge key={c.id} bg={c.is_primary ? 'primary' : 'secondary'}>
                              {c.name}
                            </Badge>
                          ))}
                        </div>
                      </td>
                      <td>
                        <Badge bg={statusVariant(teacher.status)}>
                          {teacher.status}
                        </Badge>
                      </td>
                      <td>
                        <div className="d-flex gap-2">
                          <Button
                            size="sm"
                            variant="outline-primary"
                            onClick={() => openEditModal(teacher)}
                          >
                            Edit
                          </Button>
                          <Button
                            size="sm"
                            variant="outline-danger"
                            onClick={() => deleteTeacher(teacher.id)}
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

      <Modal show={showModal} onHide={closeModal} size="lg" centered>
        <Form onSubmit={onSubmit}>
          <Modal.Header closeButton>
            <Modal.Title>{editingId ? 'Edit Teacher' : 'Add Teacher'}</Modal.Title>
          </Modal.Header>

          <Modal.Body>
            <Row className="g-3">
              <Col md={6}>
                <Form.Group>
                  <Form.Label>Teacher Name</Form.Label>
                  <Form.Control
                    name="teacherName"
                    value={form.teacherName}
                    onChange={onChange}
                    isInvalid={!!errors.teacherName}
                    placeholder="Enter teacher name"
                  />
                  <Form.Control.Feedback type="invalid">
                    {errors.teacherName}
                  </Form.Control.Feedback>
                </Form.Group>
              </Col>

              <Col md={6}>
                <Form.Group>
                  <Form.Label>Employee ID</Form.Label>
                  <Form.Control
                    name="employeeId"
                    value={form.employeeId}
                    onChange={onChange}
                    isInvalid={!!errors.employeeId}
                    placeholder="Enter employee ID"
                  />
                  <Form.Control.Feedback type="invalid">
                    {errors.employeeId}
                  </Form.Control.Feedback>
                </Form.Group>
              </Col>

              <Col md={6}>
                <Form.Group>
                  <Form.Label>Phone</Form.Label>
                  <Form.Control
                    name="phone"
                    value={form.phone}
                    onChange={onChange}
                    isInvalid={!!errors.phone}
                    placeholder="Optional"
                  />
                  <Form.Control.Feedback type="invalid">
                    {errors.phone}
                  </Form.Control.Feedback>
                </Form.Group>
              </Col>

              <Col md={6}>
                <Form.Group>
                  <Form.Label>Email</Form.Label>
                  <Form.Control
                    name="email"
                    value={form.email}
                    onChange={onChange}
                    isInvalid={!!errors.email}
                    placeholder="Optional"
                  />
                  <Form.Control.Feedback type="invalid">
                    {errors.email}
                  </Form.Control.Feedback>
                </Form.Group>
              </Col>

              <Col md={12}>
                <Form.Group>
                  <Form.Label>Subjects</Form.Label>
                  <Form.Select
                    multiple
                    value={form.subjects}
                    onChange={(e) => {
                      const values = Array.from(
                        e.target.selectedOptions,
                        (option) => option.value
                      );
                      setForm((prev) => ({
                        ...prev,
                        subjects: values,
                      }));
                      setErrors((prev) => ({ ...prev, subjects: '' }));
                    }}
                    isInvalid={!!errors.subjects}
                    style={{ minHeight: 140 }}
                  >
                    {SUBJECT_OPTIONS.map((subject) => (
                      <option key={subject} value={subject}>
                        {subject}
                      </option>
                    ))}
                  </Form.Select>
                  <Form.Control.Feedback type="invalid">
                    {errors.subjects}
                  </Form.Control.Feedback>
                  <div className="small text-muted mt-1">
                    Hold Ctrl (Windows) or Cmd (Mac) to select multiple subjects
                  </div>

                  {form.subjects.length > 0 ? (
                    <div className="d-flex flex-wrap gap-1 mt-2">
                      {form.subjects.map((subject) => (
                        <Badge key={subject} bg="info">
                          {subject}
                        </Badge>
                      ))}
                    </div>
                  ) : null}
                </Form.Group>
              </Col>

              <Col md={6}>
                <Form.Group>
                  <Form.Label>Status</Form.Label>
                  <Form.Select
                    name="status"
                    value={form.status}
                    onChange={onChange}
                  >
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </Form.Select>
                </Form.Group>
              </Col>

              <Col md={12}>
                <hr />
                <h6 className="mb-3">Link Classes</h6>
              </Col>

              <Col md={9}>
                <Form.Group>
                  <Form.Label>Class</Form.Label>
                  <Form.Select
                    name="selectedClassId"
                    value={form.selectedClassId}
                    onChange={onChange}
                  >
                    <option value="">Select class</option>
                    {classes.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name} ({(item.sections || []).join(', ')})
                      </option>
                    ))}
                  </Form.Select>
                </Form.Group>
              </Col>

              <Col md={3} className="d-flex align-items-end">
                <Button
                  type="button"
                  className="w-100"
                  onClick={addSelectedClass}
                  disabled={!form.selectedClassId}
                >
                  Add Class
                </Button>
              </Col>

              <Col md={12}>
                <Form.Check
                  type="checkbox"
                  name="setAsPrimaryTeacher"
                  checked={form.setAsPrimaryTeacher}
                  onChange={onChange}
                  label="Set linked primary class teacher based on selected class mapping"
                />
                {errors.linkedClasses ? (
                  <div className="text-danger small mt-2">{errors.linkedClasses}</div>
                ) : null}
              </Col>

              <Col md={12}>
                <Card className="bg-light border-0">
                  <Card.Body>
                    <div className="fw-semibold mb-2">Linked Classes</div>
                    {form.linkedClasses.length === 0 ? (
                      <div className="text-muted">No classes linked yet</div>
                    ) : (
                      <div className="d-flex flex-column gap-2">
                        {form.linkedClasses.map((item) => (
                          <div
                            key={item.id}
                            className="d-flex flex-wrap justify-content-between align-items-center border rounded p-2 bg-white"
                          >
                            <div>
                              <div className="fw-semibold">{item.name}</div>
                              <div className="small text-muted">
                                Sections: {(item.sections || []).join(', ') || '-'}
                              </div>
                            </div>

                            <div className="d-flex gap-2 mt-2 mt-md-0">
                              <Button
                                type="button"
                                size="sm"
                                variant={item.is_primary ? 'primary' : 'outline-primary'}
                                onClick={() => setPrimaryClass(item.id)}
                              >
                                {item.is_primary ? 'Primary' : 'Make Primary'}
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                variant="outline-danger"
                                onClick={() => removeLinkedClass(item.id)}
                              >
                                Remove
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </Card.Body>
                </Card>
              </Col>
            </Row>
          </Modal.Body>

          <Modal.Footer>
            <Button variant="outline-secondary" onClick={closeModal} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? 'Saving...' : editingId ? 'Update Teacher' : 'Save Teacher'}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </AdminLayout>
  );
}
 
