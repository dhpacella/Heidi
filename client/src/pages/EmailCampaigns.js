import React, { useRef, useState, useEffect } from 'react';
import apiClient from '../services/apiClient';
import { templateService, campaignService } from '../services/api';

function EmailCampaigns() {
  // Campaign list state
  const [blasts, setBlasts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sortConfig, setSortConfig] = useState({ key: 'created_at', direction: 'desc' });
  const [selectedBlastId, setSelectedBlastId] = useState(null);

  // Compose form state
  const fileInputRef = useRef(null);
  const [fileName, setFileName] = useState('');
  const [recipientCount, setRecipientCount] = useState(0);
  const [subject, setSubject] = useState('');
  const [fromAddress, setFromAddress] = useState('');
  const [htmlBody, setHtmlBody] = useState('');
  const [sending, setSending] = useState(false);
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
  const [composeMode, setComposeMode] = useState('new');

  const COST_PER_EMAIL = 0.0001;
  const estimatedCost = (recipientCount * COST_PER_EMAIL).toFixed(4);

  // Load campaigns and templates on mount
  useEffect(() => {
    fetchBlasts();
    templateService.getAll().then(data => {
      setTemplates(data.templates || []);
    }).catch(() => {});
  }, []);

  const fetchBlasts = async () => {
    try {
      const data = await campaignService.getAllBlasts();
      setBlasts(data.blasts || []);
      setLoading(false);
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  const resetForm = () => {
    setSubject('');
    setFromAddress('');
    setHtmlBody('');
    setPlainTextBody('');
    setFromName('');
    setReplyTo('');
    setQueryString('');
    setWebLanguage('en');
    setBodyMode('html');
    setFileName('');
    setRecipientCount(0);
    setRecipientEmails('');
    setErrorFields({});
    setError(null);
    setSuccessMessage('');
    setScheduleEnabled(false);
    setScheduledAt('');
    setShowSaveTemplate(false);
    setSaveTemplateName('');
    setSelectedTemplateId('');
    if (fileInputRef.current) fileInputRef.current.value = '';
    setComposeMode('new');
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      setFileName(file.name);
      setError(null);
      const reader = new FileReader();
      reader.onload = (event) => {
        const content = event.target.result;
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

      if (fileInputRef.current?.files[0]) {
        formData.append('file', fileInputRef.current.files[0]);
      }

      formData.append('subject', subject);
      formData.append('fromAddress', fromAddress);
      formData.append('fromName', fromName || '');
      formData.append('replyTo', replyTo || '');
      formData.append('queryString', queryString || '');
      formData.append('webLanguage', webLanguage || 'en');

      if (bodyMode === 'html') {
        formData.append('htmlBody', htmlBody);
      } else {
        formData.append('plainTextBody', plainTextBody);
      }

      if (recipientEmails) {
        formData.append('recipientEmails', JSON.stringify(recipientEmails.split(/[,\n;]+/).map(e => e.trim()).filter(Boolean)));
      }

      if (scheduleEnabled && scheduledAt) {
        formData.append('scheduledAt', new Date(scheduledAt).toISOString());
      }

      const response = await apiClient.post('/api/email/send', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      if (response.status === 200) {
        const data = response.data;
        if (data.scheduled) {
          setSuccessMessage(`Campaign scheduled for ${new Date(data.scheduledAt).toLocaleString()}!`);
        } else {
          setSuccessMessage('Campaign queued successfully!');
        }
        resetForm();
        setTimeout(() => {
          setSuccessMessage('');
          fetchBlasts();
        }, 3000);
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to send campaign');
      console.error('Send error:', err);
    } finally {
      setSending(false);
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

  const selectedBlast = selectedBlastId ? blasts.find(b => b.id === selectedBlastId) : null;

  return (
    <div className="grid grid-cols-2 gap-6 p-6" style={{ alignItems: 'start' }}>
      {/* LEFT PANEL: Campaign List */}
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Campaigns</h2>
          <button
            onClick={() => { setSelectedBlastId(null); setComposeMode('new'); }}
            className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm font-semibold"
          >
            + New
          </button>
        </div>

        {error && composeMode === 'list' && (
          <div className="bg-red-50 dark:bg-red-900/30 p-3 rounded-lg border border-red-400 dark:border-red-700">
            <p className="text-red-800 dark:text-red-200 text-sm">{error}</p>
          </div>
        )}

        {loading ? (
          <p className="text-gray-600 dark:text-gray-400">Loading campaigns...</p>
        ) : blasts.length === 0 ? (
          <div className="bg-gray-50 dark:bg-gray-800 p-6 rounded-lg border border-gray-300 dark:border-gray-700 text-center">
            <p className="text-gray-600 dark:text-gray-400 text-sm">No campaigns yet</p>
          </div>
        ) : (
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {sortedBlasts.map((blast) => (
              <button
                key={blast.id}
                onClick={() => setSelectedBlastId(selectedBlastId === blast.id ? null : blast.id)}
                className={`w-full p-3 rounded-lg text-left transition border ${
                  selectedBlastId === blast.id
                    ? 'bg-blue-50 dark:bg-blue-900/30 border-blue-400 dark:border-blue-600'
                    : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700 hover:border-blue-400'
                }`}
              >
                <div className="flex justify-between items-start gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 dark:text-white truncate text-sm">{blast.subject}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{blast.from_address}</p>
                  </div>
                  <span className={`text-xs font-semibold px-2 py-1 rounded whitespace-nowrap ${getStatusBadge(blast.status)}`}>
                    {blast.status}
                  </span>
                </div>
                <div className="flex justify-between items-center gap-2 mt-2 text-xs text-gray-600 dark:text-gray-400">
                  <span>{blast.recipient_count} recipients</span>
                  <span>{formatDate(blast.created_at)}</span>
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Quick Stats */}
        {blasts.length > 0 && (
          <div className="grid grid-cols-2 gap-2 mt-4 pt-4 border-t border-gray-300 dark:border-gray-700">
            <div className="bg-white dark:bg-gray-800 p-3 rounded-lg">
              <p className="text-xs text-gray-600 dark:text-gray-400">Total Recipients</p>
              <p className="text-lg font-bold text-gray-900 dark:text-white">
                {blasts.reduce((sum, b) => sum + (b.recipient_count || 0), 0).toLocaleString()}
              </p>
            </div>
            <div className="bg-white dark:bg-gray-800 p-3 rounded-lg">
              <p className="text-xs text-gray-600 dark:text-gray-400">Total Opens</p>
              <p className="text-lg font-bold text-blue-600 dark:text-blue-400">
                {blasts.reduce((sum, b) => sum + (b.opened_count || 0), 0).toLocaleString()}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* RIGHT PANEL: Compose Form or Campaign Details */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 space-y-4">
        {selectedBlast && composeMode !== 'compose' ? (
          // Campaign Details View
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">{selectedBlast.subject}</h2>

            <div className="grid grid-cols-2 gap-4 py-4 border-y border-gray-300 dark:border-gray-700">
              <div>
                <p className="text-xs text-gray-600 dark:text-gray-400">From</p>
                <p className="text-sm font-semibold text-gray-900 dark:text-white">{selectedBlast.from_address}</p>
              </div>
              <div>
                <p className="text-xs text-gray-600 dark:text-gray-400">Recipients</p>
                <p className="text-sm font-semibold text-gray-900 dark:text-white">{selectedBlast.recipient_count}</p>
              </div>
              <div>
                <p className="text-xs text-gray-600 dark:text-gray-400">Status</p>
                <span className={`text-xs font-semibold px-2 py-1 rounded inline-block mt-1 ${getStatusBadge(selectedBlast.status)}`}>
                  {selectedBlast.status}
                </span>
              </div>
              <div>
                <p className="text-xs text-gray-600 dark:text-gray-400">Created</p>
                <p className="text-sm font-semibold text-gray-900 dark:text-white">{formatDate(selectedBlast.created_at)}</p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded">
                <p className="text-xs text-gray-600 dark:text-gray-400">Opened</p>
                <p className="text-lg font-bold text-blue-600 dark:text-blue-400">{selectedBlast.opened_count || 0}</p>
              </div>
              <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded">
                <p className="text-xs text-gray-600 dark:text-gray-400">Clicked</p>
                <p className="text-lg font-bold text-green-600 dark:text-green-400">{selectedBlast.clicked_count || 0}</p>
              </div>
              <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded">
                <p className="text-xs text-gray-600 dark:text-gray-400">Delivered</p>
                <p className="text-lg font-bold text-gray-900 dark:text-white">{selectedBlast.delivered_count || 0}</p>
              </div>
            </div>

            <button
              onClick={() => setSelectedBlastId(null)}
              className="w-full px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition font-semibold"
            >
              Close
            </button>
          </div>
        ) : (
          // Compose Form
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Compose Campaign</h2>

            {successMessage && (
              <div className="bg-green-50 dark:bg-green-900/30 p-3 rounded-lg border border-green-400 dark:border-green-700">
                <p className="text-green-800 dark:text-green-200 text-sm">{successMessage}</p>
              </div>
            )}

            {error && composeMode === 'compose' && (
              <div className="bg-red-50 dark:bg-red-900/30 p-3 rounded-lg border border-red-400 dark:border-red-700">
                <p className="text-red-800 dark:text-red-200 text-sm">{error}</p>
              </div>
            )}

            {/* Template Selector */}
            <div>
              <label className="block text-sm font-semibold text-gray-900 dark:text-white mb-1">Template</label>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <select value={selectedTemplateId} onChange={e => setSelectedTemplateId(e.target.value)} className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm">
                  <option value="">— select a template —</option>
                  {templates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
                <button
                  type="button"
                  disabled={!selectedTemplateId}
                  onClick={() => {
                    const tpl = templates.find(t => String(t.id) === String(selectedTemplateId));
                    if (tpl) {
                      setSubject(tpl.subject);
                      setHtmlBody(tpl.html_body);
                      setBodyMode('html');
                    }
                  }}
                  className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm disabled:bg-gray-400 font-semibold"
                >
                  Load
                </button>
              </div>
            </div>

            {/* Subject */}
            <div>
              <label className="block text-sm font-semibold text-gray-900 dark:text-white mb-1">Subject</label>
              <input
                type="text"
                value={subject}
                onChange={e => setSubject(e.target.value)}
                placeholder="Campaign subject with {first_name} personalization"
                className={`w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm ${errorFields.subject ? 'border-red-500 dark:border-red-500' : 'border-gray-300 dark:border-gray-600'}`}
              />
            </div>

            {/* ⭐ BODY MODE TOGGLE - PROMINENT PLACEMENT */}
            <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg border-2 border-blue-300 dark:border-blue-700">
              <label className="block text-sm font-bold text-blue-900 dark:text-blue-100 mb-2">📝 Message Format</label>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => setBodyMode('html')}
                  className={`flex-1 px-4 py-3 rounded-lg transition text-sm font-bold ${bodyMode === 'html' ? 'bg-blue-600 text-white shadow-lg scale-105' : 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white border border-blue-400'}`}
                >
                  📄 HTML
                </button>
                <button
                  type="button"
                  onClick={() => setBodyMode('text')}
                  className={`flex-1 px-4 py-3 rounded-lg transition text-sm font-bold ${bodyMode === 'text' ? 'bg-blue-600 text-white shadow-lg scale-105' : 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white border border-blue-400'}`}
                >
                  📋 Plain Text
                </button>
              </div>
              <p className="text-xs text-blue-700 dark:text-blue-200 mt-2">Current: <strong>{bodyMode === 'html' ? 'HTML with tags' : 'Plain text only'}</strong></p>
            </div>

            {/* From Fields */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-sm font-semibold text-gray-900 dark:text-white mb-1">From Address</label>
                <input
                  type="email"
                  value={fromAddress}
                  onChange={e => setFromAddress(e.target.value)}
                  placeholder="sender@example.com"
                  className={`w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm ${errorFields.fromAddress ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'}`}
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-900 dark:text-white mb-1">From Name</label>
                <input
                  type="text"
                  value={fromName}
                  onChange={e => setFromName(e.target.value)}
                  placeholder="Campaign Team"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                />
              </div>
            </div>

            {/* Reply-to & Language */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-sm font-semibold text-gray-900 dark:text-white mb-1">Reply-to</label>
                <input
                  type="email"
                  value={replyTo}
                  onChange={e => setReplyTo(e.target.value)}
                  placeholder="support@example.com"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-900 dark:text-white mb-1">Language</label>
                <select value={webLanguage} onChange={e => setWebLanguage(e.target.value)} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm">
                  <option value="en">English</option>
                  <option value="es">Español</option>
                  <option value="fr">Français</option>
                </select>
              </div>
            </div>

            {/* Body Mode Toggle */}
            <div>
              <label className="block text-sm font-semibold text-gray-900 dark:text-white mb-2">Message Format</label>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => setBodyMode('html')}
                  className={`flex-1 px-3 py-2 rounded-lg transition text-sm font-semibold ${bodyMode === 'html' ? 'bg-blue-600 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white'}`}
                >
                  HTML
                </button>
                <button
                  type="button"
                  onClick={() => setBodyMode('text')}
                  className={`flex-1 px-3 py-2 rounded-lg transition text-sm font-semibold ${bodyMode === 'text' ? 'bg-blue-600 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white'}`}
                >
                  Plain Text
                </button>
              </div>
            </div>

            {/* Message Body */}
            {bodyMode === 'html' ? (
              <div>
                <label className="block text-sm font-semibold text-gray-900 dark:text-white mb-1">HTML Body</label>
                <textarea
                  value={htmlBody}
                  onChange={e => setHtmlBody(e.target.value)}
                  placeholder="<h1>Hello {first_name}!</h1><p>Your message here...</p>"
                  className={`w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm font-mono h-32 ${errorFields.htmlBody ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'}`}
                />
              </div>
            ) : (
              <div>
                <label className="block text-sm font-semibold text-gray-900 dark:text-white mb-1">Plain Text Body</label>
                <textarea
                  value={plainTextBody}
                  onChange={e => setPlainTextBody(e.target.value)}
                  placeholder="Hello {first_name}, your message here..."
                  className={`w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm h-32 ${errorFields.plainTextBody ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'}`}
                />
              </div>
            )}

            {/* Recipients */}
            <div>
              <label className="block text-sm font-semibold text-gray-900 dark:text-white mb-1">Recipients</label>
              <div style={{ marginBottom: '0.5rem' }}>
                <input
                  type="file"
                  ref={fileInputRef}
                  accept=".csv,.xlsx"
                  onChange={handleFileSelect}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                />
                {fileName && <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">✓ {fileName} ({recipientCount} recipients)</p>}
              </div>
              <textarea
                value={recipientEmails}
                onChange={e => setRecipientEmails(e.target.value)}
                placeholder="Or paste emails: user1@example.com, user2@example.com"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm h-20"
              />
            </div>

            {/* Scheduling */}
            <div>
              <label>
                <input type="checkbox" checked={scheduleEnabled} onChange={e => { setScheduleEnabled(e.target.checked); if (!e.target.checked) setScheduledAt(''); }} />
                {' '}<span className="text-sm font-semibold text-gray-900 dark:text-white">Schedule for later</span>
              </label>
              {scheduleEnabled && (
                <input type="datetime-local" value={scheduledAt}
                  min={new Date(Date.now() + 60000).toISOString().slice(0, 16)}
                  onChange={e => setScheduledAt(e.target.value)}
                  className="w-full mt-2 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                />
              )}
            </div>

            {/* Save Template */}
            <div>
              <button
                type="button"
                onClick={() => setShowSaveTemplate(s => !s)}
                className="px-3 py-2 bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition text-sm font-semibold"
              >
                Save as Template
              </button>
              {showSaveTemplate && (
                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                  <input type="text" placeholder="Template name" value={saveTemplateName} onChange={e => setSaveTemplateName(e.target.value)} className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm" />
                  <button
                    type="button"
                    disabled={!saveTemplateName.trim() || !subject || !htmlBody}
                    onClick={() => templateService.create(saveTemplateName.trim(), subject, htmlBody)
                      .then(data => {
                        setTemplates(ts => [data.template, ...ts]);
                        setSaveTemplateName('');
                        setShowSaveTemplate(false);
                      })
                      .catch(() => alert('Failed to save template'))
                    }
                    className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:bg-gray-400 text-sm font-semibold"
                  >
                    Save
                  </button>
                </div>
              )}
            </div>

            {/* Cost & Send */}
            <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-lg flex justify-between items-center">
              <div>
                <p className="text-xs text-gray-600 dark:text-gray-400">Estimated Cost</p>
                <p className="text-lg font-bold text-gray-900 dark:text-white">${estimatedCost}</p>
              </div>
              <button
                onClick={handleSend}
                disabled={sending}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:bg-gray-400 font-semibold"
              >
                {sending ? 'Sending...' : 'Send'}
              </button>
            </div>

            {/* Confirm Modal */}
            {showConfirm && (
              <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
                <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg max-w-sm">
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Confirm Send</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                    Send to {recipientCount || 'specified'} recipients for ${estimatedCost}?
                  </p>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button onClick={() => setShowConfirm(false)} className="flex-1 px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition font-semibold">Cancel</button>
                    <button onClick={confirmAndSend} className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-semibold">Confirm</button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default EmailCampaigns;
