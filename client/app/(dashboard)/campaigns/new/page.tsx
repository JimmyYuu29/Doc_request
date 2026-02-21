'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { useAuthStore, useNotificationStore } from '@/store';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function NewCampaignPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { addNotification } = useNotificationStore();
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    name: '',
    control_code: '',
    description: '',
    start_date: '',
    end_date: '',
    reminder_frequency_days: 3,
    reminder_max: 5,
    reminder_start_after: 2,
    escalation_level2_after: 2,
    escalation_level3_after: 4,
    escalation_superior_email: '',
    email_template: '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data } = await api.post('/campaigns', {
        name: form.name,
        control_code: form.control_code,
        description: form.description || undefined,
        owner_user_id: user!.user_id,
        start_date: form.start_date,
        end_date: form.end_date,
        reminder_policy: {
          frequency_days: Number(form.reminder_frequency_days),
          max_reminders: Number(form.reminder_max),
          start_after_days: Number(form.reminder_start_after),
        },
        escalation_policy: {
          levels: [
            { level: 1, after_reminders: 0, cc_delegate: false, cc_superior: false },
            { level: 2, after_reminders: Number(form.escalation_level2_after), cc_delegate: true, cc_superior: false },
            { level: 3, after_reminders: Number(form.escalation_level3_after), cc_delegate: true, cc_superior: true, superior_email: form.escalation_superior_email || undefined },
          ],
        },
        email_template: form.email_template || undefined,
      });

      addNotification('success', 'Campana creada correctamente');
      router.push(`/campaigns/${data.campaign_id}`);
    } catch (err: any) {
      addNotification('error', err.response?.data?.error || 'Error al crear la campana');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/campaigns" className="p-2 rounded-lg hover:bg-gray-100">
          <ArrowLeft className="h-5 w-5 text-gray-500" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Nueva Campana</h1>
          <p className="text-sm text-gray-500">
            Defina los parametros de la campana de solicitud
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Info */}
        <div className="card space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">Informacion basica</h2>

          <div>
            <label className="label">Nombre de la campana *</label>
            <input name="name" value={form.name} onChange={handleChange} className="input" placeholder="Revision Anual de Controles HR 2026" required />
          </div>

          <div>
            <label className="label">Codigo de control *</label>
            <input name="control_code" value={form.control_code} onChange={handleChange} className="input font-mono" placeholder="HR-FCTRL-1" required />
          </div>

          <div>
            <label className="label">Descripcion</label>
            <textarea name="description" value={form.description} onChange={handleChange} className="input" rows={3} placeholder="Descripcion de la campana..." />
          </div>
        </div>

        {/* Dates */}
        <div className="card space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">Periodo</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Fecha de inicio *</label>
              <input name="start_date" type="date" value={form.start_date} onChange={handleChange} className="input" required />
            </div>
            <div>
              <label className="label">Fecha limite *</label>
              <input name="end_date" type="date" value={form.end_date} onChange={handleChange} className="input" required />
            </div>
          </div>
        </div>

        {/* Reminder Policy */}
        <div className="card space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">Politica de recordatorios</h2>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="label">Frecuencia (dias)</label>
              <input name="reminder_frequency_days" type="number" value={form.reminder_frequency_days} onChange={handleChange} className="input" min={1} />
            </div>
            <div>
              <label className="label">Maximo recordatorios</label>
              <input name="reminder_max" type="number" value={form.reminder_max} onChange={handleChange} className="input" min={1} />
            </div>
            <div>
              <label className="label">Iniciar tras (dias)</label>
              <input name="reminder_start_after" type="number" value={form.reminder_start_after} onChange={handleChange} className="input" min={0} />
            </div>
          </div>
        </div>

        {/* Escalation Policy */}
        <div className="card space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">Politica de escalado</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Nivel 2 tras N recordatorios</label>
              <input name="escalation_level2_after" type="number" value={form.escalation_level2_after} onChange={handleChange} className="input" min={1} />
              <p className="text-xs text-gray-500 mt-1">Se copiara al delegado</p>
            </div>
            <div>
              <label className="label">Nivel 3 tras N recordatorios</label>
              <input name="escalation_level3_after" type="number" value={form.escalation_level3_after} onChange={handleChange} className="input" min={2} />
              <p className="text-xs text-gray-500 mt-1">Se copiara al superior</p>
            </div>
          </div>
          <div>
            <label className="label">Email del superior (Nivel 3)</label>
            <input name="escalation_superior_email" type="email" value={form.escalation_superior_email} onChange={handleChange} className="input" placeholder="socio@firma.com" />
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3">
          <Link href="/campaigns" className="btn-secondary">Cancelar</Link>
          <button type="submit" disabled={loading} className="btn-primary">
            {loading ? 'Creando...' : 'Crear Campana'}
          </button>
        </div>
      </form>
    </div>
  );
}
