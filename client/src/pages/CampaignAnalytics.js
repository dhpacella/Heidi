import React, { useEffect, useState } from 'react';
import { Chart as ChartJS, ArcElement, BarElement, CategoryScale, LinearScale, Tooltip, Legend } from 'chart.js';
import { Doughnut, Bar } from 'react-chartjs-2';
import { campaignService } from '../services/api';

ChartJS.register(ArcElement, BarElement, CategoryScale, LinearScale, Tooltip, Legend);

function CampaignAnalytics() {
  const [stats, setStats] = useState(null);
  const [blasts, setBlasts] = useState([]);
  const [selectedBlastId, setSelectedBlastId] = useState(null);
  const [bounces, setBounces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sortConfig, setSortConfig] = useState({ key: 'created_at', direction: 'desc' });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [statsRes, blastsRes] = await Promise.all([
        campaignService.getStats(),
        campaignService.getAllBlasts()
      ]);

      setStats(statsRes);
      setBlasts(blastsRes.blasts || []);
    } catch (err) {
      setError(err.message);
      console.error('Failed to fetch analytics data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleBlastClick = async (blastId) => {
    if (selectedBlastId === blastId) {
      setSelectedBlastId(null);
      setBounces([]);
      return;
    }

    try {
      const bouncesRes = await campaignService.getBlastBounces(blastId);
      setBounces(bouncesRes.bounces || []);
      setSelectedBlastId(blastId);
    } catch (err) {
      console.error('Failed to fetch bounces:', err);
    }
  };

  const sortedBlasts = [...blasts].sort((a, b) => {
    const aVal = a[sortConfig.key];
    const bVal = b[sortConfig.key];
    const comparison = aVal > bVal ? 1 : -1;
    return sortConfig.direction === 'asc' ? comparison : -comparison;
  });

  const last10Blasts = sortedBlasts.slice(0, 10);

  if (loading) {
    return (
      <div className="space-y-6 p-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Campaign Analytics</h1>
        <p className="text-gray-600 dark:text-gray-400">Loading...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6 p-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Campaign Analytics</h1>
        <div className="bg-red-50 dark:bg-red-900/30 p-4 rounded-lg border border-red-400 dark:border-red-700">
          <p className="text-red-800 dark:text-red-200">{error}</p>
        </div>
      </div>
    );
  }

  // Prepare doughnut chart data
  const doughnutData = {
    labels: ['Delivered', 'Bounced', 'Complained', 'Unsubscribed'],
    datasets: [{
      data: [
        stats?.totalDelivered || 0,
        stats?.totalBounced || 0,
        stats?.totalComplained || 0,
        stats?.totalUnsubscribed || 0
      ],
      backgroundColor: ['#10b981', '#ef4444', '#f59e0b', '#8b5cf6'],
      borderColor: ['#059669', '#dc2626', '#d97706', '#7c3aed'],
      borderWidth: 2
    }]
  };

  // Prepare bar chart data for delivery rates
  const barData = {
    labels: last10Blasts.map(b => b.subject.substring(0, 15) + '...'),
    datasets: [{
      label: 'Delivery Rate %',
      data: last10Blasts.map(b => {
        const deliveryRate = b.recipient_count > 0 ? ((b.delivered_count / b.recipient_count) * 100).toFixed(1) : 0;
        return parseFloat(deliveryRate);
      }),
      backgroundColor: '#3b82f6',
      borderColor: '#1e40af',
      borderWidth: 1
    }]
  };

  return (
    <div className="space-y-6 p-6">
      <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Campaign Analytics</h1>

      {/* Overview Stats */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Total Sent</p>
          <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">
            {(stats?.totalSent || 0).toLocaleString()}
          </p>
        </div>
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Delivery Rate</p>
          <p className="text-3xl font-bold text-green-600 dark:text-green-400">
            {stats?.deliveryRate || 0}%
          </p>
        </div>
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Open Rate</p>
          <p className="text-3xl font-bold text-purple-600 dark:text-purple-400">
            {stats?.openRate || 0}%
          </p>
        </div>
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Click Rate</p>
          <p className="text-3xl font-bold text-pink-600 dark:text-pink-400">
            {stats?.clickRate || 0}%
          </p>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-2 gap-6">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Email Status Distribution</h2>
          <div className="h-80 flex items-center justify-center">
            <Doughnut data={doughnutData} options={{ responsive: true, maintainAspectRatio: false }} />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Delivery Rates (Last 10 Campaigns)</h2>
          <div className="h-80">
            <Bar
              data={barData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                  y: {
                    beginAtZero: true,
                    max: 100
                  }
                }
              }}
            />
          </div>
        </div>
      </div>

      {/* Blast History Table */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Campaign History</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-100 dark:bg-gray-700">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-gray-900 dark:text-white cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-600">
                  <button onClick={() => setSortConfig({ key: 'subject', direction: sortConfig.direction === 'asc' ? 'desc' : 'asc' })}>
                    Subject {sortConfig.key === 'subject' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                  </button>
                </th>
                <th className="px-4 py-3 text-right font-semibold text-gray-900 dark:text-white">Recipients</th>
                <th className="px-4 py-3 text-right font-semibold text-gray-900 dark:text-white">Delivered %</th>
                <th className="px-4 py-3 text-right font-semibold text-gray-900 dark:text-white">Opened %</th>
                <th className="px-4 py-3 text-right font-semibold text-gray-900 dark:text-white">Clicked %</th>
                <th className="px-4 py-3 text-right font-semibold text-gray-900 dark:text-white">Bounced %</th>
                <th className="px-4 py-3 text-center font-semibold text-gray-900 dark:text-white">Details</th>
              </tr>
            </thead>
            <tbody>
              {sortedBlasts.map((blast) => {
                const deliveredPct = blast.recipient_count > 0 ? ((blast.delivered_count / blast.recipient_count) * 100).toFixed(1) : 0;
                const openedPct = blast.recipient_count > 0 ? ((blast.opened_count / blast.recipient_count) * 100).toFixed(1) : 0;
                const clickedPct = blast.recipient_count > 0 ? ((blast.clicked_count / blast.recipient_count) * 100).toFixed(1) : 0;
                const bouncedPct = blast.recipient_count > 0 ? ((blast.bounced_count / blast.recipient_count) * 100).toFixed(1) : 0;
                const isExpanded = selectedBlastId === blast.id;

                return (
                  <React.Fragment key={blast.id}>
                    <tr className="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                      <td className="px-4 py-3 text-gray-900 dark:text-white font-medium">{blast.subject}</td>
                      <td className="px-4 py-3 text-right text-gray-600 dark:text-gray-400">{(blast.recipient_count || 0).toLocaleString()}</td>
                      <td className="px-4 py-3 text-right text-green-600 dark:text-green-400 font-semibold">{deliveredPct}%</td>
                      <td className="px-4 py-3 text-right text-purple-600 dark:text-purple-400 font-semibold">{openedPct}%</td>
                      <td className="px-4 py-3 text-right text-pink-600 dark:text-pink-400 font-semibold">{clickedPct}%</td>
                      <td className="px-4 py-3 text-right text-red-600 dark:text-red-400 font-semibold">{bouncedPct}%</td>
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => handleBlastClick(blast.id)}
                          className="text-blue-600 dark:text-blue-400 hover:underline"
                        >
                          {isExpanded ? '▼' : '▶'}
                        </button>
                      </td>
                    </tr>
                    {isExpanded && bounces.length > 0 && (
                      <tr className="bg-gray-50 dark:bg-gray-700/50">
                        <td colSpan="7" className="px-4 py-4">
                          <div className="bg-white dark:bg-gray-800 p-4 rounded">
                            <h4 className="font-semibold text-gray-900 dark:text-white mb-3">Bounces ({bounces.length})</h4>
                            <div className="space-y-2 max-h-40 overflow-y-auto">
                              {bounces.map((bounce, idx) => (
                                <div key={idx} className="text-sm text-gray-600 dark:text-gray-400 border-l-4 border-red-500 pl-3">
                                  <p className="font-medium text-gray-900 dark:text-white">{bounce.email}</p>
                                  <p className="text-xs">{bounce.bounce_type} - {bounce.bounce_subtype || 'N/A'}</p>
                                </div>
                              ))}
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default CampaignAnalytics;
