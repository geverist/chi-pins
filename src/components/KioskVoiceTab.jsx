// src/components/KioskVoiceTab.jsx
import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAdminSettings } from '../state/useAdminSettings'
import { DEFAULT_CUSTOM_PROMPTS } from '../config/customVoicePrompts'

export default function KioskVoiceTab() {
  const [loading, setLoading] = useState(true)
  const [settings, setSettings] = useState(null)
  const [newPrompt, setNewPrompt] = useState('')
  const [newAIInstruction, setNewAIInstruction] = useState('')
  const [newCategory, setNewCategory] = useState('general')
  const [phoneExposed, setPhoneExposed] = useState(true)
  const [editingPrompt, setEditingPrompt] = useState(null)

  const { settings: adminSettings, save: saveAdminSettings } = useAdminSettings()

  useEffect(() => {
    loadSettings()
  }, [])

  const loadSettings = async () => {
    setLoading(true)
    try {
      // Try to load existing settings
      const { data, error } = await supabase
        .from('kiosk_voice_settings')
        .select('*')
        .limit(1)
        .single()

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
        throw error
      }

      if (data) {
        setSettings(data)
      } else {
        // Create default settings
        const defaultSettings = {
          tenant_id: 'default',
          location_id: 'default',
          enabled: true,
          voice_provider: 'Browser',
          voice_name: 'Google US English (Female)',
          language: 'en-US',
          suggested_prompts: [
            "What can you help me with?",
            "Tell me about this business",
            "What are your hours?",
            "How do I get help?"
          ],
          auto_generate_prompts: true
        }

        const { data: newData, error: insertError } = await supabase
          .from('kiosk_voice_settings')
          .insert(defaultSettings)
          .select()
          .single()

        if (insertError) throw insertError
        setSettings(newData)
      }
    } catch (error) {
      console.error('Error loading kiosk voice settings:', error)
      alert('Error loading settings: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const updateSettings = async (updates) => {
    try {
      const { data, error } = await supabase
        .from('kiosk_voice_settings')
        .update(updates)
        .eq('id', settings.id)
        .select()
        .single()

      if (error) throw error
      setSettings(data)
    } catch (error) {
      console.error('Error updating settings:', error)
      alert('Error updating settings: ' + error.message)
    }
  }

  const addCustomPrompt = async () => {
    if (!newPrompt.trim()) {
      alert('Please enter prompt text')
      return
    }
    if (!newAIInstruction.trim()) {
      alert('Please enter AI instruction')
      return
    }

    const customPrompts = adminSettings.customVoicePrompts || []

    // Check if prompt already exists
    if (customPrompts.find(p => p.text.toLowerCase() === newPrompt.trim().toLowerCase())) {
      alert('This prompt already exists')
      return
    }

    const newPromptObj = {
      id: `custom-${Date.now()}`,
      text: newPrompt.trim(),
      aiInstruction: newAIInstruction.trim(),
      category: newCategory,
      enabled: true,
      phoneExposed: phoneExposed,
    }

    await saveAdminSettings({
      customVoicePrompts: [...customPrompts, newPromptObj]
    })

    setNewPrompt('')
    setNewAIInstruction('')
    setNewCategory('general')
    setPhoneExposed(true)
  }

  const updateCustomPrompt = async (id, updates) => {
    const customPrompts = adminSettings.customVoicePrompts || []
    const updated = customPrompts.map(p => p.id === id ? { ...p, ...updates } : p)
    await saveAdminSettings({ customVoicePrompts: updated })
    setEditingPrompt(null)
  }

  const removeCustomPrompt = async (id) => {
    if (!confirm('Delete this prompt?')) return
    const customPrompts = adminSettings.customVoicePrompts || []
    await saveAdminSettings({
      customVoicePrompts: customPrompts.filter(p => p.id !== id)
    })
  }

  const moveCustomPrompt = async (index, direction) => {
    const customPrompts = [...(adminSettings.customVoicePrompts || [])]
    const newIndex = direction === 'up' ? index - 1 : index + 1
    if (newIndex < 0 || newIndex >= customPrompts.length) return

    [customPrompts[index], customPrompts[newIndex]] = [customPrompts[newIndex], customPrompts[index]]
    await saveAdminSettings({ customVoicePrompts: customPrompts })
  }

  const resetToDefaults = async () => {
    if (!confirm('Reset to default prompts? This will remove all custom prompts.')) return
    await saveAdminSettings({ customVoicePrompts: DEFAULT_CUSTOM_PROMPTS })
  }

  // Legacy functions for backwards compatibility
  const addPrompt = () => {
    if (!newPrompt.trim()) {
      alert('Please enter a prompt')
      return
    }

    const prompts = settings.suggested_prompts || []
    if (prompts.includes(newPrompt.trim())) {
      alert('This prompt already exists')
      return
    }

    updateSettings({
      suggested_prompts: [...prompts, newPrompt.trim()]
    })
    setNewPrompt('')
  }

  const removePrompt = (promptToRemove) => {
    const prompts = settings.suggested_prompts || []
    updateSettings({
      suggested_prompts: prompts.filter(p => p !== promptToRemove)
    })
  }

  const movePrompt = (index, direction) => {
    const prompts = [...(settings.suggested_prompts || [])]
    const newIndex = direction === 'up' ? index - 1 : index + 1
    if (newIndex < 0 || newIndex >= prompts.length) return

    [prompts[index], prompts[newIndex]] = [prompts[newIndex], prompts[index]]
    updateSettings({ suggested_prompts: prompts })
  }

  if (loading) {
    return (
      <div style={{ padding: 20, textAlign: 'center' }}>
        <p style={{ color: '#888' }}>Loading kiosk voice assistant settings...</p>
      </div>
    )
  }

  if (!settings) {
    return (
      <div style={{ padding: 20, textAlign: 'center' }}>
        <p style={{ color: '#ef4444' }}>Error loading settings</p>
        <button onClick={loadSettings} style={btn}>Retry</button>
      </div>
    )
  }

  const browserVoices = [
    { id: 'Google US English (Female)', name: 'Google US English (Female)' },
    { id: 'Google US English (Male)', name: 'Google US English (Male)' },
    { id: 'Google UK English Female', name: 'Google UK English Female' },
    { id: 'Google UK English Male', name: 'Google UK English Male' },
    { id: 'Microsoft Zira - English (United States)', name: 'Microsoft Zira (Female)' },
    { id: 'Microsoft David - English (United States)', name: 'Microsoft David (Male)' }
  ]

  const elevenLabsVoices = [
    { id: 'adam-flash_v2_5', name: 'Adam (Male, Flash 2.5)' },
    { id: 'alice-flash_v2_5', name: 'Alice (Female, Flash 2.5)' },
    { id: 'bill-flash_v2_5', name: 'Bill (Male, Flash 2.5)' },
    { id: 'brian-flash_v2_5', name: 'Brian (Male, Flash 2.5)' },
    { id: 'callum-flash_v2_5', name: 'Callum (Male, Flash 2.5)' },
    { id: 'charlie-flash_v2_5', name: 'Charlie (Male, Flash 2.5)' }
  ]

  const googleVoices = [
    { id: 'en-US-Neural2-D', name: 'Neural2-D (Male)' },
    { id: 'en-US-Neural2-F', name: 'Neural2-F (Female)' },
    { id: 'en-US-Neural2-A', name: 'Neural2-A (Male)' },
    { id: 'en-US-Neural2-C', name: 'Neural2-C (Female)' },
    { id: 'en-US-Wavenet-D', name: 'Wavenet-D (Male)' },
    { id: 'en-US-Wavenet-F', name: 'Wavenet-F (Female)' }
  ]

  const amazonVoices = [
    { id: 'Matthew-Neural', name: 'Matthew (Male, Neural)' },
    { id: 'Joanna-Neural', name: 'Joanna (Female, Neural)' },
    { id: 'Kevin-Neural', name: 'Kevin (Male, Neural)' },
    { id: 'Salli-Neural', name: 'Salli (Female, Neural)' }
  ]

  const getVoiceOptions = () => {
    switch (settings.voice_provider) {
      case 'ElevenLabs':
        return elevenLabsVoices
      case 'Google':
        return googleVoices
      case 'Amazon':
        return amazonVoices
      case 'Browser':
      default:
        return browserVoices
    }
  }

  return (
    <div style={{ display: 'grid', gap: 12 }}>
      {/* Info Banner */}
      <div style={{ padding: 12, background: 'rgba(59, 130, 246, 0.1)', borderRadius: 6, border: '1px solid rgba(59, 130, 246, 0.3)' }}>
        <div style={{ fontSize: 13, color: '#93c5fd', marginBottom: 4 }}>
          🎤 Kiosk Voice Assistant
        </div>
        <div style={{ fontSize: 12, color: '#d1d5db' }}>
          Configure the voice assistant that appears on your kiosk touchscreen. These settings control the microphone modal and suggested prompts displayed to users.
        </div>
      </div>

      {/* Voice Configuration Card */}
      <Card title="Voice Configuration">
        <div style={{ display: 'grid', gap: 16 }}>
          {/* Enable/Disable */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ ...label, marginBottom: 2 }}>Voice Assistant</div>
              <div style={{ fontSize: 12, color: '#9ca3af' }}>Show microphone and voice prompts on kiosk</div>
            </div>
            <button
              onClick={() => updateSettings({ enabled: !settings.enabled })}
              style={{
                ...btnSmall,
                background: settings.enabled ? '#10b981' : '#6b7280',
                color: '#fff'
              }}
            >
              {settings.enabled ? '✓ Enabled' : '✗ Disabled'}
            </button>
          </div>

          {/* Voice Provider */}
          <div>
            <label style={label}>Voice Provider</label>
            <select
              value={settings.voice_provider || 'Browser'}
              onChange={(e) => {
                const provider = e.target.value
                let defaultVoice = 'Google US English (Female)'
                if (provider === 'ElevenLabs') defaultVoice = 'alice-flash_v2_5'
                else if (provider === 'Google') defaultVoice = 'en-US-Neural2-F'
                else if (provider === 'Amazon') defaultVoice = 'Joanna-Neural'

                updateSettings({
                  voice_provider: provider,
                  voice_id: defaultVoice,
                  voice_name: defaultVoice
                })
              }}
              style={selectStyle}
            >
              <option value="Browser">Browser (Free)</option>
              <option value="ElevenLabs">ElevenLabs (Premium)</option>
              <option value="Google">Google Cloud TTS</option>
              <option value="Amazon">Amazon Polly</option>
            </select>
            <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 4 }}>
              {settings.voice_provider === 'Browser' && 'Uses the browser\'s built-in speech synthesis (free, varies by browser)'}
              {settings.voice_provider === 'ElevenLabs' && 'High-quality AI voices from ElevenLabs (requires API key)'}
              {settings.voice_provider === 'Google' && 'Google Cloud Text-to-Speech (requires API key)'}
              {settings.voice_provider === 'Amazon' && 'Amazon Polly voices (requires AWS credentials)'}
            </div>
          </div>

          {/* Voice Selection */}
          <div>
            <label style={label}>Voice</label>
            <select
              value={settings.voice_id || settings.voice_name}
              onChange={(e) => {
                const selectedVoice = getVoiceOptions().find(v => v.id === e.target.value)
                updateSettings({
                  voice_id: selectedVoice.id,
                  voice_name: selectedVoice.name
                })
              }}
              style={selectStyle}
            >
              {getVoiceOptions().map(voice => (
                <option key={voice.id} value={voice.id}>{voice.name}</option>
              ))}
            </select>
          </div>

          {/* Language */}
          <div>
            <label style={label}>Language</label>
            <select
              value={settings.language || 'en-US'}
              onChange={(e) => updateSettings({ language: e.target.value })}
              style={selectStyle}
            >
              <option value="en-US">English (US)</option>
              <option value="en-GB">English (UK)</option>
              <option value="es-US">Spanish (US)</option>
              <option value="es-ES">Spanish (Spain)</option>
              <option value="fr-FR">French</option>
              <option value="de-DE">German</option>
              <option value="it-IT">Italian</option>
              <option value="pt-BR">Portuguese (Brazil)</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Custom Voice Prompts Card */}
      <Card title="Custom Voice Prompts with AI Instructions">
        <div style={{ marginBottom: 16, padding: 12, background: 'rgba(251, 191, 36, 0.1)', borderRadius: 6, border: '1px solid rgba(251, 191, 36, 0.3)' }}>
          <div style={{ fontSize: 12, color: '#fbbf24' }}>
            💡 Configure prompts that users can click or say. Each prompt has custom AI instructions that guide the assistant's response.
          </div>
        </div>

        {/* Reset to Defaults Button */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
          <button
            onClick={resetToDefaults}
            style={{
              ...btnSmall,
              background: '#8b5cf6',
              color: '#fff'
            }}
          >
            🔄 Reset to Defaults
          </button>
        </div>

        {/* Add Prompt Form */}
        <div style={{ padding: 16, background: 'rgba(255, 255, 255, 0.05)', borderRadius: 8, marginBottom: 16 }}>
          <div style={{ display: 'grid', gap: 12 }}>
            <div>
              <label style={label}>Prompt Text (What users see/say)</label>
              <input
                type="text"
                value={newPrompt}
                onChange={(e) => setNewPrompt(e.target.value)}
                placeholder="e.g., What games can I play?"
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  borderRadius: 6,
                  color: '#f3f4f6',
                  fontSize: 14
                }}
              />
            </div>

            <div>
              <label style={label}>AI Instruction (How AI should respond)</label>
              <textarea
                value={newAIInstruction}
                onChange={(e) => setNewAIInstruction(e.target.value)}
                placeholder="e.g., List available games (trivia, deep dish, popcorn wind). Offer to start one."
                rows={3}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  borderRadius: 6,
                  color: '#f3f4f6',
                  fontSize: 14,
                  fontFamily: 'inherit',
                  resize: 'vertical'
                }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={label}>Category</label>
                <select
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  style={selectStyle}
                >
                  <option value="general">General</option>
                  <option value="features">Features</option>
                  <option value="navigation">Navigation</option>
                  <option value="map-action">Map Action</option>
                </select>
              </div>

              <div style={{ display: 'flex', alignItems: 'end' }}>
                <button
                  onClick={() => setPhoneExposed(!phoneExposed)}
                  style={{
                    ...btnSmall,
                    width: '100%',
                    background: phoneExposed ? '#10b981' : '#6b7280',
                    color: '#fff'
                  }}
                >
                  {phoneExposed ? '📞 Phone Accessible' : '🚫 Kiosk Only'}
                </button>
              </div>
            </div>

            <button
              onClick={addCustomPrompt}
              style={{
                ...btn,
                background: '#10b981',
                color: '#fff',
                width: '100%'
              }}
            >
              ➕ Add Custom Prompt
            </button>
          </div>
        </div>

        {/* Prompts List */}
        {(!adminSettings.customVoicePrompts || adminSettings.customVoicePrompts.length === 0) ? (
          <p style={{ color: '#888', fontStyle: 'italic', textAlign: 'center', margin: '20px 0' }}>
            No custom prompts yet. Click "Reset to Defaults" to load default prompts, or create your own above.
          </p>
        ) : (
          <div style={{ display: 'grid', gap: 12 }}>
            {adminSettings.customVoicePrompts.map((prompt, index) => (
              <div
                key={prompt.id}
                style={{
                  padding: 12,
                  background: 'rgba(255, 255, 255, 0.05)',
                  borderRadius: 8,
                  border: '1px solid rgba(255, 255, 255, 0.1)'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'start', gap: 12, marginBottom: 8 }}>
                  {/* Order controls */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <button
                      onClick={() => moveCustomPrompt(index, 'up')}
                      disabled={index === 0}
                      style={{
                        ...btnTiny,
                        opacity: index === 0 ? 0.3 : 1
                      }}
                    >
                      ▲
                    </button>
                    <button
                      onClick={() => moveCustomPrompt(index, 'down')}
                      disabled={index === adminSettings.customVoicePrompts.length - 1}
                      style={{
                        ...btnTiny,
                        opacity: index === adminSettings.customVoicePrompts.length - 1 ? 0.3 : 1
                      }}
                    >
                      ▼
                    </button>
                  </div>

                  {/* Content */}
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', gap: 8, marginBottom: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                      <span style={{
                        padding: '2px 8px',
                        borderRadius: 4,
                        background: '#3b82f6',
                        color: '#fff',
                        fontSize: 11,
                        fontWeight: 600,
                        textTransform: 'uppercase'
                      }}>
                        {prompt.category}
                      </span>

                      {prompt.phoneExposed === false && (
                        <span style={{
                          padding: '2px 8px',
                          borderRadius: 4,
                          background: '#6b7280',
                          color: '#fff',
                          fontSize: 11
                        }}>
                          🚫 Kiosk Only
                        </span>
                      )}

                      {prompt.phoneExposed !== false && (
                        <span style={{
                          padding: '2px 8px',
                          borderRadius: 4,
                          background: '#10b981',
                          color: '#fff',
                          fontSize: 11
                        }}>
                          📞 Phone Accessible
                        </span>
                      )}
                    </div>

                    <div style={{ fontSize: 14, fontWeight: 600, color: '#f3f4f6', marginBottom: 8 }}>
                      "{prompt.text}"
                    </div>

                    <div style={{ fontSize: 12, color: '#9ca3af', marginBottom: 4 }}>AI Instruction:</div>
                    <div style={{ fontSize: 13, color: '#d1d5db', fontStyle: 'italic' }}>
                      {prompt.aiInstruction}
                    </div>
                  </div>

                  {/* Action buttons */}
                  <div style={{ display: 'flex', gap: 4 }}>
                    <button
                      onClick={() => updateCustomPrompt(prompt.id, { enabled: !prompt.enabled })}
                      style={{
                        ...btnSmall,
                        background: prompt.enabled ? '#10b981' : '#6b7280',
                        color: '#fff'
                      }}
                    >
                      {prompt.enabled ? '✓' : '✗'}
                    </button>
                    <button
                      onClick={() => removeCustomPrompt(prompt.id)}
                      style={{
                        ...btnSmall,
                        background: '#ef4444',
                        color: '#fff'
                      }}
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Preview note */}
        <div style={{ marginTop: 16, padding: 10, background: 'rgba(59, 130, 246, 0.1)', borderRadius: 6, border: '1px solid rgba(59, 130, 246, 0.3)' }}>
          <div style={{ fontSize: 11, color: '#93c5fd' }}>
            💬 These prompts scroll horizontally on the kiosk screen and are accessible via Twilio phone (if marked as phone accessible).
          </div>
        </div>
      </Card>

      {/* Integration Note */}
      <Card title="Twilio Voice Agent Integration">
        <div style={{ padding: 12, background: 'rgba(16, 185, 129, 0.1)', borderRadius: 6, border: '1px solid rgba(16, 185, 129, 0.3)' }}>
          <div style={{ fontSize: 13, color: '#10b981', marginBottom: 4 }}>
            ✓ Connected to Voice Agent
          </div>
          <div style={{ fontSize: 12, color: '#d1d5db' }}>
            When you configure your Twilio voice agent in the "Voice Agent" tab, these same prompts and voice settings will be used for incoming phone calls. This ensures a consistent experience across both kiosk touchscreen and phone interactions.
          </div>
        </div>
      </Card>
    </div>
  )
}

// Helper component
function Card({ title, children }) {
  return (
    <section style={{
      background: 'rgba(0, 0, 0, 0.3)',
      border: '1px solid rgba(255, 255, 255, 0.1)',
      borderRadius: 8,
      overflow: 'hidden'
    }}>
      <header style={{
        padding: '12px 16px',
        borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
        background: 'rgba(255, 255, 255, 0.05)'
      }}>
        <h4 style={{ margin: 0, fontSize: 14, fontWeight: 600, color: '#f3f4f6' }}>{title}</h4>
      </header>
      <div style={{ padding: 16 }}>
        {children}
      </div>
    </section>
  )
}

// Styles
const label = {
  display: 'block',
  fontSize: 12,
  color: '#9ca3af',
  marginBottom: 4,
  fontWeight: 600
}

const btn = {
  padding: '8px 16px',
  border: 'none',
  borderRadius: 6,
  fontSize: 14,
  cursor: 'pointer',
  fontWeight: 600
}

const btnSmall = {
  padding: '4px 8px',
  border: 'none',
  borderRadius: 4,
  fontSize: 11,
  cursor: 'pointer',
  fontWeight: 600
}

const btnTiny = {
  padding: '2px 6px',
  border: 'none',
  borderRadius: 3,
  fontSize: 10,
  cursor: 'pointer',
  background: 'rgba(255, 255, 255, 0.1)',
  color: '#f3f4f6'
}

const selectStyle = {
  width: '100%',
  padding: '8px 12px',
  background: 'rgba(255, 255, 255, 0.05)',
  border: '1px solid rgba(255, 255, 255, 0.2)',
  borderRadius: 6,
  color: '#f3f4f6',
  fontSize: 14,
  cursor: 'pointer'
}
