import {guideVideo,VideoPlayer} from './VideoPlayer';
import {Video} from 'lucide-react';
import {useState, type FormEvent} from 'react';
import {Modal} from './Modal';

export type PowerBiReport = {id: string; name: string; embed: string; guide: string; area?: string; description?: string};

export function PowerBiIcon({size = 17}: {size?: number}) {
  return <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
    <rect x="14" y="2" width="8" height="20" rx="2" fill="#e5a700"/>
    <rect x="8" y="7" width="8" height="15" rx="2" fill="#f2be1a"/>
    <rect x="2" y="12" width="8" height="10" rx="2" fill="#ffdb57"/>
  </svg>;
}

function parseHttps(value: string) {
  try {
    const url = new URL(value);
    if (url.protocol === 'https:' && !url.username && !url.password) return url;
  } catch {}
  return null;
}

function embedUrl(value: string) {
  const url = parseHttps(value);
  return url?.origin === 'https://app.powerbi.com' && /^\/(reportEmbed|dashboardEmbed|view)\/?$/i.test(url.pathname) ? url.href : null;
}

export function PowerBiReports({reports, canManage, onAdd, reportId}: {
  reportId?: string; reports: PowerBiReport[]; canManage: boolean; onAdd: (report: PowerBiReport) => boolean;
}) {
  const [videoReport,setVideoReport]=useState<PowerBiReport|null>(null);
  const [videoError,setVideoError]=useState('');
  const [adding, setAdding] = useState(false);
  const [selection, setSelection] = useState({route:reportId,id:reportId ?? ''});
  const selectedId = selection.route === reportId ? selection.id : reportId ?? '';
  const setSelectedId = (id: string) => setSelection({route:reportId,id});
  const [error, setError] = useState('');
  const selected = reports.find(report => report.id === selectedId);
  const source = selected && embedUrl(selected.embed);
  const player=videoReport&&guideVideo(videoReport.guide);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const name = String(data.get('name') ?? '').trim();
    const embed = embedUrl(String(data.get('embed') ?? '').trim());
    const guide = String(data.get('guide') ?? '').trim();
    if (!name || !embed || (guide && !guideVideo(guide))) {
      setError('نام، نشانی جاسازی Power BI و لینک فایل ویدئویی یا Google Drive را بررسی کنید.');
      return;
    }
    const area = String(data.get('area') ?? '').trim();
    const description = String(data.get('description') ?? '').trim();
    const report = {id: crypto.randomUUID(), name, embed, guide, area, description};
    if (onAdd(report)) {
      setSelectedId(report.id);
      setAdding(false);
      setError('');
    }
  }

  return <>
    {canManage && <div className="kpi-actions">
      <button type="button" className="secondary" aria-expanded={adding}
        onClick={() => {setAdding(!adding);setError('');}}>افزودن داشبورد</button>
    </div>}
    {adding && canManage && <form className="panel kpi-form" onSubmit={submit}>
      <label>نام داشبورد<input name="name" required maxLength={120}/></label>
      <label>حوزه<input name="area" maxLength={60}/></label>
      <label>توضیح کوتاه<input name="description" maxLength={240}/></label>
      <label>لینک جاسازی Power BI<input type="url" dir="ltr" name="embed" required/></label>
      <label>لینک ویدئوی راهنما (Google Drive یا MP4/WebM)<input type="url" dir="ltr" name="guide"/></label>
      <button className="primary">ذخیره داشبورد</button>
      {error && <p role="alert" className="alert error">{error}</p>}
    </form>}
    {reports.length ? <div className="power-bi-grid" aria-label="داشبوردهای Power BI">
      {reports.map(report => {

        return <article key={report.id} className="panel power-bi-card">
          <button type="button" className="power-bi-open" aria-pressed={report.id === selectedId} onClick={() => setSelectedId(report.id)}>
            <span><PowerBiIcon size={23}/><small>{report.area ?? 'Power BI'}</small></span>
            <strong>{report.name}</strong>{report.description && <span className="power-bi-description">{report.description}</span>}
          </button>
          <button type="button" className="secondary power-bi-guide" onClick={()=>{setVideoError('');setVideoReport(report);}}>
           <Video size={16}/>راهنمای داشبورد
          </button>
        </article>;
      })}
    </div> : <p className="empty-inline">هنوز داشبوردی ثبت نشده است.</p>}
    {selectedId && !selected && <p className="empty-inline">داشبورد در دسترس نیست.</p>}
    {selected && <Modal label={selected.name} className="panel power-bi-dialog" onClose={()=>setSelectedId('')}>
      <header><h2>{selected.name}</h2><button type="button" className="secondary" onClick={()=>setSelectedId('')}>بستن</button></header>
      {selected.description && <p>{selected.description}</p>}
      {source ? <iframe className="power-bi-frame" src={source} title={selected.name} allow="fullscreen"/> :
        <small>نمونهٔ دمو</small>}
    </Modal>}
    {videoReport && <Modal className="panel power-bi-dialog" label={'راهنمای '+videoReport.name} onClose={()=>setVideoReport(null)}>
      <header><h2>راهنمای {videoReport.name}</h2><button type="button" className="secondary" onClick={()=>setVideoReport(null)}>بستن</button></header>
      {player ? <VideoPlayer source={player} title={'ویدئوی راهنمای '+videoReport.name}/> :
        <p className="empty-inline">هنوز ویدئوی راهنما ثبت نشده است.</p>}
      {canManage&&<form className="kpi-form" onSubmit={event=>{
        event.preventDefault();
        const guide=String(new FormData(event.currentTarget).get('videoGuide')??'').trim();
        if(guide&&!guideVideo(guide)){setVideoError('لینک فایل ویدئویی Google Drive، MP4 یا WebM را بررسی کنید.');return;}
        const updated={...videoReport,guide};
        if(onAdd(updated)){setVideoError('');setVideoReport(updated);}
      }}>
        <label>لینک ویدئوی Google Drive یا MP4/WebM<input dir="ltr" type="url" name="videoGuide" defaultValue={player?videoReport.guide:''}/></label>
        <button className="primary">ذخیره راهنما</button>
        {videoError&&<p role="alert" className="alert error">{videoError}</p>}
      </form>}
    </Modal>}

  </>;
}
