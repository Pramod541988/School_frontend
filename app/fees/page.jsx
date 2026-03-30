'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Badge,
  Button,
  Card,
  Col,
  Form,
  Modal,
  Row,
  Spinner,
  Table,
} from 'react-bootstrap';
import AdminLayout from '@/components/AdminLayout';

const emptyForm = {
  classId: '',
  feeName: '',
  amount: '',
  dueDate: '',
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

function feeBadge(status) {
  if (status === 'Paid') return 'success';
  if (status === 'Partial') return 'warning';
  if (status === 'Pending') return 'danger';
  return 'secondary';
}

export default function FeesPage() {
  const API_BASE = getApiBase();

  const [classes, setClasses] = useState([]);
  const [classFilter, setClassFilter] = useState('');
  const [structures, setStructures] = useState([]);
  const [studentItems, setStudentItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [pageError, setPageError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);
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
      headers: authHeaders(),
      cache: 'no-store',
    });
    const data = await readJsonSafe(res);
    if (!res.ok) throw new Error(data?.detail || 'Failed to load classes');
    setClasses(Array.isArray(data) ? data : []);
  }

  async function loadStructures(selectedClassId = classFilter) {
    const qs = new URLSearchParams();
    if (selectedClassId) qs.set('class_id', selectedClassId);

    const res = await fetch(`${API_BASE}/admin/fees/structures?${qs.toString()}`, {
      headers: authHeaders(),
      cache: 'no-store',
    });
    const data = await readJsonSafe(res);
    if (!res.ok) throw new Error(data?.detail || 'Failed to load fee structures');
    setStructures(Array.isArray(data?.items) ? data.items : []);
  }

  async function loadStudentItems(selectedClassId = classFilter) {
    const qs = new URLSearchParams();
    if (selectedClassId) qs.set('class_id', selectedClassId);

    const res = await fetch(`${API_BASE}/admin/fees/student-items?${qs.toString()}`, {
      headers: authHeaders(),
      cache: 'no-store',
    });
    const data = await readJsonSafe(res);
    if (!res.ok) throw new Error(data?.detail || 'Failed to load student fee items');
    setStudentItems(Array.isArray(data?.items) ? data.items : []);
  }

  async function refreshAll(selectedClassId = classFilter) {
    try {
      setLoading(true);
      setPageError('');
      await Promise.all([
        loadClasses(),
        loadStructures(selectedClassId),
        loadStudentItems(selectedClassId),
      ]);
    } catch (err) {
      setPageError(err?.message || 'Failed to load fees data');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refreshAll('');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!API_BASE) return;
    const t = setTimeout(() => {
      Promise.all([loadStructures(classFilter), loadStudentItems(classFilter)]).catch((err) => {
        setPageError(err?.message || 'Failed to load fees data');
      });
    }, 200);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [classFilter]);

  const className = useMemo(() => {
    const found = classes.find((c) => String(c.id) === String(classFilter));
    return found?.name || 'All Classes';
  }, [classes, classFilter]);

  const summary = useMemo(() => {
    const totalAmount = studentItems.reduce((sum, x) => sum + Number(x.amount || 0), 0);
    const totalPaid = studentItems.reduce((sum, x) => sum + Number(x.paid_amount || 0), 0);
    return {
      totalAmount,
      totalPaid,
      pending: totalAmount - totalPaid,
    };
  }, [studentItems]);

  const openAddModal = () => {
    setEditingId(null);
    setForm({
     
