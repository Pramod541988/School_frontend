'use client';

import { Badge, Card, Table } from 'react-bootstrap';

export default function SectionPlaceholder({ entity, note }) {
  const rows = [
    { name: `${entity} Item 1`, status: 'Active', remark: 'Ready for backend CRUD' },
    { name: `${entity} Item 2`, status: 'Pending', remark: 'Customize section next' },
    { name: `${entity} Item 3`, status: 'Draft', remark: 'Add filters, modals, forms' }
  ];

  const statusVariant = {
    Active: 'success',
    Pending: 'warning',
    Draft: 'secondary'
  };

  return (
    <Card className="card-soft">
      <Card.Body>
        <div className="mb-3" style={{ color: '#667085' }}>{note}</div>
        <Table responsive hover>
          <thead>
            <tr>
              <th>Name</th>
              <th>Status</th>
              <th>Remark</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, idx) => (
              <tr key={idx}>
                <td>{row.name}</td>
                <td><Badge bg={statusVariant[row.status] || 'secondary'}>{row.status}</Badge></td>
                <td>{row.remark}</td>
              </tr>
            ))}
          </tbody>
        </Table>
      </Card.Body>
    </Card>
  );
}
