'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import api from '@/lib/api';
import { formatDate, getStatusBadgeClass, getStatusLabel } from '@/lib/utils';
import { Plus, Search, FolderOpen } from 'lucide-react';

interface Campaign {
  campaign_id: string;
  name: string;
  control_code: string;
  status: string;
  start_date: string;
  end_date: string;
  owner: { display_name: string };
  _count: { requests: number };
}

const STATUS_TABS = ['', 'DRAFT', 'ACTIVE', 'COMPLETED', 'ARCHIVED'];
const STATUS_TAB_LABELS: Record<string, string> = {
  '': 'Todas',
  DRAFT: 'Borrador',
  ACTIVE: 'Activas',
  COMPLETED: 'Completadas',
  ARCHIVED: 'Archivadas',
};

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  useEffect(() => {
    fetchCampaigns();
  }, [statusFilter, search, page]);

  const fetchCampaigns = async () => {
    setLoading(true);
    try {
      const params: Record<string, string | number> = { page, limit: 12 };
      if (statusFilter) params.status = statusFilter;
      if (search) params.search = search;

      const { data } = await api.get('/campaigns', { params });
      setCampaigns(data.data);
      setTotal(data.total);
    } catch (error) {
      console.error('Error fetching campaigns:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Campanas</h1>
          <p className="text-sm text-gray-500 mt-1">
            Gestione las campanas de solicitud de documentacion
          </p>
        </div>
        <Link href="/campaigns/new" className="btn-primary">
          <Plus className="h-4 w-4 mr-2" />
          Nueva Campana
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar por nombre o codigo de control..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="input pl-10"
          />
        </div>

        <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => { setStatusFilter(tab); setPage(1); }}
              className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                statusFilter === tab
                  ? 'bg-white text-gray-900 shadow-sm font-medium'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {STATUS_TAB_LABELS[tab]}
            </button>
          ))}
        </div>
      </div>

      {/* Campaign Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="card animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-3" />
              <div className="h-3 bg-gray-200 rounded w-1/2 mb-4" />
              <div className="h-8 bg-gray-200 rounded" />
            </div>
          ))}
        </div>
      ) : campaigns.length === 0 ? (
        <div className="card text-center py-12">
          <FolderOpen className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900">Sin campanas</h3>
          <p className="text-sm text-gray-500 mt-1">
            Cree su primera campana para comenzar
          </p>
          <Link href="/campaigns/new" className="btn-primary mt-4 inline-flex">
            <Plus className="h-4 w-4 mr-2" />
            Nueva Campana
          </Link>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {campaigns.map((campaign) => (
              <Link
                key={campaign.campaign_id}
                href={`/campaigns/${campaign.campaign_id}`}
                className="card hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-900 truncate">
                      {campaign.name}
                    </h3>
                    <p className="text-sm text-gray-500 font-mono">
                      {campaign.control_code}
                    </p>
                  </div>
                  <span className={`badge ${getStatusBadgeClass(campaign.status)}`}>
                    {getStatusLabel(campaign.status)}
                  </span>
                </div>

                <div className="text-sm text-gray-500 space-y-1">
                  <p>{formatDate(campaign.start_date)} - {formatDate(campaign.end_date)}</p>
                  <p>{campaign.owner.display_name}</p>
                  <p className="font-medium text-gray-700">
                    {campaign._count.requests} solicitud(es)
                  </p>
                </div>
              </Link>
            ))}
          </div>

          {/* Pagination */}
          {total > 12 && (
            <div className="flex justify-center gap-2">
              <button
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page === 1}
                className="btn-secondary"
              >
                Anterior
              </button>
              <span className="px-4 py-2 text-sm text-gray-600">
                Pagina {page} de {Math.ceil(total / 12)}
              </span>
              <button
                onClick={() => setPage(page + 1)}
                disabled={page >= Math.ceil(total / 12)}
                className="btn-secondary"
              >
                Siguiente
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
