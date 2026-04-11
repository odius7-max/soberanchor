'use client'

import StepWorkOverview from '@/components/dashboard/step-work/StepWorkOverview'

interface Props {
  userId: string
}

export default function StepWorkTab({ userId }: Props) {
  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 600, color: 'var(--navy)', margin: 0, lineHeight: 1.2 }}>
          Step Work
        </h2>
        <p style={{ fontSize: 14, color: 'var(--mid)', marginTop: 5 }}>
          AA 12-Step workbook — 16 sections, 85 prompts. Click any section to begin or continue.
        </p>
      </div>
      <StepWorkOverview userId={userId} />
    </div>
  )
}
