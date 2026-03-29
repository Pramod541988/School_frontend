'use client';

import AdminLayout from '@/components/AdminLayout';
import PageHeader from '@/components/PageHeader';
import SectionPlaceholder from '@/components/SectionPlaceholder';

export default function TimetablePage() {
  return (
    <AdminLayout
      title="Timetable"
      subtitle="Period-wise class schedules and teacher-slot mapping."
    >
      <PageHeader
        title="Timetable Section"
        subtitle="Frontend shell is ready. Next step is section-wise customization and backend CRUD integration."
      />
      <SectionPlaceholder entity="Timetable" note="Period-wise class schedules and teacher-slot mapping." />
    </AdminLayout>
  );
}
