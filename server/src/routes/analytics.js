const express = require('express');
const router = express.Router();
const { getAllData } = require('../db/mock-db');

// GET /api/analytics/summary — overall campaign stats
router.get('/summary', (req, res) => {
  try {
    const db = getAllData();

    const subscribers = db.email_subscribers.length;
    const emailsSent = db.email_blasts.length;

    // Calculate open rate across all recipients
    const totalRecipients = db.email_recipients.length;
    const openedRecipients = db.email_recipients.filter(r => r.opened_at).length;
    const openRate = totalRecipients > 0 ? Math.round((openedRecipients / totalRecipients) * 100) : 0;

    // Volunteer count
    const volunteers = db.volunteers ? db.volunteers.length : 0;

    // Recent campaigns (last 5 blasts)
    const recentCampaigns = db.email_blasts.slice(-5).reverse().map(blast => {
      const blastRecipients = db.email_recipients.filter(r => r.blast_id === blast.id);
      const opens = blastRecipients.filter(r => r.opened_at).length;
      const clicks = blastRecipients.filter(r => r.clicked_at).length;
      const deliveries = blastRecipients.filter(r => r.delivered_at).length;

      return {
        id: blast.id,
        subject: blast.subject,
        sent_date: blast.sent_at || blast.created_at,
        recipients: blastRecipients.length,
        delivered: deliveries,
        opens: opens,
        clicks: clicks,
        openRate: blastRecipients.length > 0 ? Math.round((opens / blastRecipients.length) * 100) : 0,
        clickRate: blastRecipients.length > 0 ? Math.round((clicks / blastRecipients.length) * 100) : 0
      };
    });

    // Recent activity (last 10 events)
    const recentActivity = [];

    // Add recent poll votes
    db.poll_votes.slice(-3).forEach(vote => {
      recentActivity.push({
        type: 'poll_vote',
        description: 'New poll vote',
        timestamp: vote.created_at || new Date().toISOString()
      });
    });

    // Add recent email opens
    db.email_recipients.filter(r => r.opened_at).slice(-3).forEach(recipient => {
      recentActivity.push({
        type: 'email_open',
        description: 'Email opened',
        timestamp: recipient.opened_at
      });
    });

    // Add recent new subscribers
    db.email_subscribers.slice(-2).forEach(sub => {
      recentActivity.push({
        type: 'subscriber',
        description: 'New subscriber: ' + (sub.email || 'unknown'),
        timestamp: sub.subscribed_at || new Date().toISOString()
      });
    });

    // Sort by timestamp descending and take last 10
    recentActivity.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    const activity = recentActivity.slice(0, 10);

    res.json({
      subscribers,
      emailsSent,
      openRate,
      volunteers,
      recentCampaigns,
      recentActivity: activity
    });
  } catch (err) {
    console.error('Analytics summary error:', err);
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
});

// GET /api/analytics/campaigns — detailed campaign stats
router.get('/campaigns', (req, res) => {
  try {
    const db = getAllData();

    const campaigns = db.email_blasts.map(blast => {
      const blastRecipients = db.email_recipients.filter(r => r.blast_id === blast.id);
      const opens = blastRecipients.filter(r => r.opened_at).length;
      const clicks = blastRecipients.filter(r => r.clicked_at).length;
      const bounces = blastRecipients.filter(r => r.bounced_at).length;
      const deliveries = blastRecipients.filter(r => r.delivered_at).length;

      return {
        id: blast.id,
        subject: blast.subject,
        sent_date: blast.sent_at || blast.created_at,
        recipients: blastRecipients.length,
        delivered: deliveries,
        opens: opens,
        clicks: clicks,
        bounces: bounces,
        openRate: blastRecipients.length > 0 ? Math.round((opens / blastRecipients.length) * 100) : 0,
        clickRate: blastRecipients.length > 0 ? Math.round((clicks / blastRecipients.length) * 100) : 0,
        bounceRate: blastRecipients.length > 0 ? Math.round((bounces / blastRecipients.length) * 100) : 0,
        deliveryRate: blastRecipients.length > 0 ? Math.round((deliveries / blastRecipients.length) * 100) : 0
      };
    }).reverse();

    res.json(campaigns);
  } catch (err) {
    console.error('Analytics campaigns error:', err);
    res.status(500).json({ error: 'Failed to fetch campaigns' });
  }
});

module.exports = router;
