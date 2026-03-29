'use client';

import { useMemo, useState } from 'react';
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
import PageHeader from '@/components/PageHeader';

const emptyForm = {
  name: '',
  className: '',
  rollNo: '',
  guardianName: '',
  phone: '',
  status: 'Active',
};

export default function StudentsPage() {
  const [students, setStudents] = useState([]);
  const [query, setQuery] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState({});

  const filteredStudents = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return students;

    return students.filter((student) =>
      [
        student.name,
        student.className,
        student.rollNo,
        student.guardianName,
        student.phone,
        student.status,
      ]
        .join(' ')
        .toLowerCase()
        .includes(q)
    );
  }, [students, query]);

  const stats = useMemo(() => {
    const active = students.filter((s) => s.status === 'Active').length;
    const inactive = students.filter((s) => s.status === 'Inactive').length;
    return {
      total: students.length,
      active,
      inactive,
    };
  }, [students]);

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
      className: student.className || '',
      rollNo: student.rollNo || '',
      guardianName: student.guardianName || '',
      phone: student.phone || '',
      status: student.status || 'Active',
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

    if (!form.name.trim()) nextErrors.name = 'Student name is required';
    if (!form.className.trim()) nextErrors.className = 'Class is required';
    if (!form.rollNo.trim()) nextErrors.rollNo = 'Roll number is required';
    if (!form.guardianName.trim()) nextErrors.guardianName = 'Guardian name is required';

    if (!form.phone.trim()) {
      nextErrors.phone = 'Phone number is required';
    } else if (!/^[0-9]{10}$/.test(form.phone.trim())) {
      nextErrors.phone = 'Phone number must be 10 digits';
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const onSubmit = (e) => {
    e.preventDefault();
    if (!validate()) return;

    if (editingId) {
      setStudents((prev) =>
        prev.map((student) =>
          student.id === editingId
            ? {
                ...student,
                ...form,
                name: form.name.trim(),
                className: form.className.trim(),
                rollNo: form.rollNo.trim(),
                guardianName: form.guardianName.trim(),
                phone: form.phone.trim(),
              }
            : student
        )
      );
    } else {
      setStudents((prev) => [
        {
          id: Date.now(),
          name: form.name.trim(),
          className: form.className.trim(),
          rollNo: form.rollNo.trim(),
          guardianName: form.guardianName.trim(),
          phone: form.phone.trim(),
          status: form.status,
        },
        ...prev,
      ]);
    }

    closeModal();
  };

  const deleteStudent = (id) => {
    const ok = window.confirm('Delete this student?');
    if (!ok) return;
    setStudents((prev) => prev.filter((student) => student.id !== id));
  };

  const statusVariant = (status) => {
    if (status === 'Active') return 'success';
    if (status === 'Inactive') return 'secondary';
    return 'warning';
  };

  return (
    <AdminLayout
      title="Students"
      subtitle="Manage student profiles, admissions, roll numbers, and class mapping."
    >
      <PageHeader
        title="Students Section"
        subtitle="This page is ready for student listing, search, add, edit, and delete. Backend CRUD can be connected next without changing the layout."
        buttonText="Add Student"
        onClick={openAddModal}
      />

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
            <Col md={7} lg={5}>
              <InputGroup>
                <InputGroup.Text>Search</InputGroup.Text>
                <Form.Control
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search by name, class, roll no, guardian, phone..."
                />
              </InputGroup>
            </Col>

            <Col className="text-md-end">
              <Button variant="primary" onClick={openAddModal}>
                Add Student
              </Button>
            </Col>
          </Row>

          <Table responsive hover>
            <thead>
              <tr>
                <th>Student Name</th>
                <th>Class</th>
                <th>Roll No</th>
                <th>Guardian</th>
                <th>Phone</th>
                <th>Status</th>
                <th style={{ width: 180 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-4">
                    No students found
                  </td>
                </tr>
              ) : (
                filteredStudents.map((student) => (
                  <tr key={student.id}>
                    <td>{student.name}</td>
                    <td>{student.className}</td>
                    <td>{student.rollNo}</td>
                    <td>{student.guardianName}</td>
                    <td>{student.phone}</td>
                    <td>
                      <Badge bg={statusVariant(student.status)}>{student.status}</Badge>
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
                ))
              )}
            </tbody>
          </Table>
        </Card.Body>
      </Card>

      <Modal show={showModal} onHide={closeModal} centered>
        <Form onSubmit={onSubmit}>
          <Modal.Header closeButton>
            <Modal.Title>{editingId ? 'Edit Student' : 'Add Student'}</Modal.Title>
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
                  <Form.Control
                    name="className"
                    value={form.className}
                    onChange={onChange}
                    isInvalid={!!errors.className}
                    placeholder="Example: 8-A"
                  />
                  <Form.Control.Feedback type="invalid">
                    {errors.className}
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
                  <Form.Select name="status" value={form.status} onChange={onChange}>
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
              {editingId ? 'Update Student' : 'Save Student'}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </AdminLayout>
  );
}
