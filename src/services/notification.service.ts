import axios from 'axios';
import { config } from '../config/index.js';
import logger from '../utils/logger.js';

interface SendEmailParams {
  to: string;
  cc?: string;
  subject: string;
  body_html: string;
  importance?: string;
  request_id: string;
  control_code: string;
}

interface ArchiveFileParams {
  file_content_base64: string;
  file_name: string;
  folder_path: string;
  metadata: {
    request_id: string;
    evidence_id: string;
    uploaded_by: string;
    uploaded_at: string;
  };
}

interface ArchiveResponse {
  status: string;
  sp_path: string;
  sp_url: string;
}

const isMockMode = !config.powerAutomate.sendRequests || config.isDev;

async function callWebhook(url: string, data: unknown, label: string): Promise<unknown> {
  if (isMockMode) {
    logger.info(`[MOCK Power Automate] ${label}`, { data });
    return { status: 'mocked', message: `${label} simulado correctamente` };
  }

  try {
    const response = await axios.post(url, data, {
      timeout: 30000,
      headers: { 'Content-Type': 'application/json' },
    });
    logger.info(`Power Automate ${label} exitoso`, { status: response.status });
    return response.data;
  } catch (error) {
    logger.error(`Power Automate ${label} fallido`, { error });
    throw error;
  }
}

class NotificationService {
  async sendInitialRequest(params: SendEmailParams): Promise<void> {
    await callWebhook(
      config.powerAutomate.sendRequests,
      params,
      'Envío solicitud inicial'
    );
  }

  async sendOTP(email: string, otpCode: string): Promise<void> {
    await callWebhook(
      config.powerAutomate.sendOtp,
      { email, otp_code: otpCode },
      'Envío OTP'
    );
  }

  async sendReminder(params: {
    to: string;
    cc?: string;
    subject: string;
    body_html: string;
    request_id: string;
    level: number;
  }): Promise<void> {
    await callWebhook(
      config.powerAutomate.reminders,
      params,
      `Recordatorio nivel ${params.level}`
    );
  }

  async archiveFile(params: ArchiveFileParams): Promise<ArchiveResponse> {
    const result = await callWebhook(
      config.powerAutomate.archiveFiles,
      params,
      'Archivado en SharePoint'
    );

    if (isMockMode) {
      const mockPath = `/${params.folder_path}/${params.file_name}`;
      return {
        status: 'archived',
        sp_path: mockPath,
        sp_url: `${config.sharepoint.siteUrl}/${config.sharepoint.libraryName}${mockPath}`,
      };
    }

    return result as ArchiveResponse;
  }

  async sendCloseNotification(params: {
    to: string;
    subject: string;
    body_html: string;
    request_id: string;
  }): Promise<void> {
    await callWebhook(
      config.powerAutomate.sendRequests,
      { ...params, importance: 'Normal' },
      'Notificación de cierre'
    );
  }
}

export const notificationService = new NotificationService();
