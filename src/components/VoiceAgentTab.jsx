// src/components/VoiceAgentTab.jsx
import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export default function VoiceAgentTab() {
  const [loading, setLoading] = useState(true)
  const [phoneNumber, setPhoneNumber] = useState(null)
  const [knowledgeBase, setKnowledgeBase] = useState([])
  const [callLogs, setCallLogs] = useState([])
  const [voicemails, setVoicemails] = useState([])
  const [prompts, setPrompts] = useState([])
  const [tools, setTools] = useState([])
  const [operators, setOperators] = useState([])
  const [transcriptions, setTranscriptions] = useState([])
  const [portingRequests, setPortingRequests] = useState([])
  const [activeSection, setActiveSection] = useState('settings') // settings, knowledge, calls, voicemails, config, prompts, tools, recording, operators, porting

  useEffect(() => {
    loadVoiceAgentData()
  }, [])

  const loadVoiceAgentData = async () => {
    setLoading(true)
    try {
      // Load phone number configuration
      const { data: phoneData } = await supabase
        .from('phone_numbers')
        .select('*')
        .single()

      setPhoneNumber(phoneData)

      // Load knowledge base
      const { data: knowledgeData } = await supabase
        .from('voice_agent_knowledge')
        .select('*')
        .order('category', { ascending: true })

      setKnowledgeBase(knowledgeData || [])

      // Load recent calls
      const { data: callsData } = await supabase
        .from('voice_calls')
        .select('*')
        .order('started_at', { ascending: false })
        .limit(20)

      setCallLogs(callsData || [])

      // Load voicemails
      const { data: voicemailData } = await supabase
        .from('voice_voicemails')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20)

      setVoicemails(voicemailData || [])

      // Load prompts
      const { data: promptsData } = await supabase
        .from('voice_prompts')
        .select('*')
        .order('prompt_key', { ascending: true })

      setPrompts(promptsData || [])

      // Load tools
      const { data: toolsData } = await supabase
        .from('voice_tools')
        .select('*')
        .order('tool_name', { ascending: true })

      setTools(toolsData || [])

      // Load operators
      const { data: operatorsData } = await supabase
        .from('intelligence_operators')
        .select('*')
        .order('operator_name', { ascending: true })

      setOperators(operatorsData || [])

      // Load recent transcriptions
      const { data: transcriptionsData } = await supabase
        .from('call_transcriptions')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20)

      setTranscriptions(transcriptionsData || [])

      // Load porting requests
      const { data: portingData } = await supabase
        .from('porting_requests')
        .select('*')
        .order('created_at', { ascending: false })

      setPortingRequests(portingData || [])
    } catch (error) {
      console.error('Error loading voice agent data:', error)
    } finally {
      setLoading(false)
    }
  }

  const addKnowledgeEntry = async () => {
    const category = prompt('Category (e.g., hours, menu, location):')
    if (!category) return

    const question = prompt('Sample question:')
    if (!question) return

    const answer = prompt('Answer:')
    if (!answer) return

    try {
      const { error } = await supabase
        .from('voice_agent_knowledge')
        .insert([{
          tenant_id: phoneNumber?.tenant_id || 'chicago-mikes',
          category,
          question,
          answer,
          enabled: true
        }])

      if (error) throw error
      await loadVoiceAgentData()
      alert('Knowledge entry added!')
    } catch (error) {
      alert(`Error: ${error.message}`)
    }
  }

  const deleteKnowledgeEntry = async (id) => {
    if (!confirm('Delete this knowledge entry?')) return

    try {
      const { error } = await supabase
        .from('voice_agent_knowledge')
        .delete()
        .eq('id', id)

      if (error) throw error
      await loadVoiceAgentData()
    } catch (error) {
      alert(`Error: ${error.message}`)
    }
  }

  const toggleKnowledgeEntry = async (id, currentEnabled) => {
    try {
      const { error } = await supabase
        .from('voice_agent_knowledge')
        .update({ enabled: !currentEnabled })
        .eq('id', id)

      if (error) throw error
      await loadVoiceAgentData()
    } catch (error) {
      alert(`Error: ${error.message}`)
    }
  }

  const updateGreeting = async () => {
    const newGreeting = prompt('Enter new greeting message:', phoneNumber?.greeting_message)
    if (!newGreeting) return

    try {
      const { error } = await supabase
        .from('phone_numbers')
        .update({ greeting_message: newGreeting })
        .eq('id', phoneNumber.id)

      if (error) throw error
      await loadVoiceAgentData()
      alert('Greeting updated!')
    } catch (error) {
      alert(`Error: ${error.message}`)
    }
  }

  if (loading) {
    return (
      <div style={{ padding: 20, textAlign: 'center' }}>
        <p style={{ color: '#888' }}>Loading voice agent data...</p>
      </div>
    )
  }

  return (
    <div style={{ display: 'grid', gap: 12 }}>
      {/* Navigation */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
        <button
          onClick={() => setActiveSection('settings')}
          style={{
            ...navBtn,
            ...(activeSection === 'settings' ? navBtnActive : {})
          }}
        >
          ⚙️ Settings
        </button>
        <button
          onClick={() => setActiveSection('knowledge')}
          style={{
            ...navBtn,
            ...(activeSection === 'knowledge' ? navBtnActive : {})
          }}
        >
          📚 Knowledge Base
        </button>
        <button
          onClick={() => setActiveSection('calls')}
          style={{
            ...navBtn,
            ...(activeSection === 'calls' ? navBtnActive : {})
          }}
        >
          📞 Call Logs ({callLogs.length})
        </button>
        <button
          onClick={() => setActiveSection('voicemails')}
          style={{
            ...navBtn,
            ...(activeSection === 'voicemails' ? navBtnActive : {})
          }}
        >
          💬 Voicemails ({voicemails.length})
        </button>
        <button
          onClick={() => setActiveSection('config')}
          style={{
            ...navBtn,
            ...(activeSection === 'config' ? navBtnActive : {})
          }}
        >
          🎙️ Voice Config
        </button>
        <button
          onClick={() => setActiveSection('prompts')}
          style={{
            ...navBtn,
            ...(activeSection === 'prompts' ? navBtnActive : {})
          }}
        >
          🌲 Prompt Tree
        </button>
        <button
          onClick={() => setActiveSection('tools')}
          style={{
            ...navBtn,
            ...(activeSection === 'tools' ? navBtnActive : {})
          }}
        >
          🔧 Tools ({tools.length})
        </button>
        <button
          onClick={() => setActiveSection('recording')}
          style={{
            ...navBtn,
            ...(activeSection === 'recording' ? navBtnActive : {})
          }}
        >
          🎙️ Recording
        </button>
        <button
          onClick={() => setActiveSection('operators')}
          style={{
            ...navBtn,
            ...(activeSection === 'operators' ? navBtnActive : {})
          }}
        >
          🤖 AI Operators ({operators.length})
        </button>
        <button
          onClick={() => setActiveSection('porting')}
          style={{
            ...navBtn,
            ...(activeSection === 'porting' ? navBtnActive : {})
          }}
        >
          📞 Number Porting ({portingRequests.length})
        </button>
      </div>

      {/* Settings Section */}
      {activeSection === 'settings' && (
        <div style={{ display: 'grid', gap: 12 }}>
          <Card title="Phone Configuration">
            {phoneNumber ? (
              <div style={{ display: 'grid', gap: 16 }}>
                <div>
                  <label style={label}>Phone Number</label>
                  <div style={value}>{phoneNumber.phone_number}</div>
                </div>

                <div>
                  <label style={label}>Status</label>
                  <div style={value}>
                    <span style={{
                      padding: '4px 8px',
                      borderRadius: 4,
                      background: phoneNumber.status === 'active' ? '#10b981' : '#ef4444',
                      color: '#fff',
                      fontSize: 12,
                      fontWeight: 600
                    }}>
                      {phoneNumber.status?.toUpperCase()}
                    </span>
                  </div>
                </div>

                <div>
                  <label style={label}>Package Tier</label>
                  <select
                    value={phoneNumber.package_tier || 'starter'}
                    onChange={async (e) => {
                      const tier = e.target.value
                      const limits = {
                        starter: 100,
                        professional: 250,
                        enterprise: 500,
                        unlimited: 999999
                      }
                      const { error } = await supabase
                        .from('phone_numbers')
                        .update({
                          package_tier: tier,
                          monthly_call_limit: limits[tier]
                        })
                        .eq('id', phoneNumber.id)
                      if (!error) await loadVoiceAgentData()
                    }}
                    style={selectStyle}
                  >
                    <option value="starter">Starter (100 calls/month - $99)</option>
                    <option value="professional">Professional (250 calls/month - $199)</option>
                    <option value="enterprise">Enterprise (500 calls/month - $349)</option>
                    <option value="unlimited">Unlimited (∞ calls - $499)</option>
                  </select>
                </div>

                <div>
                  <label style={label}>Call Usage This Month</label>
                  <div style={{ marginTop: 8 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ fontSize: 13, color: '#9ca3af' }}>
                        {phoneNumber.calls_used_this_month || 0} / {phoneNumber.monthly_call_limit || 100} calls
                      </span>
                      <span style={{ fontSize: 13, fontWeight: 600, color: phoneNumber.calls_used_this_month >= phoneNumber.monthly_call_limit ? '#ef4444' : '#10b981' }}>
                        {Math.max(0, (phoneNumber.monthly_call_limit || 100) - (phoneNumber.calls_used_this_month || 0))} remaining
                      </span>
                    </div>
                    <div style={{
                      height: 8,
                      background: 'rgba(255, 255, 255, 0.1)',
                      borderRadius: 4,
                      overflow: 'hidden'
                    }}>
                      <div style={{
                        height: '100%',
                        background: phoneNumber.calls_used_this_month >= phoneNumber.monthly_call_limit ? '#ef4444' : '#10b981',
                        width: `${Math.min(100, ((phoneNumber.calls_used_this_month || 0) / (phoneNumber.monthly_call_limit || 100)) * 100)}%`,
                        transition: 'width 0.3s'
                      }} />
                    </div>
                    <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 4 }}>
                      Billing period: {new Date(phoneNumber.billing_period_start).toLocaleDateString()} - {new Date(new Date(phoneNumber.billing_period_start).setMonth(new Date(phoneNumber.billing_period_start).getMonth() + 1)).toLocaleDateString()}
                    </div>
                  </div>
                </div>

              <div>
                <label style={label}>Greeting Message</label>
                <div style={value}>{phoneNumber.greeting_message}</div>
                <button
                  onClick={updateGreeting}
                  style={{
                    ...btn,
                    marginTop: 8,
                    background: '#3b82f6',
                    color: '#fff'
                  }}
                >
                  Edit Greeting
                </button>
              </div>

              <div>
                <label style={label}>Voice Type</label>
                <div style={value}>{phoneNumber.voice_type || 'Polly.Joanna'}</div>
              </div>

              <div>
                <label style={label}>Test Your Voice Agent</label>
                <div style={{ marginTop: 8 }}>
                  <a
                    href={`tel:${phoneNumber.phone_number}`}
                    style={{
                      ...btn,
                      background: '#10b981',
                      color: '#fff',
                      textDecoration: 'none',
                      display: 'inline-block'
                    }}
                  >
                    📞 Call Now
                  </a>
                </div>
              </div>
            </div>
          ) : (
            <p style={{ color: '#888', fontStyle: 'italic' }}>
              No phone number configured. Run the setup script first.
            </p>
          )}
        </Card>

        {phoneNumber && (
          <Card title="Call Forwarding Configuration">
            <div style={{ display: 'grid', gap: 16 }}>
              <div style={{ padding: 12, background: 'rgba(59, 130, 246, 0.1)', borderRadius: 6, border: '1px solid rgba(59, 130, 246, 0.3)' }}>
                <div style={{ fontSize: 13, color: '#93c5fd', marginBottom: 4 }}>
                  📞 What is Call Forwarding?
                </div>
                <div style={{ fontSize: 12, color: '#d1d5db' }}>
                  When the AI can't help or call limits are reached, calls can be automatically forwarded to a human staff member. Configure when and where to forward below.
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ ...label, marginBottom: 2 }}>Enable Forwarding</div>
                  <div style={{ fontSize: 12, color: '#9ca3af' }}>Allow calls to be transferred to staff</div>
                </div>
                <button
                  onClick={async () => {
                    const { error } = await supabase
                      .from('phone_numbers')
                      .update({ forwarding_enabled: !phoneNumber.forwarding_enabled })
                      .eq('id', phoneNumber.id)
                    if (!error) await loadVoiceAgentData()
                  }}
                  style={{
                    ...btnSmall,
                    background: phoneNumber.forwarding_enabled ? '#10b981' : '#6b7280',
                    color: '#fff'
                  }}
                >
                  {phoneNumber.forwarding_enabled ? '✓ Enabled' : '✗ Disabled'}
                </button>
              </div>

              {phoneNumber.forwarding_enabled && (
                <>
                  <div>
                    <label style={label}>Forwarding Phone Number</label>
                    <input
                      type="tel"
                      placeholder="+1234567890"
                      value={phoneNumber.forwarding_number || ''}
                      onChange={async (e) => {
                        const { error } = await supabase
                          .from('phone_numbers')
                          .update({ forwarding_number: e.target.value })
                          .eq('id', phoneNumber.id)
                        if (!error) await loadVoiceAgentData()
                      }}
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
                    <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 4 }}>
                      Format: +1XXXXXXXXXX (include country code)
                    </div>
                  </div>

                  <div style={{ borderTop: '1px solid rgba(255, 255, 255, 0.1)', paddingTop: 16 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#f3f4f6', marginBottom: 12 }}>
                      Forward calls when:
                    </div>

                    <div style={{ display: 'grid', gap: 12 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: 'rgba(255, 255, 255, 0.05)', borderRadius: 6 }}>
                        <div>
                          <div style={{ fontSize: 13, color: '#f3f4f6' }}>Monthly call limit reached</div>
                          <div style={{ fontSize: 11, color: '#9ca3af' }}>Forward when {phoneNumber.monthly_call_limit} calls used</div>
                        </div>
                        <button
                          onClick={async () => {
                            const { error } = await supabase
                              .from('phone_numbers')
                              .update({ forward_on_limit_reached: !phoneNumber.forward_on_limit_reached })
                              .eq('id', phoneNumber.id)
                            if (!error) await loadVoiceAgentData()
                          }}
                          style={{
                            ...btnSmall,
                            background: phoneNumber.forward_on_limit_reached ? '#10b981' : '#6b7280',
                            color: '#fff'
                          }}
                        >
                          {phoneNumber.forward_on_limit_reached ? '✓' : '✗'}
                        </button>
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: 'rgba(255, 255, 255, 0.05)', borderRadius: 6 }}>
                        <div>
                          <div style={{ fontSize: 13, color: '#f3f4f6' }}>AI unable to help</div>
                          <div style={{ fontSize: 11, color: '#9ca3af' }}>Caller requests human or AI can't answer</div>
                        </div>
                        <button
                          onClick={async () => {
                            const { error } = await supabase
                              .from('phone_numbers')
                              .update({ forward_on_unable_to_help: !phoneNumber.forward_on_unable_to_help })
                              .eq('id', phoneNumber.id)
                            if (!error) await loadVoiceAgentData()
                          }}
                          style={{
                            ...btnSmall,
                            background: phoneNumber.forward_on_unable_to_help ? '#10b981' : '#6b7280',
                            color: '#fff'
                          }}
                        >
                          {phoneNumber.forward_on_unable_to_help ? '✓' : '✗'}
                        </button>
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: 'rgba(255, 255, 255, 0.05)', borderRadius: 6 }}>
                        <div>
                          <div style={{ fontSize: 13, color: '#f3f4f6' }}>Outside business hours</div>
                          <div style={{ fontSize: 11, color: '#9ca3af' }}>Calls when restaurant is closed</div>
                        </div>
                        <button
                          onClick={async () => {
                            const { error } = await supabase
                              .from('phone_numbers')
                              .update({ forward_after_hours: !phoneNumber.forward_after_hours })
                              .eq('id', phoneNumber.id)
                            if (!error) await loadVoiceAgentData()
                          }}
                          style={{
                            ...btnSmall,
                            background: phoneNumber.forward_after_hours ? '#10b981' : '#6b7280',
                            color: '#fff'
                          }}
                        >
                          {phoneNumber.forward_after_hours ? '✓' : '✗'}
                        </button>
                      </div>
                    </div>
                  </div>

                  {!phoneNumber.forwarding_number && (
                    <div style={{ padding: 12, background: 'rgba(251, 191, 36, 0.1)', borderRadius: 6, border: '1px solid rgba(251, 191, 36, 0.3)' }}>
                      <div style={{ fontSize: 12, color: '#fbbf24' }}>
                        ⚠️ Please set a forwarding number to enable call transfers
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </Card>
        )}
      </div>
      )}

      {/* Knowledge Base Section */}
      {activeSection === 'knowledge' && (
        <Card title="Knowledge Base Management">
          <button
            onClick={addKnowledgeEntry}
            style={{
              ...btn,
              background: '#10b981',
              color: '#fff',
              marginBottom: 16,
              width: '100%'
            }}
          >
            ➕ Add Knowledge Entry
          </button>

          {knowledgeBase.length === 0 ? (
            <p style={{ color: '#888', fontStyle: 'italic', textAlign: 'center' }}>
              No knowledge entries yet. Add your first one!
            </p>
          ) : (
            <div style={{ display: 'grid', gap: 12 }}>
              {knowledgeBase.map((entry) => (
                <div
                  key={entry.id}
                  style={{
                    padding: 12,
                    background: 'rgba(255, 255, 255, 0.05)',
                    borderRadius: 8,
                    border: '1px solid rgba(255, 255, 255, 0.1)'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: 8 }}>
                    <span style={{
                      padding: '2px 8px',
                      borderRadius: 4,
                      background: '#3b82f6',
                      color: '#fff',
                      fontSize: 11,
                      fontWeight: 600,
                      textTransform: 'uppercase'
                    }}>
                      {entry.category}
                    </span>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button
                        onClick={() => toggleKnowledgeEntry(entry.id, entry.enabled)}
                        style={{
                          ...btnSmall,
                          background: entry.enabled ? '#10b981' : '#6b7280',
                          color: '#fff'
                        }}
                      >
                        {entry.enabled ? '✓ Enabled' : '✗ Disabled'}
                      </button>
                      <button
                        onClick={() => deleteKnowledgeEntry(entry.id)}
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
                  <div style={{ marginBottom: 8 }}>
                    <div style={{ fontSize: 12, color: '#9ca3af', marginBottom: 4 }}>Question:</div>
                    <div style={{ fontSize: 14, color: '#f3f4f6' }}>{entry.question}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 12, color: '#9ca3af', marginBottom: 4 }}>Answer:</div>
                    <div style={{ fontSize: 14, color: '#d1d5db' }}>{entry.answer}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {/* Call Logs Section */}
      {activeSection === 'calls' && (
        <Card title="Recent Calls">
          {callLogs.length === 0 ? (
            <p style={{ color: '#888', fontStyle: 'italic', textAlign: 'center' }}>
              No calls yet. Your voice agent is ready to receive calls!
            </p>
          ) : (
            <div style={{ display: 'grid', gap: 12 }}>
              {callLogs.map((call) => (
                <div
                  key={call.id}
                  style={{
                    padding: 12,
                    background: 'rgba(255, 255, 255, 0.05)',
                    borderRadius: 8,
                    border: '1px solid rgba(255, 255, 255, 0.1)'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                    <div style={{ fontSize: 14, fontWeight: 600 }}>
                      📞 {call.caller_number}
                    </div>
                    <div style={{ fontSize: 12, color: '#9ca3af' }}>
                      {new Date(call.started_at).toLocaleString()}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
                    {call.intent && (
                      <span style={{
                        padding: '2px 8px',
                        borderRadius: 4,
                        background: '#8b5cf6',
                        color: '#fff',
                        fontSize: 11
                      }}>
                        {call.intent}
                      </span>
                    )}
                    {call.sentiment && (
                      <span style={{
                        padding: '2px 8px',
                        borderRadius: 4,
                        background: call.sentiment === 'positive' ? '#10b981' : call.sentiment === 'negative' ? '#ef4444' : '#6b7280',
                        color: '#fff',
                        fontSize: 11
                      }}>
                        {call.sentiment}
                      </span>
                    )}
                    {call.status && (
                      <span style={{
                        padding: '2px 8px',
                        borderRadius: 4,
                        background: '#3b82f6',
                        color: '#fff',
                        fontSize: 11
                      }}>
                        {call.status}
                      </span>
                    )}
                  </div>
                  {call.conversation_transcript && (
                    <details style={{ marginTop: 8 }}>
                      <summary style={{ cursor: 'pointer', color: '#3b82f6', fontSize: 12 }}>
                        View Transcript
                      </summary>
                      <div style={{
                        marginTop: 8,
                        padding: 8,
                        background: 'rgba(0, 0, 0, 0.3)',
                        borderRadius: 4,
                        fontSize: 12,
                        color: '#d1d5db',
                        whiteSpace: 'pre-wrap'
                      }}>
                        {JSON.stringify(call.conversation_transcript, null, 2)}
                      </div>
                    </details>
                  )}
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {/* Voicemails Section */}
      {activeSection === 'voicemails' && (
        <Card title="Voicemails">
          {voicemails.length === 0 ? (
            <p style={{ color: '#888', fontStyle: 'italic', textAlign: 'center' }}>
              No voicemails yet.
            </p>
          ) : (
            <div style={{ display: 'grid', gap: 12 }}>
              {voicemails.map((vm) => (
                <div
                  key={vm.id}
                  style={{
                    padding: 12,
                    background: 'rgba(255, 255, 255, 0.05)',
                    borderRadius: 8,
                    border: '1px solid rgba(255, 255, 255, 0.1)'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                    <div style={{ fontSize: 14, fontWeight: 600 }}>
                      💬 {vm.caller_number}
                    </div>
                    <div style={{ fontSize: 12, color: '#9ca3af' }}>
                      {new Date(vm.created_at).toLocaleString()}
                    </div>
                  </div>
                  {vm.category && (
                    <span style={{
                      padding: '2px 8px',
                      borderRadius: 4,
                      background: '#f59e0b',
                      color: '#fff',
                      fontSize: 11,
                      marginBottom: 8,
                      display: 'inline-block'
                    }}>
                      {vm.category}
                    </span>
                  )}
                  {vm.transcription && (
                    <div style={{
                      padding: 8,
                      background: 'rgba(0, 0, 0, 0.3)',
                      borderRadius: 4,
                      fontSize: 13,
                      color: '#f3f4f6',
                      marginTop: 8
                    }}>
                      "{vm.transcription}"
                    </div>
                  )}
                  {vm.recording_url && (
                    <audio controls style={{ width: '100%', marginTop: 8 }}>
                      <source src={vm.recording_url} type="audio/mpeg" />
                    </audio>
                  )}
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {/* Voice Configuration Section */}
      {activeSection === 'config' && phoneNumber && (
        <div style={{ display: 'grid', gap: 12 }}>
          <Card title="Speech-to-Text (STT) Configuration">
            <div style={{ display: 'grid', gap: 16 }}>
              <div>
                <label style={label}>STT Provider</label>
                <select
                  value={phoneNumber.stt_provider || 'Deepgram'}
                  onChange={async (e) => {
                    const { error } = await supabase
                      .from('phone_numbers')
                      .update({ stt_provider: e.target.value })
                      .eq('id', phoneNumber.id)
                    if (!error) await loadVoiceAgentData()
                  }}
                  style={selectStyle}
                >
                  <option value="Deepgram">Deepgram</option>
                  <option value="Google">Google</option>
                </select>
              </div>

              <div>
                <label style={label}>Speech Model</label>
                <select
                  value={phoneNumber.stt_model || 'nova-2'}
                  onChange={async (e) => {
                    const { error } = await supabase
                      .from('phone_numbers')
                      .update({ stt_model: e.target.value })
                      .eq('id', phoneNumber.id)
                    if (!error) await loadVoiceAgentData()
                  }}
                  style={selectStyle}
                >
                  {phoneNumber.stt_provider === 'Deepgram' ? (
                    <>
                      <option value="nova-2">Nova 2 (Recommended)</option>
                      <option value="nova">Nova</option>
                      <option value="enhanced">Enhanced</option>
                      <option value="base">Base</option>
                    </>
                  ) : (
                    <>
                      <option value="telephony">Telephony (Phone optimized)</option>
                      <option value="long">Long (Extended audio)</option>
                      <option value="command_and_search">Command & Search</option>
                    </>
                  )}
                </select>
              </div>

              <div>
                <label style={label}>Language</label>
                <select
                  value={phoneNumber.stt_language || 'en-US'}
                  onChange={async (e) => {
                    const { error } = await supabase
                      .from('phone_numbers')
                      .update({ stt_language: e.target.value })
                      .eq('id', phoneNumber.id)
                    if (!error) await loadVoiceAgentData()
                  }}
                  style={selectStyle}
                >
                  <option value="en-US">English (US)</option>
                  <option value="es-US">Spanish (US)</option>
                  <option value="en-GB">English (UK)</option>
                  <option value="fr-FR">French</option>
                  <option value="de-DE">German</option>
                  <option value="it-IT">Italian</option>
                </select>
              </div>
            </div>
          </Card>

          <Card title="AI Conversation Model Configuration">
            <div style={{ display: 'grid', gap: 16 }}>
              <div style={{ padding: 12, background: 'rgba(59, 130, 246, 0.1)', borderRadius: 6, border: '1px solid rgba(59, 130, 246, 0.3)' }}>
                <div style={{ fontSize: 13, color: '#93c5fd', marginBottom: 4 }}>
                  🤖 AI Conversation Engine
                </div>
                <div style={{ fontSize: 12, color: '#d1d5db' }}>
                  Configure which AI model powers your voice agent's conversation intelligence. Different models offer varying capabilities, speeds, and costs.
                </div>
              </div>

              <div>
                <label style={label}>AI Provider</label>
                <select
                  value={phoneNumber.ai_provider || 'anthropic'}
                  onChange={async (e) => {
                    const provider = e.target.value
                    // Set default models for each provider
                    const defaultModels = {
                      anthropic: 'claude-3-5-sonnet-20241022',
                      openai: 'gpt-4o',
                      google: 'gemini-1.5-pro',
                      azure: 'gpt-4'
                    }
                    const { error } = await supabase
                      .from('phone_numbers')
                      .update({
                        ai_provider: provider,
                        ai_model: defaultModels[provider]
                      })
                      .eq('id', phoneNumber.id)
                    if (!error) await loadVoiceAgentData()
                  }}
                  style={selectStyle}
                >
                  <option value="anthropic">Anthropic (Claude)</option>
                  <option value="openai">OpenAI (GPT)</option>
                  <option value="google">Google (Gemini)</option>
                  <option value="azure">Azure OpenAI</option>
                </select>
              </div>

              <div>
                <label style={label}>AI Model</label>
                <select
                  value={phoneNumber.ai_model || 'claude-3-5-sonnet-20241022'}
                  onChange={async (e) => {
                    const { error } = await supabase
                      .from('phone_numbers')
                      .update({ ai_model: e.target.value })
                      .eq('id', phoneNumber.id)
                    if (!error) await loadVoiceAgentData()
                  }}
                  style={selectStyle}
                >
                  {phoneNumber.ai_provider === 'anthropic' && (
                    <>
                      <option value="claude-3-5-sonnet-20241022">Claude 3.5 Sonnet (Recommended)</option>
                      <option value="claude-3-opus-20240229">Claude 3 Opus (Most Capable)</option>
                      <option value="claude-3-sonnet-20240229">Claude 3 Sonnet</option>
                      <option value="claude-3-haiku-20240307">Claude 3 Haiku (Fastest)</option>
                    </>
                  )}
                  {phoneNumber.ai_provider === 'openai' && (
                    <>
                      <option value="gpt-4o">GPT-4o (Recommended)</option>
                      <option value="gpt-4o-mini">GPT-4o Mini (Fast & Affordable)</option>
                      <option value="gpt-4-turbo">GPT-4 Turbo</option>
                      <option value="gpt-4">GPT-4</option>
                      <option value="gpt-3.5-turbo">GPT-3.5 Turbo (Budget)</option>
                    </>
                  )}
                  {phoneNumber.ai_provider === 'google' && (
                    <>
                      <option value="gemini-1.5-pro">Gemini 1.5 Pro (Recommended)</option>
                      <option value="gemini-1.5-flash">Gemini 1.5 Flash (Fastest)</option>
                      <option value="gemini-pro">Gemini Pro</option>
                    </>
                  )}
                  {phoneNumber.ai_provider === 'azure' && (
                    <>
                      <option value="gpt-4">GPT-4 (Azure)</option>
                      <option value="gpt-4-turbo">GPT-4 Turbo (Azure)</option>
                      <option value="gpt-35-turbo">GPT-3.5 Turbo (Azure)</option>
                    </>
                  )}
                </select>
              </div>

              <div>
                <label style={label}>Temperature ({phoneNumber.ai_temperature || 0.7})</label>
                <input
                  type="range"
                  min="0"
                  max="2"
                  step="0.1"
                  value={phoneNumber.ai_temperature || 0.7}
                  onChange={async (e) => {
                    const { error } = await supabase
                      .from('phone_numbers')
                      .update({ ai_temperature: parseFloat(e.target.value) })
                      .eq('id', phoneNumber.id)
                    if (!error) await loadVoiceAgentData()
                  }}
                  style={{
                    width: '100%',
                    height: 8,
                    background: 'rgba(255, 255, 255, 0.1)',
                    borderRadius: 4,
                    outline: 'none',
                    cursor: 'pointer'
                  }}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#9ca3af', marginTop: 4 }}>
                  <span>0.0 (Focused)</span>
                  <span>1.0 (Balanced)</span>
                  <span>2.0 (Creative)</span>
                </div>
                <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 8 }}>
                  Lower values make responses more consistent and focused. Higher values increase creativity and variability.
                </div>
              </div>

              <div>
                <label style={label}>Max Response Tokens</label>
                <select
                  value={phoneNumber.ai_max_tokens || 1024}
                  onChange={async (e) => {
                    const { error } = await supabase
                      .from('phone_numbers')
                      .update({ ai_max_tokens: parseInt(e.target.value) })
                      .eq('id', phoneNumber.id)
                    if (!error) await loadVoiceAgentData()
                  }}
                  style={selectStyle}
                >
                  <option value="512">512 tokens (Short responses)</option>
                  <option value="1024">1024 tokens (Recommended)</option>
                  <option value="2048">2048 tokens (Detailed responses)</option>
                  <option value="4096">4096 tokens (Very detailed)</option>
                </select>
                <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 4 }}>
                  Roughly 750 tokens = 1 minute of speech
                </div>
              </div>

              <div style={{ padding: 12, background: 'rgba(251, 191, 36, 0.1)', borderRadius: 6, border: '1px solid rgba(251, 191, 36, 0.3)' }}>
                <div style={{ fontSize: 12, color: '#fbbf24', marginBottom: 4 }}>
                  💡 Model Selection Tips
                </div>
                <ul style={{ fontSize: 11, color: '#d1d5db', margin: '4px 0', paddingLeft: 20 }}>
                  <li>Claude 3.5 Sonnet: Best for natural conversations, tool use</li>
                  <li>GPT-4o: Fast, multimodal, good for complex tasks</li>
                  <li>Gemini 1.5 Pro: Long context, good for knowledge-heavy calls</li>
                  <li>Haiku/Mini/Flash: Budget-friendly, faster response times</li>
                </ul>
              </div>
            </div>
          </Card>

          <Card title="Text-to-Speech (TTS) Configuration">
            <div style={{ display: 'grid', gap: 16 }}>
              <div>
                <label style={label}>TTS Provider</label>
                <select
                  value={phoneNumber.tts_provider || 'Google'}
                  onChange={async (e) => {
                    const { error } = await supabase
                      .from('phone_numbers')
                      .update({ tts_provider: e.target.value })
                      .eq('id', phoneNumber.id)
                    if (!error) await loadVoiceAgentData()
                  }}
                  style={selectStyle}
                >
                  <option value="Google">Google</option>
                  <option value="Amazon">Amazon Polly</option>
                  <option value="ElevenLabs">ElevenLabs</option>
                </select>
              </div>

              <div>
                <label style={label}>Voice</label>
                <select
                  value={phoneNumber.tts_voice || 'en-US-Neural2-D'}
                  onChange={async (e) => {
                    const { error } = await supabase
                      .from('phone_numbers')
                      .update({ tts_voice: e.target.value })
                      .eq('id', phoneNumber.id)
                    if (!error) await loadVoiceAgentData()
                  }}
                  style={selectStyle}
                >
                  {phoneNumber.tts_provider === 'Google' && (
                    <>
                      <option value="en-US-Neural2-D">Neural2-D (Male)</option>
                      <option value="en-US-Neural2-F">Neural2-F (Female)</option>
                      <option value="en-US-Neural2-A">Neural2-A (Male)</option>
                      <option value="en-US-Neural2-C">Neural2-C (Female)</option>
                      <option value="en-US-Wavenet-D">Wavenet-D (Male)</option>
                      <option value="en-US-Wavenet-F">Wavenet-F (Female)</option>
                    </>
                  )}
                  {phoneNumber.tts_provider === 'Amazon' && (
                    <>
                      <option value="Matthew-Neural">Matthew (Male, Neural)</option>
                      <option value="Joanna-Neural">Joanna (Female, Neural)</option>
                      <option value="Kevin-Neural">Kevin (Male, Neural)</option>
                      <option value="Salli-Neural">Salli (Female, Neural)</option>
                    </>
                  )}
                  {phoneNumber.tts_provider === 'ElevenLabs' && (
                    <>
                      <option value="adam-flash_v2_5">Adam (Male, Flash 2.5)</option>
                      <option value="alice-flash_v2_5">Alice (Female, Flash 2.5)</option>
                      <option value="bill-flash_v2_5">Bill (Male, Flash 2.5)</option>
                      <option value="brian-flash_v2_5">Brian (Male, Flash 2.5)</option>
                    </>
                  )}
                </select>
              </div>

              <div>
                <label style={label}>Language</label>
                <select
                  value={phoneNumber.tts_language || 'en-US'}
                  onChange={async (e) => {
                    const { error } = await supabase
                      .from('phone_numbers')
                      .update({ tts_language: e.target.value })
                      .eq('id', phoneNumber.id)
                    if (!error) await loadVoiceAgentData()
                  }}
                  style={selectStyle}
                >
                  <option value="en-US">English (US)</option>
                  <option value="es-US">Spanish (US)</option>
                  <option value="en-GB">English (UK)</option>
                  <option value="fr-FR">French</option>
                  <option value="de-DE">German</option>
                  <option value="it-IT">Italian</option>
                </select>
              </div>
            </div>
          </Card>

          <Card title="Advanced Options">
            <div style={{ display: 'grid', gap: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ ...label, marginBottom: 2 }}>DTMF Detection</div>
                  <div style={{ fontSize: 12, color: '#9ca3af' }}>Allow callers to press phone keys</div>
                </div>
                <button
                  onClick={async () => {
                    const { error } = await supabase
                      .from('phone_numbers')
                      .update({ enable_dtmf: !phoneNumber.enable_dtmf })
                      .eq('id', phoneNumber.id)
                    if (!error) await loadVoiceAgentData()
                  }}
                  style={{
                    ...btnSmall,
                    background: phoneNumber.enable_dtmf ? '#10b981' : '#6b7280',
                    color: '#fff'
                  }}
                >
                  {phoneNumber.enable_dtmf ? '✓ Enabled' : '✗ Disabled'}
                </button>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ ...label, marginBottom: 2 }}>Interruption Handling</div>
                  <div style={{ fontSize: 12, color: '#9ca3af' }}>Allow callers to interrupt AI</div>
                </div>
                <button
                  onClick={async () => {
                    const { error } = await supabase
                      .from('phone_numbers')
                      .update({ enable_interruption: !phoneNumber.enable_interruption })
                      .eq('id', phoneNumber.id)
                    if (!error) await loadVoiceAgentData()
                  }}
                  style={{
                    ...btnSmall,
                    background: phoneNumber.enable_interruption ? '#10b981' : '#6b7280',
                    color: '#fff'
                  }}
                >
                  {phoneNumber.enable_interruption ? '✓ Enabled' : '✗ Disabled'}
                </button>
              </div>

              <div>
                <label style={label}>Conversation Mode</label>
                <select
                  value={phoneNumber.conversation_mode || 'conversationrelay'}
                  onChange={async (e) => {
                    const { error } = await supabase
                      .from('phone_numbers')
                      .update({ conversation_mode: e.target.value })
                      .eq('id', phoneNumber.id)
                    if (!error) await loadVoiceAgentData()
                  }}
                  style={selectStyle}
                >
                  <option value="conversationrelay">ConversationRelay (Full AI)</option>
                  <option value="simple">Simple (Keyword-based)</option>
                </select>
                <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 4 }}>
                  {phoneNumber.conversation_mode === 'conversationrelay'
                    ? 'Uses Claude AI for natural conversations with tool calling'
                    : 'Uses simple keyword matching (current active handler)'}
                </div>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Prompt Tree Section */}
      {activeSection === 'prompts' && (
        <Card title="Conversation Prompt Tree">
          <div style={{ marginBottom: 16, padding: 12, background: 'rgba(59, 130, 246, 0.1)', borderRadius: 6, border: '1px solid rgba(59, 130, 246, 0.3)' }}>
            <div style={{ fontSize: 13, color: '#93c5fd', marginBottom: 4 }}>
              📚 What is a Prompt Tree?
            </div>
            <div style={{ fontSize: 12, color: '#d1d5db' }}>
              Define stateful conversation flows that guide callers through your voice agent. Each prompt can link to next prompts based on user intent.
            </div>
          </div>

          {prompts.length === 0 ? (
            <p style={{ color: '#888', fontStyle: 'italic', textAlign: 'center' }}>
              No prompts configured yet. Add your first prompt to build a conversation tree!
            </p>
          ) : (
            <div style={{ display: 'grid', gap: 12 }}>
              {prompts.map((prompt) => (
                <div
                  key={prompt.id}
                  style={{
                    padding: 12,
                    background: 'rgba(255, 255, 255, 0.05)',
                    borderRadius: 8,
                    border: '1px solid rgba(255, 255, 255, 0.1)'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: 8 }}>
                    <span style={{
                      padding: '2px 8px',
                      borderRadius: 4,
                      background: '#8b5cf6',
                      color: '#fff',
                      fontSize: 11,
                      fontWeight: 600,
                      fontFamily: 'monospace'
                    }}>
                      {prompt.prompt_key}
                    </span>
                    <button
                      onClick={async () => {
                        const { error } = await supabase
                          .from('voice_prompts')
                          .update({ enabled: !prompt.enabled })
                          .eq('id', prompt.id)
                        if (!error) await loadVoiceAgentData()
                      }}
                      style={{
                        ...btnSmall,
                        background: prompt.enabled ? '#10b981' : '#6b7280',
                        color: '#fff'
                      }}
                    >
                      {prompt.enabled ? '✓ Enabled' : '✗ Disabled'}
                    </button>
                  </div>

                  {prompt.required_intent && (
                    <div style={{ fontSize: 11, color: '#9ca3af', marginBottom: 8 }}>
                      Triggered by intent: <span style={{ color: '#f59e0b', fontWeight: 600 }}>{prompt.required_intent}</span>
                    </div>
                  )}

                  <div style={{ fontSize: 14, color: '#f3f4f6', marginBottom: 8 }}>
                    "{prompt.prompt_text}"
                  </div>

                  {prompt.next_prompts && prompt.next_prompts.length > 0 && (
                    <div style={{ fontSize: 11, color: '#9ca3af' }}>
                      Next prompts: {prompt.next_prompts.join(' → ')}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {/* Tools Section */}
      {activeSection === 'tools' && (
        <Card title="Available Tools & Functions">
          <div style={{ marginBottom: 16, padding: 12, background: 'rgba(59, 130, 246, 0.1)', borderRadius: 6, border: '1px solid rgba(59, 130, 246, 0.3)' }}>
            <div style={{ fontSize: 13, color: '#93c5fd', marginBottom: 4 }}>
              🔧 What are Tools?
            </div>
            <div style={{ fontSize: 12, color: '#d1d5db' }}>
              Tools allow Claude AI to take actions during calls: search menus, check availability, calculate prices, etc. Enable/disable tools to control what the AI can do.
            </div>
          </div>

          {tools.length === 0 ? (
            <p style={{ color: '#888', fontStyle: 'italic', textAlign: 'center' }}>
              No tools configured yet.
            </p>
          ) : (
            <div style={{ display: 'grid', gap: 12 }}>
              {tools.map((tool) => (
                <div
                  key={tool.id}
                  style={{
                    padding: 12,
                    background: 'rgba(255, 255, 255, 0.05)',
                    borderRadius: 8,
                    border: '1px solid rgba(255, 255, 255, 0.1)'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: 8 }}>
                    <span style={{
                      padding: '2px 8px',
                      borderRadius: 4,
                      background: '#3b82f6',
                      color: '#fff',
                      fontSize: 11,
                      fontWeight: 600,
                      fontFamily: 'monospace'
                    }}>
                      {tool.tool_name}
                    </span>
                    <button
                      onClick={async () => {
                        const { error} = await supabase
                          .from('voice_tools')
                          .update({ enabled: !tool.enabled })
                          .eq('id', tool.id)
                        if (!error) await loadVoiceAgentData()
                      }}
                      style={{
                        ...btnSmall,
                        background: tool.enabled ? '#10b981' : '#6b7280',
                        color: '#fff'
                      }}
                    >
                      {tool.enabled ? '✓ Enabled' : '✗ Disabled'}
                    </button>
                  </div>

                  <div style={{ fontSize: 13, color: '#d1d5db', marginBottom: 8 }}>
                    {tool.tool_description}
                  </div>

                  <details style={{ marginTop: 8 }}>
                    <summary style={{ cursor: 'pointer', color: '#3b82f6', fontSize: 12 }}>
                      View Input Schema
                    </summary>
                    <pre style={{
                      marginTop: 8,
                      padding: 8,
                      background: 'rgba(0, 0, 0, 0.3)',
                      borderRadius: 4,
                      fontSize: 11,
                      color: '#d1d5db',
                      overflow: 'auto'
                    }}>
                      {JSON.stringify(tool.input_schema, null, 2)}
                    </pre>
                  </details>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {/* Recording & Transcription Section */}
      {activeSection === 'recording' && phoneNumber && (
        <div style={{ display: 'grid', gap: 12 }}>
          <Card title="Call Recording Configuration">
            <div style={{ display: 'grid', gap: 16 }}>
              <div style={{ padding: 12, background: 'rgba(59, 130, 246, 0.1)', borderRadius: 6, border: '1px solid rgba(59, 130, 246, 0.3)' }}>
                <div style={{ fontSize: 13, color: '#93c5fd', marginBottom: 4 }}>
                  🎙️ Call Recording & Transcription
                </div>
                <div style={{ fontSize: 12, color: '#d1d5db' }}>
                  Record all calls with automatic transcription and AI-powered analysis using Twilio Conversational Intelligence.
                </div>
              </div>

              <div>
                <label style={label}>Recording Package</label>
                <select
                  value={phoneNumber.recording_package_tier || 'none'}
                  onChange={async (e) => {
                    const tier = e.target.value
                    const enabled = tier !== 'none'
                    const { error } = await supabase
                      .from('phone_numbers')
                      .update({
                        recording_package_tier: tier,
                        recording_enabled: enabled,
                        transcription_enabled: enabled
                      })
                      .eq('id', phoneNumber.id)
                    if (!error) await loadVoiceAgentData()
                  }}
                  style={selectStyle}
                >
                  <option value="none">No Recording ($0/month)</option>
                  <option value="basic">Basic - 50 hours/month + transcription ($49)</option>
                  <option value="pro">Pro - 150 hours/month + basic operators ($99)</option>
                  <option value="enterprise">Enterprise - Unlimited + custom operators ($199)</option>
                </select>
              </div>

              {phoneNumber.recording_enabled && (
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ ...label, marginBottom: 2 }}>Recording Status</div>
                      <div style={{ fontSize: 12, color: '#9ca3af' }}>Recording active for all calls</div>
                    </div>
                    <span style={{
                      padding: '4px 8px',
                      borderRadius: 4,
                      background: '#10b981',
                      color: '#fff',
                      fontSize: 12,
                      fontWeight: 600
                    }}>
                      ✓ ENABLED
                    </span>
                  </div>

                  <div>
                    <label style={label}>Recording Channels</label>
                    <select
                      value={phoneNumber.recording_channels || 'dual'}
                      onChange={async (e) => {
                        const { error } = await supabase
                          .from('phone_numbers')
                          .update({ recording_channels: e.target.value })
                          .eq('id', phoneNumber.id)
                        if (!error) await loadVoiceAgentData()
                      }}
                      style={selectStyle}
                    >
                      <option value="mono">Mono (Single channel)</option>
                      <option value="dual">Dual (Separate agent/customer)</option>
                    </select>
                    <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 4 }}>
                      Dual channel provides better speaker separation for transcription
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ ...label, marginBottom: 2 }}>PII Redaction</div>
                      <div style={{ fontSize: 12, color: '#9ca3af' }}>Automatically redact sensitive information</div>
                    </div>
                    <button
                      onClick={async () => {
                        const { error } = await supabase
                          .from('phone_numbers')
                          .update({ pii_redaction: !phoneNumber.pii_redaction })
                          .eq('id', phoneNumber.id)
                        if (!error) await loadVoiceAgentData()
                      }}
                      style={{
                        ...btnSmall,
                        background: phoneNumber.pii_redaction ? '#10b981' : '#6b7280',
                        color: '#fff'
                      }}
                    >
                      {phoneNumber.pii_redaction ? '✓ Enabled' : '✗ Disabled'}
                    </button>
                  </div>

                  <div>
                    <label style={label}>Storage Retention</label>
                    <select
                      value={phoneNumber.recording_storage_days || 90}
                      onChange={async (e) => {
                        const { error } = await supabase
                          .from('phone_numbers')
                          .update({ recording_storage_days: parseInt(e.target.value) })
                          .eq('id', phoneNumber.id)
                        if (!error) await loadVoiceAgentData()
                      }}
                      style={selectStyle}
                    >
                      <option value="30">30 days</option>
                      <option value="60">60 days</option>
                      <option value="90">90 days (Recommended)</option>
                      <option value="180">180 days</option>
                      <option value="365">1 year</option>
                    </select>
                  </div>

                  {phoneNumber.intelligence_service_sid && (
                    <div style={{ padding: 12, background: 'rgba(16, 185, 129, 0.1)', borderRadius: 6, border: '1px solid rgba(16, 185, 129, 0.3)' }}>
                      <div style={{ fontSize: 12, color: '#10b981', marginBottom: 4 }}>
                        ✓ Intelligence Service Connected
                      </div>
                      <div style={{ fontSize: 11, color: '#d1d5db', fontFamily: 'monospace' }}>
                        SID: {phoneNumber.intelligence_service_sid}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </Card>

          {phoneNumber.recording_enabled && transcriptions.length > 0 && (
            <Card title="Recent Transcriptions">
              <div style={{ display: 'grid', gap: 12 }}>
                {transcriptions.map((trans) => (
                  <div
                    key={trans.id}
                    style={{
                      padding: 12,
                      background: 'rgba(255, 255, 255, 0.05)',
                      borderRadius: 8,
                      border: '1px solid rgba(255, 255, 255, 0.1)'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 600, color: '#f3f4f6' }}>
                          Call SID: {trans.call_sid}
                        </div>
                        <div style={{ fontSize: 12, color: '#9ca3af' }}>
                          {new Date(trans.created_at).toLocaleString()}
                        </div>
                      </div>
                      {trans.confidence_score && (
                        <span style={{
                          padding: '2px 8px',
                          borderRadius: 4,
                          background: trans.confidence_score > 0.8 ? '#10b981' : '#f59e0b',
                          color: '#fff',
                          fontSize: 11
                        }}>
                          {(trans.confidence_score * 100).toFixed(1)}% confidence
                        </span>
                      )}
                    </div>

                    {trans.transcript_text && (
                      <div style={{
                        padding: 8,
                        background: 'rgba(0, 0, 0, 0.3)',
                        borderRadius: 4,
                        fontSize: 13,
                        color: '#d1d5db',
                        marginBottom: 8
                      }}>
                        {trans.transcript_text.substring(0, 200)}...
                      </div>
                    )}

                    {trans.recording_url && (
                      <audio controls style={{ width: '100%', marginTop: 8 }}>
                        <source src={trans.recording_url} type="audio/mpeg" />
                      </audio>
                    )}

                    {trans.operator_results && Object.keys(trans.operator_results).length > 0 && (
                      <details style={{ marginTop: 8 }}>
                        <summary style={{ cursor: 'pointer', color: '#3b82f6', fontSize: 12 }}>
                          View AI Analysis ({Object.keys(trans.operator_results).length} operators)
                        </summary>
                        <div style={{
                          marginTop: 8,
                          padding: 8,
                          background: 'rgba(0, 0, 0, 0.3)',
                          borderRadius: 4,
                          fontSize: 12
                        }}>
                          {Object.entries(trans.operator_results).map(([key, value]) => (
                            <div key={key} style={{ padding: '4px 0', borderBottom: '1px solid rgba(255, 255, 255, 0.1)' }}>
                              <span style={{ color: '#9ca3af' }}>{key}:</span>{' '}
                              <span style={{ color: '#f3f4f6', fontWeight: 600 }}>
                                {typeof value === 'object' ? JSON.stringify(value) : value}
                              </span>
                            </div>
                          ))}
                        </div>
                      </details>
                    )}
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      )}

      {/* AI Operators Section */}
      {activeSection === 'operators' && (
        <Card title="Conversational Intelligence Operators">
          <div style={{ marginBottom: 16, padding: 12, background: 'rgba(59, 130, 246, 0.1)', borderRadius: 6, border: '1px solid rgba(59, 130, 246, 0.3)' }}>
            <div style={{ fontSize: 13, color: '#93c5fd', marginBottom: 4 }}>
              🤖 What are Language Operators?
            </div>
            <div style={{ fontSize: 12, color: '#d1d5db' }}>
              AI-powered analysis tools that extract insights from call transcripts. Use prebuilt operators or create custom generative operators with natural language instructions.
            </div>
          </div>

          {operators.length === 0 ? (
            <p style={{ color: '#888', fontStyle: 'italic', textAlign: 'center' }}>
              No operators configured yet. Operators are automatically loaded from the database.
            </p>
          ) : (
            <div style={{ display: 'grid', gap: 12 }}>
              {operators.map((op) => (
                <div
                  key={op.id}
                  style={{
                    padding: 12,
                    background: 'rgba(255, 255, 255, 0.05)',
                    borderRadius: 8,
                    border: '1px solid rgba(255, 255, 255, 0.1)'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: 8 }}>
                    <div>
                      <span style={{
                        padding: '2px 8px',
                        borderRadius: 4,
                        background: op.operator_type === 'prebuilt' ? '#8b5cf6' : '#f59e0b',
                        color: '#fff',
                        fontSize: 11,
                        fontWeight: 600,
                        marginRight: 8
                      }}>
                        {op.operator_type === 'prebuilt' ? 'PREBUILT' : 'CUSTOM'}
                      </span>
                      <span style={{ fontSize: 14, fontWeight: 600, color: '#f3f4f6' }}>
                        {op.operator_name}
                      </span>
                    </div>
                    <button
                      onClick={async () => {
                        const { error } = await supabase
                          .from('intelligence_operators')
                          .update({ enabled: !op.enabled })
                          .eq('id', op.id)
                        if (!error) await loadVoiceAgentData()
                      }}
                      style={{
                        ...btnSmall,
                        background: op.enabled ? '#10b981' : '#6b7280',
                        color: '#fff'
                      }}
                    >
                      {op.enabled ? '✓ Enabled' : '✗ Disabled'}
                    </button>
                  </div>

                  <div style={{ fontSize: 13, color: '#d1d5db', marginBottom: 8 }}>
                    {op.operator_description}
                  </div>

                  <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                    <span style={{
                      padding: '2px 6px',
                      borderRadius: 4,
                      background: 'rgba(255, 255, 255, 0.1)',
                      color: '#9ca3af',
                      fontSize: 11
                    }}>
                      Output: {op.output_type}
                    </span>
                  </div>

                  {op.instructions && (
                    <details style={{ marginTop: 8 }}>
                      <summary style={{ cursor: 'pointer', color: '#3b82f6', fontSize: 12 }}>
                        View Instructions
                      </summary>
                      <div style={{
                        marginTop: 8,
                        padding: 8,
                        background: 'rgba(0, 0, 0, 0.3)',
                        borderRadius: 4,
                        fontSize: 12,
                        color: '#d1d5db',
                        fontStyle: 'italic'
                      }}>
                        "{op.instructions}"
                      </div>
                    </details>
                  )}

                  {op.operator_sid && (
                    <div style={{ marginTop: 8, fontSize: 10, color: '#6b7280', fontFamily: 'monospace' }}>
                      SID: {op.operator_sid}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {/* Number Porting Section */}
      {activeSection === 'porting' && (
        <div style={{ display: 'grid', gap: 16 }}>
          <Card title="Number Porting Requests">
            <div style={{ marginBottom: 16, padding: 12, background: 'rgba(59, 130, 246, 0.1)', borderRadius: 6, border: '1px solid rgba(59, 130, 246, 0.3)' }}>
              <div style={{ fontSize: 13, color: '#93c5fd', marginBottom: 4 }}>
                📞 What is Number Porting?
              </div>
              <div style={{ fontSize: 12, color: '#d1d5db' }}>
                Transfer your existing business phone number to the EngageOS voice agent. The process typically takes 7-21 business days with progress notifications along the way.
              </div>
            </div>

            <button
              onClick={async () => {
                const phoneNumber = prompt('Enter phone number to port (E.164 format, e.g., +13125551234):')
                if (!phoneNumber) return

                const billingName = prompt('Billing name on current account:')
                if (!billingName) return

                const authorizedPerson = prompt('Authorized person name:')
                if (!authorizedPerson) return

                const street = prompt('Billing address - Street:')
                const city = prompt('City:')
                const state = prompt('State (2-letter code):')
                const zip = prompt('ZIP code:')

                const { error } = await supabase
                  .from('porting_requests')
                  .insert({
                    tenant_id: phoneNumber?.tenant_id || 'default',
                    phone_number: phoneNumber,
                    billing_name: billingName,
                    billing_address: { street, city, state, zip, country: 'US' },
                    authorized_person: authorizedPerson,
                    status: 'draft'
                  })

                if (error) {
                  alert('Error creating porting request: ' + error.message)
                } else {
                  alert('Porting request created! You can now submit it after adding additional details.')
                  await loadVoiceAgentData()
                }
              }}
              style={{
                padding: '12px 24px',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: 600,
                cursor: 'pointer',
                marginBottom: 16
              }}
            >
              + Start New Porting Request
            </button>

            {portingRequests.length === 0 ? (
              <p style={{ color: '#888', fontStyle: 'italic', textAlign: 'center' }}>
                No porting requests yet. Click "Start New Porting Request" to begin transferring a number.
              </p>
            ) : (
              <div style={{ display: 'grid', gap: 12 }}>
                {portingRequests.map((request) => {
                  const progressPercentage = {
                    draft: 10,
                    submitted: 25,
                    pending: 40,
                    in_progress: 70,
                    completed: 100,
                    cancelled: 0,
                    failed: 0
                  }[request.status] || 0

                  const statusColors = {
                    draft: '#6b7280',
                    submitted: '#3b82f6',
                    pending: '#f59e0b',
                    in_progress: '#8b5cf6',
                    completed: '#10b981',
                    cancelled: '#ef4444',
                    failed: '#ef4444'
                  }

                  const statusLabels = {
                    draft: 'Draft',
                    submitted: 'Submitted',
                    pending: 'Pending Carrier Approval',
                    in_progress: 'In Progress',
                    completed: 'Completed ✓',
                    cancelled: 'Cancelled',
                    failed: 'Failed'
                  }

                  return (
                    <div
                      key={request.id}
                      style={{
                        padding: 16,
                        background: 'rgba(255, 255, 255, 0.05)',
                        borderRadius: 8,
                        border: '1px solid rgba(255, 255, 255, 0.1)'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: 12 }}>
                        <div>
                          <div style={{ fontSize: 16, fontWeight: 600, color: '#f3f4f6', marginBottom: 4 }}>
                            {request.phone_number}
                          </div>
                          <div style={{ fontSize: 12, color: '#9ca3af' }}>
                            Requested: {new Date(request.created_at).toLocaleDateString()}
                          </div>
                        </div>
                        <span style={{
                          padding: '4px 12px',
                          borderRadius: 6,
                          background: statusColors[request.status] || '#6b7280',
                          color: '#fff',
                          fontSize: 12,
                          fontWeight: 600
                        }}>
                          {statusLabels[request.status] || request.status}
                        </span>
                      </div>

                      {/* Progress Bar */}
                      <div style={{ marginBottom: 12 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                          <span style={{ fontSize: 11, color: '#9ca3af' }}>Progress</span>
                          <span style={{ fontSize: 11, color: '#9ca3af', fontWeight: 600 }}>{progressPercentage}%</span>
                        </div>
                        <div style={{
                          width: '100%',
                          height: 6,
                          background: 'rgba(255, 255, 255, 0.1)',
                          borderRadius: 3,
                          overflow: 'hidden'
                        }}>
                          <div style={{
                            width: `${progressPercentage}%`,
                            height: '100%',
                            background: statusColors[request.status] || '#6b7280',
                            transition: 'width 0.3s ease'
                          }} />
                        </div>
                      </div>

                      {/* Details */}
                      <div style={{ display: 'grid', gap: 8, marginBottom: 12 }}>
                        <div style={{ fontSize: 12, color: '#d1d5db' }}>
                          <strong style={{ color: '#9ca3af' }}>Billing Name:</strong> {request.billing_name}
                        </div>
                        {request.current_carrier && (
                          <div style={{ fontSize: 12, color: '#d1d5db' }}>
                            <strong style={{ color: '#9ca3af' }}>Current Carrier:</strong> {request.current_carrier}
                          </div>
                        )}
                        {request.estimated_completion_date && (
                          <div style={{ fontSize: 12, color: '#d1d5db' }}>
                            <strong style={{ color: '#9ca3af' }}>Est. Completion:</strong> {new Date(request.estimated_completion_date).toLocaleDateString()}
                          </div>
                        )}
                      </div>

                      {/* Notifications */}
                      {request.notifications && request.notifications.length > 0 && (
                        <details style={{ marginTop: 12 }}>
                          <summary style={{ cursor: 'pointer', color: '#3b82f6', fontSize: 12, fontWeight: 600 }}>
                            View Progress Updates ({request.notifications.length})
                          </summary>
                          <div style={{ marginTop: 8, display: 'grid', gap: 6 }}>
                            {request.notifications.slice(-5).reverse().map((notif, idx) => (
                              <div
                                key={idx}
                                style={{
                                  padding: 8,
                                  background: 'rgba(0, 0, 0, 0.3)',
                                  borderRadius: 4,
                                  borderLeft: '3px solid #3b82f6'
                                }}
                              >
                                <div style={{ fontSize: 11, color: '#9ca3af', marginBottom: 2 }}>
                                  {new Date(notif.timestamp).toLocaleString()}
                                </div>
                                <div style={{ fontSize: 12, color: '#d1d5db' }}>
                                  {notif.message}
                                </div>
                              </div>
                            ))}
                          </div>
                        </details>
                      )}

                      {/* Actions */}
                      <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                        {request.status === 'draft' && (
                          <button
                            onClick={async () => {
                              const carrier = prompt('Current carrier name:')
                              const accountNumber = prompt('Account number with current carrier:')

                              const { error } = await supabase
                                .from('porting_requests')
                                .update({
                                  current_carrier: carrier,
                                  account_number: accountNumber,
                                  status: 'submitted'
                                })
                                .eq('id', request.id)

                              if (!error) {
                                // Add status update
                                await supabase.rpc('add_porting_status_update', {
                                  p_request_id: request.id,
                                  p_status: 'submitted',
                                  p_message: 'Porting request submitted to carrier'
                                })
                                await loadVoiceAgentData()
                              }
                            }}
                            style={{
                              ...btnSmall,
                              background: '#10b981',
                              color: '#fff'
                            }}
                          >
                            Submit Request
                          </button>
                        )}
                        {request.status !== 'completed' && request.status !== 'cancelled' && (
                          <button
                            onClick={async () => {
                              if (!confirm('Cancel this porting request?')) return

                              const { error } = await supabase
                                .from('porting_requests')
                                .update({ status: 'cancelled' })
                                .eq('id', request.id)

                              if (!error) await loadVoiceAgentData()
                            }}
                            style={{
                              ...btnSmall,
                              background: '#ef4444',
                              color: '#fff'
                            }}
                          >
                            Cancel
                          </button>
                        )}
                        {request.port_in_request_sid && (
                          <div style={{
                            flex: 1,
                            fontSize: 10,
                            color: '#6b7280',
                            fontFamily: 'monospace',
                            display: 'flex',
                            alignItems: 'center'
                          }}>
                            SID: {request.port_in_request_sid}
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </Card>
        </div>
      )}
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
const navBtn = {
  padding: '8px 16px',
  background: 'rgba(255, 255, 255, 0.05)',
  border: '1px solid rgba(255, 255, 255, 0.1)',
  borderRadius: 6,
  color: '#9ca3af',
  fontSize: 13,
  cursor: 'pointer',
  transition: 'all 0.2s'
}

const navBtnActive = {
  background: '#3b82f6',
  color: '#fff',
  border: '1px solid #3b82f6'
}

const label = {
  display: 'block',
  fontSize: 12,
  color: '#9ca3af',
  marginBottom: 4,
  fontWeight: 600
}

const value = {
  fontSize: 14,
  color: '#f3f4f6'
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
