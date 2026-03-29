'use client';

import AdminLayout from '@/components/AdminLayout';
import PageHeader from '@/components/PageHeader';
import SectionPlaceholder from '@/components/SectionPlaceholder';

export default function StudentsPage() {
  return (
    <AdminLayout
      title="Students"
      subtitle="Manage student profiles, admissions, roll numbers, and class mapping."
    >
      <PageHeader
        title="Students Section"
        subtitle="Frontend shell is ready. Next step is section-wise customization and backend CRUD integration."
      />
      <SectionPlaceholder entity="Students" note="Manage student profiles, admissions, roll numbers, and class mapping." />
    </AdminLayout>
  );
}
