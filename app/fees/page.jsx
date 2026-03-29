'use client';

import AdminLayout from '@/components/AdminLayout';
import PageHeader from '@/components/PageHeader';
import SectionPlaceholder from '@/components/SectionPlaceholder';

export default function FeesPage() {
  return (
    <AdminLayout
      title="Fees"
      subtitle="Fee categories, due management, receipts, and outstanding summary."
    >
      <PageHeader
        title="Fees Section"
        subtitle="Frontend shell is ready. Next step is section-wise customization and backend CRUD integration."
      />
      <SectionPlaceholder entity="Fees" note="Fee categories, due management, receipts, and outstanding summary." />
    </AdminLayout>
  );
}
