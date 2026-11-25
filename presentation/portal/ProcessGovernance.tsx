import apqcFa from './apqc-fa.json';
import {ApqcExplorer} from './ApqcExplorer';
import {apqcByCode} from './apqc-reference';
import {useState, type FormEvent, type ReactNode} from 'react';
import {config, mutate} from './api';
import {categories, emptyGovernance, raciRoles, type GovernanceSection, type DoaRow, type Governance, type RaciRow, type RaciRole} from './process-governance';
import type {Data} from './types';
import {errorMessage, Link} from './ui';
import './process-governance.css';

const labels = {apqc: 'طبقه‌بندی APQC', raci: 'ماتریس RACI', doa: 'ماتریس DOA'};

function Matrix({columns, children}: {columns: ReactNode[]; children: ReactNode}) {
  return <div className="governance-scroll" tabIndex={0} role="region" aria-label="جدول">
    <table><thead><tr>{columns.map((column, index) => <th scope="col" key={index}>{column}</th>)}</tr></thead>
    <tbody>{children}</tbody></table>
  </div>;
}

function PositionOptions({data}: {data: Data}) {
  return <>{data.positions.map(position => <option key={position.id} value={position.id}>{position.title}</option>)}</>;
}

export function GovernanceOverview({data, section, controls}: {data: Data; section: GovernanceSection; controls?: HTMLElement|null}) {
  const [position, setPosition] = useState('');
  const processes = data.nodes.filter(node => node.kind === 'PROCESS');
  const title = (id: string) => data.positions.find(item => item.id === id)?.title ?? '—';
  const processLink = (id: string, name: string) => <Link to={'/processes/' + id}>{name}</Link>;
  const raci = processes.flatMap(process => (data.governance?.[process.id]?.raci ?? [])
    .filter(row => !position || row.roles[position]).map(row => ({process, row})));
  const doa = processes.flatMap(process => (data.governance?.[process.id]?.doa ?? [])
    .filter(row => !position || row.position === position || row.escalation === position).map(row => ({process, row})));
  if (section === 'apqc') return <ApqcExplorer data={data} controls={controls}/>;

  return <section className="panel governance-panel">
    <h2>{labels[section]}</h2>
      <label>فیلتر سمت<select value={position} onChange={event => setPosition(event.target.value)}>
        <option value="">همه سمت‌ها</option><PositionOptions data={data}/>
      </select></label>
      {section === 'raci' && (raci.length ? <Matrix columns={['فرآیند', 'فعالیت', ...Object.values(raciRoles)]}>
        {raci.map(({process, row}) => <tr key={process.id + row.id}><th scope="row">{processLink(process.id, process.name)}</th>
          <td>{row.activity}</td>{Object.keys(raciRoles).map(role => <td key={role}>{Object.entries(row.roles)
            .filter(([id, value]) => value === role && (!position || id === position)).map(([id]) => title(id)).join('، ') || '—'}</td>)}</tr>)}
      </Matrix> : <p className="empty-inline">مسئولیتی برای این فیلتر ثبت نشده است.</p>)}
      {section === 'doa' && (doa.length ? <Matrix columns={['فرآیند', 'تصمیم', 'سمت دارای اختیار', 'شرط', 'سقف', 'ارجاع به']}>
        {doa.map(({process, row}) => <tr key={process.id + row.id}><th scope="row">{processLink(process.id, process.name)}</th>
          <td>{row.decision}</td><td>{title(row.position)}</td><td>{row.condition}</td><td>{row.limit || '—'}</td><td>{title(row.escalation)}</td></tr>)}
      </Matrix> : <p className="empty-inline">اختیاری برای این فیلتر ثبت نشده است.</p>)}
  </section>;
}

const newRaci: RaciRow = {id: '', activity: '', roles: {}};
const newDoa: DoaRow = {id: '', decision: '', position: '', condition: '', limit: '', escalation: ''};

export function ProcessGovernance({data, id, section, refresh}: {
  data: Data; id: string; section: GovernanceSection; refresh: () => Promise<void>;
}) {
  const record = data.governance?.[id] ?? emptyGovernance;
  const [raci, setRaci] = useState<RaciRow | null>(null);
  const [doa, setDoa] = useState<DoaRow | null>(null);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState({text: '', error: false});
  const admin = config.demoManagement && data.user.role === 'ADMIN';
  const title = (id: string) => data.positions.find(position => position.id === id)?.title ?? '—';
  const english = apqcByCode.get(record.apqc);
  const mapped = categories.find(([code]) => code === record.apqc)?.[1] ?? (apqcFa as Record<string,string>)[record.apqc];
  const matrixPositions = data.positions.filter(position => record.raci.some(row => row.roles[position.id]));

  async function save(change: Partial<Governance>) {
    setMessage({text: '', error: false});
    setPending(true);
    try {
      await mutate('process-governance/' + id, 'PUT', change);
      await refresh();
      setRaci(null);
      setDoa(null);
      setMessage({text: 'تغییرات ذخیره شد.', error: false});
    } catch (error) {
      setMessage({text: errorMessage(error), error: true});
    } finally {
      setPending(false);
    }
  }

  function saveRaci(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!raci) return;
    const row = {...raci, activity: raci.activity.trim(), id: raci.id || crypto.randomUUID()};
    void save({raci: raci.id ? record.raci.map(item => item.id === row.id ? row : item) : [...record.raci, row]});
  }

  function saveDoa(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!doa) return;
    const row = {...doa, decision: doa.decision.trim(), condition: doa.condition.trim(), limit: doa.limit.trim(),
      id: doa.id || crypto.randomUUID()};
    void save({doa: doa.id ? record.doa.map(item => item.id === row.id ? row : item) : [...record.doa, row]});
  }

  return <div className="governance-content">
    {section === 'apqc' && <><dl className="profile-fields process-profile-pair">
      <div><dt>طبقه‌بندی APQC · فارسی</dt><dd>{mapped ?? 'نیازمند بررسی'}</dd></div>
      <div><dt>طبقه‌بندی APQC · English</dt><dd dir="auto">{english?<><bdi>{record.apqc}</bdi> · {english}</>:'—'}</dd></div>
    </dl>{admin && <label>دسته مرجع APQC<select disabled={pending} value={record.apqc}
      onChange={event => void save({apqc: event.target.value})}>
      <option value="">نیازمند بررسی</option>
      {Array.from(apqcByCode, ([code, label]) => <option key={code} value={code}>{code} · {categories.find(([key]) => key === code)?.[1] ?? label}</option>)}
    </select></label>}</>}
    {section === 'raci' && <>
      {record.raci.length ? <>
        <p className="governance-legend">{Object.entries(raciRoles).map(([role, label]) => <span key={role}><bdi>{role}</bdi> · {label}</span>)}</p>
        <Matrix columns={['فعالیت', ...matrixPositions.map(position => position.title), ...(admin ? ['عملیات'] : [])]}>
          {record.raci.map(row => <tr key={row.id}><th scope="row">{row.activity}</th>
            {matrixPositions.map(position => <td key={position.id}><bdi>{row.roles[position.id] || '—'}</bdi></td>)}
            {admin && <td><button className="text-button" disabled={pending} onClick={() => setRaci(row)}>ویرایش</button></td>}</tr>)}
        </Matrix>
      </> : <p className="empty-inline">هنوز فعالیتی در ماتریس مسئولیت‌ها ثبت نشده است.</p>}
      {admin && (raci ? <form className="governance-form" onSubmit={saveRaci}>
        <label>فعالیت<input required maxLength={160} value={raci.activity} onChange={event => setRaci({...raci, activity: event.target.value})}/></label>
        <div className="governance-fields">{data.positions.map(position => <label key={position.id}>{position.title}
          <select value={raci.roles[position.id] ?? ''} onChange={event => {
            const roles = {...raci.roles};
            const value = event.target.value as RaciRole | '';
            if (value) roles[position.id] = value;
            else delete roles[position.id];
            setRaci({...raci, roles});
          }}><option value="">بدون نقش</option>{Object.entries(raciRoles).map(([role, label]) =>
            <option key={role} value={role}>{role} · {label}</option>)}</select></label>)}</div>
        <EditorActions pending={pending} cancel={() => setRaci(null)} remove={raci.id ? () => void save({raci: record.raci.filter(row => row.id !== raci.id)}) : undefined}/>
      </form> : <button className="secondary" disabled={pending} onClick={() => setRaci(newRaci)}>افزودن فعالیت</button>)}
    </>}
    {section === 'doa' && <>
      {record.doa.length ? <Matrix columns={['تصمیم', 'سمت دارای اختیار', 'شرط', 'سقف', 'ارجاع به', ...(admin ? ['عملیات'] : [])]}>
        {record.doa.map(row => <tr key={row.id}><th scope="row">{row.decision}</th>
          <td>{title(row.position)}</td><td>{row.condition}</td><td>{row.limit || '—'}</td><td>{title(row.escalation)}</td>
          {admin && <td><button className="text-button" disabled={pending} onClick={() => setDoa(row)}>ویرایش</button></td>}</tr>)}
      </Matrix> : <p className="empty-inline">هنوز اختیاری برای این فرآیند ثبت نشده است.</p>}
      {admin && (doa ? <form className="governance-form" onSubmit={saveDoa}>
        <div className="governance-fields">
          {(['decision', 'condition', 'limit'] as const).map((key, index) => <label key={key}>{['تصمیم', 'شرط اعمال اختیار', 'سقف اختیار'][index]}
            <input required={key !== 'limit'} maxLength={200} value={doa[key]} onChange={event => setDoa({...doa, [key]: event.target.value})}/></label>)}
          <label>سمت دارای اختیار<select required value={doa.position} onChange={event => setDoa({...doa, position: event.target.value})}>
            <option value="">انتخاب سمت</option><PositionOptions data={data}/></select></label>
          <label>سمت ارجاع<select value={doa.escalation} onChange={event => setDoa({...doa, escalation: event.target.value})}>
            <option value="">بدون ارجاع</option><PositionOptions data={data}/></select></label>
        </div>
        <EditorActions pending={pending} cancel={() => setDoa(null)} remove={doa.id ? () => void save({doa: record.doa.filter(row => row.id !== doa.id)}) : undefined}/>
      </form> : <button className="secondary" disabled={pending} onClick={() => setDoa(newDoa)}>افزودن اختیار</button>)}
    </>}
    {message.text && <p className={'alert ' + (message.error ? 'error' : 'success')} role={message.error ? 'alert' : 'status'}>{message.text}</p>}
  </div>;
}

function EditorActions({pending, cancel, remove}: {pending: boolean; cancel: () => void; remove?: () => void}) {
  return <div className="governance-actions">
    <button className="primary" disabled={pending}>{pending ? 'در حال ذخیره…' : 'ذخیره'}</button>
    <button type="button" className="secondary" disabled={pending} onClick={cancel}>انصراف</button>
    {remove && <button type="button" className="text-button" disabled={pending} onClick={remove}>حذف ردیف</button>}
  </div>;
}
