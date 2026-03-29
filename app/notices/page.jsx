'use client';

import { useEffect, useState } from 'react';
import { Alert, Card, Spinner, Table } from 'react-bootstrap';
import AdminLayout from '@/components/AdminLayout';
import PageHeader from '@/components/PageHeader';
import api from '@/lib/api';

export default function NoticesPage() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get('/notices');
      setRows(res.data || []);
    } catch (err) {
      setError(err?.response?.data?.detail || 'Failed to load notices');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <AdminLayout
      title="Notices"
      subtitle="Live notices fetched from the FastAPI backend."
    >
      <PageHeader
        title="Notice Board"
        subtitle="This section is already integrated with backend."
        buttonText="Refresh"
        onClick={load}
      />

      {error ? <Alert variant="danger">{error}</Alert> : null}

      <Card className="card-soft">
        <Card.Body>
          {loading ? (
            <div className="text-center py-5"><Spinner animation="border" /></div>
          ) : (
            <Table responsive hover>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Title</th>
                  <th>Message</th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="text-center">No notices available</td>
                  </tr>
                ) : (
                  rows.map((row) => (
                    <tr key={row.id}>
                      <td>{row.id}</td>
                      <td>{row.title}</td>
                      <td>{row.message}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </Table>
          )}
        </Card.Body>
      </Card>
    </AdminLayout>
  );
}
