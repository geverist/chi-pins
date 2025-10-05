// src/components/ContentManagementSystem.jsx
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

/**
 * Content Management System (CMS)
 *
 * Allows admins to manage content for their kiosks with:
 * - Internal content creation (create within app)
 * - External content connections (Contentful, WordPress, Airtable, Google Sheets)
 * - Industry-specific content templates
 * - Content scheduling and versioning
 * - Multi-location content distribution
 */

export default function ContentManagementSystem({ locationId, industry }) {
  const [activeTab, setActiveTab] = useState('library'); // library, connections, templates, scheduled
  const [contentItems, setContentItems] = useState([]);
  const [connections, setConnections] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadContent();
    loadConnections();
  }, [locationId]);

  async function loadContent() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('content_items')
        .select('*')
        .eq('location_id', locationId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setContentItems(data || []);
    } catch (error) {
      console.error('Error loading content:', error);
    } finally {
      setLoading(false);
    }
  }

  async function loadConnections() {
    try {
      const { data, error } = await supabase
        .from('content_connections')
        .select('*')
        .eq('location_id', locationId);

      if (error) throw error;
      setConnections(data || []);
    } catch (error) {
      console.error('Error loading connections:', error);
    }
  }

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <h1 style={styles.title}>📚 Content Management</h1>
        <p style={styles.subtitle}>Manage your kiosk content from one place</p>
      </header>

      <nav style={styles.tabs}>
        <button
          style={activeTab === 'library' ? styles.tabActive : styles.tab}
          onClick={() => setActiveTab('library')}
        >
          📁 Content Library ({contentItems.length})
        </button>
        <button
          style={activeTab === 'connections' ? styles.tabActive : styles.tab}
          onClick={() => setActiveTab('connections')}
        >
          🔌 Connections ({connections.length})
        </button>
        <button
          style={activeTab === 'templates' ? styles.tabActive : styles.tab}
          onClick={() => setActiveTab('templates')}
        >
          📄 Templates
        </button>
        <button
          style={activeTab === 'scheduled' ? styles.tabActive : styles.tab}
          onClick={() => setActiveTab('scheduled')}
        >
          📅 Scheduled
        </button>
      </nav>

      <div style={styles.content}>
        {activeTab === 'library' && (
          <ContentLibrary
            contentItems={contentItems}
            onRefresh={loadContent}
            locationId={locationId}
            industry={industry}
          />
        )}

        {activeTab === 'connections' && (
          <ContentConnections
            connections={connections}
            onRefresh={loadConnections}
            locationId={locationId}
          />
        )}

        {activeTab === 'templates' && (
          <ContentTemplates industry={industry} locationId={locationId} />
        )}

        {activeTab === 'scheduled' && (
          <ScheduledContent locationId={locationId} />
        )}
      </div>
    </div>
  );
}

// ============================================================================
// CONTENT LIBRARY TAB
// ============================================================================

function ContentLibrary({ contentItems, onRefresh, locationId, industry }) {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [filterType, setFilterType] = useState('all'); // all, video, image, game, survey, etc.

  const contentTypes = [...new Set(contentItems.map(item => item.content_type))];
  const filteredItems = filterType === 'all'
    ? contentItems
    : contentItems.filter(item => item.content_type === filterType);

  return (
    <div style={styles.tabContent}>
      <div style={styles.tabHeader}>
        <div>
          <h2>Content Library</h2>
          <p style={styles.helpText}>
            Create and manage all content for your kiosk in one place
          </p>
        </div>
        <button style={styles.btnPrimary} onClick={() => setShowCreateModal(true)}>
          + Create Content
        </button>
      </div>

      <div style={styles.filterBar}>
        <button
          style={filterType === 'all' ? styles.filterBtnActive : styles.filterBtn}
          onClick={() => setFilterType('all')}
        >
          All ({contentItems.length})
        </button>
        {contentTypes.map(type => (
          <button
            key={type}
            style={filterType === type ? styles.filterBtnActive : styles.filterBtn}
            onClick={() => setFilterType(type)}
          >
            {getContentIcon(type)} {type} ({contentItems.filter(i => i.content_type === type).length})
          </button>
        ))}
      </div>

      {filteredItems.length === 0 ? (
        <EmptyState
          icon="📁"
          title="No content yet"
          description="Create your first piece of content or connect to an external content source"
          action={<button style={styles.btnPrimary} onClick={() => setShowCreateModal(true)}>Create Content</button>}
        />
      ) : (
        <div style={styles.contentGrid}>
          {filteredItems.map(item => (
            <ContentCard
              key={item.id}
              content={item}
              onEdit={() => setEditingItem(item)}
              onDelete={() => deleteContent(item.id, onRefresh)}
            />
          ))}
        </div>
      )}

      {(showCreateModal || editingItem) && (
        <ContentEditor
          content={editingItem}
          locationId={locationId}
          industry={industry}
          onSave={() => {
            setShowCreateModal(false);
            setEditingItem(null);
            onRefresh();
          }}
          onCancel={() => {
            setShowCreateModal(false);
            setEditingItem(null);
          }}
        />
      )}
    </div>
  );
}

function ContentCard({ content, onEdit, onDelete }) {
  return (
    <div style={styles.contentCard}>
      <div style={styles.contentCardHeader}>
        <div style={styles.contentIcon}>
          {getContentIcon(content.content_type)}
        </div>
        <div style={{flex: 1}}>
          <h4 style={styles.contentTitle}>{content.title}</h4>
          <p style={styles.contentMeta}>
            {content.content_type} • {new Date(content.created_at).toLocaleDateString()}
          </p>
        </div>
        <div style={styles.contentStatus}>
          {content.status === 'published' && <span style={styles.badgeGreen}>Published</span>}
          {content.status === 'draft' && <span style={styles.badgeGray}>Draft</span>}
          {content.status === 'scheduled' && <span style={styles.badgeBlue}>Scheduled</span>}
        </div>
      </div>

      {content.description && (
        <p style={styles.contentDesc}>{content.description}</p>
      )}

      {content.thumbnail_url && (
        <img src={content.thumbnail_url} alt={content.title} style={styles.contentThumbnail} />
      )}

      <div style={styles.contentFooter}>
        <div style={styles.contentTags}>
          {content.tags && content.tags.map(tag => (
            <span key={tag} style={styles.tag}>{tag}</span>
          ))}
        </div>
        <div style={styles.contentActions}>
          <button style={styles.btnEdit} onClick={onEdit}>Edit</button>
          <button style={styles.btnDelete} onClick={onDelete}>Delete</button>
        </div>
      </div>
    </div>
  );
}

function ContentEditor({ content, locationId, industry, onSave, onCancel }) {
  const [formData, setFormData] = useState(content || {
    title: '',
    content_type: 'video',
    description: '',
    content_data: {},
    tags: [],
    status: 'draft',
    location_id: locationId
  });

  async function handleSave(e) {
    e.preventDefault();

    try {
      if (content?.id) {
        // Update existing
        const { error } = await supabase
          .from('content_items')
          .update(formData)
          .eq('id', content.id);

        if (error) throw error;
      } else {
        // Create new
        const { error } = await supabase
          .from('content_items')
          .insert([formData]);

        if (error) throw error;
      }

      alert('Content saved successfully!');
      onSave();
    } catch (error) {
      console.error('Error saving content:', error);
      alert('Error saving content: ' + error.message);
    }
  }

  function updateField(field, value) {
    setFormData(prev => ({ ...prev, [field]: value }));
  }

  return (
    <div style={styles.modal}>
      <div style={styles.modalContent}>
        <h3>{content ? 'Edit Content' : 'Create Content'}</h3>

        <form onSubmit={handleSave} style={styles.form}>
          <div style={styles.formRow}>
            <label style={styles.label}>
              Title *
              <input
                type="text"
                value={formData.title}
                onChange={e => updateField('title', e.target.value)}
                style={styles.input}
                required
                placeholder="E.g., Summer Menu Video"
              />
            </label>

            <label style={styles.label}>
              Content Type *
              <select
                value={formData.content_type}
                onChange={e => updateField('content_type', e.target.value)}
                style={styles.input}
                required
              >
                <option value="video">Video</option>
                <option value="image">Image</option>
                <option value="game">Game</option>
                <option value="survey">Survey</option>
                <option value="menu">Menu</option>
                <option value="ad">Advertisement</option>
                <option value="announcement">Announcement</option>
              </select>
            </label>
          </div>

          <label style={styles.label}>
            Description
            <textarea
              value={formData.description}
              onChange={e => updateField('description', e.target.value)}
              style={{...styles.input, minHeight: '80px'}}
              placeholder="Brief description of this content"
            />
          </label>

          {/* Content-specific fields */}
          {formData.content_type === 'video' && (
            <VideoContentFields formData={formData} updateField={updateField} />
          )}

          {formData.content_type === 'game' && (
            <GameContentFields formData={formData} updateField={updateField} industry={industry} />
          )}

          {formData.content_type === 'survey' && (
            <SurveyContentFields formData={formData} updateField={updateField} industry={industry} />
          )}

          <div style={styles.formRow}>
            <label style={styles.label}>
              Status *
              <select
                value={formData.status}
                onChange={e => updateField('status', e.target.value)}
                style={styles.input}
                required
              >
                <option value="draft">Draft</option>
                <option value="published">Published</option>
                <option value="scheduled">Scheduled</option>
                <option value="archived">Archived</option>
              </select>
            </label>

            <label style={styles.label}>
              Tags (comma-separated)
              <input
                type="text"
                value={formData.tags ? formData.tags.join(', ') : ''}
                onChange={e => updateField('tags', e.target.value.split(',').map(t => t.trim()).filter(Boolean))}
                style={styles.input}
                placeholder="E.g., summer, promotion, featured"
              />
            </label>
          </div>

          <div style={styles.formActions}>
            <button type="button" style={styles.btnCancel} onClick={onCancel}>Cancel</button>
            <button type="submit" style={styles.btnSave}>Save Content</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function VideoContentFields({ formData, updateField }) {
  const contentData = formData.content_data || {};

  function updateContentData(field, value) {
    updateField('content_data', { ...contentData, [field]: value });
  }

  return (
    <>
      <label style={styles.label}>
        Video URL (YouTube, Vimeo, or direct link)
        <input
          type="url"
          value={contentData.video_url || ''}
          onChange={e => updateContentData('video_url', e.target.value)}
          style={styles.input}
          placeholder="https://youtube.com/watch?v=..."
        />
      </label>

      <div style={styles.formRow}>
        <label style={styles.label}>
          Duration (seconds)
          <input
            type="number"
            value={contentData.duration || ''}
            onChange={e => updateContentData('duration', parseInt(e.target.value))}
            style={styles.input}
            placeholder="60"
          />
        </label>

        <label style={styles.checkboxLabel}>
          <input
            type="checkbox"
            checked={contentData.autoplay || false}
            onChange={e => updateContentData('autoplay', e.target.checked)}
          />
          Autoplay
        </label>

        <label style={styles.checkboxLabel}>
          <input
            type="checkbox"
            checked={contentData.loop || false}
            onChange={e => updateContentData('loop', e.target.checked)}
          />
          Loop
        </label>
      </div>
    </>
  );
}

function GameContentFields({ formData, updateField, industry }) {
  const contentData = formData.content_data || {};

  function updateContentData(field, value) {
    updateField('content_data', { ...contentData, [field]: value });
  }

  const gameTemplates = getGameTemplatesForIndustry(industry);

  return (
    <>
      <label style={styles.label}>
        Game Template
        <select
          value={contentData.game_template || ''}
          onChange={e => updateContentData('game_template', e.target.value)}
          style={styles.input}
        >
          <option value="">Select a template...</option>
          {gameTemplates.map(template => (
            <option key={template.id} value={template.id}>{template.name}</option>
          ))}
        </select>
      </label>

      <div style={styles.formRow}>
        <label style={styles.label}>
          Difficulty
          <select
            value={contentData.difficulty || 'medium'}
            onChange={e => updateContentData('difficulty', e.target.value)}
            style={styles.input}
          >
            <option value="easy">Easy</option>
            <option value="medium">Medium</option>
            <option value="hard">Hard</option>
          </select>
        </label>

        <label style={styles.label}>
          Time Limit (seconds)
          <input
            type="number"
            value={contentData.time_limit || 60}
            onChange={e => updateContentData('time_limit', parseInt(e.target.value))}
            style={styles.input}
            placeholder="60"
          />
        </label>
      </div>

      <label style={styles.label}>
        Questions/Content (JSON)
        <textarea
          value={JSON.stringify(contentData.questions || [], null, 2)}
          onChange={e => {
            try {
              updateContentData('questions', JSON.parse(e.target.value));
            } catch (err) {
              // Invalid JSON, ignore
            }
          }}
          style={{...styles.input, minHeight: '200px', fontFamily: 'monospace'}}
          placeholder={'[\n  {\n    "question": "What is...",\n    "answers": ["A", "B", "C"],\n    "correct": 0\n  }\n]'}
        />
      </label>
    </>
  );
}

function SurveyContentFields({ formData, updateField, industry }) {
  const contentData = formData.content_data || {};

  function updateContentData(field, value) {
    updateField('content_data', { ...contentData, [field]: value });
  }

  const surveyTemplates = getSurveyTemplatesForIndustry(industry);

  return (
    <>
      <label style={styles.label}>
        Survey Template
        <select
          value={contentData.survey_template || ''}
          onChange={e => {
            const template = surveyTemplates.find(t => t.id === e.target.value);
            if (template) {
              updateContentData('survey_template', template.id);
              updateContentData('questions', template.questions);
            }
          }}
          style={styles.input}
        >
          <option value="">Start from scratch...</option>
          {surveyTemplates.map(template => (
            <option key={template.id} value={template.id}>{template.name}</option>
          ))}
        </select>
      </label>

      <label style={styles.label}>
        Questions (JSON)
        <textarea
          value={JSON.stringify(contentData.questions || [], null, 2)}
          onChange={e => {
            try {
              updateContentData('questions', JSON.parse(e.target.value));
            } catch (err) {
              // Invalid JSON, ignore
            }
          }}
          style={{...styles.input, minHeight: '200px', fontFamily: 'monospace'}}
          placeholder={'[\n  {\n    "type": "rating",\n    "question": "How was your experience?",\n    "scale": 5\n  }\n]'}
        />
      </label>

      <label style={styles.checkboxLabel}>
        <input
          type="checkbox"
          checked={contentData.allow_anonymous || false}
          onChange={e => updateContentData('allow_anonymous', e.target.checked)}
        />
        Allow anonymous responses
      </label>
    </>
  );
}

// ============================================================================
// CONTENT CONNECTIONS TAB
// ============================================================================

function ContentConnections({ connections, onRefresh, locationId }) {
  const [showAddModal, setShowAddModal] = useState(false);

  const availableConnections = [
    {
      id: 'contentful',
      name: 'Contentful',
      icon: '📄',
      description: 'Connect to your Contentful CMS',
      type: 'cms'
    },
    {
      id: 'wordpress',
      name: 'WordPress',
      icon: '📝',
      description: 'Sync content from WordPress',
      type: 'cms'
    },
    {
      id: 'airtable',
      name: 'Airtable',
      icon: '📊',
      description: 'Connect to Airtable bases',
      type: 'database'
    },
    {
      id: 'google-sheets',
      name: 'Google Sheets',
      icon: '📈',
      description: 'Sync from Google Sheets',
      type: 'spreadsheet'
    },
    {
      id: 'dropbox',
      name: 'Dropbox',
      icon: '📦',
      description: 'Sync media files from Dropbox',
      type: 'storage'
    },
    {
      id: 'youtube',
      name: 'YouTube',
      icon: '📺',
      description: 'Import videos from YouTube playlists',
      type: 'video'
    }
  ];

  const activeConnections = connections.filter(c => c.status === 'active');

  return (
    <div style={styles.tabContent}>
      <div style={styles.tabHeader}>
        <div>
          <h2>Content Connections</h2>
          <p style={styles.helpText}>
            Connect to external content sources for automatic syncing
          </p>
        </div>
        <button style={styles.btnPrimary} onClick={() => setShowAddModal(true)}>
          + Add Connection
        </button>
      </div>

      {activeConnections.length > 0 && (
        <div style={styles.connectionsSection}>
          <h3>Active Connections</h3>
          {activeConnections.map(conn => (
            <ConnectionCard key={conn.id} connection={conn} onRefresh={onRefresh} />
          ))}
        </div>
      )}

      {showAddModal && (
        <ConnectionSelector
          availableConnections={availableConnections}
          locationId={locationId}
          onClose={() => setShowAddModal(false)}
          onConnect={onRefresh}
        />
      )}
    </div>
  );
}

function ConnectionCard({ connection, onRefresh }) {
  const [syncing, setSyncing] = useState(false);

  async function handleSync() {
    setSyncing(true);
    try {
      // Trigger sync
      const { error } = await supabase.rpc('sync_content_connection', {
        connection_id: connection.id
      });

      if (error) throw error;
      alert('Sync completed successfully!');
      onRefresh();
    } catch (error) {
      console.error('Sync error:', error);
      alert('Sync failed: ' + error.message);
    } finally {
      setSyncing(false);
    }
  }

  return (
    <div style={styles.connectionCard}>
      <div style={styles.connectionHeader}>
        <div style={styles.connectionIcon}>{connection.icon || '🔌'}</div>
        <div style={{flex: 1}}>
          <h4 style={styles.connectionName}>{connection.name}</h4>
          <p style={styles.connectionMeta}>
            Last synced: {connection.last_sync_at ? new Date(connection.last_sync_at).toLocaleString() : 'Never'}
          </p>
        </div>
        <div style={styles.connectionStatus}>
          {connection.status === 'active' && <span style={styles.badgeGreen}>Active</span>}
          {connection.status === 'error' && <span style={styles.badgeRed}>Error</span>}
        </div>
      </div>

      {connection.sync_config && (
        <div style={styles.connectionConfig}>
          <strong>Sync Frequency:</strong> {connection.sync_config.frequency || 'Manual'}
        </div>
      )}

      <div style={styles.connectionFooter}>
        <button
          style={syncing ? styles.btnDisabled : styles.btnSmall}
          onClick={handleSync}
          disabled={syncing}
        >
          {syncing ? 'Syncing...' : 'Sync Now'}
        </button>
        <button style={styles.btnEdit}>Configure</button>
        <button style={styles.btnDelete}>Disconnect</button>
      </div>
    </div>
  );
}

function ConnectionSelector({ availableConnections, locationId, onClose, onConnect }) {
  const [selectedConnection, setSelectedConnection] = useState(null);

  return (
    <div style={styles.modal}>
      <div style={styles.modalContent}>
        <h3>Add Content Connection</h3>

        <div style={styles.connectionGrid}>
          {availableConnections.map(conn => (
            <div
              key={conn.id}
              style={styles.connectionOption}
              onClick={() => setSelectedConnection(conn)}
            >
              <div style={styles.connectionOptionIcon}>{conn.icon}</div>
              <h4>{conn.name}</h4>
              <p>{conn.description}</p>
              {selectedConnection?.id === conn.id && (
                <div style={styles.selectedBadge}>Selected</div>
              )}
            </div>
          ))}
        </div>

        {selectedConnection && (
          <ConnectionSetup
            connection={selectedConnection}
            locationId={locationId}
            onComplete={() => {
              onConnect();
              onClose();
            }}
            onCancel={onClose}
          />
        )}

        {!selectedConnection && (
          <div style={styles.formActions}>
            <button type="button" style={styles.btnCancel} onClick={onClose}>Cancel</button>
          </div>
        )}
      </div>
    </div>
  );
}

function ConnectionSetup({ connection, locationId, onComplete, onCancel }) {
  const [config, setConfig] = useState({});

  async function handleConnect() {
    try {
      const { error } = await supabase
        .from('content_connections')
        .insert([{
          location_id: locationId,
          connection_type: connection.id,
          name: connection.name,
          icon: connection.icon,
          status: 'active',
          sync_config: config
        }]);

      if (error) throw error;

      alert(`${connection.name} connected successfully!`);
      onComplete();
    } catch (error) {
      console.error('Connection error:', error);
      alert('Connection failed: ' + error.message);
    }
  }

  return (
    <div style={{marginTop: '30px', paddingTop: '30px', borderTop: '1px solid #e5e7eb'}}>
      <h4>Configure {connection.name}</h4>

      {connection.id === 'contentful' && (
        <ContentfulSetup config={config} setConfig={setConfig} />
      )}

      {connection.id === 'airtable' && (
        <AirtableSetup config={config} setConfig={setConfig} />
      )}

      {connection.id === 'google-sheets' && (
        <GoogleSheetsSetup config={config} setConfig={setConfig} />
      )}

      <div style={styles.formActions}>
        <button type="button" style={styles.btnCancel} onClick={onCancel}>Cancel</button>
        <button type="button" style={styles.btnSave} onClick={handleConnect}>Connect</button>
      </div>
    </div>
  );
}

function ContentfulSetup({ config, setConfig }) {
  return (
    <div style={styles.form}>
      <label style={styles.label}>
        Space ID *
        <input
          type="text"
          value={config.space_id || ''}
          onChange={e => setConfig({...config, space_id: e.target.value})}
          style={styles.input}
          required
          placeholder="abc123xyz"
        />
      </label>

      <label style={styles.label}>
        Access Token *
        <input
          type="password"
          value={config.access_token || ''}
          onChange={e => setConfig({...config, access_token: e.target.value})}
          style={styles.input}
          required
          placeholder="CFPAT-..."
        />
      </label>

      <label style={styles.label}>
        Sync Frequency
        <select
          value={config.frequency || 'hourly'}
          onChange={e => setConfig({...config, frequency: e.target.value})}
          style={styles.input}
        >
          <option value="real-time">Real-time (webhooks)</option>
          <option value="hourly">Hourly</option>
          <option value="daily">Daily</option>
          <option value="manual">Manual only</option>
        </select>
      </label>
    </div>
  );
}

function AirtableSetup({ config, setConfig }) {
  return (
    <div style={styles.form}>
      <label style={styles.label}>
        API Key *
        <input
          type="password"
          value={config.api_key || ''}
          onChange={e => setConfig({...config, api_key: e.target.value})}
          style={styles.input}
          required
          placeholder="key..."
        />
      </label>

      <label style={styles.label}>
        Base ID *
        <input
          type="text"
          value={config.base_id || ''}
          onChange={e => setConfig({...config, base_id: e.target.value})}
          style={styles.input}
          required
          placeholder="app..."
        />
      </label>

      <label style={styles.label}>
        Table Name *
        <input
          type="text"
          value={config.table_name || ''}
          onChange={e => setConfig({...config, table_name: e.target.value})}
          style={styles.input}
          required
          placeholder="Content"
        />
      </label>
    </div>
  );
}

function GoogleSheetsSetup({ config, setConfig }) {
  return (
    <div style={styles.form}>
      <label style={styles.label}>
        Spreadsheet URL *
        <input
          type="url"
          value={config.spreadsheet_url || ''}
          onChange={e => setConfig({...config, spreadsheet_url: e.target.value})}
          style={styles.input}
          required
          placeholder="https://docs.google.com/spreadsheets/d/..."
        />
      </label>

      <label style={styles.label}>
        Sheet Name
        <input
          type="text"
          value={config.sheet_name || 'Sheet1'}
          onChange={e => setConfig({...config, sheet_name: e.target.value})}
          style={styles.input}
          placeholder="Sheet1"
        />
      </label>

      <p style={styles.helpText}>
        Note: You'll need to share the spreadsheet with the EngageOS service account
      </p>
    </div>
  );
}

// ============================================================================
// CONTENT TEMPLATES TAB
// ============================================================================

function ContentTemplates({ industry, locationId }) {
  const templates = getTemplatesForIndustry(industry);

  async function useTemplate(template) {
    try {
      const { error } = await supabase
        .from('content_items')
        .insert([{
          location_id: locationId,
          title: template.title,
          content_type: template.content_type,
          description: template.description,
          content_data: template.content_data,
          status: 'draft',
          tags: template.tags || []
        }]);

      if (error) throw error;

      alert('Template added to your content library!');
    } catch (error) {
      console.error('Error using template:', error);
      alert('Error using template: ' + error.message);
    }
  }

  return (
    <div style={styles.tabContent}>
      <div style={styles.tabHeader}>
        <div>
          <h2>Content Templates</h2>
          <p style={styles.helpText}>
            Pre-built content templates for {industry || 'your industry'}
          </p>
        </div>
      </div>

      <div style={styles.templateGrid}>
        {templates.map(template => (
          <div key={template.id} style={styles.templateCard}>
            <div style={styles.templateIcon}>{template.icon}</div>
            <h4 style={styles.templateTitle}>{template.title}</h4>
            <p style={styles.templateDesc}>{template.description}</p>
            <div style={styles.templateMeta}>
              <span style={styles.badge}>{template.content_type}</span>
            </div>
            <button
              style={styles.btnPrimary}
              onClick={() => useTemplate(template)}
            >
              Use Template
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// SCHEDULED CONTENT TAB
// ============================================================================

function ScheduledContent({ locationId }) {
  const [scheduledItems, setScheduledItems] = useState([]);

  useEffect(() => {
    loadScheduled();
  }, [locationId]);

  async function loadScheduled() {
    try {
      const { data, error } = await supabase
        .from('content_items')
        .select('*')
        .eq('location_id', locationId)
        .eq('status', 'scheduled')
        .order('scheduled_publish_at', { ascending: true });

      if (error) throw error;
      setScheduledItems(data || []);
    } catch (error) {
      console.error('Error loading scheduled content:', error);
    }
  }

  return (
    <div style={styles.tabContent}>
      <h2>Scheduled Content</h2>
      <p style={styles.helpText}>
        Content that will be published automatically at a specific time
      </p>

      {scheduledItems.length === 0 ? (
        <EmptyState
          icon="📅"
          title="No scheduled content"
          description="Schedule content to be published automatically"
        />
      ) : (
        <div style={styles.scheduledList}>
          {scheduledItems.map(item => (
            <div key={item.id} style={styles.scheduledItem}>
              <div>
                <h4>{item.title}</h4>
                <p style={styles.contentMeta}>
                  Publishes: {new Date(item.scheduled_publish_at).toLocaleString()}
                </p>
              </div>
              <button style={styles.btnSmall}>Edit</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// HELPER COMPONENTS
// ============================================================================

function EmptyState({ icon, title, description, action }) {
  return (
    <div style={styles.emptyState}>
      <div style={styles.emptyIcon}>{icon}</div>
      <h3 style={styles.emptyTitle}>{title}</h3>
      <p style={styles.emptyDesc}>{description}</p>
      {action && <div style={{marginTop: '20px'}}>{action}</div>}
    </div>
  );
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function getContentIcon(type) {
  const icons = {
    video: '📹',
    image: '🖼️',
    game: '🎮',
    survey: '📝',
    menu: '🍽️',
    ad: '📢',
    announcement: '📣'
  };
  return icons[type] || '📄';
}

function getGameTemplatesForIndustry(industry) {
  const templates = {
    restaurant: [
      { id: 'food-trivia', name: 'Food Trivia' },
      { id: 'menu-memory', name: 'Menu Memory Match' },
      { id: 'chef-challenge', name: 'Chef Challenge' }
    ],
    auto: [
      { id: 'car-trivia', name: 'Car Brand Trivia' },
      { id: 'service-match', name: 'Service Match Game' },
      { id: 'safety-quiz', name: 'Safety Quiz' }
    ],
    healthcare: [
      { id: 'health-quiz', name: 'Health Knowledge Quiz' },
      { id: 'wellness-match', name: 'Wellness Match' },
      { id: 'myth-buster', name: 'Medical Myth Buster' }
    ]
  };

  return templates[industry] || [];
}

function getSurveyTemplatesForIndustry(industry) {
  const templates = {
    restaurant: [
      {
        id: 'dining-satisfaction',
        name: 'Dining Satisfaction Survey',
        questions: [
          { type: 'rating', question: 'How would you rate your overall experience?', scale: 5 },
          { type: 'rating', question: 'How was the food quality?', scale: 5 },
          { type: 'rating', question: 'How was the service?', scale: 5 },
          { type: 'text', question: 'What can we improve?' }
        ]
      }
    ],
    auto: [
      {
        id: 'service-satisfaction',
        name: 'Service Satisfaction Survey',
        questions: [
          { type: 'rating', question: 'How satisfied are you with your service?', scale: 5 },
          { type: 'yes-no', question: 'Was your vehicle ready on time?' },
          { type: 'text', question: 'Any additional feedback?' }
        ]
      }
    ]
  };

  return templates[industry] || [];
}

function getTemplatesForIndustry(industry) {
  // This would be loaded from database in production
  return [
    {
      id: 'welcome-video',
      title: 'Welcome Video',
      icon: '📹',
      content_type: 'video',
      description: 'Welcome message for new customers',
      content_data: { duration: 30, autoplay: true },
      tags: ['welcome', 'intro']
    },
    {
      id: 'daily-special-ad',
      title: 'Daily Special Ad',
      icon: '📢',
      content_type: 'ad',
      description: 'Promote your daily specials',
      content_data: {},
      tags: ['promotion', 'special']
    },
    {
      id: 'customer-survey',
      title: 'Customer Satisfaction Survey',
      icon: '📝',
      content_type: 'survey',
      description: 'Quick customer feedback survey',
      content_data: {
        questions: [
          { type: 'rating', question: 'How was your experience?', scale: 5 }
        ]
      },
      tags: ['feedback', 'survey']
    }
  ];
}

async function deleteContent(contentId, onRefresh) {
  if (!confirm('Are you sure you want to delete this content?')) return;

  try {
    const { error } = await supabase
      .from('content_items')
      .delete()
      .eq('id', contentId);

    if (error) throw error;

    alert('Content deleted successfully');
    onRefresh();
  } catch (error) {
    console.error('Error deleting content:', error);
    alert('Error deleting content: ' + error.message);
  }
}

// ============================================================================
// STYLES (reusing from MarketplaceAdmin)
// ============================================================================

const styles = {
  container: {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    padding: '20px',
    fontFamily: 'system-ui, -apple-system, sans-serif'
  },
  header: {
    textAlign: 'center',
    color: 'white',
    marginBottom: '40px'
  },
  title: {
    fontSize: '48px',
    fontWeight: 'bold',
    margin: '0 0 10px 0'
  },
  subtitle: {
    fontSize: '18px',
    opacity: 0.9,
    margin: 0
  },
  tabs: {
    display: 'flex',
    gap: '10px',
    marginBottom: '20px',
    justifyContent: 'center',
    flexWrap: 'wrap'
  },
  tab: {
    padding: '12px 24px',
    background: 'rgba(255, 255, 255, 0.2)',
    border: 'none',
    borderRadius: '8px',
    color: 'white',
    fontSize: '16px',
    cursor: 'pointer',
    transition: 'all 0.2s',
    fontWeight: '500'
  },
  tabActive: {
    padding: '12px 24px',
    background: 'white',
    border: 'none',
    borderRadius: '8px',
    color: '#667eea',
    fontSize: '16px',
    cursor: 'pointer',
    fontWeight: 'bold',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)'
  },
  content: {
    background: 'white',
    borderRadius: '12px',
    padding: '30px',
    minHeight: '600px',
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)'
  },
  tabContent: {
    width: '100%'
  },
  tabHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '30px'
  },
  helpText: {
    fontSize: '14px',
    color: '#6b7280',
    margin: '8px 0 0 0'
  },
  btnPrimary: {
    padding: '12px 24px',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '16px',
    fontWeight: 'bold',
    cursor: 'pointer',
    transition: 'transform 0.2s',
    boxShadow: '0 4px 12px rgba(102, 126, 234, 0.3)'
  },
  filterBar: {
    display: 'flex',
    gap: '8px',
    marginBottom: '24px',
    flexWrap: 'wrap'
  },
  filterBtn: {
    padding: '8px 16px',
    background: '#f3f4f6',
    border: '1px solid #e5e7eb',
    borderRadius: '6px',
    fontSize: '14px',
    cursor: 'pointer',
    transition: 'all 0.2s'
  },
  filterBtnActive: {
    padding: '8px 16px',
    background: '#667eea',
    color: 'white',
    border: '1px solid #667eea',
    borderRadius: '6px',
    fontSize: '14px',
    cursor: 'pointer',
    fontWeight: '600'
  },
  contentGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
    gap: '20px'
  },
  contentCard: {
    background: '#f9fafb',
    border: '1px solid #e5e7eb',
    borderRadius: '12px',
    padding: '20px',
    transition: 'all 0.2s'
  },
  contentCardHeader: {
    display: 'flex',
    gap: '12px',
    marginBottom: '12px'
  },
  contentIcon: {
    fontSize: '32px'
  },
  contentTitle: {
    fontSize: '16px',
    fontWeight: 'bold',
    margin: '0 0 4px 0'
  },
  contentMeta: {
    fontSize: '13px',
    color: '#6b7280',
    margin: 0
  },
  contentStatus: {
    marginLeft: 'auto'
  },
  contentDesc: {
    fontSize: '14px',
    color: '#4b5563',
    marginBottom: '12px',
    lineHeight: '1.5'
  },
  contentThumbnail: {
    width: '100%',
    height: '160px',
    objectFit: 'cover',
    borderRadius: '8px',
    marginBottom: '12px'
  },
  contentFooter: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: '12px',
    borderTop: '1px solid #e5e7eb'
  },
  contentTags: {
    display: 'flex',
    gap: '6px',
    flexWrap: 'wrap',
    flex: 1
  },
  tag: {
    fontSize: '11px',
    background: '#e0e7ff',
    color: '#4338ca',
    padding: '3px 8px',
    borderRadius: '4px',
    fontWeight: '600'
  },
  contentActions: {
    display: 'flex',
    gap: '8px'
  },
  badgeGreen: {
    fontSize: '11px',
    fontWeight: '600',
    textTransform: 'uppercase',
    background: '#d1fae5',
    color: '#065f46',
    padding: '4px 8px',
    borderRadius: '4px'
  },
  badgeGray: {
    fontSize: '11px',
    fontWeight: '600',
    textTransform: 'uppercase',
    background: '#f3f4f6',
    color: '#6b7280',
    padding: '4px 8px',
    borderRadius: '4px'
  },
  badgeBlue: {
    fontSize: '11px',
    fontWeight: '600',
    textTransform: 'uppercase',
    background: '#dbeafe',
    color: '#1e40af',
    padding: '4px 8px',
    borderRadius: '4px'
  },
  badgeRed: {
    fontSize: '11px',
    fontWeight: '600',
    textTransform: 'uppercase',
    background: '#fee2e2',
    color: '#991b1b',
    padding: '4px 8px',
    borderRadius: '4px'
  },
  badge: {
    fontSize: '11px',
    fontWeight: '600',
    textTransform: 'uppercase',
    background: '#e5e7eb',
    color: '#4b5563',
    padding: '4px 8px',
    borderRadius: '4px'
  },
  btnEdit: {
    padding: '6px 12px',
    background: '#667eea',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    fontSize: '13px',
    cursor: 'pointer',
    fontWeight: '600'
  },
  btnDelete: {
    padding: '6px 12px',
    background: '#ef4444',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    fontSize: '13px',
    cursor: 'pointer',
    fontWeight: '600'
  },
  btnSmall: {
    padding: '6px 12px',
    background: '#667eea',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    fontSize: '13px',
    cursor: 'pointer',
    fontWeight: '600'
  },
  btnDisabled: {
    padding: '6px 12px',
    background: '#d1d5db',
    color: '#6b7280',
    border: 'none',
    borderRadius: '6px',
    fontSize: '13px',
    cursor: 'not-allowed',
    fontWeight: '600'
  },
  modal: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
    padding: '20px'
  },
  modalContent: {
    background: 'white',
    borderRadius: '12px',
    padding: '30px',
    maxWidth: '900px',
    width: '100%',
    maxHeight: '90vh',
    overflow: 'auto',
    boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)'
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px'
  },
  formRow: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '20px'
  },
  label: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    fontSize: '14px',
    fontWeight: '600',
    color: '#374151'
  },
  input: {
    padding: '10px',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    fontSize: '14px',
    fontFamily: 'inherit'
  },
  checkboxLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '14px',
    fontWeight: '600',
    color: '#374151'
  },
  formActions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '12px',
    paddingTop: '20px',
    borderTop: '1px solid #e5e7eb',
    marginTop: '20px'
  },
  btnCancel: {
    padding: '10px 20px',
    background: '#f3f4f6',
    color: '#374151',
    border: 'none',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer'
  },
  btnSave: {
    padding: '10px 20px',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer'
  },
  connectionsSection: {
    marginBottom: '40px'
  },
  connectionCard: {
    background: '#f9fafb',
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
    padding: '16px',
    marginBottom: '12px'
  },
  connectionHeader: {
    display: 'flex',
    gap: '12px',
    marginBottom: '12px'
  },
  connectionIcon: {
    fontSize: '32px'
  },
  connectionName: {
    fontSize: '16px',
    fontWeight: 'bold',
    margin: '0 0 4px 0'
  },
  connectionStatus: {
    marginLeft: 'auto'
  },
  connectionConfig: {
    fontSize: '13px',
    color: '#6b7280',
    marginBottom: '12px'
  },
  connectionFooter: {
    display: 'flex',
    gap: '8px',
    paddingTop: '12px',
    borderTop: '1px solid #e5e7eb'
  },
  connectionGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
    gap: '16px',
    marginBottom: '30px'
  },
  connectionOption: {
    background: '#f9fafb',
    border: '2px solid #e5e7eb',
    borderRadius: '8px',
    padding: '20px',
    textAlign: 'center',
    cursor: 'pointer',
    transition: 'all 0.2s',
    position: 'relative'
  },
  connectionOptionIcon: {
    fontSize: '48px',
    marginBottom: '12px'
  },
  selectedBadge: {
    position: 'absolute',
    top: '8px',
    right: '8px',
    background: '#667eea',
    color: 'white',
    padding: '4px 8px',
    borderRadius: '4px',
    fontSize: '11px',
    fontWeight: '600'
  },
  templateGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
    gap: '20px'
  },
  templateCard: {
    background: '#f9fafb',
    border: '1px solid #e5e7eb',
    borderRadius: '12px',
    padding: '24px',
    textAlign: 'center'
  },
  templateIcon: {
    fontSize: '48px',
    marginBottom: '12px'
  },
  templateTitle: {
    fontSize: '18px',
    fontWeight: 'bold',
    margin: '0 0 8px 0'
  },
  templateDesc: {
    fontSize: '14px',
    color: '#6b7280',
    marginBottom: '16px',
    lineHeight: '1.5'
  },
  templateMeta: {
    marginBottom: '16px'
  },
  scheduledList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px'
  },
  scheduledItem: {
    background: '#f9fafb',
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
    padding: '16px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  emptyState: {
    textAlign: 'center',
    padding: '80px 20px',
    color: '#6b7280'
  },
  emptyIcon: {
    fontSize: '64px',
    marginBottom: '16px'
  },
  emptyTitle: {
    fontSize: '20px',
    fontWeight: 'bold',
    margin: '0 0 8px 0',
    color: '#1f2937'
  },
  emptyDesc: {
    fontSize: '14px',
    margin: 0
  }
};
