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
      </div>
      <StepWorkOverview userId={userId} />
    </div>
  )
}
