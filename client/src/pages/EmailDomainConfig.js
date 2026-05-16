import React, { useState } from 'react';

function EmailDomainConfig() {
  const [customDomain, setCustomDomain] = useState('');
  const [protocol, setProtocol] = useState('https://');
  const [isEnabled, setIsEnabled] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);
  const [testUrl, setTestUrl] = useState('');
  const [domainVerified, setDomainVerified] = useState(false);

  const generateTestUrl = () => {
    if (customDomain) {
      setTestUrl(`${protocol}${customDomain}/test`);
    }
  };

  const handleEnableDomain = () => {
    if (customDomain && !isEnabled) {
      generateTestUrl();
      setShowInstructions(true);
      setIsEnabled(true);
    }
  };

  const handleDisableDomain = () => {
    setIsEnabled(false);
    setDomainVerified(false);
    setShowInstructions(false);
    setTestUrl('');
  };

  const handleTestDomain = () => {
    // Simulated test - in production, this would call an API
    if (customDomain) {
      alert(`Testing domain: ${protocol}${customDomain}\n\nIn production, this would verify your DNS CNAME record configuration.`);
      setDomainVerified(true);
    }
  };

  return (
    <div className="email-domain-config">
      <div className="domain-config-header">
        <h1>Custom Email Domain</h1>
        <p className="subtitle">Configure a branded email sending domain for your political campaigns</p>
      </div>

      <div className="domain-config-card">
        {/* Domain Input Section */}
        <div className="domain-input-section">
          <label className="section-label">Email Sending Domain</label>
          <div className="domain-input-group">
            <select
              value={protocol}
              onChange={(e) => setProtocol(e.target.value)}
              disabled={isEnabled}
              className="protocol-select"
            >
              <option value="https://">https://</option>
              <option value="http://">http://</option>
            </select>
            <input
              type="text"
              value={customDomain}
              onChange={(e) => setCustomDomain(e.target.value)}
              placeholder="news.cushingtrans.com"
              disabled={isEnabled}
              className="domain-input"
            />
          </div>
          <p className="input-hint">Enter your custom domain (e.g., news.yourorganization.com)</p>
        </div>

        {/* DNS Instructions */}
        {isEnabled && (
          <div className="dns-instructions">
            <div className="instruction-header">
              <h3>🔗 DNS Configuration Required</h3>
              <p>Create a CNAME record in your custom domain's DNS and point it to your email sending server:</p>
            </div>

            <table className="dns-table">
              <thead>
                <tr>
                  <th>Hostname</th>
                  <th>Type</th>
                  <th>Record Value</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="hostname">{customDomain}</td>
                  <td className="record-type">CNAME</td>
                  <td className="record-value">send.cushingtrans.com</td>
                </tr>
              </tbody>
            </table>

            <div className="instruction-steps">
              <h4>Setup Steps:</h4>
              <ol>
                <li>Log in to your domain registrar (GoDaddy, Namecheap, Route 53, etc.)</li>
                <li>Navigate to DNS settings for <strong>{customDomain}</strong></li>
                <li>Create a new CNAME record with the values shown above</li>
                <li>Wait 24-48 hours for DNS to propagate</li>
                <li>Use the test button below to verify your setup</li>
              </ol>
            </div>

            <div className="test-section">
              <h4>🧪 Test Your Domain</h4>
              <p>Before enabling this domain, test your DNS setup by visiting:</p>
              <div className="test-url-box">
                <code>{testUrl}</code>
                <button onClick={() => window.open(testUrl, '_blank')} className="btn-test-link">
                  Open Test URL
                </button>
              </div>
              <button
                onClick={handleTestDomain}
                className="btn-verify"
              >
                Verify Domain Configuration
              </button>
              {domainVerified && (
                <div className="verification-success">
                  ✅ Domain verified! Your DNS CNAME record is configured correctly.
                </div>
              )}
            </div>

            <div className="warning-box">
              <p><strong>⚠️ Important:</strong> Emails sent from unverified domains may be rejected or marked as spam. Always test your configuration before using in campaigns.</p>
            </div>
          </div>
        )}

        {/* Enable/Disable Section */}
        <div className="enable-section">
          <h3>Enable Custom Domain?</h3>
          <p>Once your DNS CNAME record is created and verified, enable this domain for your campaigns.</p>
          <div className="button-group">
            <button
              onClick={handleEnableDomain}
              disabled={!customDomain || isEnabled}
              className="btn-enable"
            >
              ✓ Enable Domain
            </button>
            {isEnabled && (
              <button
                onClick={handleDisableDomain}
                className="btn-disable"
              >
                ✕ Disable Domain
              </button>
            )}
          </div>
          {isEnabled && (
            <div className="status-active">
              <span className="status-indicator">●</span>
              <span>Custom domain is <strong>active</strong></span>
            </div>
          )}
        </div>
      </div>

      {/* Current Configuration */}
      <div className="current-config">
        <h3>Current Configuration</h3>
        <div className="config-item">
          <label>Sending Domain:</label>
          <span>{customDomain || 'Not configured'}</span>
        </div>
        <div className="config-item">
          <label>Status:</label>
          <span className={isEnabled ? 'status-enabled' : 'status-disabled'}>
            {isEnabled ? '🟢 Enabled' : '🔴 Disabled'}
          </span>
        </div>
        <div className="config-item">
          <label>Verified:</label>
          <span className={domainVerified ? 'status-verified' : 'status-unverified'}>
            {domainVerified ? '✅ Verified' : '⏳ Not Verified'}
          </span>
        </div>
      </div>

      {/* Campaign Usage Info */}
      <div className="usage-info">
        <h3>📧 Using Your Custom Domain</h3>
        <p>Once enabled, your political campaigns will use this domain for:</p>
        <ul>
          <li>✉️ Email sending (From address: campaigns@{customDomain || 'yourdomain.com'})</li>
          <li>🔗 Click tracking links (links will use your domain)</li>
          <li>📋 Unsubscribe pages (unsubscribe@{customDomain || 'yourdomain.com'})</li>
          <li>📊 Reply-to address (replies@{customDomain || 'yourdomain.com'})</li>
        </ul>
        <p className="info-note">
          <strong>Benefit:</strong> Branded email domains improve deliverability and voter trust in your campaign communications.
        </p>
      </div>
    </div>
  );
}

export default EmailDomainConfig;
