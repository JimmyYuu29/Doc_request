'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import api from '@/lib/api';
import { formatDate, formatDateTime, formatFileSize, getStatusBadgeClass, getStatusLabel, getEvidenceTypeLabel } from '@/lib/utils';
import { useNotificationStore } from '@/store';
import {
  ArrowLeft, Send, Lock, CheckCircle, XCircle, RotateCcw,
  FileText, Clock, User, AlertCircle,
} from 'lucide-react';

interface Evidence {
  evidence_id: string;
  name: string;
  type: string;
  is_mandatory: boolean;
  instructions: string | null;
  status: string;
  rejection_reason: string | null;
  validated_by: string | null;
  validated_at: string | null;
  file_size_bytes: number | null;
  file_mime_type: string | null;
  submission_files: Array<{
    file_id: string;
    original_filename: string;
    size_bytes: number;
    mime_type: string;
    uploaded_at: string;
  }>;
}

interface RequestDetail {
  request_id: string;
  recipient_name: string;
  recipient_email: string;
  delegate_email: string | null;
  status: string;
  deadline: string;
  reminder_count: number;
  escalation_level: number;
  created_at: string;
  closed_at: string | null;
  campaign: { campaign_id: string; name: string; control_code: string };
  evidence_items: Evidence[];
  submissions: Array<{
    submission_id: string;
    submitted_by_email: string;
    submitted_at: string;
    notes: string | null;
    files: Array<{ original_filename: string; size_bytes: number }>;
  }>;
}

export default function RequestDetailPage() {
  const params = useParams();
  const { addNotification } = useNotificationStore();
  const [request, setRequest] = useState<RequestDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  useEffect(() => {
    fetchRequest();
  }, [params.id]);

  const fetchRequest = async () => {
    try {
      const { data } = await api.get(`/requests/${params.id}`);
      setRequest(data);
    } catch {
      addNotification('error', 'Error al cargar solicitud');
    } finally {
      setLoading(false);
    }
  };

  const handleSend = async () => {
    try {
      await api.post(`/requests/${params.id}/send`);
      addNotification('success', 'Solicitud enviada');
      fetchRequest();
    } catch (err: any) {
      addNotification('error', err.response?.data?.error || 'Error al enviar');
    }
  };

  const handleClose = async () => {
    try {
      await api.post(`/requests/${params.id}/close`);
      addNotification('success', 'Solicitud cerrada');
      fetchRequest();
    } catch (err: any) {
      addNotification('error', err.response?.data?.error || 'Error al cerrar');
    }
  };

  const handleValidate = async (evidenceId: string) => {
    try {
      await api.post(`/evidences/${evidenceId}/validate`);
      addNotification('success', 'Evidencia validada');
      fetchRequest();
    } catch (err: any) {
      addNotification('error', err.response?.data?.error || 'Error al validar');
    }
  };

  const handleReject = async (evidenceId: string) => {
    if (!rejectReason.trim()) {
      addNotification('error', 'El motivo del rechazo es obligatorio');
      return;
    }
    try {
      await api.post(`/evidences/${evidenceId}/reject`, { rejection_reason: rejectReason });
      addNotification('success', 'Evidencia rechazada');
      setRejectingId(null);
      setRejectReason('');
      fetchRequest();
    } catch (err: any) {
      addNotification('error', err.response?.data?.error || 'Error al rechazar');
    }
  };

  const handleSubsanation = async (evidenceId: string) => {
    try {
      await api.post(`/evidences/${evidenceId}/subsanation`);
      addNotification('success', 'Evidencia reabierta para subsanacion');
      fetchRequest();
    } catch (err: any) {
      addNotification('error', err.response?.data?.error || 'Error');
    }
  };

  if (loading) return <div className="animate-pulse card h-96" />;
  if (!request) return <div className="card text-center py-12">Solicitud no encontrada</div>;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <Link href={`/campaigns/${request.campaign.campaign_id}`} className="p-2 rounded-lg hover:bg-gray-100">
            <ArrowLeft className="h-5 w-5 text-gray-500" />
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-gray-900">
                Solicitud: {request.recipient_name}
              </h1>
              <span className={`badge ${getStatusBadgeClass(request.status)}`}>
                {getStatusLabel(request.status)}
              </span>
            </div>
            <p className="text-sm text-gray-500 mt-1">
              {request.campaign.control_code} / {request.recipient_email}
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          {request.status === 'DRAFT' && (
            <button onClick={handleSend} className="btn-primary">
              <Send className="h-4 w-4 mr-2" /> Enviar
            </button>
          )}
          {request.status === 'READY_TO_CLOSE' && (
            <button onClick={handleClose} className="btn-primary">
              <Lock className="h-4 w-4 mr-2" /> Cerrar Solicitud
            </button>
          )}
        </div>
      </div>

      {/* Info */}
      <div className="card">
        <dl className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <dt className="text-gray-500 flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> Fecha limite</dt>
            <dd className="font-medium mt-1">{formatDate(request.deadline)}</dd>
          </div>
          <div>
            <dt className="text-gray-500 flex items-center gap-1"><User className="h-3.5 w-3.5" /> Delegado</dt>
            <dd className="font-medium mt-1">{request.delegate_email || 'N/A'}</dd>
          </div>
          <div>
            <dt className="text-gray-500">Recordatorios</dt>
            <dd className="font-medium mt-1">{request.reminder_count} (Nivel {request.escalation_level})</dd>
          </div>
          <div>
            <dt className="text-gray-500">Creada</dt>
            <dd className="font-medium mt-1">{formatDate(request.created_at)}</dd>
          </div>
        </dl>
      </div>

      {/* Evidence Items */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-gray-900">
          Evidencias ({request.evidence_items.length})
        </h2>

        {request.evidence_items.map((ev) => (
          <div key={ev.evidence_id} className="card">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-gray-400" />
                  <h3 className="font-medium text-gray-900">{ev.name}</h3>
                  <span className={`badge ${getStatusBadgeClass(ev.status)}`}>
                    {getStatusLabel(ev.status)}
                  </span>
                  {ev.is_mandatory && (
                    <span className="text-xs text-red-500 font-medium">Obligatorio</span>
                  )}
                </div>
                <p className="text-sm text-gray-500 mt-1">
                  Tipo: {getEvidenceTypeLabel(ev.type)}
                  {ev.instructions && ` | ${ev.instructions}`}
                </p>

                {ev.rejection_reason && (
                  <div className="mt-2 p-2 bg-red-50 rounded text-sm text-red-700">
                    <AlertCircle className="inline h-3.5 w-3.5 mr-1" />
                    Motivo del rechazo: {ev.rejection_reason}
                  </div>
                )}

                {ev.validated_by && (
                  <p className="text-xs text-gray-400 mt-1">
                    {ev.status === 'VALIDATED' ? 'Validada' : 'Revisada'} por {ev.validated_by}
                    {ev.validated_at && ` el ${formatDateTime(ev.validated_at)}`}
                  </p>
                )}

                {ev.submission_files.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {ev.submission_files.map((file) => (
                      <div key={file.file_id} className="flex items-center gap-2 text-sm text-gray-600">
                        <FileText className="h-3.5 w-3.5" />
                        {file.original_filename}
                        <span className="text-gray-400">({formatFileSize(file.size_bytes)})</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex gap-2 ml-4">
                {ev.status === 'SUBMITTED' && (
                  <>
                    <button
                      onClick={() => handleValidate(ev.evidence_id)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-green-50 text-green-700 hover:bg-green-100 text-sm font-medium"
                    >
                      <CheckCircle className="h-4 w-4" /> Validar
                    </button>
                    {rejectingId === ev.evidence_id ? (
                      <div className="flex items-center gap-2">
                        <input
                          value={rejectReason}
                          onChange={(e) => setRejectReason(e.target.value)}
                          className="input w-48"
                          placeholder="Motivo del rechazo..."
                        />
                        <button
                          onClick={() => handleReject(ev.evidence_id)}
                          className="btn-danger text-sm px-3 py-1.5"
                        >
                          Confirmar
                        </button>
                        <button
                          onClick={() => { setRejectingId(null); setRejectReason(''); }}
                          className="text-sm text-gray-500"
                        >
                          Cancelar
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setRejectingId(ev.evidence_id)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-red-50 text-red-700 hover:bg-red-100 text-sm font-medium"
                      >
                        <XCircle className="h-4 w-4" /> Rechazar
                      </button>
                    )}
                  </>
                )}
                {ev.status === 'REJECTED' && (
                  <button
                    onClick={() => handleSubsanation(ev.evidence_id)}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-yellow-50 text-yellow-700 hover:bg-yellow-100 text-sm font-medium"
                  >
                    <RotateCcw className="h-4 w-4" /> Subsanar
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Submissions History */}
      {request.submissions.length > 0 && (
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Historial de envios</h2>
          <div className="space-y-3">
            {request.submissions.map((sub) => (
              <div key={sub.submission_id} className="p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">{sub.submitted_by_email}</span>
                  <span className="text-gray-500">{formatDateTime(sub.submitted_at)}</span>
                </div>
                <div className="mt-1 text-sm text-gray-600">
                  {sub.files.length} archivo(s) enviado(s)
                  {sub.files.map((f, i) => (
                    <span key={i} className="text-gray-400"> | {f.original_filename}</span>
                  ))}
                </div>
                {sub.notes && (
                  <p className="mt-1 text-sm text-gray-500 italic">{sub.notes}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
