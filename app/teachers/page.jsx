'use client';

import AdminLayout from '@/components/AdminLayout';
import PageHeader from '@/components/PageHeader';
import SectionPlaceholder from '@/components/SectionPlaceholder';

export default function TeachersPage() {
  return (
    <AdminLayout
      title="Teachers"
      subtitle="Teacher master, subjects, employee IDs, and class allocations."
    >
      <PageHeader
        title="Teachers Section"
        subtitle="Frontend shell is ready. Next step is section-wise customization and backend CRUD integration."
      />
      <SectionPlaceholder entity="Teachers" note="Teacher master, subjects, employee IDs, and class allocations." />
    </AdminLayout>
  );
}
