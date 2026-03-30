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

const TIMETABLE_TYPES = ['Regular', 'Test', 'Exam'];
const DAY_OPTIONS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const emptyForm = {
  class_id: '',
  teacher_id: '',
  timetable_type: 'Regular',
  day_name: 'Monday',
  period_no: '1',
  period_label: '',
  subject: '',
  start_time: '',
  end_time: '',
  room: '',
  remark: '',
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

function typeVariant(type) {
  if (type === 'Regular') return 'primary';
  if (type === 'Test') return 'warning';
  if (type === 'Exam') return 'danger';
  return 'secondary';
}

export default function TimetablePage() {
  const API_BASE = getApiBase();

  const [classes, setClasses] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [entries, setEntries] = useState([]);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [pageError, setPageError] = useState('');
  const [pageSuccess, setPageSuccess] = useState('');

  const [query, setQuery] = useState('');
  const [classFilter, setClassFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('Regular');
  const [dayFilter, setDayFilter] = useState('');

  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState({});

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
    const res = await fetch(`${API_BASE}/admin/teachers`, {
      method: 'GET',
      headers: authHeaders(),
      cache: 'no-store',
    });
    const data = await readJsonSafe(res);
    if (!res.ok) throw new Error(data?.detail || 'Failed to load teachers');
    setTeachers(Array.isArray(data?.items) ? data.items : []);
  }

  async function loadEntries() {
    const params = new URLSearchParams();
    if (classFilter) params.set('class_id', classFilter);
    if (typeFilter) params.set('timetable_type', typeFilter);
    if (dayFilter) params.set('day_name', dayFilter);
    if (query.trim()) params.set('search', query.trim());

    const qs = params.toString();
    const res = await fetch(`${API_BASE}/admin/timetables${qs ? `?${qs}` : ''}`, {
      method: 'GET',
      headers: authHeaders(),
      cache: 'no-store',
    });
    const data = await readJsonSafe(res);
    if (!res.ok) throw new Error(data?.detail || 'Failed to load timetable entries');
    setEntries(Array.isArray(data?.items) ? data.items : []);
  }

  async function refreshAll() {
    if (!API_BASE) {
      setPageError('NEXT_PUBLIC_API_BASE is missing');
      return;
    }

    try {
      setLoading(true);
      setPageError('');
      await Promise.all([loadClasses(), loadTeachers(), loadEntries()]);
    } catch (err) {
      setPageError(err?.message || 'Failed to load timetable data');
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
      loadEntries().catch((err) => {
        setPageError(err?.message || 'Failed to load timetable entries');
      });
    }, 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [classFilter, typeFilter, dayFilter, query]);

  const stats = useMemo(() => {
    return {
      total: entries.length,
      regular: entries.filter((x) => x.timetable_type === 'Regular').length,
      tests: entries.filter((x) => x.timetable_type === 'Test').length,
      exams: entries.filter((x) => x.timetable_type === 'Exam').length,
    };
  }, [entries]);

  const groupedRows = useMemo(() => {
    const grouped = {};
    DAY_OPTIONS.forEach((day) => {
      grouped[day] = entries
        .filter((item) => item.day_name === day)
        .sort((a, b) => Number(a.period_no || 0) - Number(b.period_no || 0));
    });
    return grouped;
  }, [entries]);

  function resetForm() {
    setEditingId(null);
    setForm({
      ...emptyForm,
      timetable_type: typeFilter || 'Regular',
    });
    setErrors({});
  }

  function openAddModal() {
    resetForm();
    setShowModal(true);
  }

  function openEditModal(item) {
    setEditingId(item.id);
    setForm({
      class_id: item.class_id ? String(item.class_id) : '',
      teacher_id: item.teacher_id ? String(item.teacher_id) : '',
      timetable_type: item.timetable_type || 'Regular',
      day_name: item.day_name || 'Monday',
      period_no: item.period_no ? String(item.period_no) : '1',
      period_label: item.period_label || '',
      subject: item.subject || '',
      start_time: item.start_time || '',
      end_time: item.end_time || '',
      room: item.room || '',
      remark: item.remark || '',
      status: item.status || 'Active',
    });
    setErrors({});
    setShowModal(true);
  }

  function closeModal() {
    setShowModal(false);
    resetForm();
  }

  function validateForm() {
    const nextErrors = {};
    if (!form.class_id) nextErrors.class_id = 'Class is required';
    if (!form.timetable_type) nextErrors.timetable_type = 'Type is required';
    if (!form.day_name) nextErrors.day_name = 'Day is required';
    if (!String(form.period_no).trim()) nextErrors.period_no = 'Period number is required';
    if (!form.subject.trim()) nextErrors.subject = 'Subject is required';

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  async function handleSave() {
    if (!validateForm()) return;

    try {
      setSaving(true);
      setPageError('');
      setPageSuccess('');

      const payload = {
        class_id: Number(form.class_id),
        teacher_id: form.teacher_id ? Number(form.teacher_id) : null,
        timetable_type: form.timetable_type,
        day_name: form.day_name,
        period_no: Number(form.period_no),
        period_label: form.period_label.trim(),
        subject: form.subject.trim(),
        start_time: form.start_time || '',
        end_time: form.end_time || '',
        room: form.room.trim(),
        remark: form.remark.trim(),
        status: form.status,
      };

      const url = editingId
        ? `${API_BASE}/admin/timetables/${editingId}`
        : `${API_BASE}/admin/timetables`;

      const res = await fetch(url, {
        method: editingId ? 'PUT' : 'POST',
        headers: authHeaders(),
        body: JSON.stringify(payload),
      });

      const data = await readJsonSafe(res);

      if (!res.ok) {
        throw new Error(data?.detail || 'Failed to save timetable entry');
      }

      setPageSuccess(editingId ? 'Timetable entry updated successfully' : 'Timetable entry created successfully');
      closeModal();
      await loadEntries();
    } catch (err) {
      setPageError(err?.message || 'Failed to save timetable entry');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(item) {
    const ok = window.confirm(
      `Delete ${item.timetable_type} timetable entry for ${item.class_name} on ${item.day_name}, period ${item.period_no}?`
    );
    if (!ok) return;

    try {
      setPageError('');
      setPageSuccess('');

      const res = await fetch(`${API_BASE}/admin/timetables/${item.id}`, {
        method: 'DELETE',
        headers: authHeaders(),
      });

      const data = await readJsonSafe(res);

      if (!res.ok) {
        throw new Error(data?.detail || 'Failed to delete timetable entry');
      }

      setPageSuccess('Timetable entry deleted successfully');
      await loadEntries();
    } catch (err) {
      setPageError(err?.message || 'Failed to delete timetable entry');
    }
  }

  return (
    <AdminLayout
      title="Timetable"
      subtitle="Create class-wise Regular, Test and Exam schedules."
    >
      <Row className="g-3 mb-3">
        <Col md={3}>
          <Card className="shadow-sm border-0">
            <Card.Body>
              <div className="text-muted small">Total Entries</div>
              <div className="fs-3 fw-bold">{stats.total}</div>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="shadow-sm border-0">
            <Card.Body>
              <div className="text-muted small">Regular</div>
              <div className="fs-3 fw-bold text-primary">{stats.regular}</div>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="shadow-sm border-0">
            <Card.Body>
              <div className="text-muted small">Tests</div>
              <div className="fs-3 fw-bold text-warning">{stats.tests}</div>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="shadow-sm border-0">
            <Card.Body>
              <div className="text-muted small">Exams</div>
              <div className="fs-3 fw-bold text-danger">{stats.exams}</div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {pageError ? (
        <Alert variant="danger" onClose={() => setPageError('')} dismissible>
          {pageError}
        </Alert>
      ) : null}

      {pageSuccess ? (
        <Alert variant="success" onClose={() => setPageSuccess('')} dismissible>
          {pageSuccess}
        </Alert>
      ) : null}

      <Card className="shadow-sm border-0 mb-3">
        <Card.Body>
          <Row className="g-3 align-items-end">
            <Col md={3}>
              <Form.Label>Search</Form.Label>
              <InputGroup>
                <Form.Control
                  placeholder="Subject, room, teacher..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </InputGroup>
            </Col>

            <Col md={3}>
              <Form.Label>Class</Form.Label>
              <Form.Select value={classFilter} onChange={(e) => setClassFilter(e.target.value)}>
                <option value="">All Classes</option>
                {classes.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </Form.Select>
            </Col>

            <Col md={2}>
              <Form.Label>Type</Form.Label>
              <Form.Select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
                {TIMETABLE_TYPES.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </Form.Select>
            </Col>

            <Col md={2}>
              <Form.Label>Day</Form.Label>
              <Form.Select value={dayFilter} onChange={(e) => setDayFilter(e.target.value)}>
                <option value="">All Days</option>
                {DAY_OPTIONS.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </Form.Select>
            </Col>

            <Col md={2} className="d-grid">
              <Button onClick={openAddModal}>Add Entry</Button>
            </Col>
          </Row>
        </Card.Body>
      </Card>

      <Card className="shadow-sm border-0">
        <Card.Body>
          <div className="d-flex justify-content-between align-items-center mb-3">
            <div>
              <h5 className="mb-1">Class Timetable</h5>
              <div className="text-muted small">
                One class can have separate Regular, Test and Exam schedules.
              </div>
            </div>
            {loading ? <Spinner animation="border" size="sm" /> : null}
          </div>

          {DAY_OPTIONS.map((day) => (
            <div key={day} className="mb-4">
              <div className="d-flex align-items-center justify-content-between mb-2">
                <h6 className="mb-0">{day}</h6>
                <Badge bg="light" text="dark">
                  {groupedRows[day]?.length || 0} entries
                </Badge>
              </div>

              <Table responsive bordered hover size="sm" className="align-middle">
                <thead>
                  <tr>
                    <th style={{ minWidth: 90 }}>Period</th>
                    <th style={{ minWidth: 120 }}>Type</th>
                    <th style={{ minWidth: 140 }}>Class</th>
                    <th style={{ minWidth: 140 }}>Subject</th>
                    <th style={{ minWidth: 150 }}>Teacher</th>
                    <th style={{ minWidth: 130 }}>Time</th>
                    <th style={{ minWidth: 100 }}>Room</th>
                    <th style={{ minWidth: 120 }}>Status</th>
                    <th style={{ minWidth: 180 }}>Remark</th>
                    <th style={{ minWidth: 150 }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {groupedRows[day]?.length ? (
                    groupedRows[day].map((item) => (
                      <tr key={item.id}>
                        <td>
                          <div className="fw-semibold">P{item.period_no}</div>
                          <div className="text-muted small">{item.period_label || '-'}</div>
                        </td>
                        <td>
                          <Badge bg={typeVariant(item.timetable_type)}>{item.timetable_type}</Badge>
                        </td>
                        <td>{item.class_name}</td>
                        <td>{item.subject || '-'}</td>
                        <td>{item.teacher_name || '-'}</td>
                        <td>
                          {item.start_time || item.end_time
                            ? `${item.start_time || '--'} - ${item.end_time || '--'}`
                            : '-'}
                        </td>
                        <td>{item.room || '-'}</td>
                        <td>
                          <Badge bg={statusVariant(item.status)}>{item.status}</Badge>
                        </td>
                        <td>{item.remark || '-'}</td>
                        <td>
                          <div className="d-flex gap-2">
                            <Button size="sm" variant="outline-primary" onClick={() => openEditModal(item)}>
                              Edit
                            </Button>
                            <Button size="sm" variant="outline-danger" onClick={() => handleDelete(item)}>
                              Delete
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={10} className="text-center text-muted py-3">
                        No entries for {day}
                      </td>
                    </tr>
                  )}
                </tbody>
              </Table>
            </div>
          ))}
        </Card.Body>
      </Card>

      <Modal show={showModal} onHide={closeModal} size="lg" centered>
        <Modal.Header closeButton>
          <Modal.Title>{editingId ? 'Edit Timetable Entry' : 'Add Timetable Entry'}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Row className="g-3">
            <Col md={4}>
              <Form.Label>Class</Form.Label>
              <Form.Select
                value={form.class_id}
                onChange={(e) => setForm((prev) => ({ ...prev, class_id: e.target.value }))}
                isInvalid={!!errors.class_id}
              >
                <option value="">Select class</option>
                {classes.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </Form.Select>
              <Form.Control.Feedback type="invalid">{errors.class_id}</Form.Control.Feedback>
            </Col>

            <Col md={4}>
              <Form.Label>Timetable Type</Form.Label>
              <Form.Select
                value={form.timetable_type}
                onChange={(e) => setForm((prev) => ({ ...prev, timetable_type: e.target.value }))}
                isInvalid={!!errors.timetable_type}
              >
                {TIMETABLE_TYPES.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </Form.Select>
            </Col>

            <Col md={4}>
              <Form.Label>Day</Form.Label>
              <Form.Select
                value={form.day_name}
                onChange={(e) => setForm((prev) => ({ ...prev, day_name: e.target.value }))}
                isInvalid={!!errors.day_name}
              >
                {DAY_OPTIONS.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </Form.Select>
            </Col>

            <Col md={3}>
              <Form.Label>Period No</Form.Label>
              <Form.Control
                type="number"
                min={1}
                max={20}
                value={form.period_no}
                onChange={(e) => setForm((prev) => ({ ...prev, period_no: e.target.value }))}
                isInvalid={!!errors.period_no}
              />
              <Form.Control.Feedback type="invalid">{errors.period_no}</Form.Control.Feedback>
            </Col>

            <Col md={3}>
              <Form.Label>Period Label</Form.Label>
              <Form.Control
                value={form.period_label}
                onChange={(e) => setForm((prev) => ({ ...prev, period_label: e.target.value }))}
                placeholder="Period 1 / Slot A"
              />
            </Col>

            <Col md={3}>
              <Form.Label>Start Time</Form.Label>
              <Form.Control
                type="time"
                value={form.start_time}
                onChange={(e) => setForm((prev) => ({ ...prev, start_time: e.target.value }))}
              />
            </Col>

            <Col md={3}>
              <Form.Label>End Time</Form.Label>
              <Form.Control
                type="time"
                value={form.end_time}
                onChange={(e) => setForm((prev) => ({ ...prev, end_time: e.target.value }))}
              />
            </Col>

            <Col md={4}>
              <Form.Label>Subject</Form.Label>
              <Form.Control
                value={form.subject}
                onChange={(e) => setForm((prev) => ({ ...prev, subject: e.target.value }))}
                isInvalid={!!errors.subject}
                placeholder="Mathematics"
              />
              <Form.Control.Feedback type="invalid">{errors.subject}</Form.Control.Feedback>
            </Col>

            <Col md={4}>
              <Form.Label>Teacher</Form.Label>
              <Form.Select
                value={form.teacher_id}
                onChange={(e) => setForm((prev) => ({ ...prev, teacher_id: e.target.value }))}
              >
                <option value="">Select teacher</option>
                {teachers.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.teacher_name}
                  </option>
                ))}
              </Form.Select>
            </Col>

            <Col md={4}>
              <Form.Label>Room</Form.Label>
              <Form.Control
                value={form.room}
                onChange={(e) => setForm((prev) => ({ ...prev, room: e.target.value }))}
                placeholder="Room 101"
              />
            </Col>

            <Col md={6}>
              <Form.Label>Remark</Form.Label>
              <Form.Control
                value={form.remark}
                onChange={(e) => setForm((prev) => ({ ...prev, remark: e.target.value }))}
                placeholder="Chapter test / final exam / practical"
              />
            </Col>

            <Col md={6}>
              <Form.Label>Status</Form.Label>
              <Form.Select
                value={form.status}
                onChange={(e) => setForm((prev) => ({ ...prev, status: e.target.value }))}
              >
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </Form.Select>
            </Col>
          </Row>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="outline-secondary" onClick={closeModal}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : editingId ? 'Update Entry' : 'Create Entry'}
          </Button>
        </Modal.Footer>
      </Modal>
    </AdminLayout>
  );
}
