import React, { useState } from 'react';
import apiClient from '../services/apiClient';

function VoterImport() {
  const [fileName, setFileName] = useState('');
  const [importing, setImporting] = useState(false);
  const [importStats, setImportStats] = useState(null);
  const [error, setError] = useState(null);

  const handleFileUpload = (e) => {
    setFileName(e.target.files[0]?.name || '');
  };

  const handleImport = async () => {
    if (!fileName) {
      setError('Please select a file');
      return;
    }

    try {
      setImporting(true);
      setError(null);

      // In a real implementation, you would upload the file
      const response = await apiClient.post('/super-picks/import', {
        filePath: fileName
      });

      setImportStats(response.data.stats);
    } catch (err) {
      setError(err.response?.data?.error || 'Import failed');
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="voter-import">
      <h1>Import Voter Data</h1>

      <div className="import-instructions">
        <h2>Instructions</h2>
        <p>Upload a CSV file with the following columns:</p>
        <ul>
          <li><strong>firstName</strong> - Voter first name</li>
          <li><strong>lastName</strong> - Voter last name</li>
          <li><strong>email</strong> - Email address</li>
          <li><strong>phone</strong> - Phone number</li>
          <li><strong>address</strong> - Street address</li>
          <li><strong>precinct</strong> - Precinct name/ID</li>
          <li><strong>partyAffiliation</strong> - Political party</li>
          <li><strong>registrationDate</strong> - Registration date (YYYY-MM-DD)</li>
        </ul>
      </div>

      <div className="import-form">
        <div className="file-upload">
          <input 
            type="file" 
            accept=".csv"
            onChange={handleFileUpload}
            disabled={importing}
          />
          {fileName && <p>Selected: {fileName}</p>}
        </div>

        <button 
          onClick={handleImport} 
          className="btn-primary"
          disabled={importing}
        >
          {importing ? 'Importing...' : 'Import CSV'}
        </button>

        {error && <p className="error">{error}</p>}
      </div>

      {importStats && (
        <div className="import-results">
          <h2>Import Results</h2>
          <div className="stats-grid">
            <div className="stat">
              <h3>Total Imported</h3>
              <p>{importStats.totalImported}</p>
            </div>
            <div className="stat">
              <h3>With Voting History</h3>
              <p>{importStats.withVotingHistory}</p>
            </div>
            <div className="stat">
              <h3>Avg History Length</h3>
              <p>{importStats.averageHistoryLength}</p>
            </div>
          </div>

          <h3>By Precinct</h3>
          <ul>
            {Object.entries(importStats.byPrecinct).map(([precinct, count]) => (
              <li key={precinct}>{precinct}: {count}</li>
            ))}
          </ul>

          <h3>By Party</h3>
          <ul>
            {Object.entries(importStats.byParty).map(([party, count]) => (
              <li key={party}>{party || 'Unknown'}: {count}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export default VoterImport;
