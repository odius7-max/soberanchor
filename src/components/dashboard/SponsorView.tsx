'use client'

const STEPS = ['Powerlessness','Hope','Decision','Inventory','Admission','Readiness','Humility','Amends List','Amends','Daily Inventory','Spiritual Growth','Service']
const MILESTONES = [7,14,21,30,60,90,120,180,270,365,500,730]
const MOOD_META: Record<string,{emoji:string;label:string;color:string}> = {
  great:{emoji:'😊',label:'great',color:'#27AE60'},good:{emoji:'🙂',label:'good',color:'#2A8A99'},
  okay:{emoji:'😐',label:'okay',color:'#D4A574'},struggling:{emoji:'😔',label:'struggling',color:'#E67E22'},
  crisis:{emoji:'😰',label:'crisis',color:'#C0392B'},
}

interface Sponsee { id:string; name:string; sobrietyDate:string|null; currentStep:number; lastMood:string|null; lastCheckInDate:string|null; pendingReviews:number }
interface Props { sponsees: Sponsee[] }

function calcDays(d:string|null):number|null { if(!d)return null; return Math.floor((Date.now()-new Date(d+'T00:00:00').getTime())/(86400000)) }
function relDate(d:string|null):string {
  if(!d)return 'never'
  const days=Math.floor((Date.now()-new Date(d+'T00:00:00').getTime())/(86400000))
  if(days===0)return 'Today'; if(days===1)return 'Yesterday'; return `${days} days ago`
}

export default function SponsorView({ sponsees }: Props) {
  const pendingTotal = sponsees.reduce((s,sp)=>s+sp.pendingReviews,0)
  const checkInsToday = sponsees.filter(sp=>sp.lastCheckInDate===new Date().toISOString().slice(0,10)).length
  const needsAttention = sponsees.filter(sp=>sp.lastMood==='struggling'||sp.lastMood==='crisis'||sp.pendingReviews>0)
  const upcoming = sponsees.flatMap(sp=>{
    const days=calcDays(sp.sobrietyDate); if(days===null)return []
    const next=MILESTONES.find(m=>m>days); if(!next)return []
    const away=next-days; if(away>60)return []
    return [{name:sp.name,milestone:next,daysAway:away,sobrietyDate:sp.sobrietyDate}]
  })

  return (
    <div>
      {upcoming.length>0&&(
        <div className="rounded-[16px] p-5 mb-5" style={{background:'rgba(212,165,116,0.08)',border:'1px solid rgba(212,165,116,0.25)'}}>
          <div className="font-bold text-navy mb-3" style={{fontSize:'15px'}}>🎉 Upcoming Milestones</div>
          {upcoming.map((u,i)=>(
            <div key={i} className="flex justify-between items-center flex-wrap gap-2" style={{borderTop:i>0?'1px solid rgba(212,165,116,0.15)':'none',paddingTop:i>0?'10px':'0',marginTop:i>0?'10px':'0'}}>
              <div style={{fontSize:'14px',color:'var(--dark)'}}>
                <strong className="text-navy">{u.name}</strong> hits <strong style={{color:'#D4A574'}}>{u.milestone} Days</strong> in {u.daysAway} day{u.daysAway!==1?'s':''}
                {u.sobrietyDate&&<span className="text-mid" style={{fontSize:'13px'}}> · Sober since {new Date(u.sobrietyDate+'T00:00:00').toLocaleDateString('en-US',{month:'long',day:'numeric',year:'numeric'})}</span>}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="flex gap-4 mb-5 flex-wrap">
        {[
          {label:'Active Sponsees',val:sponsees.length,style:{background:'linear-gradient(135deg,#003366,#1a4a5e)'},valStyle:{color:'#fff'}},
          {label:'Pending Reviews',val:pendingTotal,style:{background:'#fff',border:'1px solid var(--border)'},valStyle:{color:'#D4A574'}},
          {label:'Checked In Today',val:checkInsToday,style:{background:'#fff',border:'1px solid var(--border)'},valStyle:{color:'#2A8A99'}},
        ].map(s=>(
          <div key={s.label} className="rounded-[14px] flex-1" style={{minWidth:'140px',padding:'22px 24px',...s.style}}>
            <div style={{color:s.style.background==='#fff'?'var(--mid)':'rgba(255,255,255,0.5)',fontSize:'12px',fontWeight:700,letterSpacing:'2px',textTransform:'uppercase'}}>
              {s.label}
            </div>
            <div className="font-bold" style={{fontFamily:'var(--font-display)',fontSize:'40px',letterSpacing:'-1.0px',marginTop:'4px',...s.valStyle}}>{s.val}</div>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between mb-3">
        <h3 className="font-bold text-navy" style={{fontSize:'15px'}}>Your Sponsees</h3>
        <button className="font-semibold text-white rounded-lg hover:bg-navy-dark transition-colors" style={{fontSize:'13px',padding:'8px 16px',background:'var(--navy)',border:'none',cursor:'pointer'}}>+ Add Sponsee</button>
      </div>

      {sponsees.length===0?(
        <div className="card-hover rounded-[16px] p-8 text-center mb-5 bg-white border border-[var(--border)]">
          <div style={{fontSize:'36px',marginBottom:'10px'}}>👥</div>
          <div className="font-semibold text-navy mb-1" style={{fontSize:'16px'}}>No active sponsees yet</div>
          <div className="text-mid" style={{fontSize:'14px'}}>Click &quot;Add Sponsee&quot; to connect with someone you&apos;re sponsoring.</div>
        </div>
      ):(
        <div style={{display:'flex',flexDirection:'column',gap:'12px',marginBottom:'20px'}}>
          {sponsees.map(sp=>{
            const days=calcDays(sp.sobrietyDate)
            const mood=sp.lastMood?MOOD_META[sp.lastMood]:null
            const pct=((sp.currentStep-1)/11)*100
            return(
              <div key={sp.id} className="card-hover rounded-[16px] p-5 bg-white border border-[var(--border)]">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center rounded-xl font-bold text-white flex-shrink-0" style={{width:'40px',height:'40px',background:'linear-gradient(135deg,#2A8A99,#003366)',fontSize:'16px'}}>
                      {sp.name[0]?.toUpperCase()?? '?'}
                    </div>
                    <div>
                      <div className="font-bold text-navy" style={{fontSize:'15px'}}>{sp.name}</div>
                      <div className="text-mid" style={{fontSize:'12px',marginTop:'1px'}}>{days!==null?`${days} days sober`:'No sobriety date'} · Step {sp.currentStep}: {STEPS[sp.currentStep-1]}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {mood&&<span title={`Last mood: ${mood.label}`}>{mood.emoji}</span>}
                    {sp.pendingReviews>0&&(
                      <span className="rounded-full font-bold text-white" style={{fontSize:'11px',padding:'2px 8px',background:'#D4A574',minWidth:'20px',textAlign:'center'}}>{sp.pendingReviews}</span>
                    )}
                  </div>
                </div>
                <div className="mb-3">
                  <div className="flex justify-between mb-1.5" style={{fontSize:'11px',color:'var(--mid)'}}>
                    <span>Step {sp.currentStep} of 12</span><span>{Math.round(pct)}% complete</span>
                  </div>
                  <div className="rounded-full overflow-hidden" style={{height:'6px',background:'var(--warm-gray)'}}>
                    <div className="rounded-full h-full" style={{width:`${pct}%`,background:'linear-gradient(90deg,#2A8A99,#003366)',transition:'width 0.4s'}} />
                  </div>
                </div>
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div style={{fontSize:'12px',color:'var(--mid)'}}>Last check-in: <span className="font-semibold text-dark">{relDate(sp.lastCheckInDate)}</span></div>
                  <div className="flex gap-2">
                    {sp.pendingReviews>0&&(
                      <button className="font-semibold text-white rounded-lg" style={{fontSize:'12px',padding:'6px 12px',background:'#2A8A99',border:'none',cursor:'pointer'}}>Review Work ({sp.pendingReviews})</button>
                    )}
                    <button className="font-semibold rounded-lg hover:bg-[var(--navy-10)] transition-colors" style={{fontSize:'12px',padding:'6px 12px',background:'none',border:'1.5px solid var(--navy)',color:'var(--navy)',cursor:'pointer'}}>View Profile</button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {needsAttention.length>0&&(
        <div className="rounded-[16px] p-5 bg-white" style={{border:'1.5px solid rgba(212,165,116,0.4)'}}>
          <h3 className="font-bold text-navy mb-3" style={{fontSize:'15px'}}>⚠️ Needs Attention</h3>
          <div style={{display:'flex',flexDirection:'column',gap:'8px'}}>
            {needsAttention.map(sp=>{
              const mood=sp.lastMood?MOOD_META[sp.lastMood]:null
              return(
                <div key={sp.id} className="flex items-center gap-3 text-mid" style={{fontSize:'14px'}}>
                  {mood&&<span style={{fontSize:'18px'}}>{mood.emoji}</span>}
                  <div><strong className="text-navy">{sp.name}</strong>{mood&&(sp.lastMood==='struggling'||sp.lastMood==='crisis')&&` — "${mood.label}" mood`}{sp.pendingReviews>0&&` · ${sp.pendingReviews} pending review${sp.pendingReviews>1?'s':''}`}</div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
