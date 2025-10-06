// src/components/KioskVoiceTab.jsx
import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export default function KioskVoiceTab() {
  const [loading, setLoading] = useState(true)
  const [settings, setSettings] = useState(null)
  const [newPrompt, setNewPrompt] = useState('')

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

      {/* Suggested Prompts Card */}
      <Card title="Suggested Prompts">
        <div style={{ marginBottom: 16, padding: 12, background: 'rgba(251, 191, 36, 0.1)', borderRadius: 6, border: '1px solid rgba(251, 191, 36, 0.3)' }}>
          <div style={{ fontSize: 12, color: '#fbbf24' }}>
            💡 These prompts scroll horizontally below the microphone. They suggest what users can say to interact with the voice assistant.
          </div>
        </div>

        {/* Auto-generate toggle */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div>
            <div style={{ ...label, marginBottom: 2 }}>Auto-generate from Features</div>
            <div style={{ fontSize: 12, color: '#9ca3af' }}>Automatically add prompts based on enabled kiosk features</div>
          </div>
          <button
            onClick={() => updateSettings({ auto_generate_prompts: !settings.auto_generate_prompts })}
            style={{
              ...btnSmall,
              background: settings.auto_generate_prompts ? '#10b981' : '#6b7280',
              color: '#fff'
            }}
          >
            {settings.auto_generate_prompts ? '✓ Enabled' : '✗ Disabled'}
          </button>
        </div>

        {/* Add Prompt */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          <input
            type="text"
            value={newPrompt}
            onChange={(e) => setNewPrompt(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && addPrompt()}
            placeholder="e.g., What are today's specials?"
            style={{
              flex: 1,
              padding: '8px 12px',
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              borderRadius: 6,
              color: '#f3f4f6',
              fontSize: 14
            }}
          />
          <button
            onClick={addPrompt}
            style={{
              ...btn,
              background: '#10b981',
              color: '#fff'
            }}
          >
            ➕ Add
          </button>
        </div>

        {/* Prompts List */}
        {!settings.suggested_prompts || settings.suggested_prompts.length === 0 ? (
          <p style={{ color: '#888', fontStyle: 'italic', textAlign: 'center', margin: '20px 0' }}>
            No prompts added yet. Add your first prompt above!
          </p>
        ) : (
          <div style={{ display: 'grid', gap: 8 }}>
            {settings.suggested_prompts.map((prompt, index) => (
              <div
                key={index}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '10px 12px',
                  background: 'rgba(255, 255, 255, 0.05)',
                  borderRadius: 8,
                  border: '1px solid rgba(255, 255, 255, 0.1)'
                }}
              >
                {/* Order controls */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <button
                    onClick={() => movePrompt(index, 'up')}
                    disabled={index === 0}
                    style={{
                      ...btnTiny,
                      opacity: index === 0 ? 0.3 : 1
                    }}
                  >
                    ▲
                  </button>
                  <button
                    onClick={() => movePrompt(index, 'down')}
                    disabled={index === settings.suggested_prompts.length - 1}
                    style={{
                      ...btnTiny,
                      opacity: index === settings.suggested_prompts.length - 1 ? 0.3 : 1
                    }}
                  >
                    ▼
                  </button>
                </div>

                {/* Prompt text */}
                <div style={{ flex: 1, fontSize: 14, color: '#f3f4f6' }}>
                  {prompt}
                </div>

                {/* Delete button */}
                <button
                  onClick={() => removePrompt(prompt)}
                  style={{
                    ...btnSmall,
                    background: '#ef4444',
                    color: '#fff'
                  }}
                >
                  🗑️
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Preview note */}
        <div style={{ marginTop: 16, padding: 10, background: 'rgba(59, 130, 246, 0.1)', borderRadius: 6, border: '1px solid rgba(59, 130, 246, 0.3)' }}>
          <div style={{ fontSize: 11, color: '#93c5fd' }}>
            💬 Preview: These prompts will scroll horizontally on the kiosk screen when users open the voice assistant.
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
