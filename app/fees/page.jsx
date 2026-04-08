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

const emptyComponent = {
  fee_head: '',
  amount: '',
  is_optional: false,
  remark: '',
};

const emptyForm = {
  class_id: '',
  academic_year: '2025-26',
  plan_name: 'Standard Fee Plan',
  description: '',
  status: 'Active',
  components: [{ ...emptyComponent }],
};

const emptyAssignForm = {
  class_id: '',
  fee_plan_id: '',
  apply_to_existing_students: true,
  overwrite_student_fee_total: true,
  reset_student_fee_paid_if_exceeds_total: false,
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

export default function FeesPage() {
  const API_BASE = getApiBase();

  const [classes, setClasses] = useState([]);
  const [plans, setPlans] = useState([]);
  const [query, setQuery] = useState('');
  const [classFilter, setClassFilter] = useState('');
  const [yearFilter, setYearFilter] = useState('');
  const [pageError, setPageError] = useState('');
  const [pageSuccess, setPageSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [assigning, setAssigning] = useState(false);

  const [showPlanModal, setShowPlanModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);

  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [assignForm, setAssignForm] = useState(emptyAssignForm);
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

    if (!res.ok) {
      throw new Error(data?.detail || 'Failed to load classes');
    }

    setClasses(Array.isArray(data) ? data : []);
  }

  async function loadPlans() {
    const params = new URLSearchParams();
    if (classFilter) params.set('class_id', classFilter);
    if (yearFilter.trim()) params.set('academic_year', yearFilter.trim());

    const qs = params.toString();
    const url = `${API_BASE}/admin/fee-plans${qs ? `?${qs}` : ''}`;

    const res = await fetch(url, {
      method: 'GET',
      headers: authHeaders(),
      cache: 'no-store',
    });

    const data = await readJsonSafe(res);

    if (!res.ok) {
      throw new Error(data?.detail || 'Failed to load fee plans');
    }

    setPlans(Array.isArray(data?.items) ? data.items : []);
  }

  async function refreshAll() {
    if (!API_BASE) {
      setPageError('NEXT_PUBLIC_API_BASE is missing');
      return;
    }

    try {
      setLoading(true);
      setPageError('');
      await Promise.all([loadClasses(), loadPlans()]);
    } catch (err) {
      setPageError(err?.message || 'Failed to load fees data');
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
      loadPlans().catch((err) => {
        setPageError(err?.message || 'Failed to load fee plans');
      });
    }, 250);

    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [classFilter, yearFilter]);

  const filteredPlans = useMemo(() => {
    const q = query.trim().toLowerCase();

    return plans.filter((item) => {
      if (!q) return true;

      const text = [
        item.class_name,
        item.academic_year,
        item.plan_name,
        item.description,
        item.status,
        ...(item.components || []).map((c) =>
          [c.fee_head, c.amount, c.remark, c.is_optional ? 'optional' : 'mandatory'].join(' ')
        ),
      ]
        .join(' ')
        .toLowerCase();

      return text.includes(q);
    });
  }, [plans, query]);

  const stats = useMemo(() => {
    const totalPlans = plans.length;
    const activePlans = plans.filter((x) => x.status === 'Active').length;
    const totalAmount = plans.reduce((sum, x) => sum + Number(x.total_amount || 0), 0);

    return {
      totalPlans,
      activePlans,
      totalAmount,
    };
  }, [plans]);

  const classOptions = useMemo(() => classes, [classes]);

  const assignablePlans = useMemo(() => {
    if (!assignForm.class_id) return plans;
    return plans.filter((item) => String(item.class_id) === String(assignForm.class_id));
  }, [plans, assignForm.class_id]);

  function resetPlanForm() {
    setEditingId(null);
    setForm({
      ...emptyForm,
      components: [{ ...emptyComponent }],
    });
    setErrors({});
  }

  function openAddModal() {
    resetPlanForm();
    setShowPlanModal(true);
  }

  function openEditModal(plan) {
    setEditingId(plan.id);
    setForm({
      class_id: plan.class_id ? String(plan.class_id) : '',
      academic_year: plan.academic_year || '2025-26',
      plan_name: plan.plan_name || 'Standard Fee Plan',
      description: plan.description || '',
      status: plan.status || 'Active',
      components:
        Array.isArray(plan.components) && plan.components.length > 0
          ? plan.components.map((item) => ({
              fee_head: item.fee_head || '',
              amount:
                item.amount !== undefined && item.amount !== null
                  ? String(item.amount)
                  : '',
              is_optional: !!item.is_optional,
              remark: item.remark || '',
            }))
          : [{ ...emptyComponent }],
    });
    setErrors({});
    setShowPlanModal(true);
  }

  function closePlanModal() {
    setShowPlanModal(false);
    resetPlanForm();
  }

  function openAssignModal(plan = null) {
    setAssignForm({
      class_id: plan?.class_id ? String(plan.class_id) : '',
      fee_plan_id: plan?.id ? String(plan.id) : '',
      apply_to_existing_students: true,
      overwrite_student_fee_total: true,
      reset_student_fee_paid_if_exceeds_total: false,
    });
    setShowAssignModal(true);
  }

  function closeAssignModal() {
    setShowAssignModal(false);
    setAssignForm(emptyAssignForm);
  }

  function updateComponent(index, field, value) {
    setForm((prev) => {
      const next = [...prev.components];
      next[index] = {
        ...next[index],
        [field]: value,
      };
      return {
        ...prev,
        components: next,
      };
    });
  }

  function addComponentRow() {
    setForm((prev) => ({
      ...prev,
      components: [...prev.components, { ...emptyComponent }],
    }));
  }

  function removeComponentRow(index) {
    setForm((prev) => {
      if (prev.components.length === 1) {
        return {
          ...prev,
          components: [{ ...emptyComponent }],
        };
      }

      return {
        ...prev,
        components: prev.components.filter((_, i) => i !== index),
      };
    });
  }

  const currentTotal = useMemo(() => {
    return form.components.reduce((sum, item) => sum + Number(item.amount || 0), 0);
  }, [form.components]);

  function validatePlan() {
    const nextErrors = {};

    if (!form.class_id) nextErrors.class_id = 'Class is required';
    if (!form.academic_year.trim()) nextErrors.academic_year = 'Academic year is required';
    if (!form.plan_name.trim()) nextErrors.plan_name = 'Plan name is required';

    const validComponents = form.components.filter(
      (item) => item.fee_head.trim() || String(item.amount).trim() || item.remark.trim()
    );

    if (validComponents.length === 0) {
      nextErrors.components = 'At least one fee component is required';
    }

    const seenHeads = new Set();

    validComponents.forEach((item, index) => {
      if (!item.fee_head.trim()) {
        nextErrors[`fee_head_${index}`] = 'Fee head is required';
      }

      if (item.amount === '') {
        nextErrors[`amount_${index}`] = 'Amount is required';
      } else if (Number(item.amount) < 0) {
        nextErrors[`amount_${index}`] = 'Amount cannot be negative';
      }

      const key = item.fee_head.trim().toLowerCase();
      if (key) {
        if (seenHeads.has(key)) {
          nextErrors[`fee_head_${index}`] = 'Duplicate fee head not allowed';
        }
        seenHeads.add(key);
      }
    });

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  async function onSavePlan(e) {
    e.preventDefault();
    if (!validatePlan()) return;

    try {
      setSaving(true);
      setPageError('');
      setPageSuccess('');

      const payload = {
        class_id: Number(form.class_id),
        academic_year: form.academic_year.trim(),
        plan_name: form.plan_name.trim(),
        description: form.description.trim(),
        status: form.status,
        components: form.components
          .filter(
            (item) => item.fee_head.trim() || String(item.amount).trim() || item.remark.trim()
          )
          .map((item) => ({
            fee_head: item.fee_head.trim(),
            amount: Number(item.amount || 0),
            is_optional: !!item.is_optional,
            remark: item.remark.trim(),
          })),
      };

      const url = editingId
        ? `${API_BASE}/admin/fee-plans/${editingId}`
        : `${API_BASE}/admin/fee-plans`;

      const method = editingId ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: authHeaders(),
        body: JSON.stringify(payload),
      });

      const data = await readJsonSafe(res);

      if (!res.ok) {
        throw new Error(data?.detail || 'Failed to save fee plan');
      }

      await loadPlans();
      setPageSuccess(editingId ? 'Fee plan updated successfully' : 'Fee plan created successfully');
      closePlanModal();
    } catch (err) {
      setPageError(err?.message || 'Failed to save fee plan');
    } finally {
      setSaving(false);
    }
  }

  async function deletePlan(id) {
    const ok = window.confirm('Delete this fee plan?');
    if (!ok) return;

    try {
      setPageError('');
      setPageSuccess('');

      const res = await fetch(`${API_BASE}/admin/fee-plans/${id}`, {
        method: 'DELETE',
        headers: authHeaders(),
      });

      const data = await readJsonSafe(res);

      if (!res.ok) {
        throw new Error(data?.detail || 'Failed to delete fee plan');
      }

      await loadPlans();
      setPageSuccess('Fee plan deleted successfully');
    } catch (err) {
      setPageError(err?.message || 'Failed to delete fee plan');
    }
  }

  async function onAssignPlan(e) {
    e.preventDefault();

    if (!assignForm.class_id || !assignForm.fee_plan_id) {
      setPageError('Please select class and fee plan');
      return;
    }

    try {
      setAssigning(true);
      setPageError('');
      setPageSuccess('');

      const payload = {
        class_id: Number(assignForm.class_id),
        fee_plan_id: Number(assignForm.fee_plan_id),
        apply_to_existing_students: !!assignForm.apply_to_existing_students,
        overwrite_student_fee_total: !!assignForm.overwrite_student_fee_total,
        reset_student_fee_paid_if_exceeds_total:
          !!assignForm.reset_student_fee_paid_if_exceeds_total,
      };

      const res = await fetch(`${API_BASE}/admin/fee-plans/assign`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify(payload),
      });

      const data = await readJsonSafe(res);

      if (!res.ok) {
        throw new Error(data?.detail || 'Failed to assign fee plan');
      }

      setPageSuccess(
        `Fee plan assigned successfully. Students updated: ${data?.students_updated ?? 0}`
      );
      closeAssignModal();
    } catch (err) {
      setPageError(err?.message || 'Failed to assign fee plan');
    } finally {
      setAssigning(false);
    }
  }

  return (
    <AdminLayout
      title="Fees"
      subtitle="Manage class-wise fee plans, fee heads, and assign fees to students."
    >
      {pageError ? (
        <Alert variant="danger" className="mb-4">
          {pageError}
        </Alert>
      ) : null}

      {pageSuccess ? (
        <Alert
          variant="success"
          className="mb-4"
          dismissible
          onClose={() => setPageSuccess('')}
        >
          {pageSuccess}
        </Alert>
      ) : null}

      <Row className="g-4 mb-4">
        <Col md={4}>
          <Card className="card-soft h-100">
            <Card.Body>
              <div className="metric-label">Total Fee Plans</div>
              <div className="metric-number">{stats.totalPlans}</div>
            </Card.Body>
          </Card>
        </Col>

        <Col md={4}>
          <Card className="card-soft h-100">
            <Card.Body>
              <div className="metric-label">Active Plans</div>
              <div className="metric-number">{stats.activePlans}</div>
            </Card.Body>
          </Card>
        </Col>

        <Col md={4}>
          <Card className="card-soft h-100">
            <Card.Body>
              <div className="metric-label">Total Planned Amount</div>
              <div className="metric-number">₹ {stats.totalAmount}</div>
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
                  placeholder="Search by class, year, plan, fee head..."
                />
              </InputGroup>
            </Col>

            <Col md={6} lg={3}>
              <Form.Select
                value={classFilter}
                onChange={(e) => setClassFilter(e.target.value)}
              >
                <option value="">All Classes</option>
                {classOptions.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </Form.Select>
            </Col>

            <Col md={6} lg={2}>
              <Form.Control
                value={yearFilter}
                onChange={(e) => setYearFilter(e.target.value)}
                placeholder="Academic year"
              />
            </Col>

            <Col md={6} lg={1} className="d-grid">
              <Button
                variant="outline-secondary"
                onClick={() => {
                  setQuery('');
                  setClassFilter('');
                  setYearFilter('');
                }}
              >
                Clear
              </Button>
            </Col>

            <Col md={6} lg={2} className="d-flex gap-2 justify-content-lg-end">
              <Button variant="outline-primary" onClick={() => openAssignModal()}>
                Assign
              </Button>
              <Button variant="primary" onClick={openAddModal}>
                Add Fee Plan
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
                  <th>Class</th>
                  <th>Academic Year</th>
                  <th>Plan Name</th>
                  <th>Fee Heads</th>
                  <th>Total Amount</th>
                  <th>Status</th>
                  <th style={{ width: 240 }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredPlans.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-4">
                      No fee plans found
                    </td>
                  </tr>
                ) : (
                  filteredPlans.map((plan) => (
                    <tr key={plan.id}>
                      <td>{plan.class_name}</td>
                      <td>{plan.academic_year}</td>
                      <td>
                        <div className="fw-semibold">{plan.plan_name}</div>
                        {plan.description ? (
                          <div className="text-muted small">{plan.description}</div>
                        ) : null}
                      </td>
                      <td>
                        <div className="d-flex flex-wrap gap-2">
                          {(plan.components || []).length === 0 ? (
                            <span className="text-muted">No heads</span>
                          ) : (
                            plan.components.map((item) => (
                              <Badge
                                key={`${plan.id}-${item.id}`}
                                bg={item.is_optional ? 'warning' : 'info'}
                                text={item.is_optional ? 'dark' : 'light'}
                              >
                                {item.fee_head}: ₹ {item.amount}
                              </Badge>
                            ))
                          )}
                        </div>
                      </td>
                      <td>₹ {plan.total_amount || 0}</td>
                      <td>
                        <Badge bg={statusVariant(plan.status)}>{plan.status}</Badge>
                      </td>
                      <td>
                        <div className="d-flex flex-wrap gap-2">
                          <Button
                            size="sm"
                            variant="outline-success"
                            onClick={() => openAssignModal(plan)}
                          >
                            Assign
                          </Button>
                          <Button
                            size="sm"
                            variant="outline-primary"
                            onClick={() => openEditModal(plan)}
                          >
                            Edit
                          </Button>
                          <Button
                            size="sm"
                            variant="outline-danger"
                            onClick={() => deletePlan(plan.id)}
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

      <Modal show={showPlanModal} onHide={closePlanModal} centered size="xl">
        <Form onSubmit={onSavePlan}>
          <Modal.Header closeButton>
            <Modal.Title>{editingId ? 'Edit Fee Plan' : 'Add Fee Plan'}</Modal.Title>
          </Modal.Header>

          <Modal.Body>
            <Row className="g-3">
              <Col md={4}>
                <Form.Group>
                  <Form.Label>Class</Form.Label>
                  <Form.Select
                    value={form.class_id}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, class_id: e.target.value }))
                    }
                    isInvalid={!!errors.class_id}
                  >
                    <option value="">Select class</option>
                    {classOptions.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name}
                      </option>
                    ))}
                  </Form.Select>
                  <Form.Control.Feedback type="invalid">
                    {errors.class_id}
                  </Form.Control.Feedback>
                </Form.Group>
              </Col>

              <Col md={4}>
                <Form.Group>
                  <Form.Label>Academic Year</Form.Label>
                  <Form.Control
                    value={form.academic_year}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, academic_year: e.target.value }))
                    }
                    isInvalid={!!errors.academic_year}
                    placeholder="2025-26"
                  />
                  <Form.Control.Feedback type="invalid">
                    {errors.academic_year}
                  </Form.Control.Feedback>
                </Form.Group>
              </Col>

              <Col md={4}>
                <Form.Group>
                  <Form.Label>Status</Form.Label>
                  <Form.Select
                    value={form.status}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, status: e.target.value }))
                    }
                  >
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </Form.Select>
                </Form.Group>
              </Col>

              <Col md={6}>
                <Form.Group>
                  <Form.Label>Plan Name</Form.Label>
                  <Form.Control
                    value={form.plan_name}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, plan_name: e.target.value }))
                    }
                    isInvalid={!!errors.plan_name}
                    placeholder="Standard Fee Plan"
                  />
                  <Form.Control.Feedback type="invalid">
                    {errors.plan_name}
                  </Form.Control.Feedback>
                </Form.Group>
              </Col>

              <Col md={6}>
                <Form.Group>
                  <Form.Label>Description</Form.Label>
                  <Form.Control
                    value={form.description}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, description: e.target.value }))
                    }
                    placeholder="Optional description"
                  />
                </Form.Group>
              </Col>

              <Col md={12}>
                <div className="d-flex justify-content-between align-items-center mb-2">
                  <Form.Label className="mb-0">Fee Components</Form.Label>
                  <Button size="sm" variant="outline-primary" onClick={addComponentRow}>
                    Add Fee Head
                  </Button>
                </div>

                {errors.components ? (
                  <Alert variant="danger" className="py-2">
                    {errors.components}
                  </Alert>
                ) : null}

                <div className="border rounded p-3">
                  {form.components.map((item, index) => (
                    <Row className="g-3 align-items-end mb-2" key={index}>
                      <Col md={4}>
                        <Form.Group>
                          <Form.Label>Fee Head</Form.Label>
                          <Form.Control
                            value={item.fee_head}
                            onChange={(e) =>
                              updateComponent(index, 'fee_head', e.target.value)
                            }
                            isInvalid={!!errors[`fee_head_${index}`]}
                            placeholder="Tuition Fee"
                          />
                          <Form.Control.Feedback type="invalid">
                            {errors[`fee_head_${index}`]}
                          </Form.Control.Feedback>
                        </Form.Group>
                      </Col>

                      <Col md={3}>
                        <Form.Group>
                          <Form.Label>Amount</Form.Label>
                          <Form.Control
                            type="number"
                            min="0"
                            value={item.amount}
                            onChange={(e) =>
                              updateComponent(index, 'amount', e.target.value)
                            }
                            isInvalid={!!errors[`amount_${index}`]}
                            placeholder="0"
                          />
                          <Form.Control.Feedback type="invalid">
                            {errors[`amount_${index}`]}
                          </Form.Control.Feedback>
                        </Form.Group>
                      </Col>

                      <Col md={3}>
                        <Form.Group>
                          <Form.Label>Remark</Form.Label>
                          <Form.Control
                            value={item.remark}
                            onChange={(e) =>
                              updateComponent(index, 'remark', e.target.value)
                            }
                            placeholder="Optional note"
                          />
                        </Form.Group>
                      </Col>

                      <Col md={1}>
                        <Form.Check
                          type="checkbox"
                          label="Optional"
                          checked={!!item.is_optional}
                          onChange={(e) =>
                            updateComponent(index, 'is_optional', e.target.checked)
                          }
                        />
                      </Col>

                      <Col md={1}>
                        <div className="d-grid">
                          <Button
                            type="button"
                            variant="outline-danger"
                            onClick={() => removeComponentRow(index)}
                          >
                            ×
                          </Button>
                        </div>
                      </Col>
                    </Row>
                  ))}

                  <div className="mt-3 text-end fw-semibold">
                    Total Plan Amount: ₹ {currentTotal}
                  </div>
                </div>
              </Col>
            </Row>
          </Modal.Body>

          <Modal.Footer>
            <Button variant="outline-secondary" onClick={closePlanModal} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? 'Saving...' : editingId ? 'Update Fee Plan' : 'Save Fee Plan'}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>

      <Modal show={showAssignModal} onHide={closeAssignModal} centered>
        <Form onSubmit={onAssignPlan}>
          <Modal.Header closeButton>
            <Modal.Title>Assign Fee Plan to Students</Modal.Title>
          </Modal.Header>

          <Modal.Body>
            <Row className="g-3">
              <Col md={12}>
                <Form.Group>
                  <Form.Label>Class</Form.Label>
                  <Form.Select
                    value={assignForm.class_id}
                    onChange={(e) =>
                      setAssignForm((prev) => ({
                        ...prev,
                        class_id: e.target.value,
                        fee_plan_id: '',
                      }))
                    }
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

              <Col md={12}>
                <Form.Group>
                  <Form.Label>Fee Plan</Form.Label>
                  <Form.Select
                    value={assignForm.fee_plan_id}
                    onChange={(e) =>
                      setAssignForm((prev) => ({
                        ...prev,
                        fee_plan_id: e.target.value,
                      }))
                    }
                    disabled={!assignForm.class_id}
                  >
                    <option value="">Select fee plan</option>
                    {assignablePlans.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.class_name} | {item.academic_year} | {item.plan_name} | ₹{' '}
                        {item.total_amount || 0}
                      </option>
                    ))}
                  </Form.Select>
                </Form.Group>
              </Col>

              <Col md={12}>
                <Form.Check
                  type="checkbox"
                  label="Apply to existing students"
                  checked={assignForm.apply_to_existing_students}
                  onChange={(e) =>
                    setAssignForm((prev) => ({
                      ...prev,
                      apply_to_existing_students: e.target.checked,
                    }))
                  }
                />
              </Col>

              <Col md={12}>
                <Form.Check
                  type="checkbox"
                  label="Overwrite student total fee"
                  checked={assignForm.overwrite_student_fee_total}
                  onChange={(e) =>
                    setAssignForm((prev) => ({
                      ...prev,
                      overwrite_student_fee_total: e.target.checked,
                    }))
                  }
                />
              </Col>

              <Col md={12}>
                <Form.Check
                  type="checkbox"
                  label="Reset paid fee if it exceeds new total"
                  checked={assignForm.reset_student_fee_paid_if_exceeds_total}
                  onChange={(e) =>
                    setAssignForm((prev) => ({
                      ...prev,
                      reset_student_fee_paid_if_exceeds_total: e.target.checked,
                    }))
                  }
                />
              </Col>
            </Row>
          </Modal.Body>

          <Modal.Footer>
            <Button
              variant="outline-secondary"
              onClick={closeAssignModal}
              disabled={assigning}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={assigning}>
              {assigning ? 'Assigning...' : 'Assign Fee Plan'}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </AdminLayout>
  );
}
