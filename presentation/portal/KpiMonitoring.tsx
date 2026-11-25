import {current, read, storageKey, type Card, type ChartKind, type Measurement, type Model, type Theme} from './kpi-monitoring-storage';
import {loadPortfolio} from './okr/portfolio-storage';
import {activeKpiTargets} from './okr/kpi-targets';
import {useEffect, useState, type FormEvent, type ReactNode} from 'react';
import {LayoutDashboard, ClipboardList, Plus, Save, Pencil, Trash2} from 'lucide-react';
import type {Data, KPI} from './types';
import {latestPerPeriod} from './kpi-periods';
import {Modal} from './Modal';
import {currentPath, go, number, routeQuery} from './ui';
import {JalaliDatePicker} from './JalaliDatePicker';
import {PowerBiIcon, PowerBiReports, type PowerBiReport} from './PowerBiReports';
import './kpi-monitoring.css';

const charts = {line: 'خطی', bar: 'میله‌ای', pie: 'دایره‌ای'} as const;
const tabs = [
  ['dashboard', 'داشبورد شاخص‌ها', LayoutDashboard],
  ['profiles', 'شناسنامه شاخص‌ها', ClipboardList],
  ['power-bi', 'PowerBI', PowerBiIcon],
] as const;
const themes = {
  ocean: {name:'آبی اقیانوسی', colors:['#2669a7','#1a8391','#6b60af','#4b8cbf','#277173','#754e88']},
  forest: {name:'سبز جنگلی', colors:['#267452','#63994c','#257a75','#906d37','#57744e','#749d8a']},
  sunset: {name:'غروب گرم', colors:['#af492e','#b87b29','#963a5b','#8a5191','#8a654c','#c28843']},
};
const dates = new Intl.DateTimeFormat('fa-IR-u-ca-persian', {year: 'numeric', month: 'short', day: 'numeric', timeZone: 'Asia/Tehran'});
const timestamps = new Intl.DateTimeFormat('fa-IR-u-ca-persian', {dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Tehran'});
const labelDate = (date: string) => dates.format(new Date(date + 'T12:00:00Z'));
function Chart({kpi, card, rows, targets}: {kpi: KPI; card: Card; rows: Measurement[]; targets:number[]}) {
  const points = latestPerPeriod(rows, kpi.frequency);
  if (!points.length) return <p className="empty-inline">در این بازه مقداری ثبت نشده است.</p>;
  const {kind, labels = true} = card;
  const colors = (themes[card.theme ?? 'ocean'] ?? themes.ocean).colors;
  const values = points.map(point => current(point.row).value);
  const total = values.reduce((sum, value) => sum + value, 0);
  if (kind === 'pie' && (values.some(value => value < 0) || total <= 0 || !Number.isFinite(total))) {
    return <p className="empty-inline">نمودار دایره‌ای به مقادیر غیرمنفی با مجموع بیشتر از صفر نیاز دارد.</p>;
  }
  let cumulative = 0;
  const segments = kind === 'pie' ? values.map((value, index) => {
    const start = cumulative;
    cumulative += value / total * 100;
    return colors[index % colors.length] + ' ' + start + '% ' + cumulative + '%';
  }) : [];
  const low = Math.min(0, ...targets, ...values);
  const high = Math.max(0, ...targets, ...values) || (low===0?1:0);
  const scale = Math.max(Math.abs(low), Math.abs(high)) || 1;
  const range = high / scale - low / scale || 1;
  const y = (value: number) => 110 - (value / scale - low / scale) / range * 82;
  const span = points[points.length - 1].index - points[0].index + 1;
  const left = labels ? 24 : 49;
  const spacing = (320-left) / span;
  const x = (index: number) => left + (points[index].index - points[0].index + .5) * spacing;
  const stride = Math.ceil(points.length / 8);
  const shortMonth = /ماهانه|monthly/i.test(kpi.frequency??'');
  return <>
    {kind === 'pie' ? <div className="kpi-pie-layout"><div className="kpi-pie" aria-hidden="true" style={{background:'conic-gradient('+segments.join(',')+')'}}/>
      {labels&&<ul className="kpi-pie-labels">{points.map((point,index)=><li key={point.index}><i style={{background:colors[index%colors.length]}}/>{point.label} · {number.format(Math.round(values[index]/total*100))}٪</li>)}</ul>}
    </div> :
      <svg className="kpi-plot" viewBox="0 0 345 142" aria-hidden="true" direction="ltr" style={{color:colors[0]}}>
        {!labels && [0,.25,.5,.75,1].map(fraction=>{
          const value=low+(high-low)*fraction;
          return <g key={fraction} className="kpi-y-tick">
           <line x1={left} x2="320" y1={y(value)} y2={y(value)} stroke="currentColor" opacity=".17"/>
           <text x={left-6} y={y(value)+3} textAnchor="end" fill="currentColor" fontSize="9">{number.format(Number(value.toPrecision(3)))}</text>
          </g>;
        })}
        {!labels && <line x1={left} x2={left} y1={y(low)} y2={28} stroke="currentColor" opacity=".4"/>}
        <line x1={left} y1={y(0)} x2="320" y2={y(0)} stroke="currentColor" opacity=".25"/>
        {targets.map(target=><line key={target} x1={left} x2="320" y1={y(target)} y2={y(target)} stroke="#9a5b2c" strokeDasharray="4 3"/>)}
        {kind === 'line' && <polyline points={values.map((value, index) => x(index)+','+y(value)).join(' ')} fill="none" stroke="currentColor" strokeWidth="2"/>}
        {values.map((value, index) => <g key={points[index].index}>
          <title>{points[index].label} · {number.format(value)}</title>
          {kind==='line'?<circle cx={x(index)} cy={y(value)} r="3" fill="currentColor"/>:
            <rect x={x(index)-Math.min(12,spacing*.33)} y={Math.min(y(value),y(0))}
              width={Math.min(24,spacing*.66)} height={Math.max(1,Math.abs(y(value)-y(0)))} rx="2" fill="currentColor"/>}
          {labels&&<text className="kpi-data-label" x={x(index)} y={Math.min(y(value),y(0))-5} textAnchor="middle" fill="currentColor" fontSize="9">{number.format(value)}</text>}
          {index%stride===0&&<text x={x(index)} y="132" textAnchor="middle" fill="currentColor" fontSize="8">{shortMonth?points[index].label.split(' ')[0]:points[index].label}</text>}
        </g>)}
      </svg>}
    <div className="kpi-chart-meta">
    {kind !== 'pie' && targets.map(target=><small key={target} className="kpi-chart-target">هدف KR {number.format(target)} {kpi.unit}</small>)}
    <details className="kpi-chart-values"><summary>مقادیر نمودار {kpi.unit && '(' + kpi.unit + ')'}</summary>
      <ul>{points.map((point, index) => <li key={point.index}>
        {point.label} · {number.format(values[index])}
      </li>)}</ul>
    </details></div>
  </>;
}

export function KpiMonitoring({data, profiles, reportId}: {data: Data; reportId?: string; profiles: (values: ReadonlyMap<string, number>) => ReactNode}) {
  const targets=activeKpiTargets(loadPortfolio(data.organization.id,data.organization.name,data.user.role==='ADMIN'));
  const key = storageKey(data);
  const [model, setModel] = useState(() => read(key));
  const tabFromUrl = () => currentPath().startsWith('/kpis/power-bi/') ? 'power-bi' : tabs.find(([id])=>id===routeQuery().get('tab'))?.[0] ?? 'dashboard';
  const [tab, setTab] = useState(tabFromUrl);
  useEffect(()=>{
    const sync=()=>{setTab(tabFromUrl());setMessage(null);};
    window.addEventListener('popstate',sync);
    window.addEventListener('hashchange',sync);
    return ()=>{window.removeEventListener('popstate',sync);window.removeEventListener('hashchange',sync);};
  },[]);
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [entryOpen, setEntryOpen] = useState(false);
  const [entryKpi, setEntryKpi] = useState('');
  const [entryDate, setEntryDate] = useState('');
  const [value, setValue] = useState('');
  const [note, setNote] = useState('');
  const [cardDraft, setCardDraft] = useState<Card | null>(null);
  const [message, setMessage] = useState<{text: string; error?: boolean} | null>(null);
  const admin = data.user.role === 'ADMIN';
  const selected = data.kpis.find(kpi => kpi.id === entryKpi);
  const existing = model.measurements.find(row => row.kpiId === entryKpi && row.date === entryDate);
  const history = model.measurements.filter(row => row.kpiId === entryKpi).sort((a, b) => b.date.localeCompare(a.date));
  const dateError = Boolean(start && end && start > end);
  const dashboardMeasurements = model.measurements.filter(({date}) =>
    (!start || date >= start) && (!end || date <= end));

  useEffect(() => {
    const sync = (event: StorageEvent) => { if (event.key === key || event.key === null) setModel(read(key)); };
    window.addEventListener('storage', sync);
    return () => window.removeEventListener('storage', sync);
  }, [key]);

  function update(change: (saved: Model) => Model, success: string) {
    try {
      const next = change(read(key));
      localStorage.setItem(key, JSON.stringify(next));
      setModel(next);
      setMessage({text: success});
      return true;
    } catch {
      setMessage({text: 'ذخیره در این مرورگر انجام نشد.', error: true});
      return false;
    }
  }

  function saveMeasurement(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!admin || !selected || !entryDate || !value.trim() || !Number.isFinite(Number(value))) return;
    const revision = {value: Number(value), note: note.trim(), actor: data.user.name || data.user.email, savedAt: new Date().toISOString()};
    const saved = update(model => {
      const row = model.measurements.find(item => item.kpiId === entryKpi && item.date === entryDate);
      const measurements = row ? model.measurements.map(item => item === row ? {...row, revisions: [...row.revisions, revision]} : item)
        : [...model.measurements, {kpiId: entryKpi, date: entryDate, revisions: [revision]}];
      return {...model, measurements};
    }, 'مقدار شاخص ذخیره شد.');
    if (saved) { setValue(''); setNote(''); }
  }

  function saveCard(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!cardDraft?.kpiId) return;
    const card = {...cardDraft, id: cardDraft.id || crypto.randomUUID()};
    const saved = update(model => ({...model, cards: cardDraft.id ?
      model.cards.map(item => item.id === card.id ? card : item) : [...model.cards, card]}), 'کارت ذخیره شد.');
    if (saved) setCardDraft(null);
  }

  const selectKpi = (id: string, change: (id: string) => void) => <select required value={id} onChange={event => change(event.target.value)}>
    <option value="">انتخاب شاخص</option>
    {data.kpis.map(kpi => <option key={kpi.id} value={kpi.id}>{kpi.name} ({kpi.code})</option>)}
  </select>;

  return <div className={'kpi-workspace'+(tab==='dashboard'&&model.cards.length>0&&model.cards.length<=4?' kpi-workspace-fit':'')}>
    <div className="module-toolbar">
      <nav className="process-workspace-tabs" aria-label="بخش‌های شاخص‌های عملکرد">
        {tabs.map(([id, title, Icon]) => <button key={id} type="button" className={tab === id ? 'active' : ''}
          aria-current={tab === id ? 'page' : undefined} onClick={() => go(id==='dashboard'?'/kpis':'/kpis?tab='+id)}><Icon size={17}/>{title}</button>)}
      </nav>
      {tab === 'dashboard' && <div className="kpi-date-filters">
        <JalaliDatePicker label="از تاریخ" value={start} onChange={setStart}/>
        <JalaliDatePicker label="تا تاریخ" value={end} onChange={setEnd}/>
        <button type="button" className="secondary kpi-clear-dates" disabled={!start&&!end}
          onClick={()=>{setStart('');setEnd('');}}>پاک کردن فیلتر تاریخ</button>
      </div>}
      {tab === 'profiles'&&<button type="button" className="secondary" aria-expanded={entryOpen}
        onClick={()=>setEntryOpen(!entryOpen)}><Save size={16}/>ثبت مقادیر</button>}
    </div>
    {message && <p className={'alert ' + (message.error ? 'error' : 'success')} role={message.error ? 'alert' : 'status'}>{message.text}</p>}
    {tab === 'profiles' && entryOpen && <>
      {admin && <form className="panel kpi-form" onSubmit={saveMeasurement}>
        <label>شاخص{selectKpi(entryKpi, id => {setEntryKpi(id);setValue('');setNote('');})}</label>
        <JalaliDatePicker label="تاریخ اندازه‌گیری" value={entryDate}
          onChange={date => {setEntryDate(date);setValue('');setNote('');}}/>
        <label>مقدار واقعی {selected?.unit && '(' + selected.unit + ')'}<input type="number" step="any" required value={value} onChange={event => setValue(event.target.value)}/></label>
        <label>توضیح اختیاری<input maxLength={300} value={note} onChange={event => setNote(event.target.value)}/></label>
        {existing && <p className="kpi-form-note">مقدار فعلی این تاریخ {number.format(current(existing).value)} است. مقدار جدید همراه با سابقهٔ اصلاح ذخیره می‌شود.</p>}
        <button className="primary" disabled={!entryDate}><Save size={16}/>{existing ? 'ثبت اصلاح' : 'ثبت مقدار'}</button>
      </form>}
      {!admin && <><p className="empty-inline">ثبت و اصلاح مقدار در حالت مدیریت در دسترس است.</p><div className="kpi-form"><label>شاخص{selectKpi(entryKpi, setEntryKpi)}</label></div></>}
      {selected && <section className="panel kpi-monitor-card"><h2>سابقهٔ مقادیر</h2>
        {!history.length && <p className="empty-inline">هنوز مقداری برای این شاخص ثبت نشده است.</p>}
        {history.map(row => <details key={row.date} className="kpi-chart-values">
          <summary>{labelDate(row.date)} · {number.format(current(row).value)} {selected.unit}</summary>
          <ul>{[...row.revisions].reverse().map((revision, index) => <li key={index}>
            {number.format(revision.value)} {selected.unit} · {revision.actor} · {timestamps.format(new Date(revision.savedAt))}
            {revision.note && ' · ' + revision.note}
          </li>)}</ul>
        </details>)}
      </section>}
    </>}
    {tab === 'profiles' && profiles(new Map([...model.measurements]
      .sort((a, b) => a.date.localeCompare(b.date)).map(row => [row.kpiId, current(row).value])))}
    {tab === 'dashboard' && <>
      {dateError && <p role="alert" className="alert error">تاریخ پایان باید برابر یا بعد از تاریخ شروع باشد.</p>}
      {!model.cards.length && <p className="panel empty-inline">برای ساخت داشبورد، اولین کارت را اضافه کنید.</p>}
      <div className={'kpi-card-grid'+(model.cards.length<=4?' kpi-card-grid-compact':'')}>{model.cards.map(card => {
        const kpi = data.kpis.find(item => item.id === card.kpiId);
        const rows = dashboardMeasurements.filter(row => row.kpiId === card.kpiId);
        return <section className="panel kpi-monitor-card" key={card.id}>
          <header><div><h2>{kpi?.name ?? 'شاخص در دسترس نیست'}</h2><small>{charts[card.kind]}{kpi?.unit && ' · ' + kpi.unit}</small></div>
            <div className="kpi-actions"><button className="icon-button" type="button" title="ویرایش" aria-label="ویرایش" onClick={() => setCardDraft(card)}><Pencil size={16}/></button>
              <button className="icon-button" type="button" title="حذف کارت" aria-label="حذف کارت" onClick={() => {
                if (update(model => ({...model, cards: model.cards.filter(item => item.id !== card.id)}), 'کارت حذف شد.') && cardDraft?.id === card.id) setCardDraft(null);
              }}><Trash2 size={16}/></button></div>
          </header>
          {kpi && !dateError && <Chart kpi={kpi} card={card} rows={rows} targets={targets.get(kpi.id)??[]}/>}
        </section>;
      })}</div>
      <div className="kpi-actions kpi-add-card"><button type="button" className="primary" disabled={!data.kpis.length}
        onClick={() => setCardDraft({id: '', kpiId: '', kind: 'line'})}><Plus size={16}/>افزودن کارت</button></div>
      {cardDraft && <Modal className="kpi-card-settings panel" label={cardDraft.id?'ویرایش کارت':'افزودن کارت'} onClose={()=>setCardDraft(null)}>
        <h2>{cardDraft.id?'ویرایش کارت':'افزودن کارت'}</h2>
        <form className="kpi-form" onSubmit={saveCard}>
        <label>شاخص{selectKpi(cardDraft.kpiId, kpiId => setCardDraft({...cardDraft, kpiId}))}</label>
        <label>نوع نمودار<select value={cardDraft.kind} onChange={event => setCardDraft({...cardDraft, kind: event.target.value as ChartKind})}>
          {Object.entries(charts).map(([id, title]) => <option key={id} value={id}>{title}</option>)}
        </select></label>
        {cardDraft.kind === 'pie' && <p className="kpi-form-note">فقط برای شاخص‌هایی انتخاب کنید که مجموع مقادیر تاریخ‌های انتخاب‌شده معنادار است.</p>}
        <label>تم رنگی<select value={cardDraft.theme??'ocean'} onChange={event=>setCardDraft({...cardDraft,theme:event.target.value as Theme})}>
          {Object.entries(themes).map(([id,theme])=><option key={id} value={id}>{theme.name}</option>)}
        </select></label>
        <label className="kpi-label-option"><input type="checkbox" checked={cardDraft.labels??true} onChange={event=>setCardDraft({...cardDraft,labels:event.target.checked})}/>نمایش برچسب داده</label>
        <div className="kpi-card-dialog-actions"><button className="primary">ذخیرهٔ کارت</button>
        <button type="button" className="secondary" onClick={() => setCardDraft(null)}>انصراف</button></div>
      </form></Modal>}
    </>}
    {tab === 'power-bi' && <PowerBiReports reportId={reportId} reports={model.reports} canManage={admin}
      onAdd={report => update(saved => ({...saved, reports: [...saved.reports.filter(item=>item.id!==report.id), report]}), 'داشبورد ذخیره شد.')}/>}
  </div>;
}
