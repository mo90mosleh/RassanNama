import {createPortal} from 'react-dom';
import {SegmentedControl} from './SegmentedControl';
import translations from './apqc-fa.json';
import {useEffect,useState} from 'react';
import {ChevronLeft, ArrowRight, Languages, Layers3} from 'lucide-react';
import {apqcByCode, apqcChildren, apqcContains, apqcParent, apqcTrail} from './apqc-reference';
import {apqcSource, categories} from './process-governance';
import type {Data} from './types';
import {go, Link, number, routeQuery} from './ui';

export function ApqcExplorer({data, controls}: {data: Data; controls?: HTMLElement|null}) {
  const [language, setLanguage] = useState<'fa' | 'en'>('fa');
  const titleFor = (code: string) => {
    if (language === 'en') return apqcByCode.get(code) ?? 'Unclassified';
    return categories.find(([key]) => key === code)?.[1] ??
      (translations as Record<string, string>)[code] ?? 'نیازمند بررسی';
  };
  function currentBranch() {
    const code = routeQuery().get('branch') ?? '';
    return code === 'unmapped' || apqcByCode.has(code) ? code : '';
  }
  const [branch, setSelectedBranch] = useState(currentBranch);
  useEffect(() => {
    const sync = () => setSelectedBranch(currentBranch());
    window.addEventListener('popstate', sync);
    window.addEventListener('hashchange', sync);
    return () => {
      window.removeEventListener('popstate', sync);
      window.removeEventListener('hashchange', sync);
    };
  }, []);
  function setBranch(code: string) {
    go('/process-governance/apqc' + (code ? '?branch=' + encodeURIComponent(code) : ''));
  }
  const processes = data.nodes.filter(node => node.kind === 'PROCESS');
  const categoryFor = (id: string) => data.governance?.[id]?.apqc ?? '';
  const isMapped = (id: string) => apqcByCode.has(categoryFor(id));
  const count = (code: string) => number.format(processes.filter(node => apqcContains(code, categoryFor(node.id))).length);
  const children = apqcChildren.get(branch) ?? [];
  const assigned = processes.filter(node => branch === 'unmapped' ? !isMapped(node.id) : categoryFor(node.id) === branch);
  const renderCards = (codes: string[]) => <div className="apqc-grid">{codes.map(code => (
    <button type="button" key={code} className="apqc-card" onClick={() => setBranch(code)}>
      <span><bdi>{code}</bdi><Layers3 size={18}/></span>
      <strong dir="auto">{titleFor(code)}</strong>
      <small>({count(code)})</small>
    </button>
  ))}</div>;

  const languageSwitch = <SegmentedControl className="apqc-language" label="زبان دسته‌بندی" value={language} onChange={setLanguage}
      options={[{value:'fa',label:'فارسی',icon:<Languages size={15}/>},{value:'en',label:'English',icon:<Languages size={15}/>}]}/>;
  return <section className="panel governance-panel apqc-explorer">
    <header className="apqc-heading"><h2>{language === 'fa' ? 'طبقه‌بندی APQC' : 'APQC classification'}</h2>
    {controls ? createPortal(languageSwitch,controls) : languageSwitch}<a href={apqcSource} target="_blank" rel="noreferrer">مرجع میان‌صنعتی ۷٫۴</a></header>
    <nav className="apqc-trail" aria-label="مسیر طبقه‌بندی APQC">
      {branch && <button type="button" className="icon-button" aria-label="بازگشت به سطح قبل" onClick={() => setBranch(branch === 'unmapped' ? '' : apqcParent(branch))}><ArrowRight size={17}/></button>}
      <button type="button" className="text-button" aria-current={!branch?'page':undefined} onClick={() => setBranch('')}>{language === 'fa' ? 'همه دسته‌ها' : 'All categories'}</button>
      {apqcTrail(branch).map(code => <span key={code}><ChevronLeft size={14}/><button type="button" className="text-button" aria-current={code === branch?'page':undefined} onClick={() => setBranch(code)}>{code !== 'unmapped' && <bdi>{code}</bdi>} {titleFor(code)}</button></span>)}
    </nav>
    {!branch ? <>
      <section className="apqc-band"><h3>{language === 'fa' ? 'فرایندهای عملیاتی' : 'Operating processes'}</h3>{renderCards(categories.slice(0, 6).map(([code]) => code))}</section>
      <section className="apqc-band apqc-support"><h3>{language === 'fa' ? 'فرایندهای مدیریتی و پشتیبان' : 'Management and support processes'}</h3>{renderCards(categories.slice(6).map(([code]) => code))}</section>
      {processes.some(node => !isMapped(node.id)) && <button type="button" className="secondary" onClick={() => setBranch('unmapped')}>نیازمند بررسی ({number.format(processes.filter(node => !isMapped(node.id)).length)})</button>}
    </> : <>
      {children.length > 0 && renderCards(children.map(node => node.code))}
      {assigned.length > 0 && <section className="apqc-assigned"><h3>فرایندهای ثبت‌شده در این سطح</h3><ul>{assigned.map(node => <li key={node.id}><Link to={'/processes/' + node.id}><bdi>{node.code}</bdi> · {node.name}</Link></li>)}</ul></section>}
      {children.length === 0 && assigned.length === 0 && <p className="empty-inline">فرایندی در این دسته ثبت نشده است.</p>}
    </>}
  </section>;
}
