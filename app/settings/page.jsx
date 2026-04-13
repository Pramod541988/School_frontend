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

const emptyRoomForm = {
  room_no: '',
  room_name: '',
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
  const [rooms, setRooms] = useState([]);

  const [subjectQuery, setSubjectQuery] = useState('');
  const [subjectStatusFilter, setSubjectStatusFilter] = useState('');
  const [roomQuery, setRoomQuery] = useState('');
  const [roomStatusFilter, setRoomStatusFilter] = useState('');

  const [showSubjectModal, setShowSubjectModal] = useState(false);
  const [editingSubjectId, setEditingSubjectId] = useState(null);
  const [subjectForm, setSubjectForm] = useState(emptySubjectForm);

  const [showRoomModal, setShowRoomModal] = useState(false);
  const [editingRoomId, setEditingRoomId] = useState(null);
  const [roomForm, setRoomForm] = useState(emptyRoomForm);

  const [pageError, setPageError] = useState('');
  const [loading, setLoading] = useState(false);
  const [savingSubject, setSavingSubject] = useState(false);
  const [savingRoom, setSavingRoom] = useState(false);

  async function readJsonSafe(res) {
    const text = await res.text();
    try {
      return text ? JSON.parse(text) : {};
    } catch {
      return { detail: text || 'Unexpected server response' };
    }
  }

  async function tryFetchList(endpoints) {
    let lastError = 'Failed to load data';

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

        return Array.isArray(data?.items)
          ? data.items
          : Array.isArray(data)
            ? data
            : [];
      } catch (err) {
        lastError = err?.message || lastError;
      }
    }

    throw new Error(lastError);
  }

  async function loadSubjects() {
    const items = await tryFetchList([
      `${API_BASE}/admin/settings/subjects`,
      `${API_BASE}/admin/subjects`,
    ]);
    setSubjects(items);
  }

  async function loadRooms() {
    const items = await tryFetchList([
      `${API_BASE}/admin/settings/rooms`,
      `${API_BASE}/admin/rooms`,
    ]);
    setRooms(items);
  }

  async function refreshAll() {
    if (!API_BASE) {
      setPageError('NEXT_PUBLIC_API_BASE is missing');
      return;
    }

    try {
      setLoading(true);
      setPageError('');
      await Promise.all([loadSubjects(), loadRooms()]);
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
      const matchesQuery = !subjectQuery.trim()
        || `${item.name || ''} ${item.status || ''}`.toLowerCase().includes(subjectQuery.trim().toLowerCase());

      const matchesStatus = !subjectStatusFilter || item.status === subjectStatusFilter;
      return matchesQuery && matchesStatus;
    });
  }, [subjects, subjectQuery, subjectStatusFilter]);

  const filteredRooms = useMemo(() => {
    return rooms.filter((item) => {
      const matchesQuery = !roomQuery.trim()
        || `${item.room_no || ''} ${item.room_name || ''} ${item.status || ''}`
          .toLowerCase()
          .includes(roomQuery.trim().toLowerCase());

      const matchesStatus = !roomStatusFilter || item.status === roomStatusFilter;
      return matchesQuery && matchesStatus;
    });
  }, [rooms, roomQuery, roomStatusFilter]);

  const subjectStats = useMemo(() => {
    const active = subjects.filter((x) => x.status === 'Active').length;
    const inactive = subjects.filter((x) => x.status === 'Inactive').length;

    return {
      total: subjects.length,
      active,
      inactive,
    };
  }, [subjects]);

  const roomStats = useMemo(() => {
    const active = rooms.filter((x) => x.status === 'Active').length;
    const inactive = rooms.filter((x) => x.status === 'Inactive').length;

    return {
      total: rooms.length,
      active,
      inactive,
    };
  }, [rooms]);

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

  const openAddRoomModal = () => {
    setEditingRoomId(null);
    setRoomForm(emptyRoomForm);
    setShowRoomModal(true);
  };

  const openEditRoomModal = (room) => {
    setEditingRoomId(room.id);
    setRoomForm({
      room_no: room.room_no || '',
      room_name: room.room_name || '',
      status: room.status || 'Active',
    });
    setShowRoomModal(true);
  };

  const closeRoomModal = () => {
    setEditingRoomId(null);
    setRoomForm(emptyRoomForm);
    setShowRoomModal(false);
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

      if (!saved) throw new Error(lastError);

      await loadSubjects();
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

      if (!deleted) throw new Error(lastError);

      await loadSubjects();
    } catch (err) {
      setPageError(err?.message || 'Failed to delete subject');
    }
  };

  const saveRoom = async (e) => {
    e.preventDefault();

    if (!roomForm.room_no.trim()) {
      alert('Room number is required');
      return;
    }

    try {
      setSavingRoom(true);
      setPageError('');

      const payload = {
        room_no: roomForm.room_no.trim(),
        room_name: roomForm.room_name.trim(),
        status: roomForm.status,
      };

      const endpoints = editingRoomId
        ? [
            `${API_BASE}/admin/settings/rooms/${editingRoomId}`,
            `${API_BASE}/admin/rooms/${editingRoomId}`,
          ]
        : [
            `${API_BASE}/admin/settings/rooms`,
            `${API_BASE}/admin/rooms`,
          ];

      const method = editingRoomId ? 'PUT' : 'POST';

      let saved = false;
      let lastError = 'Failed to save room';

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

      if (!saved) throw new Error(lastError);

      await loadRooms();
      closeRoomModal();
    } catch (err) {
      setPageError(err?.message || 'Failed to save room');
    } finally {
      setSavingRoom(false);
    }
  };

  const deleteRoom = async (roomId) => {
    const ok = window.confirm('Delete this room?');
    if (!ok) return;

    try {
      setPageError('');

      const endpoints = [
        `${API_BASE}/admin/settings/rooms/${roomId}`,
        `${API_BASE}/admin/rooms/${roomId}`,
      ];

      let deleted = false;
      let lastError = 'Failed to delete room';

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

      if (!deleted) throw new Error(lastError);

      await loadRooms();
    } catch (err) {
      setPageError(err?.message || 'Failed to delete room');
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
        <Col md={3}>
          <Card className="card-soft h-100">
            <Card.Body>
              <div className="metric-label">Total Subjects</div>
              <div className="metric-number">{subjectStats.total}</div>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="card-soft h-100">
            <Card.Body>
              <div className="metric-label">Active Subjects</div>
              <div className="metric-number">{subjectStats.active}</div>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="card-soft h-100">
            <Card.Body>
              <div className="metric-label">Total Rooms</div>
              <div className="metric-number">{roomStats.total}</div>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="card-soft h-100">
            <Card.Body>
              <div className="metric-label">Active Rooms</div>
              <div className="metric-number">{roomStats.active}</div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <Row className="g-4">
        <Col lg={6}>
          <Card className="card-soft h-100">
            <Card.Header className="bg-white border-0 pt-3">
              <div className="d-flex flex-wrap justify-content-between align-items-center gap-2">
                <div>
                  <h5 className="mb-1">Subjects Master</h5>
                  <div className="text-muted small">
                    Timetable and Teachers can use school-specific subject options.
                  </div>
                </div>
                <Button onClick={openAddSubjectModal}>Add Subject</Button>
              </div>
            </Card.Header>

            <Card.Body>
              <Row className="g-3 align-items-center mb-4">
                <Col md={8}>
                  <InputGroup>
                    <InputGroup.Text>Search</InputGroup.Text>
                    <Form.Control
                      value={subjectQuery}
                      onChange={(e) => setSubjectQuery(e.target.value)}
                      placeholder="Search subject name or status"
                    />
                  </InputGroup>
                </Col>

                <Col md={4}>
                  <Form.Select
                    value={subjectStatusFilter}
                    onChange={(e) => setSubjectStatusFilter(e.target.value)}
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
                      <th style={{ width: 70 }}>#</th>
                      <th>Subject Name</th>
                      <th>Status</th>
                      <th style={{ width: 160 }}>Actions</th>
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

        <Col lg={6}>
          <Card className="card-soft h-100">
            <Card.Header className="bg-white border-0 pt-3">
              <div className="d-flex flex-wrap justify-content-between align-items-center gap-2">
                <div>
                  <h5 className="mb-1">Rooms Master</h5>
                  <div className="text-muted small">
                    Timetable can use room numbers from here instead of free typing.
                  </div>
                </div>
                <Button onClick={openAddRoomModal}>Add Room</Button>
              </div>
            </Card.Header>

            <Card.Body>
              <Row className="g-3 align-items-center mb-4">
                <Col md={8}>
                  <InputGroup>
                    <InputGroup.Text>Search</InputGroup.Text>
                    <Form.Control
                      value={roomQuery}
                      onChange={(e) => setRoomQuery(e.target.value)}
                      placeholder="Search room no, room name or status"
                    />
                  </InputGroup>
                </Col>

                <Col md={4}>
                  <Form.Select
                    value={roomStatusFilter}
                    onChange={(e) => setRoomStatusFilter(e.target.value)}
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
                      <th style={{ width: 70 }}>#</th>
                      <th>Room No</th>
                      <th>Room Name</th>
                      <th>Status</th>
                      <th style={{ width: 160 }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRooms.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="text-center py-4">
                          No rooms found
                        </td>
                      </tr>
                    ) : (
                      filteredRooms.map((room, index) => (
                        <tr key={room.id}>
                          <td>{index + 1}</td>
                          <td>{room.room_no}</td>
                          <td>{room.room_name || '-'}</td>
                          <td>
                            <Badge bg={statusVariant(room.status)}>
                              {room.status}
                            </Badge>
                          </td>
                          <td>
                            <div className="d-flex gap-2">
                              <Button
                                size="sm"
                                variant="outline-primary"
                                onClick={() => openEditRoomModal(room)}
                              >
                                Edit
                              </Button>
                              <Button
                                size="sm"
                                variant="outline-danger"
                                onClick={() => deleteRoom(room.id)}
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
            <Modal.Title>{editingSubjectId ? 'Edit Subject' : 'Add Subject'}</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <Form.Group className="mb-3">
              <Form.Label>Subject Name</Form.Label>
              <Form.Control
                value={subjectForm.name}
                onChange={(e) => setSubjectForm((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="Enter subject name"
                required
              />
            </Form.Group>

            <Form.Group>
              <Form.Label>Status</Form.Label>
              <Form.Select
                value={subjectForm.status}
                onChange={(e) => setSubjectForm((prev) => ({ ...prev, status: e.target.value }))}
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
              {savingSubject ? 'Saving...' : editingSubjectId ? 'Update Subject' : 'Save Subject'}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>

      <Modal show={showRoomModal} onHide={closeRoomModal} centered>
        <Form onSubmit={saveRoom}>
          <Modal.Header closeButton>
            <Modal.Title>{editingRoomId ? 'Edit Room' : 'Add Room'}</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <Form.Group className="mb-3">
              <Form.Label>Room Number</Form.Label>
              <Form.Control
                value={roomForm.room_no}
                onChange={(e) => setRoomForm((prev) => ({ ...prev, room_no: e.target.value }))}
                placeholder="Room 101"
                required
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Room Name</Form.Label>
              <Form.Control
                value={roomForm.room_name}
                onChange={(e) => setRoomForm((prev) => ({ ...prev, room_name: e.target.value }))}
                placeholder="Physics Lab / KG Room / Computer Lab"
              />
            </Form.Group>

            <Form.Group>
              <Form.Label>Status</Form.Label>
              <Form.Select
                value={roomForm.status}
                onChange={(e) => setRoomForm((prev) => ({ ...prev, status: e.target.value }))}
              >
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </Form.Select>
            </Form.Group>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="outline-secondary" onClick={closeRoomModal} disabled={savingRoom}>
              Cancel
            </Button>
            <Button type="submit" disabled={savingRoom}>
              {savingRoom ? 'Saving...' : editingRoomId ? 'Update Room' : 'Save Room'}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </AdminLayout>
  );
}
