import { getGRViolationDetail, getGREntities } from '@/app/actions/gr';
import { notFound } from 'next/navigation';
import ViolationDetailClient from './ViolationDetailClient';

export default async function ViolationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const [violation, entities] = await Promise.all([
    getGRViolationDetail(id),
    getGREntities(),
  ]);

  if (!violation) notFound();
  const entity = entities.find((e: any) => e.id === violation.actual_entity_id) ?? null;

  return <ViolationDetailClient violation={violation} entity={entity} />;
}
