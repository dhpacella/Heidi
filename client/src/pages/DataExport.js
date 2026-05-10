import React, { useState } from 'react';

function DataExport() {
  const [exportFormat, setExportFormat] = useState('csv');

  const handleExport = () => {
    // TODO: Implement data export
    console.log('Exporting as:', exportFormat);
  };

  return (
    <div className="data-export">
      <h1>Data Export</h1>
      <div className="export-options">
        <div className="export-group">
          <label>Export Format:</label>
          <select value={exportFormat} onChange={(e) => setExportFormat(e.target.value)}>
            <option value="csv">CSV</option>
            <option value="json">JSON</option>
            <option value="pdf">PDF</option>
          </select>
        </div>
        <button onClick={handleExport} className="btn-primary">Export Data</button>
      </div>
    </div>
  );
}

export default DataExport;
