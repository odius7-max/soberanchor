'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

interface Meeting { id:string; name:string; day_of_week:string|null; start_time:string|null; format:string; location_name:string|null; city:string|null; fellowships:{abbreviation:string|null}|null }

const FC: Record<string,{bg:string;color:string}> = {
  AA:{bg:'rgba(0,51,102,0.07)',color:'#003366'},NA:{bg:'rgba(42,138,153,0.08)',color:'#2A8A99'},
  GA:{bg:'rgba(155,89,182,0.08)',color:'#8E44AD'},SMART:{bg:'rgba(39,174,96,0.08)',color:'#27AE60'},
  'Al-Anon':{bg:'rgba(212,165,116,0.12)',color:'#9A7B54'},
}

function fmtTime(t:string|null){
  if(!t)return ''
  const[h,m]=t.split(':'); const hour=parseInt(h); const ampm=hour>=12?'PM':'AM'; const h12=hour%12||12
  return `${h12}:${m} ${ampm}`
}

interface Props { userId: string }

export default function MeetingCheckin({ userId }: Props) {
  const router = useRouter()
  const [meetings, setMeetings] = useState<Meeting[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('All')
  const [logged, setLogged] = useState<Set<string>>(new Set())
  const [logging, setLogging] = useState<string|null>(null)

  useEffect(()=>{
    const supabase = createClient()
    supabase.from('meetings').select('id,name,day_of_week,start_time,format,location_name,city,fellowships(abbreviation)').order('day_of_week').order('start_time')
      .then(({data})=>{ setMeetings((data as unknown as Meeting[])??[]); setLoading(false) })
  },[])

  async function handleCheckin(m: Meeting) {
    setLogging(m.id)
    const supabase = createClient()
    await supabase.from('meeting_attendance').insert({
      user_id: userId, meeting_id: m.id, meeting_name: m.name,
      fellowship_name: m.fellowships?.abbreviation??null, location_name: m.location_name, checkin_method: 'directory',
    })
    setLogged(prev=>new Set([...prev,m.id])); setLogging(null); router.refresh()
  }

  const fellowships=['All',...Array.from(new Set(meetings.map(m=>m.fellowships?.abbreviation).filter(Boolean) as string[]))]
  const filtered = filter==='All' ? meetings : meetings.filter(m=>m.fellowships?.abbreviation===filter)

  return (
    <div>
      <div className="rounded-[20px] overflow-hidden mb-5 relative" style={{background:'linear-gradient(145deg,#002244 0%,#003366 50%,#1a4a5e 100%)',padding:'28px 32px'}}>
        <svg aria-hidden="true" className="absolute bottom-0 left-0 right-0 pointer-events-none" viewBox="0 0 900 80" fill="none" preserveAspectRatio="none" style={{height:'80px',width:'100%',opacity:0.05}}>
          <path d="M0 40 Q225 0 450 40 Q675 80 900 40 L900 80 L0 80Z" fill="#fff"/>
        </svg>
        <div className="relative">
          <div style={{color:'rgba(255,255,255,0.5)',fontSize:'11px',fontWeight:700,letterSpacing:'2.5px',textTransform:'uppercase',marginBottom:'6px'}}>Meeting Finder</div>
          <div className="font-semibold text-white" style={{fontFamily:'var(--font-display)',fontSize:'24px',marginBottom:'4px'}}>Find a meeting</div>
          <div style={{color:'rgba(255,255,255,0.55)',fontSize:'14px'}}>Tap &quot;I Was Here&quot; to auto-log attendance to your dashboard.</div>
        </div>
      </div>

      <div className="flex gap-2 flex-wrap mb-5">
        {fellowships.map(f=>(
          <button key={f} onClick={()=>setFilter(f)} className="rounded-full font-semibold transition-colors"
            style={{fontSize:'13px',padding:'6px 14px',cursor:'pointer',background:filter===f?'var(--navy)':'var(--warm-gray)',border:filter===f?'1.5px solid var(--navy)':'1.5px solid var(--border)',color:filter===f?'#fff':'var(--dark)'}}>
            {f}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-12 text-mid" style={{fontSize:'14px'}}>Loading meetings…</div>
      ) : filtered.length===0 ? (
        <div className="text-center py-12 text-mid" style={{fontSize:'14px'}}>No meetings found for this filter.</div>
      ) : (
        <div style={{display:'flex',flexDirection:'column',gap:'10px'}}>
          {filtered.map(m=>{
            const abbr=m.fellowships?.abbreviation??null
            const fc=abbr?(FC[abbr]??FC.AA):FC.AA
            const isLogged=logged.has(m.id)
            const fmtBadge=m.format==='online'?{label:'Online',bg:'rgba(39,174,96,0.08)',color:'#27AE60'}:m.format==='hybrid'?{label:'Hybrid',bg:'rgba(212,165,116,0.1)',color:'#9A7B54'}:{label:'In-Person',bg:'rgba(42,138,153,0.08)',color:'#2A8A99'}
            return(
              <div key={m.id} className="rounded-[16px] p-5 flex items-start gap-4 bg-white border border-[var(--border)]">
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-navy mb-1" style={{fontSize:'15px'}}>{m.name}</div>
                  <div className="flex gap-2 flex-wrap mb-2">
                    {abbr&&<span className="rounded-full font-bold" style={{fontSize:'11px',padding:'2px 9px',background:fc.bg,color:fc.color}}>{abbr}</span>}
                    <span className="rounded-full font-semibold" style={{fontSize:'11px',padding:'2px 9px',background:fmtBadge.bg,color:fmtBadge.color}}>{fmtBadge.label}</span>
                  </div>
                  <div className="text-mid" style={{fontSize:'13px'}}>
                    {m.day_of_week&&<span>{m.day_of_week}</span>}
                    {m.start_time&&<span>{m.day_of_week?' · ':''}{fmtTime(m.start_time)}</span>}
                    {(m.location_name||m.city)&&<span>{(m.day_of_week||m.start_time)?' · ':''}{m.location_name??m.city}</span>}
                  </div>
                </div>
                <button onClick={()=>!isLogged&&handleCheckin(m)} disabled={logging===m.id||isLogged} className="rounded-xl font-semibold flex-shrink-0 transition-all"
                  style={{fontSize:'13px',padding:'8px 16px',cursor:isLogged?'default':'pointer',background:isLogged?'rgba(39,174,96,0.1)':'var(--navy)',border:isLogged?'1.5px solid rgba(39,174,96,0.3)':'1.5px solid var(--navy)',color:isLogged?'#27AE60':'#fff',opacity:logging===m.id?0.7:1}}>
                  {isLogged?'✓ Logged':logging===m.id?'…':'I Was Here'}
                </button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
