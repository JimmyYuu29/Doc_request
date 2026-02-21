'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import api from '@/lib/api';
import { ArrowLeft, FileDown, Users, CheckCircle, Clock, AlertCircle, Bell, BarChart3 } from 'lucide-react';

interface DashboardData {
  campaign_name: string;
  control_code: string;
  total_requests: number;
  by_status: Record<string, number>;
  completion_rate: number;
  overdue_count: number;
  total_evidences: number;
  evidences_validated: number;
  evidences_pending: number;
  evidences_rejected: number;
  total_reminders_sent: number;
  average_response_days: number | null;
}

export default function CampaignDashboardPage() {
  const params = useParams();
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboard();
  }, [params.id]);

  const fetchDashboard = async () => {
    try {
      const { data } = await api.get(`/campaigns/${params.id}/dashboard`);
      setDashboard(data);
    } catch (error) {
      console.error('Error fetching dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadReport = async () => {
    try {
      const response = await api.get(`/campaigns/${params.id}/report`, {
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Informe_Campana_${params.id}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error('Error downloading report:', error);
    }
  };

  if (loading) return <div className="animate-pulse card h-96" />;
  if (!dashboard) return <div className="card text-center py-12">Error al cargar dashboard</div>;

  const statusColors: Record<string, string> = {
    DRAFT: '#9ca3af',
    SENT: '#3b82f6',
    IN_PROGRESS: '#eab308',
    PARTIAL: '#f97316',
    SUBMITTED: '#6366f1',
    REVIEW: '#a855f7',
    READY_TO_CLOSE: '#22c55e',
    CLOSED: '#16a34a',
    OVERDUE: '#ef4444',
  };

  const statusLabels: Record<string, string> = {
    DRAFT: 'Borrador',
    SENT: 'Enviada',
    IN_PROGRESS: 'En progreso',
    PARTIAL: 'Parcial',
    SUBMITTED: 'Enviada',
    REVIEW: 'Revision',
    READY_TO_CLOSE: 'Lista',
    CLOSED: 'Cerrada',
    OVERDUE: 'Vencida',
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href={`/campaigns/${params.id}`} className="p-2 rounded-lg hover:bg-gray-100">
            <ArrowLeft className="h-5 w-5 text-gray-500" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
            <p className="text-sm text-gray-500">{dashboard.campaign_name} ({dashboard.control_code})</p>
          </div>
        </div>
        <button onClick={handleDownloadReport} className="btn-secondary">
          <FileDown className="h-4 w-4 mr-2" />
          Descargar Informe PDF
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="card">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center">
              <Users className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{dashboard.total_requests}</p>
              <p className="text-sm text-gray-500">Total solicitudes</p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-green-100 flex items-center justify-center">
              <CheckCircle className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{dashboard.completion_rate}%</p>
              <p className="text-sm text-gray-500">Completitud</p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-red-100 flex items-center justify-center">
              <AlertCircle className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{dashboard.overdue_count}</p>
              <p className="text-sm text-gray-500">Vencidas</p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-yellow-100 flex items-center justify-center">
              <Bell className="h-5 w-5 text-yellow-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{dashboard.total_reminders_sent}</p>
              <p className="text-sm text-gray-500">Recordatorios</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Status Distribution */}
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Distribucion por estado
          </h2>
          <div className="space-y-3">
            {Object.entries(dashboard.by_status).map(([status, count]) => (
              <div key={status} className="flex items-center gap-3">
                <div
                  className="h-3 w-3 rounded-full shrink-0"
                  style={{ backgroundColor: statusColors[status] || '#9ca3af' }}
                />
                <span className="text-sm text-gray-700 w-28">{statusLabels[status] || status}</span>
                <div className="flex-1 bg-gray-100 rounded-full h-2.5">
                  <div
                    className="h-2.5 rounded-full transition-all"
                    style={{
                      width: `${dashboard.total_requests > 0 ? (count / dashboard.total_requests) * 100 : 0}%`,
                      backgroundColor: statusColors[status] || '#9ca3af',
                    }}
                  />
                </div>
                <span className="text-sm font-medium text-gray-900 w-8 text-right">{count}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Evidence Stats */}
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Evidencias</h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Total</span>
              <span className="text-lg font-bold">{dashboard.total_evidences}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-green-600">Validadas</span>
              <span className="text-lg font-bold text-green-600">{dashboard.evidences_validated}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Pendientes</span>
              <span className="text-lg font-bold text-gray-600">{dashboard.evidences_pending}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-red-600">Rechazadas</span>
              <span className="text-lg font-bold text-red-600">{dashboard.evidences_rejected}</span>
            </div>

            {/* Progress bar */}
            <div>
              <div className="flex justify-between text-xs text-gray-500 mb-1">
                <span>Progreso de validacion</span>
                <span>
                  {dashboard.total_evidences > 0
                    ? Math.round((dashboard.evidences_validated / dashboard.total_evidences) * 100)
                    : 0}%
                </span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-3">
                <div
                  className="bg-green-500 h-3 rounded-full transition-all"
                  style={{
                    width: `${dashboard.total_evidences > 0 ? (dashboard.evidences_validated / dashboard.total_evidences) * 100 : 0}%`,
                  }}
                />
              </div>
            </div>

            {dashboard.average_response_days && (
              <div className="flex items-center justify-between pt-2 border-t">
                <span className="text-sm text-gray-600 flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  Tiempo medio de respuesta
                </span>
                <span className="text-lg font-bold">{dashboard.average_response_days} dias</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
