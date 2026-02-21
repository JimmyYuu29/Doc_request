'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import api from '@/lib/api';
import { formatDate, getStatusBadgeClass, getStatusLabel } from '@/lib/utils';
import { useNotificationStore } from '@/store';
import {
  ArrowLeft,
  Play,
  Users,
  BarChart3,
  FileDown,
  Clock,
  CheckCircle,
  AlertCircle,
} from 'lucide-react';

interface Campaign {
  campaign_id: string;
  name: string;
  control_code: string;
  description: string | null;
  status: string;
  start_date: string;
  end_date: string;
  owner: { display_name: string; email: string };
  backup: { display_name: string; email: string } | null;
  requests: Array<{
    request_id: string;
    recipient_name: string;
    recipient_email: string;
    status: string;
    deadline: string;
    _count: { evidence_items: number };
  }>;
}

export default function CampaignDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { addNotification } = useNotificationStore();
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCampaign();
  }, [params.id]);

  const fetchCampaign = async () => {
    try {
      const { data } = await api.get(`/campaigns/${params.id}`);
      setCampaign(data);
    } catch {
      addNotification('error', 'Error al cargar la campana');
    } finally {
      setLoading(false);
    }
  };

  const handleActivate = async () => {
    try {
      await api.post(`/campaigns/${params.id}/activate`);
      addNotification('success', 'Campana activada');
      fetchCampaign();
    } catch (err: any) {
      addNotification('error', err.response?.data?.error || 'Error al activar');
    }
  };

  if (loading) {
    return <div className="animate-pulse card h-64" />;
  }

  if (!campaign) {
    return <div className="card text-center py-12">Campana no encontrada</div>;
  }

  const stats = {
    total: campaign.requests.length,
    closed: campaign.requests.filter((r) => r.status === 'CLOSED').length,
    overdue: campaign.requests.filter((r) => r.status === 'OVERDUE').length,
    pending: campaign.requests.filter((r) => !['CLOSED', 'READY_TO_CLOSE'].includes(r.status)).length,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <Link href="/campaigns" className="p-2 rounded-lg hover:bg-gray-100">
            <ArrowLeft className="h-5 w-5 text-gray-500" />
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-gray-900">{campaign.name}</h1>
              <span className={`badge ${getStatusBadgeClass(campaign.status)}`}>
                {getStatusLabel(campaign.status)}
              </span>
            </div>
            <p className="text-sm text-gray-500 font-mono mt-1">{campaign.control_code}</p>
          </div>
        </div>

        <div className="flex gap-2">
          {campaign.status === 'DRAFT' && (
            <button onClick={handleActivate} className="btn-primary">
              <Play className="h-4 w-4 mr-2" />
              Activar Campana
            </button>
          )}
          <Link href={`/campaigns/${params.id}/dashboard`} className="btn-secondary">
            <BarChart3 className="h-4 w-4 mr-2" />
            Dashboard
          </Link>
        </div>
      </div>

      {/* Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="card">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center">
              <Users className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
              <p className="text-sm text-gray-500">Solicitudes</p>
            </div>
          </div>
        </div>
        <div className="card">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-green-100 flex items-center justify-center">
              <CheckCircle className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.closed}</p>
              <p className="text-sm text-gray-500">Cerradas</p>
            </div>
          </div>
        </div>
        <div className="card">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-yellow-100 flex items-center justify-center">
              <Clock className="h-5 w-5 text-yellow-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.pending}</p>
              <p className="text-sm text-gray-500">Pendientes</p>
            </div>
          </div>
        </div>
        <div className="card">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-red-100 flex items-center justify-center">
              <AlertCircle className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.overdue}</p>
              <p className="text-sm text-gray-500">Vencidas</p>
            </div>
          </div>
        </div>
      </div>

      {/* Campaign Info */}
      <div className="card">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Detalle de la campana</h2>
        <dl className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <dt className="text-gray-500">Responsable</dt>
            <dd className="font-medium">{campaign.owner.display_name}</dd>
          </div>
          {campaign.backup && (
            <div>
              <dt className="text-gray-500">Backup</dt>
              <dd className="font-medium">{campaign.backup.display_name}</dd>
            </div>
          )}
          <div>
            <dt className="text-gray-500">Periodo</dt>
            <dd className="font-medium">{formatDate(campaign.start_date)} - {formatDate(campaign.end_date)}</dd>
          </div>
          {campaign.description && (
            <div className="col-span-2">
              <dt className="text-gray-500">Descripcion</dt>
              <dd>{campaign.description}</dd>
            </div>
          )}
        </dl>
      </div>

      {/* Requests List */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Solicitudes</h2>
          <Link href={`/campaigns/${params.id}/requests`} className="btn-secondary text-sm">
            Gestionar solicitudes
          </Link>
        </div>

        {campaign.requests.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-8">
            No hay solicitudes aun. Acceda a &quot;Gestionar solicitudes&quot; para crear.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-2 font-medium text-gray-500">Destinatario</th>
                  <th className="text-left py-3 px-2 font-medium text-gray-500">Estado</th>
                  <th className="text-left py-3 px-2 font-medium text-gray-500">Fecha limite</th>
                  <th className="text-left py-3 px-2 font-medium text-gray-500">Evidencias</th>
                </tr>
              </thead>
              <tbody>
                {campaign.requests.map((req) => (
                  <tr key={req.request_id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-2">
                      <Link href={`/requests/${req.request_id}`} className="hover:text-primary-600">
                        <p className="font-medium">{req.recipient_name}</p>
                        <p className="text-gray-500 text-xs">{req.recipient_email}</p>
                      </Link>
                    </td>
                    <td className="py-3 px-2">
                      <span className={`badge ${getStatusBadgeClass(req.status)}`}>
                        {getStatusLabel(req.status)}
                      </span>
                    </td>
                    <td className="py-3 px-2 text-gray-600">{formatDate(req.deadline)}</td>
                    <td className="py-3 px-2 text-gray-600">{req._count.evidence_items}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
