import React, { useRef, useState, useEffect } from 'react';
import apiClient from '../services/apiClient';
import { templateService } from '../services/api';

function EmailCompose() {
  const fileInputRef = useRef(null);
  const [fileName, setFileName] = useState('');
  const [recipientCount, setRecipientCount] = useState(0);
  const [subject, setSubject] = useState('');
  const [fromAddress, setFromAddress] = useState('');
  const [htmlBody, setHtmlBody] = useState('');
  const [sending, setSending] = useState(false);
  const [blastId, setBlastId] = useState(null);
  const [error, setError] = useState(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [templates, setTemplates] = useState([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [showSaveTemplate, setShowSaveTemplate] = useState(false);
  const [saveTemplateName, setSaveTemplateName] = useState('');
  const [scheduleEnabled, setScheduleEnabled] = useState(false);
  const [scheduledAt, setScheduledAt] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [recipientEmails, setRecipientEmails] = useState('');
  const [errorFields, setErrorFields] = useState({});
  const [fromName, setFromName] = useState('');
  const [replyTo, setReplyTo] = useState('');
  const [plainTextBody, setPlainTextBody] = useState('');
  const [queryString, setQueryString] = useState('');
  const [webLanguage, setWebLanguage] = useState('en');
  const [bodyMode, setBodyMode] = useState('html');

  const COST_PER_EMAIL = 0.0001;
  const estimatedCost = (recipientCount * COST_PER_EMAIL).toFixed(4);

  useEffect(() => {
    templateService.getAll().then(data => {
      setTemplates(data.templates || []);
    }).catch(() => {});
  }, []);

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      setFileName(file.name);
      setError(null);
      // Simple estimation: parse CSV/XLSX in browser to get count
      const reader = new FileReader();
      reader.onload = (event) => {
        const content = event.target.result;
        // Quick count: split by newline and subtract 1 for header
        const lines = content.split('\n').filter(line => line.trim());
        setRecipientCount(Math.max(0, lines.length - 1));
      };
      reader.readAsText(file);
    }
  };

  const handleSend = async () => {
    const errors = {};
    const hasFile = fileInputRef.current?.files[0];
    const hasEmails = recipientEmails.trim().length > 0;

    if (!hasFile && !hasEmails) {
      errors.recipients = true;
      setError('Upload a CSV file OR paste recipient emails');
    }
    if (!subject.trim()) {
      errors.subject = true;
      setError('Subject is required');
    }
    if (bodyMode === 'html' && !htmlBody.trim()) {
      errors.htmlBody = true;
      setError('Email body is required');
    }
    if (bodyMode === 'text' && !plainTextBody.trim()) {
      errors.plainTextBody = true;
      setError('Email body is required');
    }
    if (!fromAddress.trim()) {
      errors.fromAddress = true;
      setError('From address is required');
    }

    setErrorFields(errors);

    if (Object.keys(errors).length === 0) {
      setShowConfirm(true);
    }
  };

  const confirmAndSend = async () => {
    setShowConfirm(false);
    setSending(true);
    setError(null);

    try {
      const formData = new FormData();

      // Add file if present
      if (fileInputRef.current?.files[0]) {
        formData.append('file', fileInputRef.current.files[0]);
      }

      // Add manual emails if present
      if (recipientEmails.trim()) {
        const emails = recipientEmails.split(/[\n,;]+/).map(e => e.trim()).filter(Boolean);
        formData.append('recipientEmails', JSON.stringify(emails));
      }

      formData.append('subject', subject);
      formData.append('htmlBody', bodyMode === 'html' ? htmlBody : '');
      formData.append('plainTextBody', bodyMode === 'text' ? plainTextBody : '');
      formData.append('fromAddress', fromAddress);
      formData.append('fromName', fromName);
      formData.append('replyTo', replyTo);
      formData.append('queryString', queryString);
      formData.append('webLanguage', webLanguage);

      if (scheduleEnabled && scheduledAt) {
        formData.append('scheduledAt', new Date(scheduledAt).toISOString());
      }

      const response = await apiClient.post('/email/send', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      setBlastId(response.data.blastId);

      if (response.data.scheduled && response.data.scheduledAt) {
        const scheduledDate = new Date(response.data.scheduledAt);
        setSuccessMessage(`Scheduled for ${scheduledDate.toLocaleString()}`);
      } else {
        setSuccessMessage('Email blast queued successfully!');
      }

      setFileName('');
      setRecipientCount(0);
      setRecipientEmails('');
      setSubject('');
      setFromAddress('');
      setFromName('');
      setReplyTo('');
      setHtmlBody('');
      setPlainTextBody('');
      setQueryString('');
      setWebLanguage('en');
      setBodyMode('html');
      setScheduleEnabled(false);
      setScheduledAt('');
      setErrorFields({});
      fileInputRef.current.value = '';

      // Redirect to analytics after 3 seconds
      setTimeout(() => {
        window.location.href = '/analytics';
      }, 3000);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to send blast');
      setSending(false);
    }
  };

  if (blastId) {
    return (
      <div className="space-y-6 p-6">
        <div className="bg-green-50 dark:bg-green-900/30 p-8 rounded-lg text-center border border-green-400 dark:border-green-700">
          <h1 className="text-3xl font-bold text-green-900 dark:text-green-100 mb-4">✓ {successMessage.includes('Scheduled') ? 'Scheduled' : 'Blast Queued'}</h1>
          <p className="text-lg text-green-800 dark:text-green-200 mb-2">
            {successMessage}
          </p>
          <p className="text-sm text-green-700 dark:text-green-300 mb-2">
            Email blast #{blastId} • {recipientCount} recipients
          </p>
          <p className="text-sm text-green-700 dark:text-green-300 mb-6">
            Redirecting to analytics in 3 seconds...
          </p>
          <a href="/analytics" className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition inline-block">
            View Analytics
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">📧 Email Campaign Manager</h1>

        {/* EMAIL SECTION TABS */}
        <div className="flex gap-2 border-b-2 border-gray-300 dark:border-gray-700 pb-0">
          <a href="/email-compose" className="px-6 py-3 bg-blue-600 text-white font-semibold rounded-t-lg">📝 Compose</a>
          <a href="/analytics" className="px-6 py-3 bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white font-semibold rounded-t-lg hover:bg-gray-300 dark:hover:bg-gray-600">📈 Analytics</a>
          <a href="/reports" className="px-6 py-3 bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white font-semibold rounded-t-lg hover:bg-gray-300 dark:hover:bg-gray-600">📊 Reports</a>
          <a href="/email-domain" className="px-6 py-3 bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white font-semibold rounded-t-lg hover:bg-gray-300 dark:hover:bg-gray-600">🌐 Domain Setup</a>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Recipients Panel */}
        <div className={`col-span-1 bg-white dark:bg-gray-800 p-6 rounded-lg shadow ${
          errorFields.recipients ? 'ring-2 ring-red-500' : ''
        }`}>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">1. Recipients</h2>
          {errorFields.recipients && <p className="text-red-500 text-sm mb-3">⚠️ Please upload a CSV or paste emails</p>}

          {/* File Upload */}
          <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6 text-center mb-4">
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.xlsx,.xls"
              onChange={handleFileSelect}
              disabled={sending}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={sending}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition"
            >
              Upload CSV
            </button>
            {fileName && (
              <div className="mt-4">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">{fileName}</p>
                <p className="text-2xl font-bold text-blue-600 dark:text-blue-400 mt-2">{recipientCount}</p>
                <p className="text-xs text-gray-500 dark:text-gray-500">recipients</p>
              </div>
            )}
          </div>

          {/* OR Divider */}
          <div className="flex items-center gap-2 mb-4">
            <div className="flex-1 border-t border-gray-300 dark:border-gray-600"></div>
            <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">OR</span>
            <div className="flex-1 border-t border-gray-300 dark:border-gray-600"></div>
          </div>

          {/* Manual Email Entry */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Paste Emails
            </label>
            <textarea
              value={recipientEmails}
              onChange={(e) => {
                setRecipientEmails(e.target.value);
                const emails = e.target.value.split(/[\n,;]+/).map(e => e.trim()).filter(Boolean);
                setRecipientCount(emails.length);
              }}
              disabled={sending}
              placeholder="one@example.com&#10;two@example.com&#10;three@example.com"
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:bg-gray-100 dark:disabled:bg-gray-900"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
              Separate by comma, semicolon, or new line
            </p>
            {recipientEmails.trim() && (
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mt-2">
                {recipientCount} email{recipientCount !== 1 ? 's' : ''} ready
              </p>
            )}
          </div>
        </div>

        {/* Compose Panel */}
        <div className="col-span-1 bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">2. Compose</h2>
          <div className="space-y-4">
            {/* Template Picker */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Load Template
              </label>
              <div className="flex gap-2">
                <select
                  value={selectedTemplateId}
                  onChange={(e) => setSelectedTemplateId(e.target.value)}
                  disabled={sending}
                  className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:bg-gray-100 dark:disabled:bg-gray-900"
                >
                  <option value="">— select a template —</option>
                  {templates.map(t => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
                <button
                  type="button"
                  disabled={!selectedTemplateId || sending}
                  onClick={() => {
                    const tpl = templates.find(t => String(t.id) === String(selectedTemplateId));
                    if (tpl) {
                      setSubject(tpl.subject);
                      setHtmlBody(tpl.html_body);
                      setBodyMode('html');
                    }
                  }}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition"
                >
                  Load
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                From Address
              </label>
              <input
                type="email"
                value={fromAddress}
                onChange={(e) => {
                  setFromAddress(e.target.value);
                  setErrorFields(prev => ({ ...prev, fromAddress: false }));
                }}
                disabled={sending}
                placeholder="noreply@example.com"
                className={`w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:bg-gray-100 dark:disabled:bg-gray-900 ${
                  errorFields.fromAddress
                    ? 'border-red-500 dark:border-red-500'
                    : 'border-gray-300 dark:border-gray-600'
                }`}
              />
              {errorFields.fromAddress && <p className="text-red-500 text-xs mt-1">Required</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                From Name
              </label>
              <input
                type="text"
                value={fromName}
                onChange={(e) => setFromName(e.target.value)}
                disabled={sending}
                placeholder="Your Organization Name"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:bg-gray-100 dark:disabled:bg-gray-900"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Reply-to Email
              </label>
              <input
                type="email"
                value={replyTo}
                onChange={(e) => setReplyTo(e.target.value)}
                disabled={sending}
                placeholder="support@example.com"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:bg-gray-100 dark:disabled:bg-gray-900"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Subject
              </label>
              <input
                type="text"
                value={subject}
                onChange={(e) => {
                  setSubject(e.target.value);
                  setErrorFields(prev => ({ ...prev, subject: false }));
                }}
                disabled={sending}
                placeholder="Email subject line"
                className={`w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:bg-gray-100 dark:disabled:bg-gray-900 ${
                  errorFields.subject
                    ? 'border-red-500 dark:border-red-500'
                    : 'border-gray-300 dark:border-gray-600'
                }`}
              />
              {errorFields.subject && <p className="text-red-500 text-xs mt-1">Required</p>}
            </div>

            {/* ⭐ BIG TOGGLE - MESSAGE FORMAT SELECTOR ⭐ */}
            <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border-3 border-blue-400 dark:border-blue-600 mb-4">
              <label className="block text-lg font-bold text-blue-900 dark:text-blue-100 mb-3">
                📝 MESSAGE FORMAT - Choose One:
              </label>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setBodyMode('html');
                    setErrorFields(prev => ({ ...prev, htmlBody: false, plainTextBody: false }));
                  }}
                  disabled={sending}
                  className={`flex-1 px-6 py-4 rounded-lg text-base font-bold transition ${
                    bodyMode === 'html'
                      ? 'bg-blue-600 text-white shadow-lg scale-105'
                      : 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white border-2 border-blue-300 dark:border-blue-600'
                  } ${sending ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  📄 HTML (with tags & styles)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setBodyMode('text');
                    setErrorFields(prev => ({ ...prev, htmlBody: false, plainTextBody: false }));
                  }}
                  disabled={sending}
                  className={`flex-1 px-6 py-4 rounded-lg text-base font-bold transition ${
                    bodyMode === 'text'
                      ? 'bg-blue-600 text-white shadow-lg scale-105'
                      : 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white border-2 border-blue-300 dark:border-blue-600'
                  } ${sending ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  📋 PLAIN TEXT (no HTML)
                </button>
              </div>
              <p className="text-sm text-blue-800 dark:text-blue-200 mt-2 font-semibold">
                Current: <strong>{bodyMode === 'html' ? 'HTML Email' : 'Plain Text Email'}</strong>
              </p>
            </div>

              {bodyMode === 'html' ? (
                <>
                  <textarea
                    value={htmlBody}
                    onChange={(e) => {
                      setHtmlBody(e.target.value);
                      setErrorFields(prev => ({ ...prev, htmlBody: false }));
                    }}
                    disabled={sending}
                    placeholder="<h1>Hello!</h1><p>Your email content here...</p>"
                    rows={6}
                    className={`w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:bg-gray-100 dark:disabled:bg-gray-900 font-mono text-sm ${
                      errorFields.htmlBody
                        ? 'border-red-500 dark:border-red-500'
                        : 'border-gray-300 dark:border-gray-600'
                    }`}
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Tokens: {'{first_name}'}, {'{last_name}'}, {'{email}'}</p>
                  {errorFields.htmlBody && <p className="text-red-500 text-xs mt-1">Required</p>}
                </>
              ) : (
                <>
                  <textarea
                    value={plainTextBody}
                    onChange={(e) => {
                      setPlainTextBody(e.target.value);
                      setErrorFields(prev => ({ ...prev, plainTextBody: false }));
                    }}
                    disabled={sending}
                    placeholder="Your email content here..."
                    rows={6}
                    className={`w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:bg-gray-100 dark:disabled:bg-gray-900 font-mono text-sm ${
                      errorFields.plainTextBody
                        ? 'border-red-500 dark:border-red-500'
                        : 'border-gray-300 dark:border-gray-600'
                    }`}
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Tokens: {'{first_name}'}, {'{last_name}'}, {'{email}'}</p>
                  {errorFields.plainTextBody && <p className="text-red-500 text-xs mt-1">Required</p>}
                </>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Query String / UTM Parameters
              </label>
              <input
                type="text"
                value={queryString}
                onChange={(e) => setQueryString(e.target.value)}
                disabled={sending}
                placeholder="?utm_source=email&utm_campaign=spring2026"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:bg-gray-100 dark:disabled:bg-gray-900 font-mono text-sm"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Append to links for tracking</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Web Version Language
              </label>
              <select
                value={webLanguage}
                onChange={(e) => setWebLanguage(e.target.value)}
                disabled={sending}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:bg-gray-100 dark:disabled:bg-gray-900"
              >
                <option value="en">English</option>
                <option value="es">Spanish</option>
                <option value="fr">French</option>
                <option value="de">German</option>
                <option value="it">Italian</option>
                <option value="pt">Portuguese</option>
                <option value="zh">Chinese</option>
                <option value="ja">Japanese</option>
              </select>
            </div>

            {/* Save as Template */}
            <div>
              <button
                type="button"
                onClick={() => setShowSaveTemplate(!showSaveTemplate)}
                disabled={sending}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:bg-gray-400 transition"
              >
                Save as Template
              </button>
              {showSaveTemplate && (
                <div className="mt-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-300 dark:border-gray-600">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Template Name
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={saveTemplateName}
                      onChange={(e) => setSaveTemplateName(e.target.value)}
                      placeholder="e.g., Spring Campaign 2026"
                      disabled={sending}
                      className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:bg-gray-100 dark:disabled:bg-gray-900"
                    />
                    <button
                      type="button"
                      disabled={!saveTemplateName.trim() || !subject || !htmlBody || sending}
                      onClick={() => {
                        templateService.create(saveTemplateName.trim(), subject, htmlBody)
                          .then(data => {
                            setTemplates(ts => [data.template, ...ts]);
                            setSaveTemplateName('');
                            setShowSaveTemplate(false);
                          })
                          .catch(() => setError('Failed to save template'));
                      }}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 transition"
                    >
                      Save
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Schedule for Later */}
            <div>
              <label className="flex items-center text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <input
                  type="checkbox"
                  checked={scheduleEnabled}
                  onChange={(e) => {
                    setScheduleEnabled(e.target.checked);
                    if (!e.target.checked) setScheduledAt('');
                  }}
                  disabled={sending}
                  className="mr-2"
                />
                Schedule for later
              </label>
              {scheduleEnabled && (
                <input
                  type="datetime-local"
                  value={scheduledAt}
                  min={new Date(Date.now() + 60000).toISOString().slice(0, 16)}
                  onChange={(e) => setScheduledAt(e.target.value)}
                  disabled={sending}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:bg-gray-100 dark:disabled:bg-gray-900"
                />
              )}
            </div>
          </div>
        </div>

        {/* Send Panel */}
        <div className="col-span-1 space-y-4">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">3. Review & Send</h2>

            <div className="bg-blue-50 dark:bg-blue-900/30 p-4 rounded-lg border border-blue-400 dark:border-blue-700 mb-4">
              <p className="text-sm text-blue-800 dark:text-blue-200 font-medium mb-2">Estimated Cost</p>
              <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">${estimatedCost}</p>
              <p className="text-xs text-blue-700 dark:text-blue-300 mt-2">
                {recipientCount} recipients × ${COST_PER_EMAIL}/email
              </p>
            </div>

            <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg text-sm space-y-2 mb-4">
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Recipients:</span>
                <span className="font-semibold text-gray-900 dark:text-white">{recipientCount}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Subject:</span>
                <span className="font-semibold text-gray-900 dark:text-white truncate ml-2">{subject || '—'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">From:</span>
                <span className="font-semibold text-gray-900 dark:text-white truncate ml-2">{fromAddress || '—'}</span>
              </div>
            </div>

            <button
              onClick={handleSend}
              disabled={!recipientCount || !subject || (!htmlBody && !plainTextBody) || !fromAddress || sending}
              className="w-full px-4 py-3 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition"
            >
              {sending ? 'Sending...' : 'Send Campaign'}
            </button>
          </div>

          {error && (
            <div className="bg-red-50 dark:bg-red-900/30 p-4 rounded-lg border border-red-400 dark:border-red-700">
              <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
            </div>
          )}
        </div>
      </div>

      {/* Confirmation Dialog */}
      {showConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 p-8 rounded-lg max-w-md">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
              Confirm Email Campaign
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Send email to {recipientCount} recipients at an estimated cost of ${estimatedCost}?
            </p>
            <div className="flex gap-4">
              <button
                onClick={() => setShowConfirm(false)}
                className="flex-1 px-4 py-2 bg-gray-300 dark:bg-gray-600 text-gray-900 dark:text-white rounded-lg hover:bg-gray-400 dark:hover:bg-gray-700 transition"
              >
                Cancel
              </button>
              <button
                onClick={confirmAndSend}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-semibold"
              >
                Confirm & Send
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default EmailCompose;
