// src/components/RecentPinsTable.jsx
import React from "react"
import { titleFromSlug } from "../lib/pinsUtils"

export default function RecentPinsTable({ pins }) {
  if (!pins?.length) {
    return (
      <div style={{ padding: 20, textAlign: "center", color: "var(--muted)" }}>
        No pins yet. Try switching to Map view to browse.
      </div>
    )
  }

  return (
    <div style={{ height: "100%", overflow: "auto" }}>
      <table
        style={{
          width: "100%",
          borderCollapse: "collapse",
          fontSize: 14,
          color: "var(--fg)",
        }}
      >
        <thead
          style={{
            position: "sticky",
            top: 0,
            background: "rgba(16,17,20,0.85)",
            backdropFilter: "blur(4px)",
            WebkitBackdropFilter: "blur(4px)",
            zIndex: 1,
          }}
        >
          <tr>
            <th style={thStyle}>Guest / ID</th>
            <th style={thStyle}>Neighborhood / Region</th>
            <th style={thStyle}>Comment</th>
            <th style={thStyle}>Date</th>
          </tr>
        </thead>
        <tbody>
          {pins.map((p, i) => {
            const prettyId = titleFromSlug(p?.slug)
            const who = p?.name?.trim() || prettyId || "—"
            const where =
              p?.neighborhood?.trim() ||
              (p?.continent ? p.continent : "—")
            const note = p?.note || ""
            const date = p?.created_at
              ? new Date(p.created_at).toLocaleDateString()
              : "—"

            return (
              <tr key={p?.id || p?.slug || i} style={{ borderBottom: "1px solid #2a2f37" }}>
                <td style={tdStyle}>{who}</td>
                <td style={tdStyle}>{where}</td>
                <td style={{ ...tdStyle, maxWidth: 260, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {note}
                </td>
                <td style={tdStyle}>{date}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

const thStyle = {
  textAlign: "left",
  padding: "8px 12px",
  fontWeight: 600,
  color: "#eef3f8",
  borderBottom: "1px solid #2a2f37",
}

const tdStyle = {
  padding: "8px 12px",
  verticalAlign: "top",
  color: "var(--fg)",
}
