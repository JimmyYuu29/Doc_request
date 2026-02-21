import prisma from '../config/database.js';
import { requestService } from './request.service.js';
import logger from '../utils/logger.js';

class ReminderService {
  async getPendingReminders() {
    return requestService.getPendingReminders();
  }

  async markOverdue(): Promise<number> {
    const now = new Date();

    const result = await prisma.request.updateMany({
      where: {
        deadline: { lt: now },
        status: {
          in: ['SENT', 'IN_PROGRESS', 'PARTIAL'],
        },
      },
      data: { status: 'OVERDUE' },
    });

    if (result.count > 0) {
      logger.info(`Marked ${result.count} requests as OVERDUE`);
    }

    return result.count;
  }
}

export const reminderService = new ReminderService();
