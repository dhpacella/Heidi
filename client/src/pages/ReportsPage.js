import React, { useEffect, useState } from 'react';
import { campaignService } from '../services/api';

function ReportsPage() {
  const [blasts, setBlasts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sortConfig, setSortConfig] = useState({ key: 'created_at', direction: 'desc' });

  useEffect(() => {
    fetchReports();
  }, []);

  const fetchReports = async () => {
    try {
      const data = await campaignService.getAllBlasts();
      setBlasts(data.blasts || []);
    } catch (err) {
      setError(err.message);
      console.error('Failed to fetch reports:', err);
    } finally {
      setLoading(false);
    }
  };

  const sortedBlasts = [...blasts].sort((a, b) => {
    const aVal = a[sortConfig.key];
    const bVal = b[sortConfig.key];
    if (aVal == null || bVal == null) return 0;
    const comparison = aVal > bVal ? 1 : -1;
    return sortConfig.direction === 'asc' ? comparison : -comparison;
  });

  const handleSort = (key) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'desc' ? 'asc' : 'desc'
    }));
  };

  const formatDate = (dateString) => {
    if (!dateString) return '—';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const calculateMetrics = (blast) => {
    const recipients = blast.recipient_count || 1;
    const opened = blast.opened_count || 0;
    const clicked = blast.clicked_count || 0;
    const openRate = ((opened / recipients) * 100).toFixed(1);
    const clickRate = ((clicked / recipients) * 100).toFixed(1);
    return { openRate, clickRate, opened, clicked };
  };

  const getOpenRateColor = (rate) => {
    if (rate >= 50) return '#27ae60';
    if (rate >= 30) return '#f39c12';
    return '#e74c3c';
  };

  const getClickRateColor = (rate) => {
    if (rate >= 20) return '#2980b9';
    if (rate >= 10) return '#3498db';
    return '#95a5a6';
  };

  if (loading) {
    return (
      <div className="reports-container">
        <div className="reports-header">
          <h1>Campaign Reports</h1>
        </div>
        <p className="text-gray-600 dark:text-gray-400">Loading reports...</p>
      </div>
    );
  }

  return (
    <div className="reports-container">
      <div className="reports-header">
        <h1>Campaign Reports</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          {blasts.length} total campaigns
        </p>
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/30 p-4 rounded-lg border border-red-400 dark:border-red-700 mb-6">
          <p className="text-red-800 dark:text-red-200">{error}</p>
        </div>
      )}

      {blasts.length === 0 ? (
        <div className="bg-gray-50 dark:bg-gray-800 p-12 rounded-lg border border-gray-300 dark:border-gray-700 text-center">
          <p className="text-gray-600 dark:text-gray-400">No campaigns yet</p>
        </div>
      ) : (
        <div className="reports-table-container">
          <table className="reports-table">
            <thead>
              <tr>
                <th onClick={() => handleSort('subject')} className="sortable">
                  Campaign {sortConfig.key === 'subject' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                </th>
                <th onClick={() => handleSort('recipient_count')} className="sortable text-center">
                  Recipients {sortConfig.key === 'recipient_count' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                </th>
                <th onClick={() => handleSort('created_at')} className="sortable">
                  Sent {sortConfig.key === 'created_at' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                </th>
                <th className="text-center">Unique Opens</th>
                <th className="text-center">Unique Clicks</th>
                <th className="text-center">Status</th>
              </tr>
            </thead>
            <tbody>
              {sortedBlasts.map((blast) => {
                const { openRate, clickRate, opened, clicked } = calculateMetrics(blast);
                return (
                  <tr key={blast.id}>
                    <td className="campaign-name">
                      <span className="icon">📧</span>
                      {blast.subject || '(No subject)'}
                    </td>
                    <td className="text-center font-semibold">
                      {(blast.recipient_count || 0).toLocaleString()}
                    </td>
                    <td className="text-sm text-gray-600 dark:text-gray-400">
                      {formatDate(blast.created_at)}
                    </td>
                    <td>
                      <div className="metric-cell">
                        <span
                          className="metric-badge"
                          style={{ backgroundColor: getOpenRateColor(openRate) }}
                        >
                          {openRate}%
                        </span>
                        <span className="metric-value">{opened.toLocaleString()} opened</span>
                      </div>
                    </td>
                    <td>
                      <div className="metric-cell">
                        <span
                          className="metric-badge"
                          style={{ backgroundColor: getClickRateColor(clickRate) }}
                        >
                          {clickRate}%
                        </span>
                        <span className="metric-value">{clicked.toLocaleString()} clicked</span>
                      </div>
                    </td>
                    <td className="text-center">
                      <span className={`status-badge status-${blast.status}`}>
                        {blast.status || 'unknown'}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default ReportsPage;
