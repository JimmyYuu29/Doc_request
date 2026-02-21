'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import api from '@/lib/api';
import { formatDate, getStatusBadgeClass, getStatusLabel } from '@/lib/utils';
import { useNotificationStore } from '@/store';
import { ArrowLeft, Plus, Send, UserPlus } from 'lucide-react';

interface RequestItem {
  request_id: string;
  recipient_name: string;
  recipient_email: string;
  status: string;
  deadline: string;
  reminder_count: number;
  evidence_items: Array<{ evidence_id: string; name: string; status: string; is_mandatory: boolean }>;
  _count: { submissions: number };
}

export default function CampaignRequestsPage() {
  const params = useParams();
  const { addNotification } = useNotificationStore();
  const [requests, setRequests] = useState<RequestItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);

  // Add Request form state
  const [newRequest, setNewRequest] = useState({
    recipient_email: '',
    recipient_name: '',
    delegate_email: '',
    deadline: '',
    evidences: [{ name: '', type: 'PDF', is_mandatory: true, instructions: '' }],
  });

  useEffect(() => {
    fetchRequests();
  }, [params.id]);

  const fetchRequests = async () => {
    try {
      const { data } = await api.get(`/campaigns/${params.id}/requests`);
      setRequests(data.data);
    } catch {
      addNotification('error', 'Error al cargar solicitudes');
    } finally {
      setLoading(false);
    }
  };

  const handleSend = async (requestId: string) => {
    try {
      await api.post(`/requests/${requestId}/send`);
      addNotification('success', 'Solicitud enviada correctamente');
      fetchRequests();
    } catch (err: any) {
      addNotification('error', err.response?.data?.error || 'Error al enviar');
    }
  };

  const addEvidence = () => {
    setNewRequest({
      ...newRequest,
      evidences: [...newRequest.evidences, { name: '', type: 'PDF', is_mandatory: true, instructions: '' }],
    });
  };

  const removeEvidence = (index: number) => {
    setNewRequest({
      ...newRequest,
      evidences: newRequest.evidences.filter((_, i) => i !== index),
    });
  };

  const handleCreateRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post(`/campaigns/${params.id}/requests`, {
        requests: [{
          recipient_email: newRequest.recipient_email,
          recipient_name: newRequest.recipient_name,
          delegate_email: newRequest.delegate_email || undefined,
          deadline: newRequest.deadline,
          evidences: newRequest.evidences.filter((ev) => ev.name.trim()),
        }],
      });
      addNotification('success', 'Solicitud creada');
      setShowAddForm(false);
      setNewRequest({
        recipient_email: '',
        recipient_name: '',
        delegate_email: '',
        deadline: '',
        evidences: [{ name: '', type: 'PDF', is_mandatory: true, instructions: '' }],
      });
      fetchRequests();
    } catch (err: any) {
      addNotification('error', err.response?.data?.error || 'Error al crear solicitud');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href={`/campaigns/${params.id}`} className="p-2 rounded-lg hover:bg-gray-100">
            <ArrowLeft className="h-5 w-5 text-gray-500" />
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">Gestionar Solicitudes</h1>
        </div>
        <button onClick={() => setShowAddForm(!showAddForm)} className="btn-primary">
          <Plus className="h-4 w-4 mr-2" />
          Anadir Solicitud
        </button>
      </div>

      {/* Add Request Form */}
      {showAddForm && (
        <form onSubmit={handleCreateRequest} className="card space-y-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Nueva Solicitud
          </h2>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Nombre del destinatario *</label>
              <input value={newRequest.recipient_name} onChange={(e) => setNewRequest({ ...newRequest, recipient_name: e.target.value })} className="input" required />
            </div>
            <div>
              <label className="label">Email del destinatario *</label>
              <input type="email" value={newRequest.recipient_email} onChange={(e) => setNewRequest({ ...newRequest, recipient_email: e.target.value })} className="input" required />
            </div>
            <div>
              <label className="label">Email del delegado</label>
              <input type="email" value={newRequest.delegate_email} onChange={(e) => setNewRequest({ ...newRequest, delegate_email: e.target.value })} className="input" />
            </div>
            <div>
              <label className="label">Fecha limite *</label>
              <input type="date" value={newRequest.deadline} onChange={(e) => setNewRequest({ ...newRequest, deadline: e.target.value })} className="input" required />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="label mb-0">Evidencias solicitadas</label>
              <button type="button" onClick={addEvidence} className="text-sm text-primary-600 hover:text-primary-700">
                + Anadir evidencia
              </button>
            </div>
            {newRequest.evidences.map((ev, i) => (
              <div key={i} className="flex gap-2 mb-2">
                <input
                  value={ev.name}
                  onChange={(e) => {
                    const evs = [...newRequest.evidences];
                    evs[i].name = e.target.value;
                    setNewRequest({ ...newRequest, evidences: evs });
                  }}
                  className="input flex-1"
                  placeholder="Nombre de la evidencia"
                />
                <select
                  value={ev.type}
                  onChange={(e) => {
                    const evs = [...newRequest.evidences];
                    evs[i].type = e.target.value;
                    setNewRequest({ ...newRequest, evidences: evs });
                  }}
                  className="input w-32"
                >
                  <option value="PDF">PDF</option>
                  <option value="EXCEL">Excel</option>
                  <option value="WORD">Word</option>
                  <option value="IMAGE">Imagen</option>
                  <option value="SCREENSHOT">Captura</option>
                  <option value="MEETING_MINUTES">Acta</option>
                  <option value="OTHER">Otro</option>
                </select>
                <label className="flex items-center gap-1 text-sm">
                  <input
                    type="checkbox"
                    checked={ev.is_mandatory}
                    onChange={(e) => {
                      const evs = [...newRequest.evidences];
                      evs[i].is_mandatory = e.target.checked;
                      setNewRequest({ ...newRequest, evidences: evs });
                    }}
                  />
                  Oblig.
                </label>
                {newRequest.evidences.length > 1 && (
                  <button type="button" onClick={() => removeEvidence(i)} className="text-red-500 hover:text-red-700 px-2">
                    X
                  </button>
                )}
              </div>
            ))}
          </div>

          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setShowAddForm(false)} className="btn-secondary">Cancelar</button>
            <button type="submit" className="btn-primary">Crear Solicitud</button>
          </div>
        </form>
      )}

      {/* Requests Table */}
      <div className="card">
        {loading ? (
          <div className="animate-pulse space-y-4">
            {[...Array(3)].map((_, i) => <div key={i} className="h-12 bg-gray-100 rounded" />)}
          </div>
        ) : requests.length === 0 ? (
          <p className="text-center text-gray-500 py-8">No hay solicitudes</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-2 font-medium text-gray-500">Destinatario</th>
                  <th className="text-left py-3 px-2 font-medium text-gray-500">Estado</th>
                  <th className="text-left py-3 px-2 font-medium text-gray-500">Fecha limite</th>
                  <th className="text-left py-3 px-2 font-medium text-gray-500">Evidencias</th>
                  <th className="text-left py-3 px-2 font-medium text-gray-500">Recordatorios</th>
                  <th className="text-right py-3 px-2 font-medium text-gray-500">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {requests.map((req) => {
                  const totalEv = req.evidence_items.length;
                  const doneEv = req.evidence_items.filter((e) => e.status === 'VALIDATED').length;

                  return (
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
                      <td className="py-3 px-2">
                        <span className="text-gray-600">{doneEv}/{totalEv}</span>
                      </td>
                      <td className="py-3 px-2 text-gray-600">{req.reminder_count}</td>
                      <td className="py-3 px-2 text-right">
                        {req.status === 'DRAFT' && (
                          <button
                            onClick={() => handleSend(req.request_id)}
                            className="inline-flex items-center gap-1 text-primary-600 hover:text-primary-700 text-sm font-medium"
                          >
                            <Send className="h-3.5 w-3.5" />
                            Enviar
                          </button>
                        )}
                        <Link
                          href={`/requests/${req.request_id}`}
                          className="ml-3 text-gray-500 hover:text-gray-700 text-sm"
                        >
                          Ver
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
