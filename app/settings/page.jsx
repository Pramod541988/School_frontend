'use client';

import AdminLayout from '@/components/AdminLayout';
import PageHeader from '@/components/PageHeader';
import SectionPlaceholder from '@/components/SectionPlaceholder';

export default function SettingsPage() {
  return (
    <AdminLayout
      title="Settings"
      subtitle="School-wide portal configuration, branding, and API preferences."
    >
      <PageHeader
        title="Settings Section"
        subtitle="Frontend shell is ready. Next step is section-wise customization and backend CRUD integration."
      />
      <SectionPlaceholder entity="Settings" note="School-wide portal configuration, branding, and API preferences." />
    </AdminLayout>
  );
}
