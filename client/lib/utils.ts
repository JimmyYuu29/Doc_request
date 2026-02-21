import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: string | Date): string {
  return new Date(date).toLocaleDateString('es-ES', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function formatDateTime(date: string | Date): string {
  return new Date(date).toLocaleString('es-ES', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

export function getStatusBadgeClass(status: string): string {
  const map: Record<string, string> = {
    DRAFT: 'badge-draft',
    ACTIVE: 'badge-active',
    SENT: 'badge-sent',
    IN_PROGRESS: 'badge-in-progress',
    PARTIAL: 'badge-partial',
    SUBMITTED: 'badge-submitted',
    REVIEW: 'badge-review',
    VALIDATED: 'badge-validated',
    READY_TO_CLOSE: 'badge-ready',
    COMPLETED: 'badge-completed',
    CLOSED: 'badge-closed',
    REJECTED: 'badge-rejected',
    OVERDUE: 'badge-overdue',
    PENDING: 'badge-pending',
    ARCHIVED: 'badge-archived',
  };
  return map[status] || 'badge-draft';
}

export function getStatusLabel(status: string): string {
  const map: Record<string, string> = {
    DRAFT: 'Borrador',
    ACTIVE: 'Activa',
    SENT: 'Enviada',
    IN_PROGRESS: 'En progreso',
    PARTIAL: 'Parcial',
    SUBMITTED: 'Enviada',
    REVIEW: 'En revision',
    VALIDATED: 'Validada',
    READY_TO_CLOSE: 'Lista para cerrar',
    COMPLETED: 'Completada',
    CLOSED: 'Cerrada',
    REJECTED: 'Rechazada',
    OVERDUE: 'Vencida',
    PENDING: 'Pendiente',
    ARCHIVED: 'Archivada',
  };
  return map[status] || status;
}

export function getEvidenceTypeLabel(type: string): string {
  const map: Record<string, string> = {
    PDF: 'PDF',
    EXCEL: 'Excel',
    WORD: 'Word',
    IMAGE: 'Imagen',
    EMAIL: 'Correo',
    SCREENSHOT: 'Captura',
    ACCESS: 'Acceso',
    MEETING_MINUTES: 'Acta',
    OTHER: 'Otro',
  };
  return map[type] || type;
}
