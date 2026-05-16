import React, { useRef, useState } from 'react';
import apiClient from '../services/apiClient';

function VoterImport() {
  const fileInputRef = useRef(null);
  const [fileName, setFileName] = useState('');
  const [importing, setImporting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [importResult, setImportResult] = useState(null);
  const [error, setError] = useState(null);

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      setFileName(file.name);
      setError(null);
    }
  };

  const handleImport = async () => {
    if (!fileInputRef.current?.files[0]) {
      setError('Please select a file');
      return;
    }

    const file = fileInputRef.current.files[0];

    try {
      setImporting(true);
      setError(null);
      setUploadProgress(0);

      const formData = new FormData();
      formData.append('file', file);

      const response = await apiClient.post('/voters/import', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (progressEvent) => {
          const progress = Math.round((progressEvent.loaded / progressEvent.total) * 100);
          setUploadProgress(progress);
        }
      });

      setImportResult(response.data);
      setFileName('');
      fileInputRef.current.value = '';
    } catch (err) {
      setError(err.response?.data?.error || 'Import failed');
    } finally {
      setImporting(false);
      setUploadProgress(0);
    }
  };

  return (
    <div className="space-y-6 p-6">
      <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Import Voter Data</h1>

      <div className="bg-blue-50 dark:bg-blue-900/30 p-6 rounded-lg">
        <h2 className="text-xl font-semibold text-blue-900 dark:text-blue-100 mb-4">File Format</h2>
        <p className="text-blue-800 dark:text-blue-200 mb-3">Upload a CSV or Excel file with these columns:</p>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <strong className="text-blue-900 dark:text-blue-100">Required:</strong>
            <ul className="list-disc list-inside text-blue-800 dark:text-blue-200 mt-2 space-y-1">
              <li>first_name (or firstname, first)</li>
              <li>last_name (or lastname, last)</li>
            </ul>
          </div>
          <div>
            <strong className="text-blue-900 dark:text-blue-100">Optional:</strong>
            <ul className="list-disc list-inside text-blue-800 dark:text-blue-200 mt-2 space-y-1">
              <li>email</li>
              <li>phone</li>
              <li>precinct_id</li>
              <li>party</li>
            </ul>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
        <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-8 text-center">
          <div className="mb-4">
            <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48">
              <path d="M28 8H12a4 4 0 00-4 4v20a4 4 0 004 4h24a4 4 0 004-4V20m-8-12l-4-4m0 0l-4 4m4-4v12" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.xlsx,.xls"
            onChange={handleFileSelect}
            disabled={importing}
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={importing}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition"
          >
            Choose File
          </button>
          {fileName && (
            <p className="mt-4 text-sm text-gray-600 dark:text-gray-400">
              Selected: <span className="font-medium text-gray-900 dark:text-gray-100">{fileName}</span>
            </p>
          )}
        </div>

        {importing && (
          <div className="mt-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Uploading...</span>
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{uploadProgress}%</span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-200"
                style={{ width: `${uploadProgress}%` }}
              ></div>
            </div>
          </div>
        )}

        <button
          onClick={handleImport}
          disabled={!fileName || importing}
          className="mt-6 w-full px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition font-medium"
        >
          {importing ? 'Importing...' : 'Start Import'}
        </button>

        {error && (
          <div className="mt-6 p-4 bg-red-100 dark:bg-red-900/30 border border-red-400 dark:border-red-700 rounded text-red-800 dark:text-red-200">
            {error}
          </div>
        )}
      </div>

      {importResult && (
        <div className="bg-green-50 dark:bg-green-900/30 p-6 rounded-lg border border-green-400 dark:border-green-700">
          <h2 className="text-2xl font-semibold text-green-900 dark:text-green-100 mb-4">Import Complete</h2>
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-white dark:bg-gray-800 p-4 rounded">
              <p className="text-sm text-gray-600 dark:text-gray-400">Imported</p>
              <p className="text-3xl font-bold text-green-600 dark:text-green-400">{importResult.imported}</p>
            </div>
            <div className="bg-white dark:bg-gray-800 p-4 rounded">
              <p className="text-sm text-gray-600 dark:text-gray-400">Skipped</p>
              <p className="text-3xl font-bold text-yellow-600 dark:text-yellow-400">{importResult.skipped}</p>
            </div>
            <div className="bg-white dark:bg-gray-800 p-4 rounded">
              <p className="text-sm text-gray-600 dark:text-gray-400">Total</p>
              <p className="text-3xl font-bold text-gray-600 dark:text-gray-400">{importResult.total}</p>
            </div>
          </div>
          <p className="mt-4 text-sm text-green-800 dark:text-green-200">
            ✓ {importResult.imported} voters imported successfully
          </p>
        </div>
      )}
    </div>
  );
}

export default VoterImport;
