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

const emptyForm = {
  name: '',
  className: '',
  section: '',
  rollNo: '',
  guardianName: '',
  phone: '',
  status: 'Active',
  attendancePercentage: '',
  feeTotal: '',
  feePaid: '',
};

function safeJsonParse(value, fallback) {
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function normalizeClassMaster(raw) {
  if (!Array.isArray(raw)) return [];

  return raw
    .map((item, index) => {
      if (typeof item === 'string') {
        return {
          id: `class-${index}`,
          name: item,
          sections: [],
        };
      }

      const name =
        item?.name ||
        item?.className ||
        item?.title ||
        item?.standard ||
        '';

      const sections = Array.isArray(item?.sections)
        ? item.sections
            .map((s) => {
              if (typeof s === 'string') return s;
              return s?.name || s?.section || '';
            })
            .filter(Boolean)
        : [];

      if (!name) return null;

      return {
        id: item?.id || `class-${index}`,
        name,
        sections,
      };
    })
    .filter(Boolean);
}

function getFeeStatus(student) {
  const total = Number(student?.feeTotal || 0);
  const paid = Number(student?.feePaid || 0);

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
  const [students, setStudents] = useState([]);
  const [query, setQuery] = useState('');
  const [classFilter, setClassFilter] = useState('');
  const [sectionFilter, setSectionFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState({});
  const [classMaster, setClassMaster] = useState([]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const savedClasses = safeJsonParse(
      localStorage.getItem('school_classes_v1'),
      []
    );

    setClassMaster(normalizeClassMaster(savedClasses));
  }, []);

  const derivedClassOptionsFromStudents = useMemo(() => {
    return [...new Set(students.map((s) => s.className).filter(Boolean))];
  }, [students]);

  const classOptions = useMemo(() => {
    const fromMaster = classMaster.map((item) => item.name).filter(Boolean);
    return fromMaster.length > 0
      ? fromMaster
      : derivedClassOptionsFromStudents;
  }, [classMaster, derivedClassOptionsFromStudents]);

  const derivedSectionOptionsFromStudents = useMemo(() => {
    const base = classFilter
      ? students.filter((s) => s.className === classFilter)
      : students;

    return [...new Set(base.map((s) => s.section).filter(Boolean))];
  }, [students, classFilter]);

  const sectionOptions = useMemo(() => {
    if (classMaster.length > 0) {
      const selectedClass = classMaster.find(
        (item) => item.name === classFilter
      );

      if (selectedClass) return selectedClass.sections || [];

      if (!classFilter) {
        return [
          ...new Set(
            classMaster.flatMap((item) => item.sections || []).filter(Boolean)
          ),
        ];
      }
    }

    return derivedSectionOptionsFromStudents;
  }, [classMaster, classFilter, derivedSectionOptionsFromStudents]);

  const modalSectionOptions = useMemo(() => {
    if (classMaster.length > 0) {
      const selectedClass = classMaster.find(
        (item) => item.name === form.className
      );
      return selectedClass?.sections || [];
    }

    return [
      ...new Set(
        students
          .filter((s) => !form.className || s.className === form.className)
          .map((s) => s.section)
          .filter(Boolean)
      ),
    ];
  }, [classMaster, form.className, students]);

  const filteredStudents = useMemo(() => {
    const q = query.trim().toLowerCase();

    return students.filter((student) => {
      const matchesQuery =
        !q ||
        [
          student.name,
          student.className,
          student.section,
          student.rollNo,
          student.guardianName,
          student.phone,
          student.status,
          getFeeStatus(student),
          String(student.attendancePercentage ?? ''),
        ]
          .join(' ')
          .toLowerCase()
          .includes(q);

      const matchesClass = !classFilter || student.className === classFilter;
      const matchesSection = !sectionFilter || student.section === sectionFilter;

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
      section: student.section || '',
      rollNo: student.rollNo || '',
      guardianName: student.guardianName || '',
      phone: student.phone || '',
      status: student.status || 'Active',
      attendancePercentage:
        student.attendancePercentage !== undefined &&
        student.attendancePercentage !== null
          ? String(student.attendancePercentage)
          : '',
      feeTotal:
        student.feeTotal !== undefined && student.feeTotal !== null
          ? String(student.feeTotal)
          : '',
      feePaid:
        student.feePaid !== undefined && student.feePaid !== null
          ? String(student.feePaid)
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
      if (name === 'className') {
        return {
          ...prev,
          className: value,
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
    if (!form.className.trim()) nextErrors.className = 'Class is required';
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

  const onSubmit = (e) => {
    e.preventDefault();
    if (!validate()) return;

    const payload = {
      name: form.name.trim(),
      className: form.className.trim(),
      section: form.section.trim(),
      rollNo: form.rollNo.trim(),
      guardianName: form.guardianName.trim(),
      phone: form.phone.trim(),
      status: form.status,
      attendancePercentage: Number(form.attendancePercentage),
      feeTotal: Number(form.feeTotal || 0),
      feePaid: Number(form.feePaid || 0),
    };

    if (editingId) {
      setStudents((prev) =>
        prev.map((student) =>
          student.id === editingId ? { ...student, ...payload } : student
        )
      );
    } else {
      setStudents((prev) => [
        {
          id: Date.now(),
          ...payload,
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

  return (
    <AdminLayout
      title="Students"
      subtitle="Manage student profiles, admissions, roll numbers, and class mapping."
    >
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
                  <option key={item} value={item}>
                    {item}
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
                      <td>{student.className}</td>
                      <td>{student.section || '-'}</td>
                      <td>{student.rollNo}</td>
                      <td>{student.guardianName}</td>
                      <td>{student.phone}</td>
                      <td>{student.attendancePercentage ?? 0}%</td>
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
                    name="className"
                    value={form.className}
                    onChange={onChange}
                    isInvalid={!!errors.className}
                  >
                    <option value="">Select class</option>
                    {classOptions.map((item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                  </Form.Select>
                  <Form.Control.Feedback type="invalid">
                    {errors.className}
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
                    disabled={!form.className}
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
