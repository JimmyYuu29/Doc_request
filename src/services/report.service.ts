import PDFDocument from 'pdfkit';
import prisma from '../config/database.js';
import { NotFoundError } from '../utils/errors.js';

interface DashboardKPIs {
  campaign_id: string;
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

class ReportService {
  async getCampaignDashboard(campaignId: string): Promise<DashboardKPIs> {
    const campaign = await prisma.campaign.findUnique({
      where: { campaign_id: campaignId },
      include: {
        requests: {
          include: {
            evidence_items: true,
          },
        },
      },
    });

    if (!campaign) throw new NotFoundError('Campaña');

    const requests = campaign.requests;
    const allEvidences = requests.flatMap((r) => r.evidence_items);

    // Count by status
    const byStatus: Record<string, number> = {};
    for (const req of requests) {
      byStatus[req.status] = (byStatus[req.status] || 0) + 1;
    }

    // Completion rate
    const closed = requests.filter((r) => r.status === 'CLOSED').length;
    const completionRate = requests.length > 0 ? (closed / requests.length) * 100 : 0;

    // Overdue
    const overdue = requests.filter((r) => r.status === 'OVERDUE').length;

    // Evidence stats
    const validated = allEvidences.filter((e) => e.status === 'VALIDATED').length;
    const pending = allEvidences.filter((e) => e.status === 'PENDING').length;
    const rejected = allEvidences.filter((e) => e.status === 'REJECTED').length;

    // Total reminders
    const totalReminders = requests.reduce((sum, r) => sum + r.reminder_count, 0);

    // Average response time (days from creation to first submission)
    const responseTimes: number[] = [];
    for (const req of requests) {
      if (req.closed_at) {
        const days = (req.closed_at.getTime() - req.created_at.getTime()) / (1000 * 60 * 60 * 24);
        responseTimes.push(days);
      }
    }
    const avgResponse = responseTimes.length > 0
      ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length
      : null;

    return {
      campaign_id: campaignId,
      campaign_name: campaign.name,
      control_code: campaign.control_code,
      total_requests: requests.length,
      by_status: byStatus,
      completion_rate: Math.round(completionRate * 10) / 10,
      overdue_count: overdue,
      total_evidences: allEvidences.length,
      evidences_validated: validated,
      evidences_pending: pending,
      evidences_rejected: rejected,
      total_reminders_sent: totalReminders,
      average_response_days: avgResponse ? Math.round(avgResponse * 10) / 10 : null,
    };
  }

  async generateCampaignReport(campaignId: string): Promise<Buffer> {
    const dashboard = await this.getCampaignDashboard(campaignId);

    const campaign = await prisma.campaign.findUnique({
      where: { campaign_id: campaignId },
      include: {
        owner: { select: { display_name: true, email: true } },
        requests: {
          include: { evidence_items: true },
          orderBy: { recipient_name: 'asc' },
        },
      },
    });

    if (!campaign) throw new NotFoundError('Campaña');

    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ margin: 50, size: 'A4' });
      const chunks: Buffer[] = [];

      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      // Header
      doc.fontSize(20).text('Informe de Campaña', { align: 'center' });
      doc.moveDown(0.5);
      doc.fontSize(14).text(campaign.name, { align: 'center' });
      doc.fontSize(10).fillColor('#666').text(`Control: ${campaign.control_code}`, { align: 'center' });
      doc.moveDown(1);

      // Campaign info
      doc.fillColor('#000').fontSize(12).text('Información General', { underline: true });
      doc.moveDown(0.3);
      doc.fontSize(10);
      doc.text(`Responsable: ${campaign.owner?.display_name || 'N/A'}`);
      doc.text(`Periodo: ${campaign.start_date.toLocaleDateString('es-ES')} - ${campaign.end_date.toLocaleDateString('es-ES')}`);
      doc.text(`Estado: ${campaign.status}`);
      doc.moveDown(1);

      // KPIs
      doc.fontSize(12).text('Indicadores Clave (KPIs)', { underline: true });
      doc.moveDown(0.3);
      doc.fontSize(10);
      doc.text(`Total solicitudes: ${dashboard.total_requests}`);
      doc.text(`Tasa de completitud: ${dashboard.completion_rate}%`);
      doc.text(`Solicitudes vencidas: ${dashboard.overdue_count}`);
      doc.text(`Total evidencias: ${dashboard.total_evidences}`);
      doc.text(`Evidencias validadas: ${dashboard.evidences_validated}`);
      doc.text(`Evidencias pendientes: ${dashboard.evidences_pending}`);
      doc.text(`Evidencias rechazadas: ${dashboard.evidences_rejected}`);
      doc.text(`Recordatorios enviados: ${dashboard.total_reminders_sent}`);
      if (dashboard.average_response_days) {
        doc.text(`Tiempo medio de respuesta: ${dashboard.average_response_days} días`);
      }
      doc.moveDown(1);

      // Per-request breakdown
      doc.fontSize(12).text('Detalle por Solicitud', { underline: true });
      doc.moveDown(0.5);

      for (const req of campaign.requests) {
        doc.fontSize(10).fillColor('#1a365d').text(`${req.recipient_name} (${req.recipient_email})`);
        doc.fillColor('#000').fontSize(9);
        doc.text(`  Estado: ${req.status} | Fecha límite: ${req.deadline.toLocaleDateString('es-ES')} | Recordatorios: ${req.reminder_count}`);

        for (const ev of req.evidence_items) {
          const statusIcon = ev.status === 'VALIDATED' ? '[OK]' : ev.status === 'REJECTED' ? '[X]' : '[ ]';
          doc.text(`    ${statusIcon} ${ev.name} - ${ev.status}${ev.is_mandatory ? ' (Obligatorio)' : ''}`);
        }
        doc.moveDown(0.3);
      }

      // Footer
      doc.moveDown(1);
      doc.fontSize(8).fillColor('#999');
      doc.text(`Generado: ${new Date().toLocaleString('es-ES')}`, { align: 'center' });

      doc.end();
    });
  }
}

export const reportService = new ReportService();
