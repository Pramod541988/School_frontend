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

const emptyForm = {
  name: '',
  classId: '',
  section: '',
  rollNo: '',
  guardianName: '',
  phone: '',
  status: 'Active',
  attendancePercentage: '',
  feeTotal: '',
  feePaid: '',
};

function getApiBase() {
  return (process.env.NEXT_PUBLIC_API_BASE || '').replace(/\/$/, '');
}

function getAuthToken() {
  if (typeof window === 'undefined') return '';
  return (
    localStorage.getItem('school_admin_token') ||
    localStorage.getItem('token') ||
    localStorage.getItem('access_token') ||
    ''
  );
}

function authHeaders(extra = {}) {
  const token = getAuthToken();
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...extra,
  };
}

function getFeeStatus(student) {
  const total = Number(student?.fee_total ?? student?.feeTotal ?? 0);
  const paid = Number(student?.fee_paid ?? student?.feePaid ?? 0);

  if (total <= 0) return 'Pending';
  if (paid <= 0) return 'Pending';
  if (paid >= total) return 'Paid';
  return 'Partial';
}

function feeVariant(feeStatus) {
  if (feeStatus === 'Paid') return 'success';
  if (feeStatus === 'Partial') return 'warning';
  if (feeStatus === 'Pending') return 'danger';
  return 'secondary';
}

function statusVariant(status) {
  if (status === 'Active') return 'success';
  if (status === 'Inactive') return 'secondary';
  return 'warning';
}

export default function StudentsPage() {
  const API_BASE = getApiBase();

  const [students, setStudents] = useState([]);
  const [classes, setClasses] = useState([]);
  const [query, setQuery] = useState('');
  const [classFilter, setClassFilter] = useState('');
  const [sectionFilter, setSectionFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState({});
  const [pageError, setPageError] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const classOptions = useMemo(() => classes, [classes]);

  const sectionOptions = useMemo(() => {
    if (!classFilter) {
      return [...new Set(classes.flatMap((item) => item.sections || []))];
    }
    const selected = classes.find((item) => String(item.id) === String(classFilter));
    return selected?.sections || [];
  }, [classes, classFilter]);

  const modalSectionOptions = useMemo(() => {
    if (!form.classId) return [];
    const selected = classes.find((item) => String(item.id) === String(form.classId));
    return selected?.sections || [];
  }, [classes, form.classId]);

  const filteredStudents = useMemo(() => {
    const q = query.trim().toLowerCase();

    return students.filter((student) => {
      const matchesQuery =
        !q ||
        [
          student.name,
          student.class_name,
          student.section,
          student.roll_no,
          student.guardian_name,
          student.phone,
          student.status,
          getFeeStatus(student),
          String(student.attendance_percentage ?? ''),
        ]
          .join(' ')
          .toLowerCase()
          .includes(q);

      const matchesClass =
        !classFilter || String(student.class_id) === String(classFilter);

      const matchesSection =
        !sectionFilter || student.section === sectionFilter;

      return matchesQuery && matchesClass && matchesSection;
    });
  }, [students, query, classFilter, sectionFilter]);

  const stats = useMemo(() => {
    const active = students.filter((s) => s.status === 'Active').length;
    const inactive = students.filter((s) => s.status === 'Inactive').length;

    return {
      total: students.length,
      active,
      inactive,
    };
  }, [students]);

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

    if (!res.ok) {
      throw new Error(data?.detail || 'Failed to load classes');
    }

    setClasses(Array.isArray(data) ? data : []);
  }

  async function loadStudents() {
    const params = new URLSearchParams();
    if (query.trim()) params.set('search', query.trim());
    if (classFilter) params.set('class_id', classFilter);
    if (sectionFilter) params.set('section', sectionFilter);

    const qs = params.toString();
    const url = `${API_BASE}/admin/students${qs ? `?${qs}` : ''}`;

    const res = await fetch(url, {
      method: 'GET',
      headers: authHeaders(),
      cache: 'no-store',
    });

    const data = await readJsonSafe(res);

    if (!res.ok) {
      throw new Error(data?.detail || 'Failed to load students');
    }

    setStudents(Array.isArray(data?.items) ? data.items : []);
  }

  async function refreshAll() {
    if (!API_BASE) {
      setPageError('NEXT_PUBLIC_API_BASE is missing');
      return;
    }

    try {
      setLoading(true);
      setPageError('');
      await Promise.all([loadClasses(), loadStudents()]);
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
      loadStudents().catch((err) => {
        setPageError(err?.message || 'Failed to load students');
      });
    }, 250);

    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, classFilter, sectionFilter]);

  const openAddModal = () => {
    setEditingId(null);
    setForm(emptyForm);
    setErrors({});
    setShowModal(true);
  };

  const openEditModal = (student) => {
    setEditingId(student.id);
    setForm({
      name: student.name || '',
      classId: student.class_id ? String(student.class_id) : '',
      section: student.section || '',
      rollNo: student.roll_no || '',
      guardianName: student.guardian_name || '',
      phone: student.phone || '',
      status: student.status || 'Active',
      attendancePercentage:
        student.attendance_percentage !== undefined &&
        student.attendance_percentage !== null
          ? String(student.attendance_percentage)
          : '',
      feeTotal:
        student.fee_total !== undefined && student.fee_total !== null
          ? String(student.fee_total)
          : '',
      feePaid:
        student.fee_paid !== undefined && student.fee_paid !== null
          ? String(student.fee_paid)
          : '',
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
    const { name, value } = e.target;

    setForm((prev) => {
      if (name === 'classId') {
        return {
          ...prev,
          classId: value,
          section: '',
        };
      }

      return {
        ...prev,
        [name]: value,
      };
    });

    setErrors((prev) => ({ ...prev, [name]: '' }));
  };

  const validate = () => {
    const nextErrors = {};

    if (!form.name.trim()) nextErrors.name = 'Student name is required';
    if (!form.classId.trim()) nextErrors.classId = 'Class is required';
    if (!form.section.trim()) nextErrors.section = 'Section is required';
    if (!form.rollNo.trim()) nextErrors.rollNo = 'Roll number is required';
    if (!form.guardianName.trim()) {
      nextErrors.guardianName = 'Guardian name is required';
    }

    if (!form.phone.trim()) {
      nextErrors.phone = 'Phone number is required';
    } else if (!/^[0-9]{10}$/.test(form.phone.trim())) {
      nextErrors.phone = 'Phone number must be 10 digits';
    }

    if (form.attendancePercentage === '') {
      nextErrors.attendancePercentage = 'Attendance percentage is required';
    } else {
      const val = Number(form.attendancePercentage);
      if (Number.isNaN(val) || val < 0 || val > 100) {
        nextErrors.attendancePercentage =
          'Attendance percentage must be between 0 and 100';
      }
    }

    if (form.feeTotal !== '' && Number(form.feeTotal) < 0) {
      nextErrors.feeTotal = 'Fee total cannot be negative';
    }

    if (form.feePaid !== '' && Number(form.feePaid) < 0) {
      nextErrors.feePaid = 'Fee paid cannot be negative';
    }

    if (
      form.feeTotal !== '' &&
      form.feePaid !== '' &&
      Number(form.feePaid) > Number(form.feeTotal)
    ) {
      nextErrors.feePaid = 'Fee paid cannot be greater than fee total';
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    const payload = {
      name: form.name.trim(),
      class_id: Number(form.classId),
      section: form.section.trim(),
      roll_no: form.rollNo.trim(),
      guardian_name: form.guardianName.trim(),
      phone: form.phone.trim(),
      status: form.status,
      attendance_percentage: Number(form.attendancePercentage),
      fee_total: Number(form.feeTotal || 0),
      fee_paid: Number(form.feePaid || 0),
    };

    try {
      setSaving(true);
      setPageError('');

      const url = editingId
        ? `${API_BASE}/admin/students/${editingId}`
        : `${API_BASE}/admin/students`;

      const method = editingId ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: authHeaders(),
        body: JSON.stringify(payload),
      });

      const data = await readJsonSafe(res);

      if (!res.ok) {
        throw new Error(data?.detail || 'Failed to save student');
      }

      await loadStudents();
      closeModal();
    } catch (err) {
      setPageError(err?.message || 'Failed to save student');
    } finally {
      setSaving(false);
    }
  };

  const deleteStudent = async (id) => {
    const ok = window.confirm('Delete this student?');
    if (!ok) return;

    try {
      setPageError('');
      const res = await fetch(`${API_BASE}/admin/students/${id}`, {
        method: 'DELETE',
        headers: authHeaders(),
      });

      const data = await readJsonSafe(res);

      if (!res.ok) {
        throw new Error(data?.detail || 'Failed to delete student');
      }

      await loadStudents();
    } catch (err) {
      setPageError(err?.message || 'Failed to delete student');
    }
  };

  return (
    <AdminLayout
      title="Students"
      subtitle="Manage student profiles, admissions, roll numbers, and class mapping."
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
              <div className="metric-label">Total Students</div>
              <div className="metric-number">{stats.total}</div>
            </Card.Body>
          </Card>
        </Col>

        <Col md={4}>
          <Card className="card-soft h-100">
            <Card.Body>
              <div className="metric-label">Active</div>
              <div className="metric-number">{stats.active}</div>
            </Card.Body>
          </Card>
        </Col>

        <Col md={4}>
          <Card className="card-soft h-100">
            <Card.Body>
              <div className="metric-label">Inactive</div>
              <div className="metric-number">{stats.inactive}</div>
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
                  placeholder="Search by name, class, section, roll no..."
                />
              </InputGroup>
            </Col>

            <Col md={6} lg={3}>
              <Form.Select
                value={classFilter}
                onChange={(e) => {
                  setClassFilter(e.target.value);
                  setSectionFilter('');
                }}
              >
                <option value="">All Classes</option>
                {classOptions.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </Form.Select>
            </Col>

            <Col md={6} lg={3}>
              <Form.Select
                value={sectionFilter}
                onChange={(e) => setSectionFilter(e.target.value)}
              >
                <option value="">All Sections</option>
                {sectionOptions.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </Form.Select>
            </Col>

            <Col lg={2} className="text-lg-end">
              <Button variant="primary" onClick={openAddModal}>
                Add Student
              </Button>
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
                  <th>Student Name</th>
                  <th>Class</th>
                  <th>Section</th>
                  <th>Roll No</th>
                  <th>Guardian</th>
                  <th>Phone</th>
                  <th>Attendance %</th>
                  <th>Fee Status</th>
                  <th>Status</th>
                  <th style={{ width: 180 }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredStudents.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="text-center py-4">
                      No students found
                    </td>
                  </tr>
                ) : (
                  filteredStudents.map((student) => {
                    const currentFeeStatus = getFeeStatus(student);

                    return (
                      <tr key={student.id}>
                        <td>{student.name}</td>
                        <td>{student.class_name}</td>
                        <td>{student.section || '-'}</td>
                        <td>{student.roll_no}</td>
                        <td>{student.guardian_name}</td>
                        <td>{student.phone}</td>
                        <td>{student.attendance_percentage ?? 0}%</td>
                        <td>
                          <Badge bg={feeVariant(currentFeeStatus)}>
                            {currentFeeStatus}
                          </Badge>
                        </td>
                        <td>
                          <Badge bg={statusVariant(student.status)}>
                            {student.status}
                          </Badge>
                        </td>
                        <td>
                          <div className="d-flex gap-2">
                            <Button
                              size="sm"
                              variant="outline-primary"
                              onClick={() => openEditModal(student)}
                            >
                              Edit
                            </Button>
                            <Button
                              size="sm"
                              variant="outline-danger"
                              onClick={() => deleteStudent(student.id)}
                            >
                              Delete
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </Table>
          )}
        </Card.Body>
      </Card>

      <Modal show={showModal} onHide={closeModal} centered>
        <Form onSubmit={onSubmit}>
          <Modal.Header closeButton>
            <Modal.Title>
              {editingId ? 'Edit Student' : 'Add Student'}
            </Modal.Title>
          </Modal.Header>

          <Modal.Body>
            <Row className="g-3">
              <Col md={12}>
                <Form.Group>
                  <Form.Label>Student Name</Form.Label>
                  <Form.Control
                    name="name"
                    value={form.name}
                    onChange={onChange}
                    isInvalid={!!errors.name}
                    placeholder="Enter student name"
                  />
                  <Form.Control.Feedback type="invalid">
                    {errors.name}
                  </Form.Control.Feedback>
                </Form.Group>
              </Col>

              <Col md={6}>
                <Form.Group>
                  <Form.Label>Class</Form.Label>
                  <Form.Select
                    name="classId"
                    value={form.classId}
                    onChange={onChange}
                    isInvalid={!!errors.classId}
                  >
                    <option value="">Select class</option>
                    {classOptions.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name}
                      </option>
                    ))}
                  </Form.Select>
                  <Form.Control.Feedback type="invalid">
                    {errors.classId}
                  </Form.Control.Feedback>
                </Form.Group>
              </Col>

              <Col md={6}>
                <Form.Group>
                  <Form.Label>Section</Form.Label>
                  <Form.Select
                    name="section"
                    value={form.section}
                    onChange={onChange}
                    isInvalid={!!errors.section}
                    disabled={!form.classId}
                  >
                    <option value="">Select section</option>
                    {modalSectionOptions.map((item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                  </Form.Select>
                  <Form.Control.Feedback type="invalid">
                    {errors.section}
                  </Form.Control.Feedback>
                </Form.Group>
              </Col>

              <Col md={6}>
                <Form.Group>
                  <Form.Label>Roll Number</Form.Label>
                  <Form.Control
                    name="rollNo"
                    value={form.rollNo}
                    onChange={onChange}
                    isInvalid={!!errors.rollNo}
                    placeholder="Enter roll number"
                  />
                  <Form.Control.Feedback type="invalid">
                    {errors.rollNo}
                  </Form.Control.Feedback>
                </Form.Group>
              </Col>

              <Col md={6}>
                <Form.Group>
                  <Form.Label>Attendance Percentage</Form.Label>
                  <Form.Control
                    name="attendancePercentage"
                    type="number"
                    min="0"
                    max="100"
                    value={form.attendancePercentage}
                    onChange={onChange}
                    isInvalid={!!errors.attendancePercentage}
                    placeholder="Enter attendance %"
                  />
                  <Form.Control.Feedback type="invalid">
                    {errors.attendancePercentage}
                  </Form.Control.Feedback>
                </Form.Group>
              </Col>

              <Col md={12}>
                <Form.Group>
                  <Form.Label>Guardian Name</Form.Label>
                  <Form.Control
                    name="guardianName"
                    value={form.guardianName}
                    onChange={onChange}
                    isInvalid={!!errors.guardianName}
                    placeholder="Enter guardian name"
                  />
                  <Form.Control.Feedback type="invalid">
                    {errors.guardianName}
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
                    placeholder="10 digit phone"
                  />
                  <Form.Control.Feedback type="invalid">
                    {errors.phone}
                  </Form.Control.Feedback>
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

              <Col md={6}>
                <Form.Group>
                  <Form.Label>Total Fee</Form.Label>
                  <Form.Control
                    name="feeTotal"
                    type="number"
                    min="0"
                    value={form.feeTotal}
                    onChange={onChange}
                    isInvalid={!!errors.feeTotal}
                    placeholder="Enter total fee"
                  />
                  <Form.Control.Feedback type="invalid">
                    {errors.feeTotal}
                  </Form.Control.Feedback>
                </Form.Group>
              </Col>

              <Col md={6}>
                <Form.Group>
                  <Form.Label>Paid Fee</Form.Label>
                  <Form.Control
                    name="feePaid"
                    type="number"
                    min="0"
                    value={form.feePaid}
                    onChange={onChange}
                    isInvalid={!!errors.feePaid}
                    placeholder="Enter paid fee"
                  />
                  <Form.Control.Feedback type="invalid">
                    {errors.feePaid}
                  </Form.Control.Feedback>
                </Form.Group>
              </Col>

              <Col md={12}>
                <Form.Group>
                  <Form.Label>Fee Status</Form.Label>
                  <Form.Control
                    value={getFeeStatus({
                      feeTotal: form.feeTotal,
                      feePaid: form.feePaid,
                    })}
                    readOnly
                  />
                </Form.Group>
              </Col>
            </Row>
          </Modal.Body>

          <Modal.Footer>
            <Button variant="outline-secondary" onClick={closeModal} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? 'Saving...' : editingId ? 'Update Student' : 'Save Student'}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </AdminLayout>
  );
}
