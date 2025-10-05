export default function TeamCount({ pins, selectedTeam, onTeamSelect }){
  const counts = pins.reduce((a,p)=> {
    const team = p.team || 'none';
    a[team] = (a[team] || 0) + 1;
    return a;
  }, {cubs:0, whitesox:0, none:0})

  const buttonStyle = (team) => ({
    padding: '6px 12px',
    borderRadius: 6,
    border: selectedTeam === team ? '2px solid #0ea5e9' : '1px solid #2a2f37',
    background: selectedTeam === team ? 'rgba(14, 165, 233, 0.2)' : 'transparent',
    cursor: 'pointer',
    fontWeight: selectedTeam === team ? 600 : 400,
    transition: 'all 0.2s',
  });

  const handleCubsClick = () => {
    const newValue = selectedTeam === 'cubs' ? null : 'cubs';
    console.log('[TeamCount] Cubs clicked. Current:', selectedTeam, '→ New:', newValue);
    onTeamSelect(newValue);
  };

  const handleSoxClick = () => {
    const newValue = selectedTeam === 'whitesox' ? null : 'whitesox';
    console.log('[TeamCount] White Sox clicked. Current:', selectedTeam, '→ New:', newValue);
    onTeamSelect(newValue);
  };

  return (
    <div className="counts" style={{ display:'flex', gap:12, flexWrap:'wrap' }}>
      <button
        onClick={handleCubsClick}
        style={buttonStyle('cubs')}
      >
        🔵 Cubs: {counts.cubs}
      </button>
      <button
        onClick={handleSoxClick}
        style={buttonStyle('whitesox')}
      >
        ⚪ White Sox: {counts.whitesox}
      </button>
      {selectedTeam === null && (
        <span style={{
          padding: '6px 12px',
          color: '#10b981',
          fontSize: 14,
          fontWeight: 600,
          alignSelf: 'center'
        }}>
          ✓ Showing all teams
        </span>
      )}
    </div>
  )
}
