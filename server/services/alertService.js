/* ==============================================================================
   BusTrack Pro — Alert & Incident Service
   ============================================================================== */

import { db } from '../database/db.js';
import { ApiError } from '../middleware/errorHandler.js';

const VALID_SEVERITIES = ['critical', 'warning', 'info'];

export class AlertService {
  static getAlerts(severity = 'all') {
    return db.getAllAlerts(severity);
  }

  static createAlert(payload) {
    if (!payload.title || typeof payload.title !== 'string') {
      throw ApiError.badRequest('Field "title" is required.');
    }
    if (!payload.desc || typeof payload.desc !== 'string') {
      throw ApiError.badRequest('Field "desc" is required.');
    }
    if (payload.type && !VALID_SEVERITIES.includes(payload.type)) {
      throw ApiError.badRequest(
        `Invalid alert severity '${payload.type}'. Allowed values: ${VALID_SEVERITIES.join(', ')}`
      );
    }

    const alert = db.createAlert(payload);
    db.pushActivity(`Alerta registrada: ${alert.title}`, alert.type === 'critical' ? 'danger' : 'warn');
    return alert;
  }

  static markAllAsRead() {
    const markedCount = db.markAllAlertsAsRead();
    return { success: true, markedCount };
  }
}
