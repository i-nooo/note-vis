export default function Legend() {
  const item = (color: string, label: string) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <span
        style={{
          width: 12,
          height: 12,
          borderRadius: 6,
          background: color,
          display: 'inline-block',
        }}
      />
      <span>{label}</span>
    </div>
  )
  return (
    <div
      style={{
        display: 'flex',
        gap: 16,
        alignItems: 'center',
        fontSize: 12,
        color: '#444',
      }}
    >
      {item('#6baed6', '노트')}
      {item('#969696', '태그(#)')}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <svg width="24" height="8">
          <line x1="0" y1="4" x2="24" y2="4" stroke="#999" strokeWidth="2" />
        </svg>
        <span>mention</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <svg width="24" height="8">
          <line
            x1="0"
            y1="4"
            x2="24"
            y2="4"
            stroke="#bbb"
            strokeDasharray="3 3"
            strokeWidth="2"
          />
        </svg>
        <span>tag</span>
      </div>
    </div>
  )
}
