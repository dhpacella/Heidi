const { EventEmitter } = require('events');

class CampaignEventEmitter extends EventEmitter {
  constructor() {
    super();
    this.maxListeners = 100;
    this.activeBlasts = new Map();
  }

  startBlast(blastId, subject, totalRecipients) {
    this.activeBlasts.set(blastId, {
      blastId,
      subject,
      total: totalRecipients,
      sent: 0,
      failed: 0,
      status: 'sending',
      startTime: Date.now(),
    });
    this.emit('blast.started', this.activeBlasts.get(blastId));
  }

  updateProgress(blastId, sent, failed) {
    const blast = this.activeBlasts.get(blastId);
    if (blast) {
      blast.sent = sent;
      blast.failed = failed;
      blast.status = 'sending';
      blast.timestamp = Date.now();
      this.emit('blast.progress', { ...blast });
    }
  }

  completeBlast(blastId, results) {
    const blast = this.activeBlasts.get(blastId);
    if (blast) {
      blast.status = 'complete';
      blast.sent = results.successCount || blast.sent;
      blast.failed = results.failureCount || blast.failed;
      blast.endTime = Date.now();
      blast.duration = blast.endTime - blast.startTime;
      blast.timestamp = Date.now();
      this.emit('blast.complete', { ...blast });
      this.activeBlasts.delete(blastId);
    }
  }

  failBlast(blastId, error) {
    const blast = this.activeBlasts.get(blastId);
    if (blast) {
      blast.status = 'failed';
      blast.error = error.message;
      blast.timestamp = Date.now();
      this.emit('blast.error', { ...blast });
      this.activeBlasts.delete(blastId);
    }
  }

  getActiveBlast(blastId) {
    return this.activeBlasts.get(blastId);
  }

  getAllActiveBlasts() {
    return Array.from(this.activeBlasts.values());
  }
}

module.exports = new CampaignEventEmitter();
