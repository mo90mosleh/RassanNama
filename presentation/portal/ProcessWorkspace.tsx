import{lazy,Suspense,useState}from'react';
import{Layers3,GitBranch,ClipboardList,Tags}from'lucide-react';
import type {GovernanceSection} from './process-governance';
import type{Data}from'./types';
import{Link}from'./ui';
const Architecture=lazy(()=>import('./Architecture').then(module=>({default:module.Architecture})));
const ProcessCatalog=lazy(()=>import('./ProcessCatalog').then(module=>({default:module.ProcessCatalog})));
const ProcessMap=lazy(()=>import('./ProcessMap').then(module=>({default:module.ProcessMap})));
const ProcessProfile=lazy(()=>import('./ProcessDetail').then(module=>({default:module.ProcessProfile})));
const GovernanceOverview = lazy(() => import('./ProcessGovernance').then(module => ({default: module.GovernanceOverview})));
import'./process-workspace.css';
export type ProcessWorkspaceSection='architecture'|'map'|'catalog'|Extract<GovernanceSection,'apqc'>;
const tabs:[ProcessWorkspaceSection,string,string,typeof Layers3][]=[
 ['architecture','معماری فرآیندها','/architecture',Layers3],
 ['apqc','APQC','/process-governance/apqc',Tags],
 ['map','نقشه فرآیندها','/process-map',GitBranch],
 ['catalog','شناسنامه فرآیندها','/processes',ClipboardList],
];
export function ProcessWorkspace({data,section,refresh,detailId}:{data:Data;section:ProcessWorkspaceSection;refresh:()=>Promise<void>;detailId?:string}){
 const [controls,setControls]=useState<HTMLDivElement|null>(null);
 return <div className="process-workspace">
  <div className="process-toolbar-row">
  <nav className="process-workspace-tabs" aria-label="بخش‌های مدیریت فرآیندها">
   {tabs.map(([id,label,to,Icon])=><Link key={id} to={to} className={section===id?'active':''} ariaLabel={label}><Icon size={17}/><span>{label}</span></Link>)}
  </nav><div className="process-toolbar-controls" ref={setControls}/>
  </div>
  <section className="process-workspace-body" aria-label={section==='catalog'?'شناسنامه فرآیندها':tabs.find(x=>x[0]===section)?.[1]}>
   <Suspense fallback={<p className="loading" role="status">در حال دریافت بخش فرآیندها…</p>}>{section==='architecture'?<Architecture data={data} embedded/>:section==='map'?<ProcessMap data={data} refresh={refresh}/>:section==='apqc'?<GovernanceOverview key={section} data={data} section={section} controls={controls}/>:detailId?<ProcessProfile key={detailId} data={data} id={detailId} refresh={refresh}/>:<ProcessCatalog data={data} embedded/>}</Suspense>
  </section>
 </div>;
}
