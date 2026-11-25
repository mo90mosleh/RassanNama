import orgArt from './assets/slide-org.jpg';
import processArt from './assets/slide-process.jpg';
import kpiArt from './assets/slide-kpi.jpg';
import okrArt from './assets/slide-okr.jpg';
import {PowerBiIcon} from './PowerBiReports';
import {groupPositions} from './position-groups';
import {useEffect,useState} from 'react';
import {Search,History,ChartNoAxesCombined,Target,Pause,Play,UserRound,BriefcaseBusiness,Building2,BookOpen,Files,ArrowLeft,CalendarDays,Clock3} from 'lucide-react';
import {ProcessIcon} from './ProcessIcon';
import {normalizeSearch} from './architecture-navigation';
import {availablePowerBiReports} from './kpi-monitoring-storage';
import {loadPortfolio} from './okr/portfolio-storage';
import type {Data} from './types';
import {Link} from './ui';

const modules = [
 {path:'/organization/chart',name:'چارت سازمانی',art:orgArt,detail:['ساختار دپارتمان‌ها و سمت‌های سازمانی را','مرور کنید و مسیر گزارش‌دهی هر سمت را ببینید.'],hint:['همکاران را با نام، سمت یا دپارتمان پیدا کنید','و اطلاعات تماسشان را از روی کارتشان ببینید.']},
 {path:'/architecture',name:'فرآیندها',art:processArt,detail:['در نقشه ببینید فرآیندها چگونه به هم وصل‌اند','و هرکدام چه نقشی در جریان کار سازمان دارند.'],hint:['مالک، مراحل اجرا و مستندات هر فرآیند را','کنار ورودی‌ها، خروجی‌ها و شاخص‌هایش ببینید.']},
 {path:'/kpis',name:'شاخص‌ها',art:kpiArt,detail:['تعریف، تناوب سنجش و منبع دادهٔ هر شاخص را','در شناسنامه ببینید و مقادیر ثبت‌شده را مرور کنید.'],hint:['بازهٔ زمانی را انتخاب کنید و روند شاخص را','با هدف تعریف‌شده برای دورهٔ فعال مقایسه کنید.']},
 {path:'/okr',name:'OKR',art:okrArt,detail:['در نقشهٔ استراتژی ببینید اهداف دپارتمان‌ها','چطور به اهداف سازمان و نتایج کلیدی وصل‌اند.'],hint:['پیشرفت نتایج کلیدی را در طول دوره دنبال کنید','و ببینید کدام هدف‌ها به پیگیری نیاز دارند.']},
];
const mainPaths=new Set(modules.map(module=>module.path));
const todayFormat=new Intl.DateTimeFormat('fa-IR-u-ca-persian',{weekday:'long',day:'numeric',month:'long',year:'numeric',timeZone:'Asia/Tehran'});

const timeFormat=new Intl.DateTimeFormat('fa-IR',{hour:'2-digit',minute:'2-digit',hourCycle:'h23',timeZone:'Asia/Tehran'});

export function DashboardDate(){
 const [date,setDate]=useState(()=>new Date());
 useEffect(()=>{let timer:number;
  function tick(){const now=new Date();setDate(now);timer=window.setTimeout(tick,60000-now.getTime()%60000);}
  tick();return()=>clearTimeout(timer);},[]);
 const parts=new Map(todayFormat.formatToParts(date).map(part=>[part.type,part.value]));
 return <div className="dashboard-date" dir="rtl"><CalendarDays size={19}/><time dir="rtl" dateTime={date.toISOString()}>
  {parts.get('weekday')}، {parts.get('day')} {parts.get('month')} {parts.get('year')}
 </time><span className="dashboard-clock"><Clock3 size={15} aria-hidden="true"/><time dir="ltr" dateTime={date.toISOString()}>{timeFormat.format(date)}</time></span></div>;
}

const searchIcons = {بخش:BookOpen, فرآیند:ProcessIcon, شاخص:ChartNoAxesCombined, هدف:Target, 'Power BI':PowerBiIcon,
  شخص:UserRound, سمت:BriefcaseBusiness, دپارتمان:Building2, سند:Files};
function chartPath(kind:string,id:string) {
 return '/organization/chart?'+new URLSearchParams({kind,node:id});
}
function destinations(data:Data) {
 const goals=loadPortfolio(data.organization.id,data.organization.name,data.user.role==='ADMIN').objectives;
 return [
  ...modules.map(({path,name})=>({path,name,type:'بخش'})),
  {path:'/process-map',name:'نقشه فرآیندها',type:'بخش'},
  {path:'/process-governance/apqc',name:'طبقه‌بندی APQC',type:'بخش'},
  {path:'/kpis?tab=profiles',name:'شناسنامهٔ شاخص‌ها',type:'بخش'},
  {path:'/kpis?tab=power-bi',name:'داشبوردهای Power BI',type:'بخش'},
  {path:'/okr?tab=goals',name:'اهداف و نتایج کلیدی',type:'بخش'},
  {path:'/okr?tab=monitor',name:'پایش و عملکرد',type:'بخش'},
  {path:'/processes',name:'شناسنامه فرآیندها',type:'بخش'},
  {path:'/documents',name:'مستندات',type:'بخش'},
  ...data.persons.map(person=>({path:chartPath('person',person.id),name:person.display_name,type:'شخص'})),
  ...groupPositions(data.positions).map(role=>({path:chartPath('position',role.id), name:role.title,type:'سمت',code:data.units.find(unit=>unit.id===role.org_unit_id)?.name})),
  ...data.units.map(unit=>({path:chartPath('unit',unit.id),name:unit.name,type:'دپارتمان',code:unit.code})),
  ...data.nodes.filter(node=>node.kind==='PROCESS').map(node=>({path:'/processes/'+node.id,name:node.name,type:'فرآیند',code:node.code})),
  ...data.kpis.map(kpi=>({path:'/kpis/'+kpi.id,name:kpi.name,type:'شاخص',code:kpi.code})),
  ...goals.map(goal=>({path:'/okr/'+goal.id,name:goal.title,type:'هدف',code:goal.code})),
  ...availablePowerBiReports(data).map(report=>({path:'/kpis/power-bi/'+report.id,name:report.name,type:'Power BI'})),
 ];
}
const historyKey=(data:Data)=>'nama-recent-v1:'+JSON.stringify([data.organization.id,data.user.email.toLowerCase()]);
function recent(data:Data):string[]{
 try {
  const saved:unknown=JSON.parse(localStorage.getItem(historyKey(data))??'[]');
  return Array.isArray(saved)?saved.filter((path):path is string=>typeof path==='string'&&!mainPaths.has(path)).slice(0,10):[];
 }catch{return [];}
}
export function rememberVisit(data:Data,path:string){
 if(mainPaths.has(path)||!destinations(data).some(item=>item.path===path))return;
 try{localStorage.setItem(historyKey(data),JSON.stringify([path,...recent(data).filter(item=>item!==path)].slice(0,10)));}catch{}
}

export function DashboardSearch({data}:{data:Data}){
 const [query,setQuery]=useState('');
 const [open,setOpen]=useState(false);
 const term=normalizeSearch(query.trim());
 const terms=term.split(/\s+/);
 const matches=term?destinations(data).filter(item=>{
  const searchable=normalizeSearch([item.name,item.type,'code' in item?item.code:''].join(' '));
  return terms.every(word=>searchable.includes(word));
 })
  .sort((a,b)=>Number(normalizeSearch(b.name)===term)-Number(normalizeSearch(a.name)===term)).slice(0,12):[];
 return <div className="dashboard-search" onBlur={e=>{if(!e.currentTarget.contains(e.relatedTarget))setOpen(false);}} onKeyDown={e=>{if(e.key==='Escape')setOpen(false);}}>
  <label><Search size={21}/><input type="search" aria-label="جست‌وجو در نما" placeholder="جست‌وجوی شخص، سمت، دپارتمان و محتوای نما…" value={query} onFocus={()=>setOpen(true)} onChange={e=>{setQuery(e.target.value);setOpen(true);}}/></label>
  {open&&term&&<div className="panel dashboard-search-results" aria-label="نتایج جست‌وجو">
   {matches.map(item=>{const Icon=searchIcons[item.type as keyof typeof searchIcons];return <Link key={item.path} to={item.path}><span><Icon size={17} aria-hidden="true"/>{item.name}</span><small>{item.type}</small></Link>;})}
   {!matches.length&&<p className="empty-inline">نتیجه‌ای پیدا نشد.</p>}
  </div>}
 </div>;
}

export function DashboardWidgets({data}:{data:Data}){
 const [index,setIndex]=useState(0);
 const [playing,setPlaying]=useState(()=>!matchMedia('(prefers-reduced-motion: reduce)').matches);
 useEffect(()=>{
  if(!playing)return;
  const timer=window.setInterval(()=>setIndex(value=>(value+1)%modules.length),8000);
  return ()=>window.clearInterval(timer);
 },[playing,index]);
 const active=modules[index];
 const byPath=new Map(destinations(data).map(item=>[item.path,item]));
 const visits=recent(data).flatMap(path=>{const item=byPath.get(path);return item?[item]:[];});
 return <div className="dashboard-widgets">
  <section className="panel dashboard-tour" aria-label="آشنایی با بخش‌های نما">
   <div className="dashboard-slide" data-slide={index} key={active.path}>
    <div className="dashboard-slide-copy"><h2>{active.name}</h2>{[active.detail,active.hint].map(lines=><p key={lines[0]}>{lines.map(line=><span key={line}>{line}{' '}</span>)}</p>)}</div>
    <img className="dashboard-slide-art" src={active.art} width={560} height={560} alt=""/>
   </div>
   <footer className="dashboard-slide-footer">
   <div className="dashboard-slide-controls">{modules.map((item,i)=><button type="button" key={item.path} aria-label={item.name} aria-pressed={i===index} onClick={()=>setIndex(i)}/>)}
    <button type="button" className="icon-button" aria-label={playing?'توقف اسلایدر':'پخش اسلایدر'} onClick={()=>setPlaying(!playing)}>{playing?<Pause size={15}/>:<Play size={15}/>}</button></div><Link className="dashboard-view-link" to={active.path} ariaLabel={'مشاهده '+active.name}>مشاهده<ArrowLeft size={15}/></Link></footer>
  </section>
  <section className="panel dashboard-recent"><h2><History size={18}/>آخرین بازدیدها</h2>
   {visits.length?<ol>{visits.map(item=><li key={item.path}><Link to={item.path}><span>{item.name}</span><small>{item.type}</small></Link></li>)}</ol>:<p className="empty-inline">هنوز بازدیدی ثبت نشده است.</p>}
  </section>
 </div>;
}
