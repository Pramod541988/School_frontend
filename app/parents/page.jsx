'use client';

import AdminLayout from '@/components/AdminLayout';
import PageHeader from '@/components/PageHeader';
import SectionPlaceholder from '@/components/SectionPlaceholder';

export default function ParentsPage() {
  return (
    <AdminLayout
      title="Parents"
      subtitle="Map parents to students, contact details, and portal access."
    >
      <PageHeader
        title="Parents Section"
        subtitle="Frontend shell is ready. Next step is section-wise customization and backend CRUD integration."
      />
      <SectionPlaceholder entity="Parents" note="Map parents to students, contact details, and portal access." />
    </AdminLayout>
  );
}
