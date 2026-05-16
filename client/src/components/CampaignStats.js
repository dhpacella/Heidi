import React, { useEffect, useState } from 'react';
import { useCampaignStream } from '../hooks/useCampaignStream';

export function CampaignStats() {
  const { latestBlast, isConnected } = useCampaignStream();
  const [displayBlast, setDisplayBlast] = useState(null);

  useEffect(() => {
    if (latestBlast) {
      setDisplayBlast(latestBlast);

      // Auto-clear after 30s when complete
      if (latestBlast.status === 'complete') {
        const timer = setTimeout(() => {
          setDisplayBlast(null);
        }, 30000);
        return () => clearTimeout(timer);
      }
    }
  }, [latestBlast]);

  if (!displayBlast) {
    return (
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Campaign Stats
          </h3>
          <div
            className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium ${
              isConnected
                ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100'
                : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-100'
            }`}
          >
            <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-gray-500'}`}></span>
            {isConnected ? 'Connected' : 'Disconnected'}
          </div>
        </div>
        <p className="text-gray-600 dark:text-gray-400">No active campaigns</p>
      </div>
    );
  }

  const progress = displayBlast.total > 0 ? (displayBlast.sent / displayBlast.total) * 100 : 0;
  const duration = displayBlast.duration
    ? `${(displayBlast.duration / 1000).toFixed(1)}s`
    : null;

  const statusBadgeClass = {
    sending: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100',
    complete: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100',
    failed: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100'
  }[displayBlast.status] || 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-100';

  return (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            {displayBlast.subject}
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Blast ID: {displayBlast.blastId}
          </p>
        </div>
        <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium ${statusBadgeClass}`}>
          {displayBlast.status === 'sending' && (
            <>
              <span className="animate-spin">⟳</span>
              Sending
            </>
          )}
          {displayBlast.status === 'complete' && (
            <>
              <span>✓</span>
              Complete
            </>
          )}
          {displayBlast.status === 'failed' && (
            <>
              <span>✕</span>
              Failed
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-blue-50 dark:bg-blue-900/30 p-4 rounded">
          <p className="text-sm text-gray-600 dark:text-gray-400">Sent</p>
          <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
            {displayBlast.sent.toLocaleString()}
          </p>
        </div>
        <div className="bg-red-50 dark:bg-red-900/30 p-4 rounded">
          <p className="text-sm text-gray-600 dark:text-gray-400">Failed</p>
          <p className="text-2xl font-bold text-red-600 dark:text-red-400">
            {displayBlast.failed.toLocaleString()}
          </p>
        </div>
      </div>

      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Progress
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {displayBlast.sent} / {displayBlast.total}
          </p>
        </div>
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
          <div
            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          ></div>
        </div>
      </div>

      <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
        <div>
          {duration && <span>Duration: {duration}</span>}
        </div>
        <div>
          <span>Updated: {new Date(displayBlast.timestamp).toLocaleTimeString()}</span>
        </div>
      </div>
    </div>
  );
}
