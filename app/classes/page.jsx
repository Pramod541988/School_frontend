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
} from 'react-bootstrap';
import AdminLayout from '@/components/AdminLayout';

const STORAGE_KEY = 'school_classes_v1';

const emptyForm = {
  name: '',
  sectionsText: '',
  classTeacher: '',
  status: 'Active',
};

function safeJsonParse(value, fallback) {
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function normalizeSections(input) {
  return [...new Set(
    String(input || '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
  )];
}

export default function ClassesPage() {
  const [classes, setClasses] = useState([]);
  const [query, setQuery] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const saved = safeJsonParse(localStorage.getItem(STORAGE_KEY), []);
    setClasses(Array.isArray(saved) ? saved : []);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(classes));
  }, [classes]);

  const filteredRows = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return classes;

    return classes.filter((item) =>
      [
        item.name,
        item.classTeacher,
        item.status,
        ...(item.sections || []),
      ]
        .join(' ')
        .toLowerCase()
        .includes(q)
    );
  }, [classes, query]);

  const stats = useMemo(() => {
    const active = classes.filter((c) => c.status === 'Active').length;
    const inactive = classes.filter((c) => c.status === 'Inactive').length;
    const totalSections = classes.reduce(
      (sum, c) => sum + (Array.isArray(c.sections) ? c.sections.length : 0),
      0
    );

    return {
      total: classes.length,
      active,
      inactive,
      totalSections,
    };
  }, [classes]);

  const openAddModal = () => {
    setEditingId(null);
    setForm(emptyForm);
    setErrors({});
    setShowModal(true);
  };

  const openEditModal = (item) => {
    setEditingId(item.id);
    setForm({
      name: item.name || '',
      sectionsText: Array.isArray(item.sections) ? item.sections.join(', ') : '',
      classTeacher: item.classTeacher || '',
      status: item.status || 'Active',
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
    setForm((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: '' }));
  };

  const validate = () => {
    const nextErrors = {};
    const sections = normalizeSections(form.sectionsText);

    if (!form.name.trim()) nextErrors.name = 'Class name is required';
    if (sections.length === 0) nextErrors.sectionsText = 'At least one section is required';

    const duplicateClass = classes.find(
      (item) =>
        item.id !== editingId &&
        String(item.name).trim().toLowerCase() === form.name.trim().toLowerCase()
    );
    if (duplicateClass) {
      nextErrors.name = 'This class already exists';
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const onSubmit = (e) => {
    e.preventDefault();
    if (!validate()) return;

    const payload = {
      name: form.name.trim(),
      sections: normalizeSections(form.sectionsText),
      classTeacher: form.classTeacher.trim(),
      status: form.status,
    };

    if (editingId) {
      setClasses((prev) =>
        prev.map((item) =>
          item.id === editingId ? { ...item, ...payload } : item
        )
      );
    } else {
      setClasses((prev) => [
        {
          id: Date.now(),
          ...payload,
        },
        ...prev,
      ]);
    }

    closeModal();
  };

  const deleteClass = (id) => {
    const ok = window.confirm(
      'Delete this class? This will also remove it from class dropdowns stored in local browser data.'
    );
    if (!ok) return;
    setClasses((prev) => prev.filter((item) => item.id !== id));
  };

  const statusVariant = (status) => {
    if (status === 'Active') return 'success';
    if (status === 'Inactive') return 'secondary';
    return 'warning';
  };

  return (
    <AdminLayout
      title="Classes"
      subtitle="Class-section setup, class teacher assignment, and structure."
    >
      <Row className="g-4 mb-4">
        <Col md={3}>
          <Card className="card-soft h-100">
            <Card.Body>
              <div className="metric-label">Total Classes</div>
              <div className="metric-number">{stats.total}</div>
            </Card.Body>
          </Card>
        </Col>

        <Col md={3}>
          <Card className="card-soft h-100">
            <Card.Body>
              <div className="metric-label">Total Sections</div>
              <div className="metric-number">{stats.totalSections}</div>
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
      </Row>

      <Card className="card-soft">
        <Card.Body>
          <Row className="g-3 align-items-center mb-4">
            <Col md={12} lg={5}>
              <InputGroup>
                <InputGroup.Text>Search</InputGroup.Text>
                <Form.Control
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search by class, section, teacher..."
                />
              </InputGroup>
            </Col>

            <Col className="text-lg-end">
              <Button variant="primary" onClick={openAddModal}>
                Add Class
              </Button>
            </Col>
          </Row>

          <Table responsive hover>
            <thead>
              <tr>
                <th>Class</th>
                <th>Sections</th>
                <th>Class Teacher</th>
                <th>Status</th>
                <th style={{ width: 180 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-4">
                    No classes found
                  </td>
                </tr>
              ) : (
                filteredRows.map((item) => (
                  <tr key={item.id}>
                    <td>{item.name}</td>
                    <td>
                      <div className="d-flex flex-wrap gap-2">
                        {(item.sections || []).map((section) => (
                          <Badge key={section} bg="info">
                            {section}
                          </Badge>
                        ))}
                      </div>
                    </td>
                    <td>{item.classTeacher || '-'}</td>
                    <td>
                      <Badge bg={statusVariant(item.status)}>{item.status}</Badge>
                    </td>
                    <td>
                      <div className="d-flex gap-2">
                        <Button
                          size="sm"
                          variant="outline-primary"
                          onClick={() => openEditModal(item)}
                        >
                          Edit
                        </Button>
                        <Button
                          size="sm"
                          variant="outline-danger"
                          onClick={() => deleteClass(item.id)}
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
        </Card.Body>
      </Card>

      <Modal show={showModal} onHide={closeModal} centered>
        <Form onSubmit={onSubmit}>
          <Modal.Header closeButton>
            <Modal.Title>{editingId ? 'Edit Class' : 'Add Class'}</Modal.Title>
          </Modal.Header>

          <Modal.Body>
            <Row className="g-3">
              <Col md={12}>
                <Form.Group>
                  <Form.Label>Class Name</Form.Label>
                  <Form.Control
                    name="name"
                    value={form.name}
                    onChange={onChange}
                    isInvalid={!!errors.name}
                    placeholder="Example: 8"
                  />
                  <Form.Control.Feedback type="invalid">
                    {errors.name}
                  </Form.Control.Feedback>
                </Form.Group>
              </Col>

              <Col md={12}>
                <Form.Group>
                  <Form.Label>Sections</Form.Label>
                  <Form.Control
                    name="sectionsText"
                    value={form.sectionsText}
                    onChange={onChange}
                    isInvalid={!!errors.sectionsText}
                    placeholder="Example: A, B, C"
                  />
                  <Form.Text muted>
                    Enter sections separated by commas.
                  </Form.Text>
                  <Form.Control.Feedback type="invalid">
                    {errors.sectionsText}
                  </Form.Control.Feedback>
                </Form.Group>
              </Col>

              <Col md={12}>
                <Form.Group>
                  <Form.Label>Class Teacher</Form.Label>
                  <Form.Control
                    name="classTeacher"
                    value={form.classTeacher}
                    onChange={onChange}
                    placeholder="Enter class teacher name"
                  />
                </Form.Group>
              </Col>

              <Col md={12}>
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
            </Row>
          </Modal.Body>

          <Modal.Footer>
            <Button variant="outline-secondary" onClick={closeModal}>
              Cancel
            </Button>
            <Button type="submit">
              {editingId ? 'Update Class' : 'Save Class'}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </AdminLayout>
  );
}
