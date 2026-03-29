'use client';

import AdminLayout from '@/components/AdminLayout';
import PageHeader from '@/components/PageHeader';
import SectionPlaceholder from '@/components/SectionPlaceholder';

export default function ClassesPage() {
  return (
    <AdminLayout
      title="Classes"
      subtitle="Class-section setup, class teacher assignment, and structure."
    >
      <PageHeader
        title="Classes Section"
        subtitle="Frontend shell is ready. Next step is section-wise customization and backend CRUD integration."
      />
      <SectionPlaceholder entity="Classes" note="Class-section setup, class teacher assignment, and structure." />
    </AdminLayout>
  );
}
