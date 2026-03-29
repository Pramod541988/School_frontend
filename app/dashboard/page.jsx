'use client';

import { Card, Col, ListGroup, Row } from 'react-bootstrap';
import AdminLayout from '@/components/AdminLayout';

const metrics = [
  { label: 'Students', value: '2' },
  { label: 'Parents', value: '1' },
  { label: 'Teachers', value: '1' },
  { label: 'Notices', value: '4' }
];

export default function DashboardPage() {
  return (
    <AdminLayout
      title="Dashboard"
      subtitle="Monitor the school system and navigate module-wise customization."
    >
      <Row className="g-4 mb-4">
        {metrics.map((m) => (
          <Col md={6} lg={3} key={m.label}>
            <Card className="card-soft h-100">
              <Card.Body>
                <div className="metric-label">{m.label}</div>
                <div className="metric-number">{m.value}</div>
              </Card.Body>
            </Card>
          </Col>
        ))}
      </Row>

      <Row className="g-4">
        <Col lg={7}>
          <Card className="card-soft">
            <Card.Body>
              <div style={{ fontSize: 20, fontWeight: 700 }} className="mb-3">Build Roadmap</div>
              <ListGroup variant="flush">
                <ListGroup.Item>1. Login and protected layout completed</ListGroup.Item>
                <ListGroup.Item>2. Notices integration completed</ListGroup.Item>
                <ListGroup.Item>3. Students section ready for CRUD wiring</ListGroup.Item>
                <ListGroup.Item>4. Customize each module one by one</ListGroup.Item>
              </ListGroup>
            </Card.Body>
          </Card>
        </Col>

        <Col lg={5}>
          <Card className="card-soft">
            <Card.Body>
              <div style={{ fontSize: 20, fontWeight: 700 }} className="mb-3">Backend</div>
              <div style={{ color: '#667085' }}>
                The portal is prepared to integrate your FastAPI backend section by section.
                Login is live-ready and notices page is already wired to the deployed API.
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </AdminLayout>
  );
}
