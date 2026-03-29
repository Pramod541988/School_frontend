'use client';

import AdminLayout from '@/components/AdminLayout';
import PageHeader from '@/components/PageHeader';
import SectionPlaceholder from '@/components/SectionPlaceholder';

export default function AttendancePage() {
  return (
    <AdminLayout
      title="Attendance"
      subtitle="Attendance reports, daily status, and teacher-submitted records."
    >
      <PageHeader
        title="Attendance Section"
        subtitle="Frontend shell is ready. Next step is section-wise customization and backend CRUD integration."
      />
      <SectionPlaceholder entity="Attendance" note="Attendance reports, daily status, and teacher-submitted records." />
    </AdminLayout>
  );
}
