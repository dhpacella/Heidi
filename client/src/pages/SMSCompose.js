import React, { useState, useRef } from 'react';
import { useDispatch } from 'react-redux';
import { smsService } from '../services/api';

const COST_PER_PART = 0.0075;
const CHARS_PER_SEGMENT = 160;

export default function SMSCompose() {
  const [message, setMessage] = useState('');
  const [phoneText, setPhoneText] = useState('');
  const [phoneFile, setPhoneFile] = useState(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const fileInputRef = useRef(null);

  const charCount = message.length;
  const parts = Math.ceil(charCount / CHARS_PER_SEGMENT) || 1;

  const manualPhones = phoneText
    .split(/[\n,;]+/)
    .map(p => p.trim())
    .filter(Boolean);

  const recipientCount = phoneFile ? null : manualPhones.length;
  const estimatedCost = recipientCount !== null
    ? (COST_PER_PART * parts * recipientCount).toFixed(4)
    : null;

  const handleSend = async () => {
    setSending(true);
    setError('');
    try {
      const formData = new FormData();
      formData.append('message', message);
      if (phoneFile) {
        formData.append('phoneFile', phoneFile);
      }
      if (manualPhones.length > 0) {
        formData.append('recipientPhones', JSON.stringify(manualPhones));
      }
      const data = await smsService.send(formData);
      setResult(data);
      setShowConfirm(false);
      setMessage('');
      setPhoneText('');
      setPhoneFile(null);
    } catch (err) {
      setError(err?.response?.data?.error || 'Failed to send SMS');
    } finally {
      setSending(false);
    }
  };

  return (
    <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
      <h1>SMS Blast</h1>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '2rem', marginTop: '2rem' }}>
        {/* Recipients Panel */}
        <div>
          <h3>Recipients</h3>
          <p>Upload CSV/XLSX with a <code>phone</code> column:</p>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.xlsx"
            onChange={e => setPhoneFile(e.target.files[0] || null)}
            style={{ display: 'block', marginBottom: '1rem' }}
          />
          {phoneFile && (
            <button
              onClick={() => {
                setPhoneFile(null);
                fileInputRef.current.value = '';
              }}
              style={{ marginBottom: '1rem' }}
            >
              Remove file
            </button>
          )}
          {phoneFile && <p>File: {phoneFile.name}</p>}

          <p style={{ marginTop: '1rem' }}>Or enter phones manually (one per line or comma-separated):</p>
          <textarea
            value={phoneText}
            onChange={e => setPhoneText(e.target.value)}
            rows={8}
            placeholder="+15551234567&#10;+15559876543"
            style={{ width: '100%', padding: '8px', fontFamily: 'monospace' }}
          />
        </div>

        {/* Message Panel */}
        <div>
          <h3>Message</h3>
          <textarea
            value={message}
            onChange={e => setMessage(e.target.value)}
            rows={8}
            maxLength={1600}
            placeholder="Enter your SMS message..."
            style={{ width: '100%', padding: '8px' }}
          />
          <p style={{ marginTop: '0.5rem', fontSize: '0.9rem' }}>
            {charCount} characters · {parts} segment{parts !== 1 ? 's' : ''} per recipient
          </p>
        </div>

        {/* Cost & Send Panel */}
        <div>
          <h3>Send</h3>
          {recipientCount !== null && (
            <p>Recipients: <strong>{recipientCount}</strong></p>
          )}
          {phoneFile && <p>Recipients: from file (counted on server)</p>}
          {estimatedCost !== null && (
            <p>Estimated cost: <strong>${estimatedCost}</strong></p>
          )}
          {phoneFile && parts && (
            <p style={{ fontSize: '0.9rem' }}>Cost per recipient: ${(COST_PER_PART * parts).toFixed(4)}</p>
          )}

          {error && <p style={{ color: 'red', marginBottom: '1rem' }}>{error}</p>}
          {result && (
            <p style={{ color: 'green', marginBottom: '1rem' }}>
              ✅ Sent to {result.recipientCount} recipients.
            </p>
          )}

          <button
            onClick={() => setShowConfirm(true)}
            disabled={!message || (!phoneFile && manualPhones.length === 0)}
            style={{
              padding: '0.75rem 1.5rem',
              backgroundColor: '#4CAF50',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '1rem',
              marginBottom: '1rem',
              width: '100%',
            }}
          >
            Review & Send
          </button>

          {showConfirm && (
            <div
              style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: 'rgba(0, 0, 0, 0.5)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 1000,
              }}
            >
              <div
                style={{
                  backgroundColor: 'white',
                  padding: '2rem',
                  borderRadius: '8px',
                  maxWidth: '400px',
                  width: '90%',
                }}
              >
                <h4>Confirm SMS Blast</h4>
                <p><strong>Message:</strong></p>
                <p style={{ fontFamily: 'monospace', whiteSpace: 'pre-wrap', fontSize: '0.9rem' }}>
                  {message.slice(0, 200)}{message.length > 200 ? '…' : ''}
                </p>
                <p><strong>Segments per recipient:</strong> {parts}</p>
                {estimatedCost && <p><strong>Estimated total cost:</strong> ${estimatedCost}</p>}
                <div style={{ display: 'flex', gap: '1rem', justifyContent: 'space-between', marginTop: '1.5rem' }}>
                  <button
                    onClick={() => setShowConfirm(false)}
                    disabled={sending}
                    style={{
                      padding: '0.75rem 1.5rem',
                      backgroundColor: '#ccc',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      flex: 1,
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSend}
                    disabled={sending}
                    style={{
                      padding: '0.75rem 1.5rem',
                      backgroundColor: '#4CAF50',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      flex: 1,
                    }}
                  >
                    {sending ? 'Sending…' : 'Confirm Send'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
