'use client';

import AdminLayout from '@/components/AdminLayout';
import PageHeader from '@/components/PageHeader';
import SectionPlaceholder from '@/components/SectionPlaceholder';

export default function ResultsPage() {
  return (
    <AdminLayout
      title="Results"
      subtitle="Exam setup, subject-wise marks, and report generation."
    >
      <PageHeader
        title="Results Section"
        subtitle="Frontend shell is ready. Next step is section-wise customization and backend CRUD integration."
      />
      <SectionPlaceholder entity="Results" note="Exam setup, subject-wise marks, and report generation." />
    </AdminLayout>
  );
}
