import React, { useEffect, useState } from 'react';
import { campaignService } from '../services/api';

function EmailOutreach() {
  const [blasts, setBlasts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sortConfig, setSortConfig] = useState({ key: 'created_at', direction: 'desc' });
  const [selectedBlastId, setSelectedBlastId] = useState(null);

  useEffect(() => {
    fetchBlasts();
  }, []);

  const fetchBlasts = async () => {
    try {
      const data = await campaignService.getAllBlasts();
      setBlasts(data.blasts || []);
    } catch (err) {
      setError(err.message);
      console.error('Failed to fetch campaigns:', err);
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

  const getStatusBadge = (status) => {
    const statusConfig = {
      'queued': 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200',
      'sending': 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200',
      'sent': 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200',
      'scheduled': 'bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-200',
      'paused': 'bg-gray-100 dark:bg-gray-900/30 text-gray-800 dark:text-gray-200',
    };
    return statusConfig[status] || statusConfig['queued'];
  };

  if (loading) {
    return (
      <div className="space-y-6 p-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Email Outreach</h1>
        <p className="text-gray-600 dark:text-gray-400">Loading campaigns...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Email Outreach</h1>
        <a
          href="/email"
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-semibold"
        >
          + New Campaign
        </a>
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/30 p-4 rounded-lg border border-red-400 dark:border-red-700">
          <p className="text-red-800 dark:text-red-200">{error}</p>
        </div>
      )}

      {blasts.length === 0 ? (
        <div className="bg-gray-50 dark:bg-gray-800 p-12 rounded-lg border border-gray-300 dark:border-gray-700 text-center">
          <p className="text-gray-600 dark:text-gray-400 mb-4">No campaigns yet</p>
          <a
            href="/email"
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition inline-block"
          >
            Create Your First Campaign
          </a>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700 border-b border-gray-300 dark:border-gray-600">
                <tr>
                  <th className="px-6 py-4 text-left">
                    <button
                      onClick={() => handleSort('subject')}
                      className="text-sm font-semibold text-gray-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 flex items-center gap-1"
                    >
                      Subject
                      {sortConfig.key === 'subject' && (
                        <span>{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>
                      )}
                    </button>
                  </th>
                  <th className="px-6 py-4 text-left">
                    <button
                      onClick={() => handleSort('from_address')}
                      className="text-sm font-semibold text-gray-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400"
                    >
                      From
                    </button>
                  </th>
                  <th className="px-6 py-4 text-center">
                    <button
                      onClick={() => handleSort('recipient_count')}
                      className="text-sm font-semibold text-gray-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 w-full"
                    >
                      Recipients
                    </button>
                  </th>
                  <th className="px-6 py-4 text-center">
                    <button
                      onClick={() => handleSort('delivered_count')}
                      className="text-sm font-semibold text-gray-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 w-full"
                    >
                      Delivered
                    </button>
                  </th>
                  <th className="px-6 py-4 text-center">
                    <button
                      onClick={() => handleSort('opened_count')}
                      className="text-sm font-semibold text-gray-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 w-full"
                    >
                      Opens
                    </button>
                  </th>
                  <th className="px-6 py-4 text-center">
                    <button
                      onClick={() => handleSort('clicked_count')}
                      className="text-sm font-semibold text-gray-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 w-full"
                    >
                      Clicks
                    </button>
                  </th>
                  <th className="px-6 py-4 text-left">
                    <button
                      onClick={() => handleSort('status')}
                      className="text-sm font-semibold text-gray-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400"
                    >
                      Status
                    </button>
                  </th>
                  <th className="px-6 py-4 text-left">
                    <button
                      onClick={() => handleSort('created_at')}
                      className="text-sm font-semibold text-gray-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 flex items-center gap-1"
                    >
                      Date
                      {sortConfig.key === 'created_at' && (
                        <span>{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>
                      )}
                    </button>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-300 dark:divide-gray-600">
                {sortedBlasts.map((blast) => (
                  <tr
                    key={blast.id}
                    onClick={() => setSelectedBlastId(selectedBlastId === blast.id ? null : blast.id)}
                    className="hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition"
                  >
                    <td className="px-6 py-4">
                      <p className="text-sm font-medium text-gray-900 dark:text-white truncate max-w-xs">
                        {blast.subject || '—'}
                      </p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm text-gray-600 dark:text-gray-400 truncate">
                        {blast.from_address || '—'}
                      </p>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <p className="text-sm font-semibold text-gray-900 dark:text-white">
                        {blast.recipient_count || 0}
                      </p>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {blast.delivered_count || 0}
                      </p>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <p className="text-sm font-medium text-blue-600 dark:text-blue-400">
                        {blast.opened_count || 0}
                      </p>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <p className="text-sm font-medium text-green-600 dark:text-green-400">
                        {blast.clicked_count || 0}
                      </p>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`text-xs font-semibold px-3 py-1 rounded-full ${getStatusBadge(blast.status)}`}>
                        {blast.status || 'unknown'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {formatDate(blast.created_at)}
                      </p>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Quick Stats Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-8">
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
          <p className="text-sm text-gray-600 dark:text-gray-400">Total Campaigns</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white mt-2">{blasts.length}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
          <p className="text-sm text-gray-600 dark:text-gray-400">Total Recipients</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white mt-2">
            {blasts.reduce((sum, b) => sum + (b.recipient_count || 0), 0).toLocaleString()}
          </p>
        </div>
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
          <p className="text-sm text-gray-600 dark:text-gray-400">Total Opens</p>
          <p className="text-2xl font-bold text-blue-600 dark:text-blue-400 mt-2">
            {blasts.reduce((sum, b) => sum + (b.opened_count || 0), 0).toLocaleString()}
          </p>
        </div>
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
          <p className="text-sm text-gray-600 dark:text-gray-400">Total Clicks</p>
          <p className="text-2xl font-bold text-green-600 dark:text-green-400 mt-2">
            {blasts.reduce((sum, b) => sum + (b.clicked_count || 0), 0).toLocaleString()}
          </p>
        </div>
      </div>
    </div>
  );
}

export default EmailOutreach;
