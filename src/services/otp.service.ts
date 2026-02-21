import crypto from 'crypto';
import { config } from '../config/index.js';
import { notificationService } from './notification.service.js';
import { auditService } from './audit.service.js';
import { AuditAction, EntityType } from '../types/index.js';
import logger from '../utils/logger.js';

interface OTPEntry {
  codeHash: string;
  email: string;
  requestId: string;
  expiresAt: Date;
  attempts: number;
}

// In-memory OTP store (sufficient for MVP; use Redis/DB for production)
const otpStore = new Map<string, OTPEntry>();

// Cleanup expired entries every 5 minutes
setInterval(() => {
  const now = new Date();
  for (const [key, entry] of otpStore) {
    if (entry.expiresAt < now) {
      otpStore.delete(key);
    }
  }
}, 5 * 60 * 1000);

class OTPService {
  private generateCode(): string {
    return crypto.randomInt(100000, 999999).toString();
  }

  private hashCode(code: string): string {
    return crypto.createHash('sha256').update(code).digest('hex');
  }

  private getStoreKey(requestId: string, email: string): string {
    return `${requestId}:${email}`;
  }

  async generate(requestId: string, email: string): Promise<void> {
    if (!config.otp.enabled) return;

    const code = this.generateCode();
    const key = this.getStoreKey(requestId, email);

    otpStore.set(key, {
      codeHash: this.hashCode(code),
      email,
      requestId,
      expiresAt: new Date(Date.now() + config.otp.expiryMinutes * 60 * 1000),
      attempts: 0,
    });

    await notificationService.sendOTP(email, code);

    await auditService.log({
      entityType: EntityType.OTP,
      entityId: requestId,
      action: AuditAction.OTP_SENT,
      actorEmail: 'system',
      details: { email },
    });

    logger.info('OTP generated and sent', { requestId, email });
  }

  async verify(requestId: string, email: string, code: string): Promise<boolean> {
    if (!config.otp.enabled) return true;

    const key = this.getStoreKey(requestId, email);
    const entry = otpStore.get(key);

    if (!entry) {
      return false;
    }

    if (entry.expiresAt < new Date()) {
      otpStore.delete(key);
      return false;
    }

    if (entry.attempts >= config.otp.maxAttempts) {
      await auditService.log({
        entityType: EntityType.OTP,
        entityId: requestId,
        action: AuditAction.OTP_FAILED,
        actorEmail: email,
        details: { reason: 'max_attempts_exceeded' },
      });
      otpStore.delete(key);
      return false;
    }

    entry.attempts++;

    if (this.hashCode(code) !== entry.codeHash) {
      await auditService.log({
        entityType: EntityType.OTP,
        entityId: requestId,
        action: AuditAction.OTP_FAILED,
        actorEmail: email,
        details: { attempts: entry.attempts },
      });
      return false;
    }

    // OTP valid
    otpStore.delete(key);

    await auditService.log({
      entityType: EntityType.OTP,
      entityId: requestId,
      action: AuditAction.OTP_VALIDATED,
      actorEmail: email,
    });

    return true;
  }

  isEnabled(): boolean {
    return config.otp.enabled;
  }
}

export const otpService = new OTPService();
