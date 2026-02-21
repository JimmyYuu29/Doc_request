'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { formatDateTime } from '@/lib/utils';
import { Shield, Search, ChevronDown, ChevronUp } from 'lucide-react';

interface AuditEntry {
  log_id: string;
  entity_type: string;
  entity_id: string;
  action: string;
  actor_email: string;
  actor_ip: string | null;
  timestamp: string;
  details: Record<string, unknown> | null;
  campaign_id: string | null;
}

const ACTION_LABELS: Record<string, string> = {
  CAMPAIGN_CREATED: 'Campana creada',
  CAMPAIGN_UPDATED: 'Campana actualizada',
  CAMPAIGN_ACTIVATED: 'Campana activada',
  CAMPAIGN_COMPLETED: 'Campana completada',
  REQUEST_CREATED: 'Solicitud creada',
  REQUEST_SENT: 'Solicitud enviada',
  REQUEST_REMINDER_SENT: 'Recordatorio enviado',
  REQUEST_CLOSED: 'Solicitud cerrada',
  EVIDENCE_SUBMITTED: 'Evidencia enviada',
  EVIDENCE_VALIDATED: 'Evidencia validada',
  EVIDENCE_REJECTED: 'Evidencia rechazada',
  SUBMISSION_CREATED: 'Envio creado',
  TOKEN_VALIDATED: 'Token validado',
  OTP_SENT: 'OTP enviado',
  OTP_VALIDATED: 'OTP validado',
  OTP_FAILED: 'OTP fallido',
  FILE_UPLOADED: 'Archivo subido',
  USER_LOGIN: 'Inicio de sesion',
};

export default function AuditPage() {
  const [logs, setLogs] = useState<AuditEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Filters
  const [entityType, setEntityType] = useState('');
  const [action, setAction] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  useEffect(() => {
    fetchLogs();
  }, [page, entityType, action, dateFrom, dateTo]);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const params: Record<string, string | number> = { page, limit: 25 };
      if (entityType) params.entity_type = entityType;
      if (action) params.action = action;
      if (dateFrom) params.date_from = dateFrom;
      if (dateTo) params.date_to = dateTo;

      const { data } = await api.get('/audit-logs', { params });
      setLogs(data.data);
      setTotal(data.total);
    } catch (error) {
      console.error('Error fetching audit logs:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Shield className="h-6 w-6" />
          Registro de Auditoria
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Historial inmutable de todas las acciones del sistema
        </p>
      </div>

      {/* Filters */}
      <div className="card">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <label className="label">Tipo de entidad</label>
            <select value={entityType} onChange={(e) => { setEntityType(e.target.value); setPage(1); }} className="input">
              <option value="">Todas</option>
              <option value="CAMPAIGN">Campana</option>
              <option value="REQUEST">Solicitud</option>
              <option value="EVIDENCE">Evidencia</option>
              <option value="SUBMISSION">Envio</option>
              <option value="TOKEN">Token</option>
              <option value="OTP">OTP</option>
              <option value="FILE">Archivo</option>
              <option value="USER">Usuario</option>
            </select>
          </div>
          <div>
            <label className="label">Accion</label>
            <select value={action} onChange={(e) => { setAction(e.target.value); setPage(1); }} className="input">
              <option value="">Todas</option>
              {Object.entries(ACTION_LABELS).map(([key, label]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Desde</label>
            <input type="date" value={dateFrom} onChange={(e) => { setDateFrom(e.target.value); setPage(1); }} className="input" />
          </div>
          <div>
            <label className="label">Hasta</label>
            <input type="date" value={dateTo} onChange={(e) => { setDateTo(e.target.value); setPage(1); }} className="input" />
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="card overflow-hidden p-0">
        {loading ? (
          <div className="animate-pulse p-6 space-y-3">
            {[...Array(5)].map((_, i) => <div key={i} className="h-10 bg-gray-100 rounded" />)}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left py-3 px-4 font-medium text-gray-500">Fecha</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-500">Accion</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-500">Entidad</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-500">Actor</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-500">Detalles</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.log_id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4 text-gray-600 whitespace-nowrap">
                      {formatDateTime(log.timestamp)}
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-medium">{ACTION_LABELS[log.action] || log.action}</span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-gray-500">{log.entity_type}</span>
                      <span className="text-xs text-gray-400 block font-mono">{log.entity_id.substring(0, 8)}...</span>
                    </td>
                    <td className="py-3 px-4 text-gray-600">{log.actor_email}</td>
                    <td className="py-3 px-4">
                      {log.details && (
                        <button
                          onClick={() => setExpandedId(expandedId === log.log_id ? null : log.log_id)}
                          className="text-primary-600 hover:text-primary-700 flex items-center gap-1"
                        >
                          {expandedId === log.log_id ? (
                            <><ChevronUp className="h-3.5 w-3.5" /> Ocultar</>
                          ) : (
                            <><ChevronDown className="h-3.5 w-3.5" /> Ver</>
                          )}
                        </button>
                      )}
                      {expandedId === log.log_id && log.details && (
                        <pre className="mt-2 p-2 bg-gray-100 rounded text-xs overflow-x-auto">
                          {JSON.stringify(log.details, null, 2)}
                        </pre>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {total > 25 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200">
            <span className="text-sm text-gray-500">{total} registros</span>
            <div className="flex gap-2">
              <button
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page === 1}
                className="btn-secondary text-sm"
              >
                Anterior
              </button>
              <span className="px-3 py-1.5 text-sm text-gray-600">
                {page} / {Math.ceil(total / 25)}
              </span>
              <button
                onClick={() => setPage(page + 1)}
                disabled={page >= Math.ceil(total / 25)}
                className="btn-secondary text-sm"
              >
                Siguiente
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
