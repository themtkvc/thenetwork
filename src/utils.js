export const DEFAULT_CONFIG = {
  sectors: ['Teknoloji','Finans','Sağlık','Eğitim & Akademi','Enerji','Hukuk','Medya & İletişim','Danışmanlık','Gayrimenkul','Üretim & Sanayi','Sivil Toplum','Kamu & Diplomasi','Diğer'],
  orgTypes: ['Şirket','Üniversite','Araştırma Enstitüsü','STK / Vakıf','Kamu Kurumu','Uluslararası Kuruluş','Girişim','Yatırım Fonu','Medya Kuruluşu','Diğer'],
  relTypes: ['Müşteri','Partner','Mentor','Meslektaş','Yatırımcı','Tedarikçi','Akademisyen','Eski İş Arkadaşı','Arkadaş','Potansiyel Müşteri','Diğer'],
  eventTypes: ['Konferans','Networking','Workshop','Panel','Seminer','Zirve','Fuar','Yuvarlak Masa','Diğer']
}

export function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

export function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

export function formatDate(str) {
  if (!str) return '';
  const [y, m, d] = str.split('-');
  const months = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];
  return `${parseInt(d)} ${months[parseInt(m) - 1]} ${y}`;
}

export function dayDiff(a, b) {
  return Math.round((new Date(b) - new Date(a)) / 86400000);
}

export function getSampleData() {
  return [
    {
      id: uid(), firstName: 'Sophie', lastName: 'Müller',
      company: 'Berlin Tech GmbH', position: 'Chief Innovation Officer',
      country: 'Almanya', city: 'Berlin',
      email: 'sophie.muller@berlintech.de', phone: '+49 30 1234567',
      linkedin: 'https://linkedin.com/in/sophiemuller', website: '',
      sector: 'Teknoloji', relType: 'Partner', priority: 'high',
      tags: ['yapay zeka', 'startup'],
      meetDate: '2025-06-01',
      lastContact: '2026-02-10', nextFollowup: '2026-03-15',
      communications: [
        { id: uid(), date: '2026-02-10', type: 'meeting', note: "Berlin'de ofisinde buluştuk. Ortak AR-GE projesi için MOU imzaladık." },
        { id: uid(), date: '2025-11-20', type: 'email', note: 'Q4 partnership raporu gönderildi.' }
      ],
      notes: "Yapay zeka alanında çok güçlü bir ağı var.",
      opportunities: 'AB Horizon Europe hibe başvurusu için ortaklık.',
      addedDate: '2025-06-01', orgId: ''
    },
    {
      id: uid(), firstName: 'James', lastName: 'Chen',
      company: 'Singapore Ventures', position: 'Managing Director',
      country: 'Singapur', city: 'Singapur',
      email: 'jchen@sgventures.com', phone: '+65 9123 4567',
      linkedin: '', website: 'https://sgventures.com',
      sector: 'Finans', relType: 'Yatırımcı', priority: 'high',
      tags: ['yatırım', 'ASEAN', 'seri-A'],
      meetDate: '2025-09-15',
      lastContact: '2026-01-28', nextFollowup: '2026-03-05',
      communications: [
        { id: uid(), date: '2026-01-28', type: 'call', note: 'Yeni fon stratejisi hakkında 45 dk. konuştuk.' }
      ],
      notes: "Güneydoğu Asya'daki en aktif yatırımcılardan biri.",
      opportunities: "Seri A turunda lider yatırımcı olabilir.",
      addedDate: '2025-09-15', orgId: ''
    },
    {
      id: uid(), firstName: 'Amara', lastName: 'Diallo',
      company: 'AfriHealth Institute', position: 'Research Director',
      country: 'Nijerya', city: 'Lagos',
      email: 'a.diallo@afrihealth.org', phone: '+234 801 234 5678',
      linkedin: 'https://linkedin.com/in/amaradiallo', website: '',
      sector: 'Sağlık', relType: 'Akademisyen', priority: 'medium',
      tags: ['global sağlık', 'araştırma', 'Afrika'],
      meetDate: '2025-12-05',
      lastContact: '2025-12-05', nextFollowup: '2026-04-01',
      communications: [
        { id: uid(), date: '2025-12-05', type: 'linkedin', note: 'WHO konferansı sonrası bağlantı isteği kabul edildi.' }
      ],
      notes: 'WHO Danışma Kurulu üyesi.',
      opportunities: "Ortak yayın için araştırma verisi paylaşımı.",
      addedDate: '2025-12-05', orgId: ''
    }
  ];
}

const CONTACTS_KEY = 'gnm_contacts_v2';
export function loadContacts() {
  try {
    const raw = localStorage.getItem(CONTACTS_KEY);
    return raw ? JSON.parse(raw) : getSampleData();
  } catch { return getSampleData(); }
}
export function saveContacts(contacts) {
  localStorage.setItem(CONTACTS_KEY, JSON.stringify(contacts));
}

const ORG_KEY = 'gnm_orgs_v1';
export function loadOrgs() {
  try {
    const raw = localStorage.getItem(ORG_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}
export function saveOrgs(orgs) {
  localStorage.setItem(ORG_KEY, JSON.stringify(orgs));
}

const CONFIG_KEY = 'gnm_config_v1';
export function loadConfig() {
  try {
    const raw = localStorage.getItem(CONFIG_KEY);
    if (!raw) return { ...DEFAULT_CONFIG };
    const saved = JSON.parse(raw);
    return {
      sectors:    saved.sectors    || DEFAULT_CONFIG.sectors,
      orgTypes:   saved.orgTypes   || DEFAULT_CONFIG.orgTypes,
      relTypes:   saved.relTypes   || DEFAULT_CONFIG.relTypes,
      eventTypes: saved.eventTypes || DEFAULT_CONFIG.eventTypes,
    };
  } catch { return { ...DEFAULT_CONFIG }; }
}
export function saveConfig(config) {
  localStorage.setItem(CONFIG_KEY, JSON.stringify(config));
}

const EVENTS_KEY = 'gnm_events_v1';
export function loadEvents() {
  try {
    const raw = localStorage.getItem(EVENTS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}
export function saveEvents(events) {
  localStorage.setItem(EVENTS_KEY, JSON.stringify(events));
}

export function parseCSVLine(line) {
  const result = []; let cur = ''; let inQ = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQ && line[i + 1] === '"') { cur += '"'; i++; }
      else inQ = !inQ;
    } else if (ch === ',' && !inQ) { result.push(cur); cur = ''; }
    else cur += ch;
  }
  result.push(cur);
  return result;
}
