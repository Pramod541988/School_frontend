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
  parentName: '',
  relation: 'Guardian',
  phone: '',
  altPhone: '',
  email: '',
  address: '',
  status: 'Active',
  pickerClassId: '',
  pickerSection: '',
  pickerSearch: '',
  selectedStudentId: '',
  linkedStudents: [],
  syncToStudents: true,
  setAsPrimaryParent: true,
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

export default function ParentsPage() {
  const API_BASE = getApiBase();

  const [parents, setParents] = useState([]);
  const [classes, setClasses] = useState([]);
  const [studentOptions, setStudentOptions] = useState([]);

  const [query, setQuery] = useState('');
  const [classFilter, setClassFilter] = useState('');
  const [sectionFilter, setSectionFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState({});
  const [pageError, setPageError] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [pickerLoading, setPickerLoading] = useState(false);

  async function readJsonSafe(res) {
    const text = await res.text();
    try {
      return text ? JSON.parse(text) : {};
    } catch {
      return { detail: text || 'Unexpected server response' };
    }
  }

  const classOptions = useMemo(() => classes, [classes]);

  const sectionOptions = useMemo(() => {
    if (!classFilter) {
      return [...new Set(classes.flatMap((x) => x.sections || []))];
    }
    const selected = classes.find((x) => String(x.id) === String(classFilter));
    return selected?.sections || [];
  }, [classes, classFilter]);

  const modalSectionOptions = useMemo(() => {
    if (!form.pickerClassId) return [];
    const selected = classes.find((x) => String(x.id) === String(form.pickerClassId));
    return selected?.sections || [];
  }, [classes, form.pickerClassId]);

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

  async function loadParents() {
    const params = new URLSearchParams();
    if (query.trim()) params.set('search', query.trim());
    if (classFilter) params.set('class_id', classFilter);
    if (sectionFilter) params.set('section', sectionFilter);
    if (statusFilter) params.set('status', statusFilter);

    const res = await fetch(`${API_BASE}/admin/parents?${params.toString()}`, {
      method: 'GET',
      headers: authHeaders(),
      cache: 'no-store',
    });
    const data = await readJsonSafe(res);
    if (!res.ok) throw new Error(data?.detail || 'Failed to load parents');
    setParents(Array.isArray(data?.items) ? data.items : []);
  }

  async function loadStudentOptions() {
    if (!form.pickerClassId) {
      setStudentOptions([]);
      return;
    }

    const params = new URLSearchParams();
    params.set('class_id', form.pickerClassId);
    if (form.pickerSection) params.set('section', form.pickerSection);
    if (form.pickerSearch.trim()) params.set('search', form.pickerSearch.trim());

    setPickerLoading(true);
    try {
      const res = await fetch(`${API_BASE}/admin/students/options?${params.toString()}`, {
        method: 'GET',
        headers: authHeaders(),
        cache: 'no-store',
      });
      const data = await readJsonSafe(res);
      if (!res.ok) throw new Error(data?.detail || 'Failed to load students');
      setStudentOptions(Array.isArray(data) ? data : []);
    } catch (err) {
      setPageError(err?.message || 'Failed to load students');
    } finally {
      setPickerLoading(false);
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
      await Promise.all([loadClasses(), loadParents()]);
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
      loadParents().catch((err) => {
        setPageError(err?.message || 'Failed to load parents');
      });
    }, 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, classFilter, sectionFilter, statusFilter]);

  useEffect(() => {
    if (!showModal) return;
    const t = setTimeout(() => {
      loadStudentOptions().catch(() => {});
    }, 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showModal, form.pickerClassId, form.pickerSection, form.pickerSearch]);

  const stats = useMemo(() => {
    const active = parents.filter((x) => x.status === 'Active').length;
    const inactive = parents.filter((x) => x.status === 'Inactive').length;
    const linkedStudents = parents.reduce((sum, item) => sum + (item.student_count || 0), 0);
    return {
      total: parents.length,
      active,
      inactive,
      linkedStudents,
    };
  }, [parents]);

  const openAddModal = () => {
    setEditingId(null);
    setForm(emptyForm);
    setErrors({});
    setStudentOptions([]);
    setShowModal(true);
  };

  const openEditModal = (parent) => {
    const firstStudent = parent.students?.[0];

    setEditingId(parent.id);
    setForm({
      parentName: parent.parent_name || '',
      relation: parent.relation || 'Guardian',
      phone: parent.phone || '',
      altPhone: parent.alt_phone || '',
      email: parent.email || '',
      address: parent.address || '',
      status: parent.status || 'Active',
      pickerClassId: firstStudent?.class_id ? String(firstStudent.class_id) : '',
      pickerSection: firstStudent?.section || '',
      pickerSearch: '',
      selectedStudentId: '',
      linkedStudents: (parent.students || []).map((s) => ({
        id: s.id,
        name: s.name,
        class_id: s.class_id,
        class_name: s.class_name,
        section: s.section,
        roll_no: s.roll_no,
        guardian_name: s.guardian_name,
        phone: s.phone,
        is_primary: !!s.is_primary,
        relation_label: s.relation_label || parent.relation || 'Guardian',
      })),
      syncToStudents: true,
      setAsPrimaryParent: (parent.students || []).some((x) => x.is_primary),
    });
    setErrors({});
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingId(null);
    setForm(emptyForm);
    setErrors({});
    setStudentOptions([]);
  };

  const onChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => {
      if (type === 'checkbox') {
        return { ...prev, [name]: checked };
      }
      if (name === 'pickerClassId') {
        return {
          ...prev,
          pickerClassId: value,
          pickerSection: '',
          selectedStudentId: '',
        };
      }
      return { ...prev, [name]: value };
    });
    setErrors((prev) => ({ ...prev, [name]: '' }));
  };

  const addSelectedStudent = () => {
    const chosen = studentOptions.find(
      (x) => String(x.id) === String(form.selectedStudentId)
    );
    if (!chosen) return;

    const alreadyExists = form.linkedStudents.some((x) => x.id === chosen.id);
    if (alreadyExists) return;

    setForm((prev) => ({
      ...prev,
      linkedStudents: [
        ...prev.linkedStudents,
        {
          ...chosen,
          is_primary: prev.setAsPrimaryParent ? true : prev.linkedStudents.length === 0,
          relation_label: prev.relation || 'Guardian',
        },
      ],
      selectedStudentId: '',
    }));
  };

  const removeLinkedStudent = (studentId) => {
    setForm((prev) => ({
      ...prev,
      linkedStudents: prev.linkedStudents.filter((x) => x.id !== studentId),
    }));
  };

  const setPrimaryStudent = (studentId) => {
    setForm((prev) => ({
      ...prev,
      linkedStudents: prev.linkedStudents.map((x) => ({
        ...x,
        is_primary: x.id === studentId,
      })),
    }));
  };

  const validate = () => {
    const nextErrors = {};

    if (!form.parentName.trim()) nextErrors.parentName = 'Parent name is required';

    if (!form.phone.trim()) {
      nextErrors.phone = 'Phone number is required';
    } else if (!/^[0-9]{10}$/.test(form.phone.trim())) {
      nextErrors.phone = 'Phone number must be 10 digits';
    }

    if (form.altPhone.trim() && !/^[0-9]{10}$/.test(form.altPhone.trim())) {
      nextErrors.altPhone = 'Alternate phone must be 10 digits';
    }

    if (form.email.trim() && !/^\S+@\S+\.\S+$/.test(form.email.trim())) {
      nextErrors.email = 'Invalid email address';
    }

    if (form.linkedStudents.length === 0) {
      nextErrors.linkedStudents = 'Please link at least one student';
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    const payload = {
      parent_name: form.parentName.trim(),
      relation: form.relation,
      phone: form.phone.trim(),
      alt_phone: form.altPhone.trim(),
      email: form.email.trim(),
      address: form.address.trim(),
      status: form.status,
      sync_to_students: form.syncToStudents,
      set_as_primary_parent: form.setAsPrimaryParent,
      student_links: form.linkedStudents.map((x) => ({
        student_id: x.id,
        is_primary: !!x.is_primary,
        relation_label: x.relation_label || form.relation || 'Guardian',
      })),
    };

    try {
      setSaving(true);
      setPageError('');

      const url = editingId
        ? `${API_BASE}/admin/parents/${editingId}`
        : `${API_BASE}/admin/parents`;

      const method = editingId ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: authHeaders(),
        body: JSON.stringify(payload),
      });

      const data = await readJsonSafe(res);
      if (!res.ok) throw new Error(data?.detail || 'Failed to save parent');

      await loadParents();
      closeModal();
    } catch (err) {
      setPageError(err?.message || 'Failed to save parent');
    } finally {
      setSaving(false);
    }
  };

  const deleteParent = async (id) => {
    const ok = window.confirm('Delete this parent?');
    if (!ok) return;

    try {
      setPageError('');
      const res = await fetch(`${API_BASE}/admin/parents/${id}`, {
        method: 'DELETE',
        headers: authHeaders(),
      });

      const data = await readJsonSafe(res);
      if (!res.ok) throw new Error(data?.detail || 'Failed to delete parent');

      await loadParents();
    } catch (err) {
      setPageError(err?.message || 'Failed to delete parent');
    }
  };

  return (
    <AdminLayout
      title="Parents"
      subtitle="Manage parent master, link multiple students, and keep family mapping clean."
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
              <div className="metric-label">Total Parents</div>
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
              <div className="metric-label">Linked Students</div>
              <div className="metric-number">{stats.linkedStudents}</div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <Card className="card-soft">
        <Card.Body>
          <Row className="g-3 align-items-center mb-4">
            <Col md={12} lg={3}>
              <InputGroup>
                <InputGroup.Text>Search</InputGroup.Text>
                <Form.Control
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Parent, phone, student..."
                />
              </InputGroup>
            </Col>

            <Col md={4} lg={2}>
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

            <Col md={4} lg={2}>
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

            <Col md={4} lg={2}>
              <Form.Select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="">All Status</option>
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </Form.Select>
            </Col>

            <Col lg={3} className="text-lg-end">
              <Button onClick={openAddModal}>Add Parent</Button>
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
                  <th>Parent Name</th>
                  <th>Relation</th>
                  <th>Phone</th>
                  <th>Linked Students</th>
                  <th>Status</th>
                  <th style={{ width: 180 }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {parents.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-4">
                      No parents found
                    </td>
                  </tr>
                ) : (
                  parents.map((parent) => (
                    <tr key={parent.id}>
                      <td>{parent.parent_name}</td>
                      <td>{parent.relation}</td>
                      <td>{parent.phone}</td>
                      <td>
                        <div className="d-flex flex-wrap gap-1">
                          {(parent.students || []).map((s) => (
                            <Badge
                              key={s.id}
                              bg={s.is_primary ? 'primary' : 'secondary'}
                            >
                              {s.name} ({s.class_name}-{s.section})
                            </Badge>
                          ))}
                        </div>
                      </td>
                      <td>
                        <Badge bg={statusVariant(parent.status)}>
                          {parent.status}
                        </Badge>
                      </td>
                      <td>
                        <div className="d-flex gap-2">
                          <Button
                            size="sm"
                            variant="outline-primary"
                            onClick={() => openEditModal(parent)}
                          >
                            Edit
                          </Button>
                          <Button
                            size="sm"
                            variant="outline-danger"
                            onClick={() => deleteParent(parent.id)}
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
            <Modal.Title>{editingId ? 'Edit Parent' : 'Add Parent'}</Modal.Title>
          </Modal.Header>

          <Modal.Body>
            <Row className="g-3">
              <Col md={6}>
                <Form.Group>
                  <Form.Label>Parent Name</Form.Label>
                  <Form.Control
                    name="parentName"
                    value={form.parentName}
                    onChange={onChange}
                    isInvalid={!!errors.parentName}
                    placeholder="Enter parent/guardian name"
                  />
                  <Form.Control.Feedback type="invalid">
                    {errors.parentName}
                  </Form.Control.Feedback>
                </Form.Group>
              </Col>

              <Col md={6}>
                <Form.Group>
                  <Form.Label>Relation</Form.Label>
                  <Form.Select
                    name="relation"
                    value={form.relation}
                    onChange={onChange}
                  >
                    <option value="Father">Father</option>
                    <option value="Mother">Mother</option>
                    <option value="Guardian">Guardian</option>
                    <option value="Other">Other</option>
                  </Form.Select>
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
                  <Form.Label>Alternate Phone</Form.Label>
                  <Form.Control
                    name="altPhone"
                    value={form.altPhone}
                    onChange={onChange}
                    isInvalid={!!errors.altPhone}
                    placeholder="Optional"
                  />
                  <Form.Control.Feedback type="invalid">
                    {errors.altPhone}
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
                <Form.Group>
                  <Form.Label>Address</Form.Label>
                  <Form.Control
                    as="textarea"
                    rows={2}
                    name="address"
                    value={form.address}
                    onChange={onChange}
                    placeholder="Optional"
                  />
                </Form.Group>
              </Col>

              <Col md={12}>
                <hr />
                <h6 className="mb-3">Link Students</h6>
              </Col>

              <Col md={4}>
                <Form.Group>
                  <Form.Label>Class</Form.Label>
                  <Form.Select
                    name="pickerClassId"
                    value={form.pickerClassId}
                    onChange={onChange}
                  >
                    <option value="">Select class</option>
                    {classOptions.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name}
                      </option>
                    ))}
                  </Form.Select>
                </Form.Group>
              </Col>

              <Col md={4}>
                <Form.Group>
                  <Form.Label>Section</Form.Label>
                  <Form.Select
                    name="pickerSection"
                    value={form.pickerSection}
                    onChange={onChange}
                    disabled={!form.pickerClassId}
                  >
                    <option value="">All / Select section</option>
                    {modalSectionOptions.map((item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                  </Form.Select>
                </Form.Group>
              </Col>

              <Col md={4}>
                <Form.Group>
                  <Form.Label>Search Student</Form.Label>
                  <Form.Control
                    name="pickerSearch"
                    value={form.pickerSearch}
                    onChange={onChange}
                    placeholder="Name / roll no / guardian"
                    disabled={!form.pickerClassId}
                  />
                </Form.Group>
              </Col>

              <Col md={9}>
                <Form.Group>
                  <Form.Label>Student</Form.Label>
                  <Form.Select
                    name="selectedStudentId"
                    value={form.selectedStudentId}
                    onChange={onChange}
                    disabled={!form.pickerClassId || pickerLoading}
                  >
                    <option value="">
                      {pickerLoading ? 'Loading students...' : 'Select student'}
                    </option>
                    {studentOptions.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name} | {item.class_name}-{item.section} | Roll: {item.roll_no}
                      </option>
                    ))}
                  </Form.Select>
                </Form.Group>
              </Col>

              <Col md={3} className="d-flex align-items-end">
                <Button
                  type="button"
                  className="w-100"
                  onClick={addSelectedStudent}
                  disabled={!form.selectedStudentId}
                >
                  Add Student
                </Button>
              </Col>

              <Col md={12}>
                <Form.Check
                  type="checkbox"
                  name="syncToStudents"
                  checked={form.syncToStudents}
                  onChange={onChange}
                  label="Sync parent name and phone into linked student records"
                />
                <Form.Check
                  type="checkbox"
                  name="setAsPrimaryParent"
                  checked={form.setAsPrimaryParent}
                  onChange={onChange}
                  label="Set this parent as primary parent for linked students"
                />
                {errors.linkedStudents ? (
                  <div className="text-danger small mt-2">{errors.linkedStudents}</div>
                ) : null}
              </Col>

              <Col md={12}>
                <Card className="bg-light border-0">
                  <Card.Body>
                    <div className="fw-semibold mb-2">Linked Students</div>
                    {form.linkedStudents.length === 0 ? (
                      <div className="text-muted">No students linked yet</div>
                    ) : (
                      <div className="d-flex flex-column gap-2">
                        {form.linkedStudents.map((student) => (
                          <div
                            key={student.id}
                            className="d-flex flex-wrap justify-content-between align-items-center border rounded p-2 bg-white"
                          >
                            <div>
                              <div className="fw-semibold">
                                {student.name} ({student.class_name}-{student.section})
                              </div>
                              <div className="small text-muted">
                                Roll: {student.roll_no} | Guardian: {student.guardian_name}
                              </div>
                            </div>

                            <div className="d-flex gap-2 mt-2 mt-md-0">
                              <Button
                                type="button"
                                size="sm"
                                variant={student.is_primary ? 'primary' : 'outline-primary'}
                                onClick={() => setPrimaryStudent(student.id)}
                              >
                                {student.is_primary ? 'Primary' : 'Make Primary'}
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                variant="outline-danger"
                                onClick={() => removeLinkedStudent(student.id)}
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
              {saving ? 'Saving...' : editingId ? 'Update Parent' : 'Save Parent'}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </AdminLayout>
  );
}
