'use client';

import { Button, Card } from 'react-bootstrap';

export default function PageHeader({ title, subtitle, buttonText = '', onClick = null }) {
  return (
    <Card className="card-soft mb-4">
      <Card.Body className="d-flex justify-content-between align-items-center flex-wrap gap-3">
        <div>
          <div style={{ fontSize: 24, fontWeight: 700 }}>{title}</div>
          <div style={{ color: '#667085' }}>{subtitle}</div>
        </div>
        {buttonText ? <Button onClick={onClick}>{buttonText}</Button> : null}
      </Card.Body>
    </Card>
  );
}
