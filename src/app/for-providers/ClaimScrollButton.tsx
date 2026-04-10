'use client'

interface Props {
  className?: string
  children: React.ReactNode
}

export default function ClaimScrollButton({ className, children }: Props) {
  function handleClick() {
    document.getElementById('claim')?.scrollIntoView({ behavior: 'smooth' })
  }
  return (
    <button onClick={handleClick} className={className}>
      {children}
    </button>
  )
}
