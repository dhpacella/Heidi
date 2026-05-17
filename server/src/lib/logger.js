const pool = require('../db/connection');

class Logger {
  static async logApiCall(req, res, startTime, details = {}) {
    try {
      const duration = Date.now() - startTime;
      const message = `${req.method} ${req.path} - ${res.statusCode}`;

      await pool.query(
        `INSERT INTO system_logs (check_type, status, message, details)
         VALUES ($1, $2, $3, $4)`,
        [
          'api-call',
          res.statusCode < 400 ? 'success' : res.statusCode < 500 ? 'warning' : 'error',
          message,
          JSON.stringify({
            method: req.method,
            path: req.path,
            statusCode: res.statusCode,
            duration,
            userId: req.user?.id,
            ...details
          })
        ]
      );
    } catch (err) {
      console.error('Logger.logApiCall error:', err.message);
    }
  }

  static async logEmailOperation(operation, blastId, details = {}) {
    try {
      const statusMap = {
        'send': 'success',
        'bounce': 'warning',
        'open': 'success',
        'click': 'success',
        'complaint': 'warning',
        'unsubscribe': 'success',
        'delivery': 'success',
        'failure': 'error'
      };

      await pool.query(
        `INSERT INTO system_logs (check_type, status, message, details)
         VALUES ($1, $2, $3, $4)`,
        [
          'email-operation',
          statusMap[operation] || 'success',
          `Email ${operation}: blast ${blastId}`,
          JSON.stringify({
            operation,
            blastId,
            timestamp: new Date().toISOString(),
            ...details
          })
        ]
      );
    } catch (err) {
      console.error('Logger.logEmailOperation error:', err.message);
    }
  }

  static async logSmsOperation(operation, blastId, details = {}) {
    try {
      const statusMap = {
        'send': 'success',
        'delivery': 'success',
        'bounce': 'warning',
        'fail': 'error'
      };

      await pool.query(
        `INSERT INTO system_logs (check_type, status, message, details)
         VALUES ($1, $2, $3, $4)`,
        [
          'sms-operation',
          statusMap[operation] || 'success',
          `SMS ${operation}: blast ${blastId}`,
          JSON.stringify({
            operation,
            blastId,
            timestamp: new Date().toISOString(),
            ...details
          })
        ]
      );
    } catch (err) {
      console.error('Logger.logSmsOperation error:', err.message);
    }
  }

  static async logAwsCall(service, action, success, details = {}) {
    try {
      await pool.query(
        `INSERT INTO system_logs (check_type, status, message, details)
         VALUES ($1, $2, $3, $4)`,
        [
          'aws-service',
          success ? 'success' : 'error',
          `${service}.${action}`,
          JSON.stringify({
            service,
            action,
            success,
            timestamp: new Date().toISOString(),
            ...details
          })
        ]
      );
    } catch (err) {
      console.error('Logger.logAwsCall error:', err.message);
    }
  }

  static async logDatabaseOperation(operation, table, duration, rowsAffected = 0, error = null) {
    try {
      await pool.query(
        `INSERT INTO system_logs (check_type, status, message, details)
         VALUES ($1, $2, $3, $4)`,
        [
          'database-operation',
          error ? 'error' : 'success',
          `${operation} ${table}`,
          JSON.stringify({
            operation,
            table,
            duration,
            rowsAffected,
            error: error ? error.message : null,
            timestamp: new Date().toISOString()
          })
        ]
      );
    } catch (err) {
      console.error('Logger.logDatabaseOperation error:', err.message);
    }
  }

  static async logJobExecution(jobName, success, duration, details = {}) {
    try {
      await pool.query(
        `INSERT INTO system_logs (check_type, status, message, details)
         VALUES ($1, $2, $3, $4)`,
        [
          'job-execution',
          success ? 'success' : 'error',
          `Job: ${jobName}`,
          JSON.stringify({
            jobName,
            success,
            duration,
            timestamp: new Date().toISOString(),
            ...details
          })
        ]
      );
    } catch (err) {
      console.error('Logger.logJobExecution error:', err.message);
    }
  }

  static async logError(context, error, details = {}) {
    try {
      await pool.query(
        `INSERT INTO system_logs (check_type, status, message, details)
         VALUES ($1, $2, $3, $4)`,
        [
          'error',
          'error',
          `${context}: ${error.message}`,
          JSON.stringify({
            context,
            message: error.message,
            stack: error.stack,
            timestamp: new Date().toISOString(),
            ...details
          })
        ]
      );
    } catch (err) {
      console.error('Logger.logError error:', err.message);
    }
  }

  static async logCampaignEvent(campaignId, event, details = {}) {
    try {
      await pool.query(
        `INSERT INTO system_logs (check_type, status, message, details)
         VALUES ($1, $2, $3, $4)`,
        [
          'campaign-event',
          'success',
          `Campaign ${campaignId}: ${event}`,
          JSON.stringify({
            campaignId,
            event,
            timestamp: new Date().toISOString(),
            ...details
          })
        ]
      );
    } catch (err) {
      console.error('Logger.logCampaignEvent error:', err.message);
    }
  }

  static async getLogsByType(type, limit = 100, offset = 0) {
    try {
      const result = await pool.query(
        `SELECT id, check_type, status, message, details, created_at
         FROM system_logs
         WHERE check_type = $1
         ORDER BY created_at DESC
         LIMIT $2 OFFSET $3`,
        [type, limit, offset]
      );
      return result.rows.map(row => ({
        ...row,
        details: typeof row.details === 'string' ? JSON.parse(row.details) : row.details
      }));
    } catch (err) {
      console.error('Logger.getLogsByType error:', err.message);
      return [];
    }
  }

  static async getLogsByStatus(status, limit = 100, offset = 0) {
    try {
      const result = await pool.query(
        `SELECT id, check_type, status, message, details, created_at
         FROM system_logs
         WHERE status = $1
         ORDER BY created_at DESC
         LIMIT $2 OFFSET $3`,
        [status, limit, offset]
      );
      return result.rows.map(row => ({
        ...row,
        details: typeof row.details === 'string' ? JSON.parse(row.details) : row.details
      }));
    } catch (err) {
      console.error('Logger.getLogsByStatus error:', err.message);
      return [];
    }
  }

  static async getLogStats(hoursAgo = 24) {
    try {
      const result = await pool.query(
        `SELECT check_type, status, COUNT(*) as count
         FROM system_logs
         WHERE created_at > NOW() - INTERVAL '${hoursAgo} hours'
         GROUP BY check_type, status`
      );
      return result.rows;
    } catch (err) {
      console.error('Logger.getLogStats error:', err.message);
      return [];
    }
  }
}

module.exports = Logger;
