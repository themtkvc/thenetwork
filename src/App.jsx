import { useState, useEffect, useRef } from 'react'
import './App.css'
import {
  uid, todayStr, formatDate, dayDiff,
  loadContacts, saveContacts,
  loadOrgs, saveOrgs,
  loadEvents, saveEvents,
  loadConfig, saveConfig,
  parseCSVLine, DEFAULT_CONFIG
} from './utils'

const COMM_TYPES      = { email:'📧', meeting:'🤝', call:'📞', linkedin:'💼', other:'💬' }
const COMM_TYPE_LABELS = { email:'E-posta', meeting:'Toplantı', call:'Telefon', linkedin:'LinkedIn', other:'Diğer' }
const PRIORITY_LABELS  = { high:'Yüksek', medium:'Orta', low:'Düşük' }

const emptyForm = () => ({
  firstName:'', lastName:'', company:'', position:'', country:'', city:'',
  email:'', phone:'', linkedin:'', website:'',
  sector:'', relType:'', priority:'medium', tags:'',
  meetDate:'', meetEventId:'', lastContact:'', nextFollowup:'', notes:'', opportunities:'',
  orgId:''
})
const emptyOrgForm = () => ({
  name:'', type:'', sector:'', country:'', city:'',
  website:'', phone:'', email:'', notes:''
})
const emptyEventForm = () => ({
  title:'', date:'', endDate:'', location:'', type:'',
  description:'', orgIds:[], contactIds:[]
})

/* ─── StatsBar ─── */
function StatsBar({ contacts, orgs, events }) {
  const countries = new Set(contacts.map(c => c.country).filter(Boolean))
  const today = todayStr()
  const overdue = contacts.filter(c => c.nextFollowup && c.nextFollowup < today).length
  const highPri = contacts.filter(c => c.priority === 'high').length
  return (
    <div className="stats-bar">
      <div className="stat-card"><div className="stat-icon blue">👥</div><div><div className="stat-label">Toplam Kişi</div><div className="stat-value">{contacts.length}</div></div></div>
      <div className="stat-card"><div className="stat-icon purple">🏛</div><div><div className="stat-label">Toplam Kurum</div><div className="stat-value">{orgs.length}</div></div></div>
      <div className="stat-card"><div className="stat-icon teal">📅</div><div><div className="stat-label">Etkinlik</div><div className="stat-value">{events.length}</div></div></div>
      <div className="stat-card"><div className="stat-icon green">🌍</div><div><div className="stat-label">Ülke Sayısı</div><div className="stat-value">{countries.size}</div></div></div>
      <div className="stat-card"><div className="stat-icon gold">⭐</div><div><div className="stat-label">Yüksek Öncelik</div><div className="stat-value">{highPri}</div></div></div>
      <div className="stat-card"><div className="stat-icon red">⏰</div><div><div className="stat-label">Takip Gereken</div><div className="stat-value">{overdue}</div></div></div>
    </div>
  )
}

/* ─── FollowupBanner ─── */
function FollowupBanner({ contacts }) {
  const today = todayStr()
  const soon = new Date(); soon.setDate(soon.getDate() + 7)
  const soonStr = soon.toISOString().slice(0,10)
  const due = contacts.filter(c => c.nextFollowup && c.nextFollowup <= soonStr)
  if (!due.length) return null
  const overdue = due.filter(c => c.nextFollowup < today)
  const upcoming = due.filter(c => c.nextFollowup >= today)
  return (
    <div className="followup-banner">
      <span>⏰</span>
      <span>
        {overdue.length > 0 && <><strong>{overdue.length} kişiyle</strong> takip süresi geçti. </>}
        {upcoming.length > 0 && <><strong>{upcoming.length} kişiyle</strong> bu hafta takip planlandı: {upcoming.slice(0,3).map(c=>`${c.firstName} ${c.lastName}`).join(', ')}</>}
      </span>
    </div>
  )
}

/* ─── ContactCard ─── */
function ContactCard({ c, onOpen, onEdit, onDelete, orgs }) {
  const initials = (c.firstName?.[0]||'') + (c.lastName?.[0]||'')
  const today = todayStr()
  const linkedOrg = orgs.find(o => o.id === c.orgId)
  let followupNote = null
  if (c.nextFollowup) {
    if (c.nextFollowup < today) followupNote = <span className="last-contact overdue">⚠ Takip gecikti: {formatDate(c.nextFollowup)}</span>
    else {
      const diff = dayDiff(today, c.nextFollowup)
      if (diff <= 7) followupNote = <span className="last-contact soon">📅 {diff} günde takip</span>
      else followupNote = <span className="last-contact">📅 {formatDate(c.nextFollowup)}</span>
    }
  } else if (c.lastContact) {
    followupNote = <span className="last-contact">Son: {formatDate(c.lastContact)}</span>
  }
  return (
    <div className={`contact-card priority-${c.priority||'medium'}`} onClick={() => onOpen(c.id)}>
      <div className="card-header">
        <div className="avatar">{initials}</div>
        <div style={{flex:1,minWidth:0}}>
          <div className="card-name">{c.firstName} {c.lastName}</div>
          {c.position && <div className="card-position">{c.position}</div>}
          {linkedOrg ? <div className="card-company org-linked">🏛 {linkedOrg.name}</div>
            : c.company && <div className="card-company">🏢 {c.company}</div>}
        </div>
      </div>
      <div className="card-meta">
        {c.country && <span className="badge badge-country">📍 {c.country}</span>}
        {c.sector && <span className="badge badge-sector">{c.sector}</span>}
        {c.relType && <span className="badge badge-rel">{c.relType}</span>}
        {(c.tags||[]).slice(0,2).map(t=><span key={t} className="badge badge-tag">{t}</span>)}
      </div>
      <div className="card-footer">
        {followupNote}
        <div className="card-actions" onClick={e => e.stopPropagation()}>
          <button className="btn-icon edit" title="Düzenle" onClick={() => onEdit(c.id)}>✏️</button>
          <button className="btn-icon danger" title="Sil" onClick={() => onDelete(c.id)}>🗑</button>
        </div>
      </div>
    </div>
  )
}

/* ─── OrgCard ─── */
function OrgCard({ org, contacts, onOpen, onEdit, onDelete }) {
  const linked = contacts.filter(c => c.orgId === org.id)
  return (
    <div className="org-card" onClick={() => onOpen(org.id)}>
      <div className="card-header">
        <div className="org-avatar">🏛</div>
        <div style={{flex:1,minWidth:0}}>
          <div className="card-name">{org.name}</div>
          {org.type && <div className="card-position">{org.type}</div>}
          {org.city && org.country && <div className="card-company">📍 {org.city}, {org.country}</div>}
        </div>
      </div>
      <div className="card-meta">
        {org.sector && <span className="badge badge-sector">{org.sector}</span>}
        {linked.length > 0 && <span className="badge badge-linked">👥 {linked.length} kişi</span>}
      </div>
      <div className="card-footer">
        {org.website
          ? <a href={org.website} target="_blank" rel="noreferrer" className="last-contact org-site" onClick={e=>e.stopPropagation()}>🌐 Web Sitesi</a>
          : <span className="last-contact">{org.email || ''}</span>}
        <div className="card-actions" onClick={e => e.stopPropagation()}>
          <button className="btn-icon edit" title="Düzenle" onClick={() => onEdit(org.id)}>✏️</button>
          <button className="btn-icon danger" title="Sil" onClick={() => onDelete(org.id)}>🗑</button>
        </div>
      </div>
    </div>
  )
}

/* ─── EventCard ─── */
function EventCard({ event, contacts, orgs, onOpen, onEdit, onDelete }) {
  const linkedContacts = contacts.filter(c => (event.contactIds||[]).includes(c.id))
  const linkedOrgs = orgs.filter(o => (event.orgIds||[]).includes(o.id))
  const today = todayStr()
  const isPast = event.date && event.date < today
  return (
    <div className={`org-card event-card${isPast?' event-past':''}`} onClick={() => onOpen(event.id)}>
      <div className="card-header">
        <div className="org-avatar event-avatar">📅</div>
        <div style={{flex:1,minWidth:0}}>
          <div className="card-name">{event.title}</div>
          {event.date && <div className="card-position">
            {formatDate(event.date)}{event.endDate && event.endDate !== event.date ? ` – ${formatDate(event.endDate)}` : ''}
          </div>}
          {event.location && <div className="card-company">📍 {event.location}</div>}
        </div>
      </div>
      <div className="card-meta">
        {event.type && <span className="badge badge-rel">{event.type}</span>}
        {linkedContacts.length > 0 && <span className="badge badge-linked">👥 {linkedContacts.length} kişi</span>}
        {linkedOrgs.length > 0 && <span className="badge badge-linked">🏛 {linkedOrgs.length} kurum</span>}
      </div>
      <div className="card-footer">
        <span className="last-contact">{isPast ? '✓ Tamamlandı' : (event.description ? event.description.slice(0,38)+(event.description.length>38?'…':'') : '')}</span>
        <div className="card-actions" onClick={e => e.stopPropagation()}>
          <button className="btn-icon edit" title="Düzenle" onClick={() => onEdit(event.id)}>✏️</button>
          <button className="btn-icon danger" title="Sil" onClick={() => onDelete(event.id)}>🗑</button>
        </div>
      </div>
    </div>
  )
}

/* ─── TableView (contacts) ─── */
function TableView({ list, onOpen, onEdit, onDelete, orgs }) {
  const today = todayStr()
  if (!list.length) return <EmptyState/>
  return (
    <div className="table-wrap">
      <table>
        <thead><tr>
          <th>Ad Soyad</th><th>Kurum</th><th>Ülke</th><th>Sektör</th>
          <th>İlişki</th><th>Öncelik</th><th>Son İletişim</th><th>Takip</th><th></th>
        </tr></thead>
        <tbody>
          {list.map(c => {
            const initials = (c.firstName?.[0]||'') + (c.lastName?.[0]||'')
            const isOverdue = c.nextFollowup && c.nextFollowup < today
            const linkedOrg = orgs.find(o => o.id === c.orgId)
            return (
              <tr key={c.id}>
                <td>
                  <div style={{display:'flex',alignItems:'center',gap:9}}>
                    <div className="avatar" style={{width:32,height:32,fontSize:12}}>{initials}</div>
                    <div>
                      <div className="table-name" onClick={()=>onOpen(c.id)}>{c.firstName} {c.lastName}</div>
                      {c.position && <div className="table-sub">{c.position}</div>}
                    </div>
                  </div>
                </td>
                <td>{linkedOrg ? <span className="org-linked">🏛 {linkedOrg.name}</span> : (c.company||'—')}</td>
                <td>{c.country||'—'}</td>
                <td>{c.sector ? <span className="badge badge-sector">{c.sector}</span> : '—'}</td>
                <td>{c.relType ? <span className="badge badge-rel">{c.relType}</span> : '—'}</td>
                <td><span className={`badge badge-priority-${c.priority||'medium'}`}>{PRIORITY_LABELS[c.priority]||'Orta'}</span></td>
                <td style={{fontSize:'12.5px'}}>{c.lastContact ? formatDate(c.lastContact) : '—'}</td>
                <td style={{fontSize:'12.5px',color:isOverdue?'var(--red)':undefined,fontWeight:isOverdue?600:undefined}}>
                  {c.nextFollowup ? formatDate(c.nextFollowup) : '—'}
                </td>
                <td>
                  <div style={{display:'flex',gap:4}}>
                    <button className="btn-icon edit" onClick={()=>onEdit(c.id)}>✏️</button>
                    <button className="btn-icon danger" onClick={()=>onDelete(c.id)}>🗑</button>
                  </div>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

/* ─── OrgTableView ─── */
function OrgTableView({ list, contacts, onOpen, onEdit, onDelete }) {
  if (!list.length) return <EmptyState type="org"/>
  return (
    <div className="table-wrap">
      <table>
        <thead><tr>
          <th>Kurum Adı</th><th>Tür</th><th>Sektör</th><th>Ülke</th><th>Bağlı Kişi</th><th>İletişim</th><th></th>
        </tr></thead>
        <tbody>
          {list.map(org => {
            const linked = contacts.filter(c => c.orgId === org.id)
            return (
              <tr key={org.id}>
                <td>
                  <div className="table-name" onClick={()=>onOpen(org.id)} style={{display:'flex',alignItems:'center',gap:8}}>
                    <span style={{fontSize:16}}>🏛</span> {org.name}
                  </div>
                </td>
                <td>{org.type||'—'}</td>
                <td>{org.sector ? <span className="badge badge-sector">{org.sector}</span> : '—'}</td>
                <td>{org.country||'—'}</td>
                <td>{linked.length > 0 ? <span className="badge badge-linked">👥 {linked.length}</span> : '—'}</td>
                <td style={{fontSize:'12.5px'}}>
                  {org.email ? <a href={`mailto:${org.email}`} style={{color:'var(--blue)'}}>{org.email}</a>
                    : org.website ? <a href={org.website} target="_blank" rel="noreferrer" style={{color:'var(--blue)'}}>Web ↗</a> : '—'}
                </td>
                <td>
                  <div style={{display:'flex',gap:4}}>
                    <button className="btn-icon edit" onClick={()=>onEdit(org.id)}>✏️</button>
                    <button className="btn-icon danger" onClick={()=>onDelete(org.id)}>🗑</button>
                  </div>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

/* ─── EmptyState ─── */
function EmptyState({ type }) {
  const msgs = {
    org:   { icon:'🏛', title:'Kurum bulunamadı',    desc:'Yeni kurum eklemek için "+ Kurum Ekle" butonunu kullanın.' },
    event: { icon:'📅', title:'Etkinlik bulunamadı', desc:'Yeni etkinlik eklemek için "+ Etkinlik Ekle" butonunu kullanın.' },
  }
  const m = msgs[type] || { icon:'🔍', title:'Kişi bulunamadı', desc:'Arama kriterlerinizi değiştirmeyi ya da yeni kişi eklemeyi deneyin.' }
  return (
    <div className="empty-state">
      <div className="empty-icon">{m.icon}</div>
      <h3>{m.title}</h3>
      <p>{m.desc}</p>
    </div>
  )
}

/* ─── FormModal (contact) ─── */
function FormModal({ isOpen, editContact, orgs, events, config, onClose, onSave, onQuickCreateOrg, defaultOrgId }) {
  const [form, setForm] = useState(emptyForm())
  const [showQuickOrg, setShowQuickOrg] = useState(false)
  const [quickOrgName, setQuickOrgName] = useState('')
  const [quickOrgType, setQuickOrgType] = useState('')
  const cfg = config || DEFAULT_CONFIG

  useEffect(() => {
    if (editContact) {
      setForm({
        firstName: editContact.firstName||'', lastName: editContact.lastName||'',
        company: editContact.company||'', position: editContact.position||'',
        country: editContact.country||'', city: editContact.city||'',
        email: editContact.email||'', phone: editContact.phone||'',
        linkedin: editContact.linkedin||'', website: editContact.website||'',
        sector: editContact.sector||'', relType: editContact.relType||'',
        priority: editContact.priority||'medium', tags: (editContact.tags||[]).join(', '),
        meetDate: editContact.meetDate||'', meetEventId: editContact.meetEventId||'',
        lastContact: editContact.lastContact||'', nextFollowup: editContact.nextFollowup||'',
        notes: editContact.notes||'', opportunities: editContact.opportunities||'',
        orgId: editContact.orgId||''
      })
    } else {
      setForm({...emptyForm(), orgId: defaultOrgId||''})
    }
    setShowQuickOrg(false); setQuickOrgName(''); setQuickOrgType('')
  }, [editContact, isOpen, defaultOrgId])

  useEffect(() => {
    const handleKey = e => { if (e.key === 'Escape') onClose() }
    if (isOpen) window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [isOpen, onClose])

  if (!isOpen) return null
  const set = (k, v) => setForm(f => ({...f, [k]: v}))
  const handleSave = () => {
    if (!form.firstName.trim() || !form.lastName.trim()) { alert('Ad ve Soyad zorunludur.'); return; }
    onSave({ ...form, tags: form.tags ? form.tags.split(',').map(t=>t.trim()).filter(Boolean) : [] })
  }

  return (
    <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <span className="modal-title">{editContact ? '✏️ Kişiyi Düzenle' : '✨ Yeni Kişi'}</span>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          <div className="form-section">
            <div className="form-section-title">👤 Temel Bilgiler</div>
            <div className="form-grid">
              <div className="form-group"><label>Ad *</label><input className="form-control" value={form.firstName} onChange={e=>set('firstName',e.target.value)} placeholder="Adı"/></div>
              <div className="form-group"><label>Soyad *</label><input className="form-control" value={form.lastName} onChange={e=>set('lastName',e.target.value)} placeholder="Soyadı"/></div>
              <div className="form-group"><label>Pozisyon / Unvan</label><input className="form-control" value={form.position} onChange={e=>set('position',e.target.value)} placeholder="Örn. CEO, Research Director"/></div>
              <div className="form-group"><label>Kurum / Şirket (serbest metin)</label><input className="form-control" value={form.company} onChange={e=>set('company',e.target.value)} placeholder="Şirket veya kurum adı"/></div>
              <div className="form-group"><label>Ülke</label><input className="form-control" value={form.country} onChange={e=>set('country',e.target.value)} placeholder="Örn. Almanya, ABD"/></div>
              <div className="form-group"><label>Şehir</label><input className="form-control" value={form.city} onChange={e=>set('city',e.target.value)} placeholder="Şehir"/></div>
              <div className="form-group"><label>E-posta</label><input type="email" className="form-control" value={form.email} onChange={e=>set('email',e.target.value)} placeholder="ornek@sirket.com"/></div>
              <div className="form-group"><label>Telefon</label><input className="form-control" value={form.phone} onChange={e=>set('phone',e.target.value)} placeholder="+49 123 456 7890"/></div>
              <div className="form-group"><label>LinkedIn URL</label><input type="url" className="form-control" value={form.linkedin} onChange={e=>set('linkedin',e.target.value)} placeholder="https://linkedin.com/in/..."/></div>
              <div className="form-group"><label>Web Sitesi</label><input type="url" className="form-control" value={form.website} onChange={e=>set('website',e.target.value)} placeholder="https://..."/></div>
              <div className="form-group">
                <label>Tanışma Tarihi</label>
                <input type="date" className="form-control" value={form.meetDate} onChange={e=>set('meetDate',e.target.value)}/>
              </div>
              <div className="form-group">
                <label>Tanışılan Etkinlik</label>
                <select className="form-control" value={form.meetEventId} onChange={e=>{
                  const ev = (events||[]).find(x=>x.id===e.target.value)
                  set('meetEventId', e.target.value)
                  if (ev && ev.date && !form.meetDate) set('meetDate', ev.date)
                }}>
                  <option value="">— Seçin —</option>
                  {(events||[]).slice().sort((a,b)=>(b.date||'').localeCompare(a.date||'')).map(ev=>(
                    <option key={ev.id} value={ev.id}>{ev.title}{ev.date ? ` (${formatDate(ev.date)})` : ''}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="form-section">
            <div className="form-section-title">🏛 Kurum Bağlantısı</div>
            <div className="form-group">
              <label>Kayıtlı Kurumla Eşleştir</label>
              <div style={{display:'flex',gap:8,alignItems:'center'}}>
                <select className="form-control" value={form.orgId} onChange={e=>set('orgId',e.target.value)}>
                  <option value="">— Kurum seçin (opsiyonel) —</option>
                  {orgs.map(o=><option key={o.id} value={o.id}>{o.name}{o.type ? ` · ${o.type}` : ''}</option>)}
                </select>
                <button type="button" className="btn btn-sm btn-outline-add" onClick={()=>setShowQuickOrg(v=>!v)} style={{flexShrink:0}}>
                  ＋ Yeni Kurum
                </button>
              </div>
              {showQuickOrg && (
                <div className="quick-org-form">
                  <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
                    <input className="form-control" style={{flex:'1 1 180px'}} value={quickOrgName} onChange={e=>setQuickOrgName(e.target.value)} placeholder="Kurum adı *" autoFocus/>
                    <input className="form-control" list="qo-types-list" style={{flex:'1 1 140px'}} value={quickOrgType} onChange={e=>setQuickOrgType(e.target.value)} placeholder="Tür (opsiyonel)"/>
                    <datalist id="qo-types-list">{cfg.orgTypes.map(t=><option key={t} value={t}/>)}</datalist>
                  </div>
                  <div style={{display:'flex',gap:6,marginTop:6}}>
                    <button type="button" className="btn btn-sm btn-primary" onClick={()=>{
                      if (!quickOrgName.trim()) return
                      const newOrg = onQuickCreateOrg(quickOrgName.trim(), quickOrgType)
                      set('orgId', newOrg.id)
                      setShowQuickOrg(false); setQuickOrgName(''); setQuickOrgType('')
                    }}>✓ Oluştur ve Seç</button>
                    <button type="button" className="btn btn-sm btn-secondary" onClick={()=>{setShowQuickOrg(false);setQuickOrgName('');setQuickOrgType('')}}>İptal</button>
                  </div>
                </div>
              )}
              {!showQuickOrg && <span style={{fontSize:11.5,color:'var(--gray-400)',marginTop:3,display:'block'}}>Kurum kaydıyla bağlantı kurarak detay sayfalarında çift yönlü erişim sağlayın.</span>}
            </div>
          </div>

          <div className="form-section">
            <div className="form-section-title">🏷️ Kategori & Etiketler</div>
            <div className="form-grid cols3">
              <div className="form-group"><label>Sektör</label>
                <select className="form-control" value={form.sector} onChange={e=>set('sector',e.target.value)}>
                  <option value="">Seçin</option>
                  {cfg.sectors.map(s=><option key={s}>{s}</option>)}
                </select>
              </div>
              <div className="form-group"><label>İlişki Türü</label>
                <select className="form-control" value={form.relType} onChange={e=>set('relType',e.target.value)}>
                  <option value="">Seçin</option>
                  {cfg.relTypes.map(r=><option key={r}>{r}</option>)}
                </select>
              </div>
              <div className="form-group"><label>Öncelik</label>
                <select className="form-control" value={form.priority} onChange={e=>set('priority',e.target.value)}>
                  <option value="medium">🔵 Orta</option>
                  <option value="high">🔴 Yüksek</option>
                  <option value="low">⚪ Düşük</option>
                </select>
              </div>
              <div className="form-group full"><label>Etiketler (virgülle ayırın)</label><input className="form-control" value={form.tags} onChange={e=>set('tags',e.target.value)} placeholder="Örn. yapay zeka, blockchain, sürdürülebilirlik"/></div>
            </div>
          </div>

          <div className="form-section">
            <div className="form-section-title">📅 İletişim Takibi</div>
            <div className="form-grid">
              <div className="form-group"><label>Son İletişim Tarihi</label><input type="date" className="form-control" value={form.lastContact} onChange={e=>set('lastContact',e.target.value)}/></div>
              <div className="form-group"><label>Sonraki Takip Tarihi</label><input type="date" className="form-control" value={form.nextFollowup} onChange={e=>set('nextFollowup',e.target.value)}/></div>
            </div>
          </div>
          <div className="form-section">
            <div className="form-section-title">📝 Notlar & Fırsatlar</div>
            <div className="form-grid">
              <div className="form-group full"><label>Genel Notlar</label><textarea className="form-control" value={form.notes} onChange={e=>set('notes',e.target.value)} placeholder="Bu kişi hakkında notlarınız…"/></div>
              <div className="form-group full"><label>Potansiyel İş Birlikleri / Fırsatlar</label><textarea className="form-control" value={form.opportunities} onChange={e=>set('opportunities',e.target.value)} placeholder="Ortak proje fikirleri, iş birliği alanları…"/></div>
            </div>
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>İptal</button>
          <button className="btn btn-primary" onClick={handleSave}>💾 Kaydet</button>
        </div>
      </div>
    </div>
  )
}

/* ─── OrgFormModal ─── */
function OrgFormModal({ isOpen, editOrg, config, onClose, onSave }) {
  const [form, setForm] = useState(emptyOrgForm())
  const cfg = config || DEFAULT_CONFIG
  useEffect(() => {
    setForm(editOrg ? {
      name: editOrg.name||'', type: editOrg.type||'', sector: editOrg.sector||'',
      country: editOrg.country||'', city: editOrg.city||'',
      website: editOrg.website||'', phone: editOrg.phone||'',
      email: editOrg.email||'', notes: editOrg.notes||''
    } : emptyOrgForm())
  }, [editOrg, isOpen])

  useEffect(() => {
    const handleKey = e => { if (e.key === 'Escape') onClose() }
    if (isOpen) window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [isOpen, onClose])

  if (!isOpen) return null
  const set = (k, v) => setForm(f => ({...f, [k]: v}))
  const handleSave = () => { if (!form.name.trim()) { alert('Kurum adı zorunludur.'); return; } onSave(form) }

  return (
    <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <span className="modal-title">{editOrg ? '✏️ Kurumu Düzenle' : '🏛 Yeni Kurum'}</span>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          <div className="form-section">
            <div className="form-section-title">🏛 Kurum Bilgileri</div>
            <div className="form-grid">
              <div className="form-group full">
                <label>Kurum Adı *</label>
                <input className="form-control" value={form.name} onChange={e=>set('name',e.target.value)} placeholder="Kurum adı"/>
              </div>
              <div className="form-group">
                <label>Kurum Türü</label>
                <select className="form-control" value={form.type} onChange={e=>set('type',e.target.value)}>
                  <option value="">— Seçin —</option>
                  {cfg.orgTypes.map(t=><option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Sektör</label>
                <select className="form-control" value={form.sector} onChange={e=>set('sector',e.target.value)}>
                  <option value="">— Seçin —</option>
                  {cfg.sectors.map(s=><option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div className="form-group"><label>Ülke</label><input className="form-control" value={form.country} onChange={e=>set('country',e.target.value)} placeholder="Örn. Almanya, ABD"/></div>
              <div className="form-group"><label>Şehir</label><input className="form-control" value={form.city} onChange={e=>set('city',e.target.value)} placeholder="Şehir"/></div>
              <div className="form-group"><label>Web Sitesi</label><input type="url" className="form-control" value={form.website} onChange={e=>set('website',e.target.value)} placeholder="https://..."/></div>
              <div className="form-group"><label>Telefon</label><input className="form-control" value={form.phone} onChange={e=>set('phone',e.target.value)} placeholder="+90 212 ..."/></div>
              <div className="form-group full"><label>E-posta</label><input type="email" className="form-control" value={form.email} onChange={e=>set('email',e.target.value)} placeholder="info@kurum.com"/></div>
              <div className="form-group full"><label>Notlar</label><textarea className="form-control" value={form.notes} onChange={e=>set('notes',e.target.value)} placeholder="Kurum hakkında notlarınız…"/></div>
            </div>
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>İptal</button>
          <button className="btn btn-primary" onClick={handleSave}>💾 Kaydet</button>
        </div>
      </div>
    </div>
  )
}

/* ─── EventFormModal ─── */
function EventFormModal({ isOpen, editEvent, contacts, orgs, config, onClose, onSave }) {
  const [form, setForm] = useState(emptyEventForm())
  const [contactSearch, setContactSearch] = useState('')
  const [orgSearch, setOrgSearch] = useState('')
  const cfg = config || DEFAULT_CONFIG

  useEffect(() => {
    setForm(editEvent ? {
      title: editEvent.title||'', date: editEvent.date||'', endDate: editEvent.endDate||'',
      location: editEvent.location||'', type: editEvent.type||'', description: editEvent.description||'',
      orgIds: editEvent.orgIds||[], contactIds: editEvent.contactIds||[]
    } : emptyEventForm())
    setContactSearch(''); setOrgSearch('')
  }, [editEvent, isOpen])

  useEffect(() => {
    const handleKey = e => { if (e.key === 'Escape') onClose() }
    if (isOpen) window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [isOpen, onClose])

  if (!isOpen) return null
  const set = (k, v) => setForm(f => ({...f, [k]: v}))

  const toggleContact = (id) => set('contactIds',
    form.contactIds.includes(id) ? form.contactIds.filter(x=>x!==id) : [...form.contactIds, id])
  const toggleOrg = (id) => set('orgIds',
    form.orgIds.includes(id) ? form.orgIds.filter(x=>x!==id) : [...form.orgIds, id])

  const filteredContacts = contacts.filter(c => {
    const q = contactSearch.toLowerCase()
    return !q || `${c.firstName} ${c.lastName}`.toLowerCase().includes(q) || (c.company||'').toLowerCase().includes(q)
  })
  const filteredOrgs = orgs.filter(o => !orgSearch || (o.name||'').toLowerCase().includes(orgSearch.toLowerCase()))

  const handleSave = () => { if (!form.title.trim()) { alert('Etkinlik adı zorunludur.'); return; } onSave(form) }

  return (
    <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="modal modal-lg" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <span className="modal-title">{editEvent ? '✏️ Etkinliği Düzenle' : '📅 Yeni Etkinlik'}</span>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          <div className="form-section">
            <div className="form-section-title">📅 Etkinlik Bilgileri</div>
            <div className="form-grid">
              <div className="form-group full">
                <label>Etkinlik Adı *</label>
                <input className="form-control" value={form.title} onChange={e=>set('title',e.target.value)} placeholder="Etkinlik adı" autoFocus/>
              </div>
              <div className="form-group">
                <label>Etkinlik Türü</label>
                <input className="form-control" list="ev-types-list" value={form.type} onChange={e=>set('type',e.target.value)} placeholder="Konferans, Workshop…"/>
                <datalist id="ev-types-list">{cfg.eventTypes.map(t=><option key={t} value={t}/>)}</datalist>
              </div>
              <div className="form-group">
                <label>Konum</label>
                <input className="form-control" value={form.location} onChange={e=>set('location',e.target.value)} placeholder="Şehir, mekan…"/>
              </div>
              <div className="form-group">
                <label>Başlangıç Tarihi</label>
                <input type="date" className="form-control" value={form.date} onChange={e=>set('date',e.target.value)}/>
              </div>
              <div className="form-group">
                <label>Bitiş Tarihi (opsiyonel)</label>
                <input type="date" className="form-control" value={form.endDate} onChange={e=>set('endDate',e.target.value)}/>
              </div>
              <div className="form-group full">
                <label>Açıklama</label>
                <textarea className="form-control" value={form.description} onChange={e=>set('description',e.target.value)} placeholder="Etkinlik hakkında notlar…"/>
              </div>
            </div>
          </div>

          <div className="form-section">
            <div className="form-section-title">👥 Katılımcılar <span style={{fontWeight:400,fontSize:12,color:'var(--gray-400)'}}>({form.contactIds.length} seçili)</span></div>
            {form.contactIds.length > 0 && (
              <div style={{display:'flex',flexWrap:'wrap',gap:6,marginBottom:10}}>
                {form.contactIds.map(id => {
                  const c = contacts.find(x=>x.id===id); if (!c) return null
                  return <span key={id} className="selected-chip" onClick={()=>toggleContact(id)}>{c.firstName} {c.lastName} ✕</span>
                })}
              </div>
            )}
            <input className="form-control" placeholder="Kişi ara…" value={contactSearch} onChange={e=>setContactSearch(e.target.value)} style={{marginBottom:8}}/>
            <div className="picker-list">
              {filteredContacts.slice(0,12).map(c => (
                <div key={c.id} className={`picker-item${form.contactIds.includes(c.id)?' selected':''}`} onClick={()=>toggleContact(c.id)}>
                  <div className="avatar" style={{width:28,height:28,fontSize:11,flexShrink:0}}>{(c.firstName?.[0]||'')+(c.lastName?.[0]||'')}</div>
                  <div style={{flex:1}}>
                    <div style={{fontWeight:600,fontSize:12}}>{c.firstName} {c.lastName}</div>
                    {c.position && <div style={{fontSize:11,color:'var(--gray-500)'}}>{c.position}</div>}
                  </div>
                  {form.contactIds.includes(c.id) && <span style={{color:'var(--blue)',fontSize:14,fontWeight:700}}>✓</span>}
                </div>
              ))}
              {filteredContacts.length === 0 && <div style={{padding:'12px',fontSize:12,color:'var(--gray-400)'}}>Kişi bulunamadı.</div>}
            </div>
          </div>

          {orgs.length > 0 && (
            <div className="form-section">
              <div className="form-section-title">🏛 Bağlı Kurumlar <span style={{fontWeight:400,fontSize:12,color:'var(--gray-400)'}}>({form.orgIds.length} seçili)</span></div>
              {form.orgIds.length > 0 && (
                <div style={{display:'flex',flexWrap:'wrap',gap:6,marginBottom:10}}>
                  {form.orgIds.map(id => {
                    const o = orgs.find(x=>x.id===id); if (!o) return null
                    return <span key={id} className="selected-chip" onClick={()=>toggleOrg(id)}>{o.name} ✕</span>
                  })}
                </div>
              )}
              <input className="form-control" placeholder="Kurum ara…" value={orgSearch} onChange={e=>setOrgSearch(e.target.value)} style={{marginBottom:8}}/>
              <div className="picker-list">
                {filteredOrgs.slice(0,10).map(o => (
                  <div key={o.id} className={`picker-item${form.orgIds.includes(o.id)?' selected':''}`} onClick={()=>toggleOrg(o.id)}>
                    <span style={{fontSize:18,flexShrink:0}}>🏛</span>
                    <div style={{flex:1}}>
                      <div style={{fontWeight:600,fontSize:12}}>{o.name}</div>
                      {o.type && <div style={{fontSize:11,color:'var(--gray-500)'}}>{o.type}</div>}
                    </div>
                    {form.orgIds.includes(o.id) && <span style={{color:'var(--blue)',fontSize:14,fontWeight:700}}>✓</span>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>İptal</button>
          <button className="btn btn-primary" onClick={handleSave}>💾 Kaydet</button>
        </div>
      </div>
    </div>
  )
}

/* ─── DetailModal (contact) ─── */
function DetailModal({ isOpen, contact, orgs, events, onClose, onEdit, onAddComm, onDeleteComm, onOpenOrg, onOpenEvent }) {
  const [newDate, setNewDate] = useState(todayStr())
  const [newType, setNewType] = useState('email')
  const [newNote, setNewNote] = useState('')
  useEffect(() => { setNewDate(todayStr()); setNewType('email'); setNewNote('') }, [contact])
  useEffect(() => {
    const handleKey = e => { if (e.key === 'Escape') onClose() }
    if (isOpen) window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [isOpen, onClose])
  if (!isOpen || !contact) return null
  const c = contact
  const initials = (c.firstName?.[0]||'') + (c.lastName?.[0]||'')
  const today = todayStr()
  const linkedOrg = orgs.find(o => o.id === c.orgId)
  const linkedEvents = (events||[]).filter(ev => (ev.contactIds||[]).includes(c.id))
  const handleAddComm = () => {
    if (!newDate || !newNote.trim()) { alert('Lütfen tarih ve not girin.'); return; }
    onAddComm(c.id, { id: uid(), date: newDate, type: newType, note: newNote.trim() })
    setNewNote('')
  }
  return (
    <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="modal modal-lg" onClick={e => e.stopPropagation()}>
        <div style={{position:'relative'}}>
          <button className="modal-close" onClick={onClose} style={{position:'absolute',top:10,right:10,zIndex:10}}>✕</button>
          <div className="detail-hero">
            <div className="detail-avatar">{initials}</div>
            <div className="detail-hero-info">
              <h2>{c.firstName} {c.lastName}</h2>
              <p>{c.position}{c.position && (linkedOrg?.name || c.company) ? ' · ' : ''}{linkedOrg?.name || c.company}</p>
              {c.country && <div className="detail-company">📍 {c.country}{c.city ? ', ' + c.city : ''}</div>}
              <div className="detail-badges" style={{marginTop:10}}>
                {c.sector && <span className="badge badge-sector">{c.sector}</span>}
                {c.relType && <span className="badge badge-rel">{c.relType}</span>}
                <span className={`badge badge-priority-${c.priority||'medium'}`}>
                  {c.priority==='high'?'🔴 Yüksek':c.priority==='low'?'⚪ Düşük':'🔵 Orta'}
                </span>
                {(c.tags||[]).map(t=><span key={t} className="badge badge-tag">#{t}</span>)}
              </div>
            </div>
            <div style={{alignSelf:'flex-start',marginTop:4}}>
              <button className="btn btn-sm btn-gold" onClick={()=>{onClose();onEdit(c.id)}}>✏️ Düzenle</button>
            </div>
          </div>
        </div>
        <div className="modal-body">
          {linkedOrg && (
            <div className="detail-section">
              <div className="detail-section-title">🏛 Bağlı Kurum</div>
              <div className="org-link-card" onClick={()=>{onClose();onOpenOrg(linkedOrg.id)}}>
                <span className="org-link-icon">🏛</span>
                <div style={{flex:1}}>
                  <div style={{fontWeight:700,fontSize:14}}>{linkedOrg.name}</div>
                  {linkedOrg.type && <div style={{fontSize:12,color:'var(--gray-500)'}}>{linkedOrg.type}{linkedOrg.sector ? ' · ' + linkedOrg.sector : ''}</div>}
                </div>
                <span style={{fontSize:12,color:'var(--blue)'}}>Görüntüle →</span>
              </div>
            </div>
          )}

          <div className="detail-section">
            <div className="detail-section-title">📬 İletişim Bilgileri</div>
            <div className="info-grid">
              {c.email && <div className="info-item"><div className="info-lbl">E-posta</div><div className="info-val"><a href={`mailto:${c.email}`}>{c.email}</a></div></div>}
              {c.phone && <div className="info-item"><div className="info-lbl">Telefon</div><div className="info-val">{c.phone}</div></div>}
              {c.linkedin && <div className="info-item"><div className="info-lbl">LinkedIn</div><div className="info-val"><a href={c.linkedin} target="_blank" rel="noreferrer">Profili Görüntüle ↗</a></div></div>}
              {c.website && <div className="info-item"><div className="info-lbl">Web Sitesi</div><div className="info-val"><a href={c.website} target="_blank" rel="noreferrer">{c.website}</a></div></div>}
            </div>
          </div>

          <div className="detail-section">
            <div className="detail-section-title">📅 İletişim Takibi</div>
            <div className="info-grid">
              {c.meetDate && <div className="info-item"><div className="info-lbl">Tanışma Tarihi</div><div className="info-val" style={{fontWeight:600}}>{formatDate(c.meetDate)}</div></div>}
              {c.meetEventId && (() => { const ev = (events||[]).find(x=>x.id===c.meetEventId); return ev ? <div className="info-item"><div className="info-lbl">Tanışılan Etkinlik</div><div className="info-val" style={{color:'var(--blue)',cursor:'pointer',fontWeight:600}} onClick={()=>{onClose();onOpenEvent(ev.id)}}>📅 {ev.title}</div></div> : null })()}
              <div className="info-item"><div className="info-lbl">Son İletişim</div><div className="info-val">{c.lastContact ? formatDate(c.lastContact) : '—'}</div></div>
              <div className="info-item"><div className="info-lbl">Sonraki Takip</div>
                <div className="info-val" style={c.nextFollowup && c.nextFollowup < today ? {color:'var(--red)',fontWeight:700} : {}}>
                  {c.nextFollowup ? formatDate(c.nextFollowup) : '—'}
                </div>
              </div>
            </div>
          </div>

          {linkedEvents.length > 0 && (
            <div className="detail-section">
              <div className="detail-section-title">📅 Bağlı Etkinlikler ({linkedEvents.length})</div>
              <div className="linked-contacts">
                {linkedEvents.map(ev => (
                  <div key={ev.id} className="linked-contact-item" onClick={()=>{onClose();onOpenEvent(ev.id)}}>
                    <span style={{fontSize:20,flexShrink:0}}>📅</span>
                    <div style={{flex:1}}>
                      <div style={{fontWeight:600,fontSize:13}}>{ev.title}</div>
                      {ev.date && <div style={{fontSize:12,color:'var(--gray-500)'}}>{formatDate(ev.date)}{ev.location ? ' · '+ev.location : ''}</div>}
                    </div>
                    <span style={{fontSize:11,color:'var(--blue)'}}>→</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="detail-section">
            <div className="detail-section-title">🗂 İletişim Geçmişi</div>
            <div className="comm-log">
              {(c.communications||[]).length === 0
                ? <p style={{fontSize:13,color:'var(--gray-400)'}}>Henüz iletişim kaydı yok.</p>
                : [...(c.communications||[])].reverse().map(cm => (
                  <div key={cm.id} className="comm-entry">
                    <div className="comm-entry-header">
                      <div className={`comm-type-icon comm-type-${cm.type||'other'}`}>{COMM_TYPES[cm.type]||'💬'}</div>
                      <span style={{fontSize:12,fontWeight:600,color:'var(--gray-600)'}}>{COMM_TYPE_LABELS[cm.type]||'Diğer'}</span>
                      <span className="comm-date">{formatDate(cm.date)}</span>
                    </div>
                    <div className="comm-note">{cm.note}</div>
                    <button className="comm-delete" onClick={()=>onDeleteComm(c.id, cm.id)} title="Sil">✕</button>
                  </div>
                ))
              }
            </div>
            <div className="add-comm-form">
              <div style={{fontSize:12,fontWeight:700,color:'var(--gray-500)',marginBottom:10,textTransform:'uppercase',letterSpacing:'0.5px'}}>+ Yeni Kayıt Ekle</div>
              <div className="comm-row">
                <div className="form-group"><label>Tarih</label><input type="date" className="form-control" value={newDate} onChange={e=>setNewDate(e.target.value)}/></div>
                <div className="form-group"><label>Tür</label>
                  <select className="form-control" value={newType} onChange={e=>setNewType(e.target.value)}>
                    <option value="email">📧 E-posta</option>
                    <option value="meeting">🤝 Toplantı</option>
                    <option value="call">📞 Telefon</option>
                    <option value="linkedin">💼 LinkedIn</option>
                    <option value="other">💬 Diğer</option>
                  </select>
                </div>
              </div>
              <div className="form-group" style={{marginBottom:10}}>
                <textarea className="form-control" value={newNote} onChange={e=>setNewNote(e.target.value)} placeholder="İletişim notu…" style={{minHeight:60}}/>
              </div>
              <button className="btn btn-primary btn-sm" onClick={handleAddComm}>Kaydet</button>
            </div>
          </div>
          {c.notes && <div className="detail-section"><div className="detail-section-title">📝 Notlar</div><div className="note-box">{c.notes}</div></div>}
          {c.opportunities && <div className="detail-section"><div className="detail-section-title">🚀 Fırsatlar & İş Birlikleri</div><div className="note-box">{c.opportunities}</div></div>}
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Kapat</button>
        </div>
      </div>
    </div>
  )
}

/* ─── OrgDetailModal ─── */
function OrgDetailModal({ isOpen, org, contacts, allContacts, events, onClose, onEdit, onOpenContact, onNewContact, onLinkContact, onOpenEvent }) {
  const [showLinkPicker, setShowLinkPicker] = useState(false)
  const [linkSearch, setLinkSearch] = useState('')

  useEffect(() => {
    const handleKey = e => { if (e.key === 'Escape') onClose() }
    if (isOpen) window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [isOpen, onClose])
  useEffect(() => { if (!isOpen) { setShowLinkPicker(false); setLinkSearch('') } }, [isOpen])

  if (!isOpen || !org) return null
  const linked = contacts.filter(c => c.orgId === org.id)
  const unlinked = (allContacts||contacts).filter(c => !c.orgId || c.orgId === '')
  const filteredUnlinked = unlinked.filter(c => {
    const q = linkSearch.toLowerCase()
    return !q || `${c.firstName} ${c.lastName}`.toLowerCase().includes(q)
      || (c.company||'').toLowerCase().includes(q) || (c.position||'').toLowerCase().includes(q)
  })
  const linkedEvents = (events||[]).filter(ev => (ev.orgIds||[]).includes(org.id))

  return (
    <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="modal modal-lg" onClick={e => e.stopPropagation()}>
        <div style={{position:'relative'}}>
          <button className="modal-close" onClick={onClose} style={{position:'absolute',top:10,right:10,zIndex:10}}>✕</button>
          <div className="detail-hero">
            <div className="org-detail-avatar">🏛</div>
            <div className="detail-hero-info">
              <h2>{org.name}</h2>
              <p>{org.type}{org.type && org.sector ? ' · ' : ''}{org.sector}</p>
              {org.country && <div className="detail-company">📍 {org.country}{org.city ? ', ' + org.city : ''}</div>}
              <div className="detail-badges" style={{marginTop:10}}>
                {org.type && <span className="badge badge-rel">{org.type}</span>}
                {org.sector && <span className="badge badge-sector">{org.sector}</span>}
                <span className="badge badge-linked">👥 {linked.length} kişi</span>
                {linkedEvents.length > 0 && <span className="badge badge-linked">📅 {linkedEvents.length} etkinlik</span>}
              </div>
            </div>
            <div style={{alignSelf:'flex-start',marginTop:4}}>
              <button className="btn btn-sm btn-gold" onClick={()=>{onClose();onEdit(org.id)}}>✏️ Düzenle</button>
            </div>
          </div>
        </div>
        <div className="modal-body">
          {(org.email || org.phone || org.website) && (
            <div className="detail-section">
              <div className="detail-section-title">📬 İletişim Bilgileri</div>
              <div className="info-grid">
                {org.email && <div className="info-item"><div className="info-lbl">E-posta</div><div className="info-val"><a href={`mailto:${org.email}`}>{org.email}</a></div></div>}
                {org.phone && <div className="info-item"><div className="info-lbl">Telefon</div><div className="info-val">{org.phone}</div></div>}
                {org.website && <div className="info-item full"><div className="info-lbl">Web Sitesi</div><div className="info-val"><a href={org.website} target="_blank" rel="noreferrer">{org.website} ↗</a></div></div>}
              </div>
            </div>
          )}

          <div className="detail-section">
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:10}}>
              <div className="detail-section-title" style={{marginBottom:0}}>👥 Bağlı Kişiler ({linked.length})</div>
              <div style={{display:'flex',gap:6}}>
                <button className="btn btn-sm btn-outline-add" onClick={()=>{setShowLinkPicker(v=>!v);setLinkSearch('')}}>🔗 Mevcut Kişiyi Bağla</button>
                <button className="btn btn-sm btn-primary" onClick={()=>{onClose();onNewContact(org.id)}}>＋ Yeni Kişi Ekle</button>
              </div>
            </div>
            {showLinkPicker && (
              <div className="link-picker">
                <div style={{fontWeight:600,fontSize:12,color:'var(--gray-500)',marginBottom:6}}>Henüz bir kuruma bağlı olmayan kişilerden seçin:</div>
                <input className="form-control" style={{marginBottom:8}} placeholder="İsim veya şirket ara…" value={linkSearch} onChange={e=>setLinkSearch(e.target.value)} autoFocus/>
                {filteredUnlinked.length === 0
                  ? <p style={{fontSize:12,color:'var(--gray-400)',margin:0}}>Bağlanabilecek kişi bulunamadı.</p>
                  : filteredUnlinked.map(c => (
                    <div key={c.id} className="linked-contact-item link-picker-row" onClick={()=>{onLinkContact(c.id,org.id);setShowLinkPicker(false);setLinkSearch('')}}>
                      <div className="avatar" style={{width:32,height:32,fontSize:12,flexShrink:0}}>{(c.firstName?.[0]||'')+(c.lastName?.[0]||'')}</div>
                      <div style={{flex:1}}>
                        <div style={{fontWeight:600,fontSize:13}}>{c.firstName} {c.lastName}</div>
                        {(c.position||c.company) && <div style={{fontSize:11,color:'var(--gray-500)'}}>{c.position}{c.position&&c.company?' · ':''}{c.company}</div>}
                      </div>
                      <span className="link-picker-add">Bağla ＋</span>
                    </div>
                  ))
                }
              </div>
            )}
            {linked.length === 0 && !showLinkPicker
              ? <p style={{fontSize:13,color:'var(--gray-400)'}}>Bu kuruma bağlı kişi yok.</p>
              : (
                <div className="linked-contacts">
                  {linked.map(c => (
                    <div key={c.id} className="linked-contact-item" onClick={()=>{onClose();onOpenContact(c.id)}}>
                      <div className="avatar" style={{width:34,height:34,fontSize:13}}>{(c.firstName?.[0]||'')+(c.lastName?.[0]||'')}</div>
                      <div style={{flex:1}}>
                        <div style={{fontWeight:600,fontSize:13,color:'var(--gray-800)'}}>{c.firstName} {c.lastName}</div>
                        {c.position && <div style={{fontSize:12,color:'var(--gray-500)'}}>{c.position}</div>}
                      </div>
                      {c.relType && <span className="badge badge-rel">{c.relType}</span>}
                      <span style={{fontSize:11,color:'var(--blue)'}}>→</span>
                    </div>
                  ))}
                </div>
              )
            }
          </div>

          {linkedEvents.length > 0 && (
            <div className="detail-section">
              <div className="detail-section-title">📅 Bağlı Etkinlikler ({linkedEvents.length})</div>
              <div className="linked-contacts">
                {linkedEvents.map(ev => (
                  <div key={ev.id} className="linked-contact-item" onClick={()=>{onClose();onOpenEvent(ev.id)}}>
                    <span style={{fontSize:20,flexShrink:0}}>📅</span>
                    <div style={{flex:1}}>
                      <div style={{fontWeight:600,fontSize:13}}>{ev.title}</div>
                      {ev.date && <div style={{fontSize:12,color:'var(--gray-500)'}}>{formatDate(ev.date)}{ev.location ? ' · '+ev.location : ''}</div>}
                    </div>
                    <span style={{fontSize:11,color:'var(--blue)'}}>→</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {org.notes && <div className="detail-section"><div className="detail-section-title">📝 Notlar</div><div className="note-box">{org.notes}</div></div>}
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Kapat</button>
        </div>
      </div>
    </div>
  )
}

/* ─── EventDetailModal ─── */
function EventDetailModal({ isOpen, event, contacts, orgs, onClose, onEdit, onOpenContact, onOpenOrg }) {
  useEffect(() => {
    const handleKey = e => { if (e.key === 'Escape') onClose() }
    if (isOpen) window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [isOpen, onClose])
  if (!isOpen || !event) return null
  const linkedContacts = contacts.filter(c => (event.contactIds||[]).includes(c.id))
  const linkedOrgs = orgs.filter(o => (event.orgIds||[]).includes(o.id))
  const today = todayStr()
  const isPast = event.date && event.date < today
  return (
    <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="modal modal-lg" onClick={e => e.stopPropagation()}>
        <div style={{position:'relative'}}>
          <button className="modal-close" onClick={onClose} style={{position:'absolute',top:10,right:10,zIndex:10}}>✕</button>
          <div className="detail-hero">
            <div className="org-detail-avatar" style={{background:'linear-gradient(135deg,#0ea5e9,#0284c7)'}}>📅</div>
            <div className="detail-hero-info">
              <h2>{event.title}</h2>
              <p>{event.type}</p>
              {event.date && <div className="detail-company">📅 {formatDate(event.date)}{event.endDate && event.endDate !== event.date ? ` – ${formatDate(event.endDate)}` : ''}</div>}
              {event.location && <div className="detail-company">📍 {event.location}</div>}
              <div className="detail-badges" style={{marginTop:10}}>
                {event.type && <span className="badge badge-rel">{event.type}</span>}
                {isPast && <span className="badge" style={{background:'#f0fdf4',color:'#166534',border:'1px solid #bbf7d0'}}>✓ Tamamlandı</span>}
                <span className="badge badge-linked">👥 {linkedContacts.length} kişi</span>
                {linkedOrgs.length > 0 && <span className="badge badge-linked">🏛 {linkedOrgs.length} kurum</span>}
              </div>
            </div>
            <div style={{alignSelf:'flex-start',marginTop:4}}>
              <button className="btn btn-sm btn-gold" onClick={()=>{onClose();onEdit(event.id)}}>✏️ Düzenle</button>
            </div>
          </div>
        </div>
        <div className="modal-body">
          {event.description && (
            <div className="detail-section">
              <div className="detail-section-title">📝 Açıklama</div>
              <div className="note-box">{event.description}</div>
            </div>
          )}
          {linkedOrgs.length > 0 && (
            <div className="detail-section">
              <div className="detail-section-title">🏛 Bağlı Kurumlar ({linkedOrgs.length})</div>
              <div className="linked-contacts">
                {linkedOrgs.map(o => (
                  <div key={o.id} className="linked-contact-item" onClick={()=>{onClose();onOpenOrg(o.id)}}>
                    <span style={{fontSize:20,flexShrink:0}}>🏛</span>
                    <div style={{flex:1}}>
                      <div style={{fontWeight:600,fontSize:13}}>{o.name}</div>
                      {o.type && <div style={{fontSize:12,color:'var(--gray-500)'}}>{o.type}</div>}
                    </div>
                    <span style={{fontSize:11,color:'var(--blue)'}}>→</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          <div className="detail-section">
            <div className="detail-section-title">👥 Katılımcılar ({linkedContacts.length})</div>
            {linkedContacts.length === 0
              ? <p style={{fontSize:13,color:'var(--gray-400)'}}>Bu etkinliğe bağlı kişi yok.</p>
              : (
                <div className="linked-contacts">
                  {linkedContacts.map(c => (
                    <div key={c.id} className="linked-contact-item" onClick={()=>{onClose();onOpenContact(c.id)}}>
                      <div className="avatar" style={{width:34,height:34,fontSize:13}}>{(c.firstName?.[0]||'')+(c.lastName?.[0]||'')}</div>
                      <div style={{flex:1}}>
                        <div style={{fontWeight:600,fontSize:13}}>{c.firstName} {c.lastName}</div>
                        {c.position && <div style={{fontSize:12,color:'var(--gray-500)'}}>{c.position}</div>}
                      </div>
                      {c.relType && <span className="badge badge-rel">{c.relType}</span>}
                      <span style={{fontSize:11,color:'var(--blue)'}}>→</span>
                    </div>
                  ))}
                </div>
              )
            }
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Kapat</button>
        </div>
      </div>
    </div>
  )
}

/* ─── DeleteModal ─── */
function DeleteModal({ isOpen, name, message, onClose, onConfirm }) {
  useEffect(() => {
    const handleKey = e => { if (e.key === 'Escape') onClose() }
    if (isOpen) window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [isOpen, onClose])
  if (!isOpen) return null
  return (
    <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="modal" style={{maxWidth:400}} onClick={e=>e.stopPropagation()}>
        <div className="modal-header">
          <span className="modal-title">Sil</span>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          <p style={{fontSize:14,color:'var(--gray-600)'}}>{message || `"${name}" öğesini silmek istediğinize emin misiniz? Bu işlem geri alınamaz.`}</p>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>İptal</button>
          <button className="btn btn-danger" onClick={onConfirm}>🗑 Sil</button>
        </div>
      </div>
    </div>
  )
}

/* ─── AdminPanel ─── */
function AdminPanel({ config, onSaveConfig }) {
  const [cfg, setCfg] = useState({ ...config })
  const [newItems, setNewItems] = useState({ sectors:'', orgTypes:'', relTypes:'', eventTypes:'' })

  useEffect(() => { setCfg({ ...config }) }, [config])

  const addItem = (key) => {
    const val = newItems[key].trim()
    if (!val) return
    if (cfg[key].includes(val)) { alert('Bu seçenek zaten mevcut.'); return; }
    const updated = { ...cfg, [key]: [...cfg[key], val] }
    setCfg(updated); onSaveConfig(updated)
    setNewItems(n => ({...n, [key]: ''}))
  }
  const removeItem = (key, item) => {
    const updated = { ...cfg, [key]: cfg[key].filter(x => x !== item) }
    setCfg(updated); onSaveConfig(updated)
  }
  const resetToDefault = (key) => {
    const updated = { ...cfg, [key]: DEFAULT_CONFIG[key] }
    setCfg(updated); onSaveConfig(updated)
  }

  const SECTIONS = {
    sectors:    { label:'🏢 Sektörler',       placeholder:'Yeni sektör ekle…' },
    orgTypes:   { label:'🏛 Kurum Türleri',   placeholder:'Yeni kurum türü ekle…' },
    relTypes:   { label:'👥 İlişki Türleri',  placeholder:'Yeni ilişki türü ekle…' },
    eventTypes: { label:'📅 Etkinlik Türleri',placeholder:'Yeni etkinlik türü ekle…' },
  }

  return (
    <div className="admin-panel">
      <div className="admin-header">
        <h2>⚙️ Sistem Yönetimi</h2>
        <p>Uygulama genelinde kullanılan liste seçeneklerini buradan özelleştirin. Değişiklikler anında kaydedilir.</p>
      </div>
      <div className="admin-grid">
        {Object.keys(SECTIONS).map(key => (
          <div key={key} className="admin-section">
            <div className="admin-section-header">
              <div className="admin-section-title">{SECTIONS[key].label}</div>
              <button className="btn btn-xs btn-secondary" onClick={()=>resetToDefault(key)} title="Varsayılana sıfırla">↺ Varsayılan</button>
            </div>
            <div className="admin-tags">
              {cfg[key].map(item => (
                <div key={item} className="admin-tag">
                  <span>{item}</span>
                  <button onClick={()=>removeItem(key,item)} title="Kaldır">✕</button>
                </div>
              ))}
              {cfg[key].length === 0 && <span style={{fontSize:12,color:'var(--gray-400)'}}>Seçenek yok</span>}
            </div>
            <div className="admin-add-row">
              <input
                className="form-control"
                value={newItems[key]}
                onChange={e=>setNewItems(n=>({...n,[key]:e.target.value}))}
                placeholder={SECTIONS[key].placeholder}
                onKeyDown={e=>e.key==='Enter'&&addItem(key)}
              />
              <button className="btn btn-sm btn-primary" onClick={()=>addItem(key)}>＋ Ekle</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ─── App ─── */
export default function App() {
  const [contacts, setContacts] = useState(() => loadContacts())
  const [orgs, setOrgs]         = useState(() => loadOrgs())
  const [events, setEvents]     = useState(() => loadEvents())
  const [config, setConfig]     = useState(() => loadConfig())
  const [activeModule, setActiveModule] = useState('contacts')

  // contact states
  const [search, setSearch]         = useState('')
  const [fCountry, setFCountry]     = useState('')
  const [fSector, setFSector]       = useState('')
  const [fRelType, setFRelType]     = useState('')
  const [fPriority, setFPriority]   = useState('')
  const [view, setView]             = useState('card')
  const [formOpen, setFormOpen]     = useState(false)
  const [editId, setEditId]         = useState(null)
  const [detailId, setDetailId]     = useState(null)
  const [deleteId, setDeleteId]     = useState(null)
  const fileInputRef = useRef()

  // org states
  const [orgSearch, setOrgSearch]     = useState('')
  const [orgView, setOrgView]         = useState('card')
  const [orgFormOpen, setOrgFormOpen] = useState(false)
  const [editOrgId, setEditOrgId]     = useState(null)
  const [detailOrgId, setDetailOrgId] = useState(null)
  const [deleteOrgId, setDeleteOrgId] = useState(null)
  const [pendingOrgId, setPendingOrgId] = useState('')

  // event states
  const [eventSearch, setEventSearch]       = useState('')
  const [eventView, setEventView]           = useState('card')
  const [eventFormOpen, setEventFormOpen]   = useState(false)
  const [editEventId, setEditEventId]       = useState(null)
  const [detailEventId, setDetailEventId]   = useState(null)
  const [deleteEventId, setDeleteEventId]   = useState(null)

  useEffect(() => { saveContacts(contacts) }, [contacts])
  useEffect(() => { saveOrgs(orgs) }, [orgs])
  useEffect(() => { saveEvents(events) }, [events])
  useEffect(() => { saveConfig(config) }, [config])

  const filtered = contacts.filter(c => {
    const q = search.toLowerCase().trim()
    const linkedOrg = orgs.find(o => o.id === c.orgId)
    const matchQ = !q || `${c.firstName} ${c.lastName}`.toLowerCase().includes(q)
      || (c.company||'').toLowerCase().includes(q) || (c.country||'').toLowerCase().includes(q)
      || (c.position||'').toLowerCase().includes(q) || (c.tags||[]).some(t=>t.toLowerCase().includes(q))
      || (linkedOrg?.name||'').toLowerCase().includes(q)
    return matchQ && (!fCountry||c.country===fCountry) && (!fSector||c.sector===fSector)
      && (!fRelType||c.relType===fRelType) && (!fPriority||c.priority===fPriority)
  })

  const filteredOrgs = orgs.filter(o => {
    const q = orgSearch.toLowerCase().trim()
    return !q || (o.name||'').toLowerCase().includes(q) || (o.type||'').toLowerCase().includes(q)
      || (o.sector||'').toLowerCase().includes(q) || (o.country||'').toLowerCase().includes(q)
  })

  const filteredEvents = events.filter(ev => {
    const q = eventSearch.toLowerCase().trim()
    return !q || (ev.title||'').toLowerCase().includes(q) || (ev.type||'').toLowerCase().includes(q)
      || (ev.location||'').toLowerCase().includes(q)
  })

  const countries = [...new Set(contacts.map(c=>c.country).filter(Boolean))].sort()
  const sectors   = [...new Set(contacts.map(c=>c.sector).filter(Boolean))].sort()
  const relTypes  = [...new Set(contacts.map(c=>c.relType).filter(Boolean))].sort()

  const handleSave = (formData) => {
    if (editId) setContacts(cs => cs.map(c => c.id===editId ? {...c,...formData} : c))
    else setContacts(cs => [...cs, { id:uid(), ...formData, communications:[], addedDate:todayStr() }])
    setFormOpen(false); setEditId(null)
  }
  const handleSaveOrg = (formData) => {
    if (editOrgId) setOrgs(os => os.map(o => o.id===editOrgId ? {...o,...formData} : o))
    else setOrgs(os => [...os, { id:uid(), ...formData, addedDate:todayStr() }])
    setOrgFormOpen(false); setEditOrgId(null)
  }
  const handleSaveEvent = (formData) => {
    if (editEventId) setEvents(es => es.map(e => e.id===editEventId ? {...e,...formData} : e))
    else setEvents(es => [...es, { id:uid(), ...formData, addedDate:todayStr() }])
    setEventFormOpen(false); setEditEventId(null)
  }
  const handleQuickCreateOrg = (name, type) => {
    const newOrg = { id:uid(), name, type:type||'', sector:'', country:'', city:'', website:'', phone:'', email:'', notes:'', addedDate:todayStr() }
    setOrgs(os => [...os, newOrg]); return newOrg
  }
  const handleNewContactForOrg = (orgId) => {
    setDetailOrgId(null); setPendingOrgId(orgId); setEditId(null); setFormOpen(true); setActiveModule('contacts')
  }
  const handleLinkContact = (contactId, orgId) => {
    setContacts(cs => cs.map(c => c.id===contactId ? {...c, orgId} : c))
  }
  const handleAddComm = (contactId, comm) => {
    setContacts(cs => cs.map(c => {
      if (c.id !== contactId) return c
      const newComms = [...(c.communications||[]), comm]
      const newLastContact = !c.lastContact || comm.date > c.lastContact ? comm.date : c.lastContact
      return { ...c, communications: newComms, lastContact: newLastContact }
    }))
  }
  const handleDeleteComm = (contactId, commId) => {
    setContacts(cs => cs.map(c => c.id!==contactId ? c : {...c, communications:(c.communications||[]).filter(cm=>cm.id!==commId)}))
  }
  const handleDelete = () => {
    setContacts(cs => cs.filter(c => c.id!==deleteId))
    if (detailId===deleteId) setDetailId(null)
    setDeleteId(null)
  }
  const handleDeleteOrg = () => {
    setContacts(cs => cs.map(c => c.orgId===deleteOrgId ? {...c,orgId:''} : c))
    setOrgs(os => os.filter(o => o.id!==deleteOrgId))
    if (detailOrgId===deleteOrgId) setDetailOrgId(null)
    setDeleteOrgId(null)
  }
  const handleDeleteEvent = () => {
    setEvents(es => es.filter(e => e.id!==deleteEventId))
    if (detailEventId===deleteEventId) setDetailEventId(null)
    setDeleteEventId(null)
  }
  const handleSaveConfig = (newConfig) => { setConfig(newConfig) }

  const exportCSV = () => {
    const headers = ['Ad','Soyad','Kurum','Pozisyon','Ülke','Şehir','E-posta','Telefon','LinkedIn','Web Sitesi','Sektör','İlişki Türü','Öncelik','Etiketler','Tanışma Tarihi','Son İletişim','Takip Tarihi','Notlar','Fırsatlar']
    const rows = contacts.map(c => [
      c.firstName, c.lastName, c.company, c.position, c.country, c.city,
      c.email, c.phone, c.linkedin, c.website, c.sector, c.relType, c.priority,
      (c.tags||[]).join(';'), c.meetDate, c.lastContact, c.nextFollowup, c.notes, c.opportunities
    ].map(v => `"${(v||'').replace(/"/g,'""')}"`))
    const csv = [headers.join(','), ...rows.map(r=>r.join(','))].join('\n')
    const blob = new Blob(['\uFEFF'+csv], {type:'text/csv;charset=utf-8'})
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob)
    a.download = `global_network_${todayStr()}.csv`; a.click()
  }
  const importCSV = (e) => {
    const file = e.target.files[0]; if (!file) return
    const reader = new FileReader()
    reader.onload = ev => {
      const lines = ev.target.result.split('\n').filter(l=>l.trim())
      const imported = []
      for (let i = 1; i < lines.length; i++) {
        const cols = parseCSVLine(lines[i])
        if (cols.length >= 2 && cols[0]) {
          imported.push({
            id:uid(), firstName:cols[0]||'', lastName:cols[1]||'',
            company:cols[2]||'', position:cols[3]||'', country:cols[4]||'', city:cols[5]||'',
            email:cols[6]||'', phone:cols[7]||'', linkedin:cols[8]||'', website:cols[9]||'',
            sector:cols[10]||'', relType:cols[11]||'', priority:cols[12]||'medium',
            tags:cols[13] ? cols[13].split(';').filter(Boolean) : [],
            meetDate:cols[14]||'', lastContact:cols[15]||'', nextFollowup:cols[16]||'',
            notes:cols[17]||'', opportunities:cols[18]||'',
            communications:[], addedDate:todayStr(), orgId:''
          })
        }
      }
      if (imported.length) { setContacts(cs => [...cs,...imported]); alert(`${imported.length} kişi aktarıldı.`) }
    }
    reader.readAsText(file, 'UTF-8'); e.target.value = ''
  }

  const editContact  = contacts.find(c => c.id===editId)    || null
  const detailContact= contacts.find(c => c.id===detailId)  || null
  const deleteContact= contacts.find(c => c.id===deleteId)
  const editOrg      = orgs.find(o => o.id===editOrgId)     || null
  const detailOrg    = orgs.find(o => o.id===detailOrgId)   || null
  const deleteOrg    = orgs.find(o => o.id===deleteOrgId)
  const editEvent    = events.find(e => e.id===editEventId)  || null
  const detailEvent  = events.find(e => e.id===detailEventId)|| null
  const deleteEvent  = events.find(e => e.id===deleteEventId)

  const openContact = (id) => { setDetailId(id) }
  const openOrg     = (id) => { setDetailOrgId(id) }
  const openEvent   = (id) => { setDetailEventId(id) }

  // search placeholder per module
  const searchPlaceholder = activeModule==='orgs' ? 'Kurum adı, tür, ülke ara…'
    : activeModule==='events' ? 'Etkinlik adı, tür, konum ara…'
    : 'İsim, şirket, ülke ara…'
  const searchValue = activeModule==='orgs' ? orgSearch : activeModule==='events' ? eventSearch : search
  const setSearchValue = activeModule==='orgs' ? setOrgSearch : activeModule==='events' ? setEventSearch : setSearch

  return (
    <>
      <nav className="navbar">
        <div className="navbar-brand"><span className="globe">🌐</span>Global <span>Network</span></div>
        <div className="nav-modules">
          <button className={`nav-module-btn${activeModule==='contacts'?' active':''}`} onClick={()=>setActiveModule('contacts')}>
            👥 Kişiler <span className="mod-count">{contacts.length}</span>
          </button>
          <button className={`nav-module-btn${activeModule==='orgs'?' active':''}`} onClick={()=>setActiveModule('orgs')}>
            🏛 Kurumlar <span className="mod-count">{orgs.length}</span>
          </button>
          <button className={`nav-module-btn${activeModule==='events'?' active':''}`} onClick={()=>setActiveModule('events')}>
            📅 Etkinlikler <span className="mod-count">{events.length}</span>
          </button>
          <button className={`nav-module-btn${activeModule==='admin'?' active':''}`} onClick={()=>setActiveModule('admin')}>
            ⚙ Admin
          </button>
        </div>
        {activeModule !== 'admin' && (
          <div className="search-wrap">
            <span className="search-icon">🔍</span>
            <input type="text" value={searchValue} onChange={e=>setSearchValue(e.target.value)} placeholder={searchPlaceholder}/>
          </div>
        )}
        <div className="navbar-right">
          {activeModule==='contacts' && <button className="btn-add-nav" onClick={()=>{setEditId(null);setFormOpen(true)}}>＋ Kişi Ekle</button>}
          {activeModule==='orgs'     && <button className="btn-add-nav btn-add-org" onClick={()=>{setEditOrgId(null);setOrgFormOpen(true)}}>＋ Kurum Ekle</button>}
          {activeModule==='events'   && <button className="btn-add-nav btn-add-event" onClick={()=>{setEditEventId(null);setEventFormOpen(true)}}>＋ Etkinlik Ekle</button>}
        </div>
      </nav>

      <StatsBar contacts={contacts} orgs={orgs} events={events}/>
      <FollowupBanner contacts={contacts}/>

      {/* ── CONTACTS ── */}
      {activeModule === 'contacts' && (
        <>
          <div className="toolbar-extra">
            <button className="btn-export" onClick={exportCSV}>⬇ CSV İndir</button>
            <label className="btn-export" style={{cursor:'pointer'}}>
              ⬆ CSV Yükle
              <input ref={fileInputRef} type="file" accept=".csv" style={{display:'none'}} onChange={importCSV}/>
            </label>
          </div>
          <div className="filters-bar">
            <select className="filter-select" value={fCountry} onChange={e=>setFCountry(e.target.value)}>
              <option value="">🌍 Ülke</option>
              {countries.map(c=><option key={c} value={c}>{c}</option>)}
            </select>
            <select className="filter-select" value={fSector} onChange={e=>setFSector(e.target.value)}>
              <option value="">🏢 Sektör</option>
              {sectors.map(s=><option key={s} value={s}>{s}</option>)}
            </select>
            <select className="filter-select" value={fRelType} onChange={e=>setFRelType(e.target.value)}>
              <option value="">👥 İlişki Türü</option>
              {relTypes.map(r=><option key={r} value={r}>{r}</option>)}
            </select>
            <select className="filter-select" value={fPriority} onChange={e=>setFPriority(e.target.value)}>
              <option value="">⭐ Öncelik</option>
              <option value="high">🔴 Yüksek</option>
              <option value="medium">🔵 Orta</option>
              <option value="low">⚪ Düşük</option>
            </select>
            <button className="filter-clear" onClick={()=>{setFCountry('');setFSector('');setFRelType('');setFPriority('');setSearch('')}}>✕ Temizle</button>
            <span className="results-count">{filtered.length} kişi</span>
            <div className="view-toggle">
              <button className={`view-btn${view==='card'?' active':''}`} onClick={()=>setView('card')} title="Kart">⊞</button>
              <button className={`view-btn${view==='table'?' active':''}`} onClick={()=>setView('table')} title="Tablo">☰</button>
            </div>
          </div>
          <div className="main-content">
            {view==='card'
              ? filtered.length===0 ? <EmptyState/>
                : <div className="cards-grid">{filtered.map(c=><ContactCard key={c.id} c={c} onOpen={setDetailId} onEdit={id=>{setEditId(id);setFormOpen(true)}} onDelete={setDeleteId} orgs={orgs}/>)}</div>
              : <TableView list={filtered} onOpen={setDetailId} onEdit={id=>{setEditId(id);setFormOpen(true)}} onDelete={setDeleteId} orgs={orgs}/>
            }
          </div>
        </>
      )}

      {/* ── ORGS ── */}
      {activeModule === 'orgs' && (
        <>
          <div className="filters-bar">
            <span className="results-count">{filteredOrgs.length} kurum</span>
            <div className="view-toggle" style={{marginLeft:'auto'}}>
              <button className={`view-btn${orgView==='card'?' active':''}`} onClick={()=>setOrgView('card')} title="Kart">⊞</button>
              <button className={`view-btn${orgView==='table'?' active':''}`} onClick={()=>setOrgView('table')} title="Tablo">☰</button>
            </div>
          </div>
          <div className="main-content">
            {orgView==='card'
              ? filteredOrgs.length===0 ? <EmptyState type="org"/>
                : <div className="cards-grid">{filteredOrgs.map(o=><OrgCard key={o.id} org={o} contacts={contacts} onOpen={setDetailOrgId} onEdit={id=>{setEditOrgId(id);setOrgFormOpen(true)}} onDelete={setDeleteOrgId}/>)}</div>
              : <OrgTableView list={filteredOrgs} contacts={contacts} onOpen={setDetailOrgId} onEdit={id=>{setEditOrgId(id);setOrgFormOpen(true)}} onDelete={setDeleteOrgId}/>
            }
          </div>
        </>
      )}

      {/* ── EVENTS ── */}
      {activeModule === 'events' && (
        <>
          <div className="filters-bar">
            <span className="results-count">{filteredEvents.length} etkinlik</span>
            <div className="view-toggle" style={{marginLeft:'auto'}}>
              <button className={`view-btn${eventView==='card'?' active':''}`} onClick={()=>setEventView('card')} title="Kart">⊞</button>
            </div>
          </div>
          <div className="main-content">
            {filteredEvents.length===0 ? <EmptyState type="event"/>
              : <div className="cards-grid">{filteredEvents.map(ev=><EventCard key={ev.id} event={ev} contacts={contacts} orgs={orgs} onOpen={setDetailEventId} onEdit={id=>{setEditEventId(id);setEventFormOpen(true)}} onDelete={setDeleteEventId}/>)}</div>
            }
          </div>
        </>
      )}

      {/* ── ADMIN ── */}
      {activeModule === 'admin' && (
        <AdminPanel config={config} onSaveConfig={handleSaveConfig}/>
      )}

      {/* ── MODALS ── */}
      <FormModal
        isOpen={formOpen} editContact={editContact} orgs={orgs} events={events} config={config}
        defaultOrgId={pendingOrgId}
        onClose={()=>{setFormOpen(false);setEditId(null);setPendingOrgId('')}}
        onSave={(data)=>{handleSave(data);setPendingOrgId('')}}
        onQuickCreateOrg={handleQuickCreateOrg}
      />
      <OrgFormModal isOpen={orgFormOpen} editOrg={editOrg} config={config}
        onClose={()=>{setOrgFormOpen(false);setEditOrgId(null)}} onSave={handleSaveOrg}/>
      <EventFormModal isOpen={eventFormOpen} editEvent={editEvent} contacts={contacts} orgs={orgs} config={config}
        onClose={()=>{setEventFormOpen(false);setEditEventId(null)}} onSave={handleSaveEvent}/>
      <DetailModal isOpen={!!detailId} contact={detailContact} orgs={orgs} events={events}
        onClose={()=>setDetailId(null)} onEdit={id=>{setEditId(id);setFormOpen(true)}}
        onAddComm={handleAddComm} onDeleteComm={handleDeleteComm} onOpenOrg={openOrg} onOpenEvent={openEvent}/>
      <OrgDetailModal isOpen={!!detailOrgId} org={detailOrg} contacts={contacts} allContacts={contacts} events={events}
        onClose={()=>setDetailOrgId(null)} onEdit={id=>{setEditOrgId(id);setOrgFormOpen(true)}}
        onOpenContact={openContact} onNewContact={handleNewContactForOrg}
        onLinkContact={handleLinkContact} onOpenEvent={openEvent}/>
      <EventDetailModal isOpen={!!detailEventId} event={detailEvent} contacts={contacts} orgs={orgs}
        onClose={()=>setDetailEventId(null)} onEdit={id=>{setEditEventId(id);setEventFormOpen(true)}}
        onOpenContact={openContact} onOpenOrg={openOrg}/>
      <DeleteModal isOpen={!!deleteId} name={deleteContact?`${deleteContact.firstName} ${deleteContact.lastName}`:''} onClose={()=>setDeleteId(null)} onConfirm={handleDelete}/>
      <DeleteModal isOpen={!!deleteOrgId} name={deleteOrg?.name||''} message={deleteOrg?`"${deleteOrg.name}" kurumunu silmek istediğinize emin misiniz? Bu kuruma bağlı kişilerin bağlantısı kaldırılacak.`:''}
        onClose={()=>setDeleteOrgId(null)} onConfirm={handleDeleteOrg}/>
      <DeleteModal isOpen={!!deleteEventId} name={deleteEvent?.title||''} onClose={()=>setDeleteEventId(null)} onConfirm={handleDeleteEvent}/>
    </>
  )
}
