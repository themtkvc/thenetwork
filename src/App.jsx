import { useState, useEffect, useCallback, useRef } from 'react'
import './App.css'
import { uid, todayStr, formatDate, dayDiff, loadContacts, saveContacts, parseCSVLine } from './utils'

const SECTORS = ['Teknoloji','Finans','Sağlık','Eğitim & Akademi','Enerji','Hukuk','Medya & İletişim','Danışmanlık','Gayrimenkul','Üretim & Sanayi','Sivil Toplum','Kamu & Diplomasi','Diğer']
const REL_TYPES = ['Müşteri','Partner','Mentor','Meslektaş','Yatırımcı','Tedarikçi','Akademisyen','Eski İş Arkadaşı','Arkadaş','Potansiyel Müşteri','Diğer']
const COMM_TYPES = { email:'📧', meeting:'🤝', call:'📞', linkedin:'💼', other:'💬' }
const COMM_TYPE_LABELS = { email:'E-posta', meeting:'Toplantı', call:'Telefon', linkedin:'LinkedIn', other:'Diğer' }
const PRIORITY_LABELS = { high:'Yüksek', medium:'Orta', low:'Düşük' }

const emptyForm = () => ({
  firstName:'', lastName:'', company:'', position:'', country:'', city:'',
  email:'', phone:'', linkedin:'', website:'',
  sector:'', relType:'', priority:'medium', tags:'',
  lastContact:'', nextFollowup:'', notes:'', opportunities:''
})

function StatsBar({ contacts }) {
  const countries = new Set(contacts.map(c => c.country).filter(Boolean))
  const today = todayStr()
  const overdue = contacts.filter(c => c.nextFollowup && c.nextFollowup < today).length
  const highPri = contacts.filter(c => c.priority === 'high').length
  return (
    <div className="stats-bar">
      <div className="stat-card"><div className="stat-icon blue">👥</div><div><div className="stat-label">Toplam Kişi</div><div className="stat-value">{contacts.length}</div></div></div>
      <div className="stat-card"><div className="stat-icon green">🌍</div><div><div className="stat-label">Ülke Sayısı</div><div className="stat-value">{countries.size}</div></div></div>
      <div className="stat-card"><div className="stat-icon gold">⭐</div><div><div className="stat-label">Yüksek Öncelik</div><div className="stat-value">{highPri}</div></div></div>
      <div className="stat-card"><div className="stat-icon red">⏰</div><div><div className="stat-label">Takip Gereken</div><div className="stat-value">{overdue}</div></div></div>
    </div>
  )
}

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

function ContactCard({ c, onOpen, onEdit, onDelete }) {
  const initials = (c.firstName?.[0]||'') + (c.lastName?.[0]||'')
  const today = todayStr()
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
          {c.company && <div className="card-company">🏢 {c.company}</div>}
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

function TableView({ list, onOpen, onEdit, onDelete }) {
  const today = todayStr()
  if (!list.length) return <EmptyState/>
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Ad Soyad</th><th>Kurum</th><th>Ülke</th><th>Sektör</th>
            <th>İlişki</th><th>Öncelik</th><th>Son İletişim</th><th>Takip</th><th></th>
          </tr>
        </thead>
        <tbody>
          {list.map(c => {
            const initials = (c.firstName?.[0]||'') + (c.lastName?.[0]||'')
            const isOverdue = c.nextFollowup && c.nextFollowup < today
            return (
              <tr key={c.id}>
                <td>
                  <div style={{display:'flex',alignItems:'center',gap:'9px'}}>
                    <div className="avatar" style={{width:32,height:32,fontSize:12}}>{initials}</div>
                    <div>
                      <div className="table-name" onClick={()=>onOpen(c.id)}>{c.firstName} {c.lastName}</div>
                      {c.position && <div className="table-sub">{c.position}</div>}
                    </div>
                  </div>
                </td>
                <td>{c.company||'—'}</td>
                <td>{c.country||'—'}</td>
                <td>{c.sector ? <span className="badge badge-sector">{c.sector}</span> : '—'}</td>
                <td>{c.relType ? <span className="badge badge-rel">{c.relType}</span> : '—'}</td>
                <td><span className={`badge badge-priority-${c.priority||'medium'}`}>{PRIORITY_LABELS[c.priority]||'Orta'}</span></td>
                <td style={{fontSize:'12.5px'}}>{c.lastContact ? formatDate(c.lastContact) : '—'}</td>
                <td style={{fontSize:'12.5px', color: isOverdue ? 'var(--red)' : undefined, fontWeight: isOverdue ? 600 : undefined}}>
                  {c.nextFollowup ? formatDate(c.nextFollowup) : '—'}
                </td>
                <td>
                  <div style={{display:'flex',gap:'4px'}}>
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

function EmptyState() {
  return (
    <div className="empty-state">
      <div className="empty-icon">🔍</div>
      <h3>Kişi bulunamadı</h3>
      <p>Arama kriterlerinizi değiştirmeyi ya da yeni kişi eklemeyi deneyin.</p>
    </div>
  )
}

function FormModal({ isOpen, editContact, onClose, onSave }) {
  const [form, setForm] = useState(emptyForm())
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
        lastContact: editContact.lastContact||'', nextFollowup: editContact.nextFollowup||'',
        notes: editContact.notes||'', opportunities: editContact.opportunities||''
      })
    } else {
      setForm(emptyForm())
    }
  }, [editContact, isOpen])

  useEffect(() => {
    const handleKey = e => { if (e.key === 'Escape') onClose() }
    if (isOpen) window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [isOpen, onClose])

  if (!isOpen) return null
  const set = (k, v) => setForm(f => ({...f, [k]: v}))
  const handleSave = () => {
    if (!form.firstName.trim() || !form.lastName.trim()) { alert('Ad ve Soyad zorunludur.'); return; }
    const tags = form.tags ? form.tags.split(',').map(t=>t.trim()).filter(Boolean) : []
    onSave({ ...form, tags })
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
              <div className="form-group"><label>Kurum / şirket</label><input className="form-control" value={form.company} onChange={e=>set('company',e.target.value)} placeholder="şirket veya kurum adı"/></div>
              <div className="form-group"><label>Pozisyon / Unvan</label><input className="form-control" value={form.position} onChange={e=>set('position',e.target.value)} placeholder="Örn. CEO, Research Director"/></div>
              <div className="form-group"><label>Ülke</label><input className="form-control" value={form.country} onChange={e=>set('country',e.target.value)} placeholder="Örn. Almanya, ABD"/></div>
              <div className="form-group"><label>Şehir</label><input className="form-control" value={form.city} onChange={e=>set('city',e.target.value)} placeholder="Şehir"/></div>
              <div className="form-group"><label>E-posta</label><input type="email" className="form-control" value={form.email} onChange={e=>set('email',e.target.value)} placeholder="ornek@sirket.com"/></div>
              <div className="form-group"><label>Telefon</label><input className="form-control" value={form.phone} onChange={e=>set('phone',e.target.value)} placeholder="+49 123 456 7890"/></div>
              <div className="form-group"><label>LinkedIn URL</label><input type="url" className="form-control" value={form.linkedin} onChange={e=>set('linkedin',e.target.value)} placeholder="https://linkedin.com/in/..."/></div>
              <div className="form-group"><label>Web Sitesi</label><input type="url" className="form-control" value={form.website} onChange={e=>set('website',e.target.value)} placeholder="https://..."/></div>
            </div>
          </div>
          <div className="form-section">
            <div className="form-section-title">🏷️ Kategori & Etiketler</div>
            <div className="form-grid cols3">
              <div className="form-group"><label>Sektör</label>
                <select className="form-control" value={form.sector} onChange={e=>set('sector',e.target.value)}>
                  <option value="">Seçin</option>
                  {SECTORS.map(s=><option key={s}>{s}</option>)}
                </select>
              </div>
              <div className="form-group"><label>İlişki Türü</label>
                <select className="form-control" value={form.relType} onChange={e=>set('relType',e.target.value)}>
                  <option value="">Seçin</option>
                  {REL_TYPES.map(r=><option key={r}>{r}</option>)}
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

function DetailModal({ isOpen, contact, onClose, onEdit, onAddComm, onDeleteComm }) {
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
              <p>{c.position}{c.position && c.company ? ' · ' : ''}{c.company}</p>
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
              <div className="info-item"><div className="info-lbl">Son İletişim</div><div className="info-val">{c.lastContact ? formatDate(c.lastContact) : '—'}</div></div>
              <div className="info-item"><div className="info-lbl">Sonraki Takip</div>
                <div className="info-val" style={c.nextFollowup && c.nextFollowup < today ? {color:'var(--red)',fontWeight:700} : {}}>
                  {c.nextFollowup ? formatDate(c.nextFollowup) : '—'}
                </div>
              </div>
            </div>
          </div>
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

function DeleteModal({ isOpen, contactName, onClose, onConfirm }) {
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
          <span className="modal-title">Kişiyi Sil</span>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          <p style={{fontSize:14,color:'var(--gray-600)'}}>"{contactName}" adlı kişiyi silmek istediğinize emin misiniz? Bu işlem geri alınamaz.</p>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>İptal</button>
          <button className="btn btn-danger" onClick={onConfirm}>🗑 Sil</button>
        </div>
      </div>
    </div>
  )
}

export default function App() {
  const [contacts, setContacts] = useState(() => loadContacts())
  const [search, setSearch] = useState('')
  const [fCountry, setFCountry] = useState('')
  const [fSector, setFSector] = useState('')
  const [fRelType, setFRelType] = useState('')
  const [fPriority, setFPriority] = useState('')
  const [view, setView] = useState('card')
  const [formOpen, setFormOpen] = useState(false)
  const [editId, setEditId] = useState(null)
  const [detailId, setDetailId] = useState(null)
  const [deleteId, setDeleteId] = useState(null)
  const fileInputRef = useRef()

  useEffect(() => { saveContacts(contacts) }, [contacts])

  const filtered = contacts.filter(c => {
    const q = search.toLowerCase().trim()
    const fullName = `${c.firstName} ${c.lastName}`.toLowerCase()
    const matchQ = !q || fullName.includes(q) || (c.company||'').toLowerCase().includes(q)
      || (c.country||'').toLowerCase().includes(q) || (c.position||'').toLowerCase().includes(q)
      || (c.tags||[]).some(t => t.toLowerCase().includes(q))
    return matchQ
      && (!fCountry || c.country === fCountry)
      && (!fSector || c.sector === fSector)
      && (!fRelType || c.relType === fRelType)
      && (!fPriority || c.priority === fPriority)
  })

  const countries = [...new Set(contacts.map(c=>c.country).filter(Boolean))].sort()
  const sectors = [...new Set(contacts.map(c=>c.sector).filter(Boolean))].sort()
  const relTypes = [...new Set(contacts.map(c=>c.relType).filter(Boolean))].sort()

  const handleSave = (formData) => {
    if (editId) {
      setContacts(cs => cs.map(c => c.id === editId ? {...c, ...formData} : c))
    } else {
      setContacts(cs => [...cs, { id: uid(), ...formData, communications: [], addedDate: todayStr() }])
    }
    setFormOpen(false)
    setEditId(null)
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
    setContacts(cs => cs.map(c => c.id !== contactId ? c : {...c, communications: (c.communications||[]).filter(cm=>cm.id!==commId)}))
  }

  const handleDelete = () => {
    setContacts(cs => cs.filter(c => c.id !== deleteId))
    setDeleteId(null)
    if (detailId === deleteId) setDetailId(null)
  }

  const exportCSV = () => {
    const headers = ['Ad','Soyad','Kurum','Pozisyon','Ülke','Şehir','E-posta','Telefon','LinkedIn','Web Sitesi','Sektör','İlişki Türü','Öncelik','Etiketler','Son İletişim','Takip Tarihi','Notlar','Fırsatlar']
    const rows = contacts.map(c => [
      c.firstName, c.lastName, c.company, c.position, c.country, c.city,
      c.email, c.phone, c.linkedin, c.website, c.sector, c.relType, c.priority,
      (c.tags||[]).join(';'), c.lastContact, c.nextFollowup, c.notes, c.opportunities
    ].map(v => `"${(v||'').replace(/"/g,'""')}"`))
    const csv = [headers.join(','), ...rows.map(r=>r.join(','))].join('\n')
    const blob = new Blob(['\uFEFF'+csv], {type:'text/csv;charset=utf-8'})
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `global_network_${todayStr()}.csv`
    a.click()
  }

  const importCSV = (e) => {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => {
      const lines = ev.target.result.split('\n').filter(l=>l.trim())
      const imported = []
      for (let i = 1; i < lines.length; i++) {
        const cols = parseCSVLine(lines[i])
        if (cols.length >= 2 && cols[0]) {
          imported.push({
            id: uid(), firstName: cols[0]||'', lastName: cols[1]||'',
            company: cols[2]||'', position: cols[3]||'', country: cols[4]||'', city: cols[5]||'',
            email: cols[6]||'', phone: cols[7]||'', linkedin: cols[8]||'', website: cols[9]||'',
            sector: cols[10]||'', relType: cols[11]||'', priority: cols[12]||'medium',
            tags: cols[13] ? cols[13].split(';').filter(Boolean) : [],
            lastContact: cols[14]||'', nextFollowup: cols[15]||'',
            notes: cols[16]||'', opportunities: cols[17]||'',
            communications: [], addedDate: todayStr()
          })
        }
      }
      if (imported.length) {
        setContacts(cs => [...cs, ...imported])
        alert(`${imported.length} kişi başarıyla içe aktarıldı.`)
      }
    }
    reader.readAsText(file, 'UTF-8')
    e.target.value = ''
  }

  const editContact = contacts.find(c => c.id === editId) || null
  const detailContact = contacts.find(c => c.id === detailId) || null
  const deleteContact = contacts.find(c => c.id === deleteId)

  return (
    <>
      <nav className="navbar">
        <div className="navbar-brand"><span className="globe">🌐</span>Global <span>Network</span></div>
        <div className="search-wrap">
          <span className="search-icon">🔍</span>
          <input type="text" value={search} onChange={e=>setSearch(e.target.value)} placeholder="İsim, şirket, ülke ara…"/>
        </div>
        <div className="navbar-right">
          <button className="btn-add-nav" onClick={()=>{setEditId(null);setFormOpen(true)}}>＋ Kişi Ekle</button>
        </div>
      </nav>

      <StatsBar contacts={contacts}/>
      <FollowupBanner contacts={contacts}/>

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
          <button className={`view-btn${view==='card'?' active':''}`} onClick={()=>setView('card')} title="Kart Görünümü">⊞</button>
          <button className={`view-btn${view==='table'?' active':''}`} onClick={()=>setView('table')} title="Tablo Görünümü">☰</button>
        </div>
      </div>

      <div className="main-content">
        {view === 'card'
          ? filtered.length === 0
            ? <EmptyState/>
            : <div className="cards-grid">
                {filtered.map(c => <ContactCard key={c.id} c={c} onOpen={setDetailId} onEdit={id=>{setEditId(id);setFormOpen(true)}} onDelete={setDeleteId}/>)}
              </div>
          : <TableView list={filtered} onOpen={setDetailId} onEdit={id=>{setEditId(id);setFormOpen(true)}} onDelete={setDeleteId}/>
        }
      </div>

      <FormModal isOpen={formOpen} editContact={editContact} onClose={()=>{setFormOpen(false);setEditId(null)}} onSave={handleSave}/>
      <DetailModal isOpen={!!detailId} contact={detailContact} onClose={()=>setDetailId(null)} onEdit={id=>{setEditId(id);setFormOpen(true)}} onAddComm={handleAddComm} onDeleteComm={handleDeleteComm}/>
      <DeleteModal isOpen={!!deleteId} contactName={deleteContact ? `${deleteContact.firstName} ${deleteContact.lastName}` : ''} onClose={()=>setDeleteId(null)} onConfirm={handleDelete}/>
    </>
  )
}
