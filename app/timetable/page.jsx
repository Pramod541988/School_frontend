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
  section_id: '',
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
  const [subjects, setSubjects] = useState([]);
  const [rooms, setRooms] = useState([]);

  const [filterSections, setFilterSections] = useState([]);
  const [modalSections, setModalSections] = useState([]);

  const [loadingBase, setLoadingBase] = useState(false);
  const [loadingEntries, setLoadingEntries] = useState(false);
  const [saving, setSaving] = useState(false);

  const [pageError, setPageError] = useState('');
  const [pageSuccess, setPageSuccess] = useState('');

  const [query, setQuery] = useState('');
  const [classFilter, setClassFilter] = useState('');
  const [sectionFilter, setSectionFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('Regular');
  const [dayFilter, setDayFilter] = useState('Monday');

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

  async function fetchList(url, customError = 'Failed to load data') {
    const res = await fetch(url, {
      method: 'GET',
      headers: authHeaders(),
      cache: 'no-store',
    });

    const data = await readJsonSafe(res);
    if (!res.ok) {
      throw new Error(data?.detail || customError);
    }

    return Array.isArray(data?.items)
      ? data.items
      : Array.isArray(data)
        ? data
        : [];
  }

  async function tryFetchList(endpoints) {
    let lastError = 'Failed to load data';

    for (const url of endpoints) {
      try {
        const items = await fetchList(url);
        return items;
      } catch (err) {
        lastError = err?.message || lastError;
      }
    }

    throw new Error(lastError);
  }

  async function loadClasses() {
    const rows = await tryFetchList([
      `${API_BASE}/admin/classes`,
      `${API_BASE}/classes`,
    ]);
    setClasses(rows);

    if (!classFilter && rows.length > 0) {
      setClassFilter(String(rows[0].id));
    }
  }

  async function loadTeachers() {
    const rows = await tryFetchList([
      `${API_BASE}/admin/teachers`,
      `${API_BASE}/teachers`,
    ]);
    setTeachers(rows);
  }

  async function loadSubjects() {
    const items = await tryFetchList([
      `${API_BASE}/admin/settings/subjects`,
      `${API_BASE}/admin/subjects`,
      `${API_BASE}/settings/subjects`,
      `${API_BASE}/subjects`,
    ]);
    setSubjects(items.filter((x) => (x.status || 'Active') !== 'Inactive'));
  }

  async function loadRooms() {
    const items = await tryFetchList([
      `${API_BASE}/admin/settings/rooms`,
      `${API_BASE}/admin/rooms`,
      `${API_BASE}/settings/rooms`,
      `${API_BASE}/rooms`,
    ]);
    setRooms(items.filter((x) => (x.status || 'Active') !== 'Inactive'));
  }

  async function loadSectionsForFilter(classId) {
    if (!classId) {
      setFilterSections([]);
      setSectionFilter('');
      return;
    }

    const items = await tryFetchList([
      `${API_BASE}/admin/sections?class_id=${classId}`,
      `${API_BASE}/admin/class-sections?class_id=${classId}`,
      `${API_BASE}/admin/settings/sections?class_id=${classId}`,
      `${API_BASE}/sections?class_id=${classId}`,
    ]);

    setFilterSections(items);

    setSectionFilter((prev) => {
      if (prev && items.some((x) => String(x.id) === String(prev))) return prev;
      return items.length ? String(items[0].id) : '';
    });
  }

  async function loadSectionsForModal(classId, selectedSectionId = '') {
    if (!classId) {
      setModalSections([]);
      setForm((prev) => ({ ...prev, section_id: '' }));
      return;
    }

    const items = await tryFetchList([
      `${API_BASE}/admin/sections?class_id=${classId}`,
      `${API_BASE}/admin/class-sections?class_id=${classId}`,
      `${API_BASE}/admin/settings/sections?class_id=${classId}`,
      `${API_BASE}/sections?class_id=${classId}`,
    ]);

    setModalSections(items);

    const validSelected = selectedSectionId && items.some((x) => String(x.id) === String(selectedSectionId));

    setForm((prev) => ({
      ...prev,
      section_id: validSelected
        ? String(selectedSectionId)
        : items.length
          ? String(items[0].id)
          : '',
    }));
  }

  async function loadEntries({
    selectedClass = classFilter,
    selectedSection = sectionFilter,
    selectedType = typeFilter,
    selectedDay = dayFilter,
    selectedQuery = query,
  } = {}) {
    if (!selectedClass) {
      setEntries([]);
      return;
    }

    const params = new URLSearchParams();
    if (selectedClass) params.set('class_id', selectedClass);
    if (selectedSection) params.set('section_id', selectedSection);
    if (selectedType) params.set('timetable_type', selectedType);
    if (selectedDay) params.set('day_name', selectedDay);
    if (selectedQuery?.trim()) params.set('search', selectedQuery.trim());

    const qs = params.toString();

    const rows = await tryFetchList([
      `${API_BASE}/admin/timetables${qs ? `?${qs}` : ''}`,
      `${API_BASE}/timetables${qs ? `?${qs}` : ''}`,
    ]);

    setEntries(rows);
  }

  async function refreshBaseData() {
    if (!API_BASE) {
      setPageError('NEXT_PUBLIC_API_BASE is missing');
      return;
    }

    try {
      setLoadingBase(true);
      setPageError('');

      const results = await Promise.allSettled([
        loadClasses(),
        loadTeachers(),
        loadSubjects(),
        loadRooms(),
      ]);

      const failed = results
        .filter((x) => x.status === 'rejected')
        .map((x) => x.reason?.message)
        .filter(Boolean);

      if (failed.length) {
        setPageError(failed[0]);
      }
    } finally {
      setLoadingBase(false);
    }
  }

  useEffect(() => {
    refreshBaseData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!API_BASE || !classFilter) return;

    loadSectionsForFilter(classFilter).catch((err) => {
      setFilterSections([]);
      setSectionFilter('');
      setPageError(err?.message || 'Failed to load sections');
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [API_BASE, classFilter]);

  useEffect(() => {
    if (!API_BASE || !classFilter) return;

    const t = setTimeout(() => {
      setLoadingEntries(true);
      loadEntries()
        .catch((err) => {
          setEntries([]);
          setPageError(err?.message || 'Failed to load timetable entries');
        })
        .finally(() => {
          setLoadingEntries(false);
        });
    }, 250);

    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [API_BASE, classFilter, sectionFilter, typeFilter, dayFilter, query]);

  const selectedClassName = useMemo(() => {
    const found = classes.find((x) => String(x.id) === String(classFilter));
    return found?.name || 'Selected Class';
  }, [classes, classFilter]);

  const selectedSectionName = useMemo(() => {
    const found = filterSections.find((x) => String(x.id) === String(sectionFilter));
    return found?.name || found?.section_name || '-';
  }, [filterSections, sectionFilter]);

  const stats = useMemo(() => {
    return {
      total: entries.length,
      active: entries.filter((x) => x.status === 'Active').length,
      tests: entries.filter((x) => x.timetable_type === 'Test').length,
      exams: entries.filter((x) => x.timetable_type === 'Exam').length,
    };
  }, [entries]);

  const sortedEntries = useMemo(() => {
    return [...entries].sort((a, b) => Number(a.period_no || 0) - Number(b.period_no || 0));
  }, [entries]);

  function resetForm() {
    setEditingId(null);
    setForm({
      ...emptyForm,
      class_id: classFilter || '',
      section_id: sectionFilter || '',
      timetable_type: typeFilter || 'Regular',
      day_name: dayFilter || 'Monday',
    });
    setErrors({});
    setModalSections([]);
  }

  async function openAddModal() {
    resetForm();
    setShowModal(true);

    if (classFilter) {
      try {
        await loadSectionsForModal(classFilter, sectionFilter || '');
      } catch (err) {
        setPageError(err?.message || 'Failed to load sections');
      }
    }
  }

  async function openEditModal(item) {
    const classId = item.class_id ? String(item.class_id) : '';
    const sectionId = item.section_id ? String(item.section_id) : '';

    setEditingId(item.id);
    setForm({
      class_id: classId,
      section_id: sectionId,
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

    if (classId) {
      try {
        await loadSectionsForModal(classId, sectionId);
      } catch (err) {
        setPageError(err?.message || 'Failed to load sections');
      }
    }
  }

  function closeModal() {
    setShowModal(false);
    setEditingId(null);
    setForm(emptyForm);
    setErrors({});
    setModalSections([]);
  }

  function validateForm() {
    const nextErrors = {};
    if (!form.class_id) nextErrors.class_id = 'Class is required';
    if (!form.section_id) nextErrors.section_id = 'Section is required';
    if (!form.timetable_type) nextErrors.timetable_type = 'Type is required';
    if (!form.day_name) nextErrors.day_name = 'Day is required';
    if (!String(form.period_no).trim()) nextErrors.period_no = 'Period number is required';
    if (!form.subject.trim()) nextErrors.subject = 'Subject is required';
    if (!form.room.trim()) nextErrors.room = 'Room is required';

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
        section_id: Number(form.section_id),
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
      `Delete ${item.subject} for ${item.class_name || selectedClassName}${item.section_name ? ` - ${item.section_name}` : ''} on ${item.day_name}, period ${item.period_no}?`
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
      subtitle="Select class and section, then view its day-wise schedule cleanly."
    >
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

      <Row className="g-3 mb-3">
        <Col md={3}>
          <Card className="shadow-sm border-0">
            <Card.Body>
              <div className="text-muted small">Selected Class</div>
              <div className="fs-4 fw-bold">{selectedClassName}</div>
            </Card.Body>
          </Card>
        </Col>

        <Col md={3}>
          <Card className="shadow-sm border-0">
            <Card.Body>
              <div className="text-muted small">Selected Section</div>
              <div className="fs-4 fw-bold">{selectedSectionName}</div>
            </Card.Body>
          </Card>
        </Col>

        <Col md={3}>
          <Card className="shadow-sm border-0">
            <Card.Body>
              <div className="text-muted small">Day</div>
              <div className="fs-4 fw-bold">{dayFilter}</div>
            </Card.Body>
          </Card>
        </Col>

        <Col md={3}>
          <Card className="shadow-sm border-0">
            <Card.Body>
              <div className="text-muted small">Entries</div>
              <div className="fs-4 fw-bold">{stats.total}</div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <Card className="shadow-sm border-0 mb-3">
        <Card.Body>
          <Row className="g-3 align-items-end">
            <Col md={3}>
              <Form.Label>Class</Form.Label>
              <Form.Select
                value={classFilter}
                onChange={(e) => {
                  setClassFilter(e.target.value);
                  setSectionFilter('');
                }}
              >
                <option value="">Select class</option>
                {classes.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </Form.Select>
            </Col>

            <Col md={2}>
              <Form.Label>Section</Form.Label>
              <Form.Select
                value={sectionFilter}
                onChange={(e) => setSectionFilter(e.target.value)}
                disabled={!classFilter}
              >
                <option value="">Select section</option>
                {filterSections.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name || item.section_name}
                  </option>
                ))}
              </Form.Select>
            </Col>

            <Col md={2}>
              <Form.Label>Timetable Type</Form.Label>
              <Form.Select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
                {TIMETABLE_TYPES.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </Form.Select>
            </Col>

            <Col md={3}>
              <Form.Label>Day Reference</Form.Label>
              <Form.Select value={dayFilter} onChange={(e) => setDayFilter(e.target.value)}>
                {DAY_OPTIONS.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </Form.Select>
            </Col>

            <Col md={2} className="d-grid">
              <Button onClick={openAddModal} disabled={!classFilter || !sectionFilter}>
                Add Entry
              </Button>
            </Col>
          </Row>

          <Row className="g-3 mt-1">
            <Col md={12}>
              <Form.Label>Search</Form.Label>
              <InputGroup>
                <Form.Control
                  placeholder="Search subject, room, teacher..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </InputGroup>
            </Col>
          </Row>
        </Card.Body>
      </Card>

      <Card className="shadow-sm border-0">
        <Card.Body>
          <div className="d-flex justify-content-between align-items-center mb-3">
            <div>
              <h4 className="mb-1">
                {selectedClassName}
                {selectedSectionName && selectedSectionName !== '-' ? ` - ${selectedSectionName}` : ''}
              </h4>
              <div className="text-muted">
                {dayFilter} • {typeFilter} timetable
              </div>
            </div>
            {(loadingBase || loadingEntries) ? <Spinner animation="border" size="sm" /> : null}
          </div>

          <Table responsive bordered hover className="align-middle">
            <thead>
              <tr>
                <th style={{ minWidth: 90 }}>Period</th>
                <th style={{ minWidth: 140 }}>Subject</th>
                <th style={{ minWidth: 120 }}>Section</th>
                <th style={{ minWidth: 160 }}>Teacher</th>
                <th style={{ minWidth: 140 }}>Time</th>
                <th style={{ minWidth: 100 }}>Room</th>
                <th style={{ minWidth: 100 }}>Status</th>
                <th style={{ minWidth: 180 }}>Remark</th>
                <th style={{ minWidth: 160 }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {sortedEntries.length ? (
                sortedEntries.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <div className="fw-semibold">P{item.period_no}</div>
                      <div className="text-muted small">{item.period_label || '-'}</div>
                    </td>
                    <td>
                      <div className="fw-semibold">{item.subject || '-'}</div>
                      <div className="mt-1">
                        <Badge bg={typeVariant(item.timetable_type)}>{item.timetable_type}</Badge>
                      </div>
                    </td>
                    <td>{item.section_name || selectedSectionName || '-'}</td>
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
                  <td colSpan={9} className="text-center text-muted py-4">
                    {classFilter
                      ? `No entries for ${selectedClassName}${selectedSectionName && selectedSectionName !== '-' ? ` - ${selectedSectionName}` : ''} on ${dayFilter} under ${typeFilter} timetable`
                      : 'Select a class to view timetable'}
                  </td>
                </tr>
              )}
            </tbody>
          </Table>

          <div className="d-flex flex-wrap gap-2 mt-2">
            {DAY_OPTIONS.map((day) => (
              <Button
                key={day}
                size="sm"
                variant={dayFilter === day ? 'primary' : 'outline-secondary'}
                onClick={() => setDayFilter(day)}
              >
                {day}
              </Button>
            ))}
          </div>
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
                onChange={async (e) => {
                  const nextClassId = e.target.value;
                  setForm((prev) => ({
                    ...prev,
                    class_id: nextClassId,
                    section_id: '',
                  }));
                  setModalSections([]);

                  if (!nextClassId) return;

                  try {
                    await loadSectionsForModal(nextClassId);
                  } catch (err) {
                    setPageError(err?.message || 'Failed to load sections');
                  }
                }}
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
              <Form.Label>Section</Form.Label>
              <Form.Select
                value={form.section_id}
                onChange={(e) => setForm((prev) => ({ ...prev, section_id: e.target.value }))}
                disabled={!form.class_id}
                isInvalid={!!errors.section_id}
              >
                <option value="">Select section</option>
                {modalSections.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name || item.section_name}
                  </option>
                ))}
              </Form.Select>
              <Form.Control.Feedback type="invalid">{errors.section_id}</Form.Control.Feedback>
            </Col>

            <Col md={4}>
              <Form.Label>Timetable Type</Form.Label>
              <Form.Select
                value={form.timetable_type}
                onChange={(e) => setForm((prev) => ({ ...prev, timetable_type: e.target.value }))}
              >
                {TIMETABLE_TYPES.map((item) => (
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
              <Form.Label>Day</Form.Label>
              <Form.Select
                value={form.day_name}
                onChange={(e) => setForm((prev) => ({ ...prev, day_name: e.target.value }))}
              >
                {DAY_OPTIONS.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </Form.Select>
            </Col>

            <Col md={4}>
              <Form.Label>Subject</Form.Label>
              <Form.Select
                value={form.subject}
                onChange={(e) => setForm((prev) => ({ ...prev, subject: e.target.value }))}
                isInvalid={!!errors.subject}
              >
                <option value="">Select subject</option>
                {subjects.map((item) => (
                  <option key={item.id} value={item.name}>
                    {item.name}
                  </option>
                ))}
              </Form.Select>
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

            <Col md={6}>
              <Form.Label>Room</Form.Label>
              <Form.Select
                value={form.room}
                onChange={(e) => setForm((prev) => ({ ...prev, room: e.target.value }))}
                isInvalid={!!errors.room}
              >
                <option value="">Select room</option>
                {rooms.map((item) => (
                  <option key={item.id} value={item.room_no}>
                    {item.room_name ? `${item.room_no} - ${item.room_name}` : item.room_no}
                  </option>
                ))}
              </Form.Select>
              <Form.Control.Feedback type="invalid">{errors.room}</Form.Control.Feedback>
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

            <Col md={12}>
              <Form.Label>Remark</Form.Label>
              <Form.Control
                value={form.remark}
                onChange={(e) => setForm((prev) => ({ ...prev, remark: e.target.value }))}
                placeholder="Chapter test / final exam / practical"
              />
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
