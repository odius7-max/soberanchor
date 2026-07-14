import CrisisStrip from '@/components/find/CrisisStrip'

export default function FindLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <CrisisStrip />
      {children}
    </>
  )
}
