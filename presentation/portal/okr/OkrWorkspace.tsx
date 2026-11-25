import {Fragment} from 'react';
import {Modal} from '../Modal';
import{useEffect,useMemo,useRef,useState,type FormEvent}from'react';
import{Target,Network,LayoutList,Table2,ChartNoAxesCombined,Building2,Plus,CalendarDays,ChevronLeft,ChevronDown,ChartColumnIncreasing,Activity,CheckCircle2,AlertTriangle,ArrowUpLeft,X,RefreshCw,History,GitBranch,ListTree,Search,Save}from'lucide-react';
import type{Data}from'../types';
import{Link,go,routeQuery}from'../ui';
import {loadPortfolio} from './portfolio-storage';
import{isoToJalaliInput,suggestCycleDates,validateCycleRange}from'./persian-cycle-dates';
import{activeObjectives,strategicPillars,averageProgress,keyResultProgress,number,objectivePace,objectiveProgress,paceStatusLabels,progressBand,registerCheckIn,withKeyResult,withObjective,type OkrPortfolio,type OkrObjective,type OkrPaceStatus,type OkrKeyResult}from'./model';
import'./okr.css';

type Tab='strategy'|'goals'|'monitor';
type SummaryDetail='objectives'|'results'|'progress'|'risk'|'linked'|'departments'|'onTrack'|'unscored'|'checkins';
type DetailTab='results'|'links'|'history';
type FormKind='cycle'|'objective'|'kr'|'checkin'|null;
type Draft={objectiveId?:string;keyResultId?:string;cycleId?:string};
type CycleDraft={title:string;start:string;end:string;editedStart:boolean;editedEnd:boolean};
const initialCycleDraft:CycleDraft={title:'',start:'',end:'',editedStart:false,editedEnd:false};
const actionTime=()=>new Date().toISOString();
function okrTabFromUrl():Tab {
 const tab=routeQuery().get('tab');
 return tab==='goals'||tab==='monitor'?tab:'strategy';
}
const titleByTab:Record<Tab,string>={strategy:'نقشه استراتژی',goals:'اهداف و نتایج کلیدی',monitor:'پایش و عملکرد'};
const paceExplanation:Record<OkrPaceStatus,string>={
 ON_TRACK:'هم‌سطح یا جلوتر از پیشرفت پیش‌بینی‌شده با توجه به زمان سپری‌شده از دوره',
 AT_RISK:'کمتر از پیشرفت پیش‌بینی‌شده با توجه به زمان سپری‌شده از دوره',
 OFF_TRACK:'به‌طور قابل‌توجهی عقب‌تر از پیشرفت پیش‌بینی‌شده با توجه به زمان سپری‌شده از دوره',
 NOT_STARTED:'تاریخ شروع دوره هنوز نرسیده است',
 NO_DATA:'دادهٔ کافی برای سنجش پیشرفت ثبت نشده است',
};
function Status({value}:{value:OkrPaceStatus}){const tone=value==='ON_TRACK'?'is-good':value==='AT_RISK'?'is-risk':value==='OFF_TRACK'?'is-bad':'is-neutral';return <span className={'okr-status '+tone} title="وضعیت خودکار بر اساس پیشرفت و زمان سپری‌شده از دوره">{paceStatusLabels[value]}</span>;}
function Progress({value}:{value:number}){const band=progressBand(value);return <div className={'okr-progress okr-progress-'+band} role="progressbar" aria-label="درصد پیشرفت" aria-valuemin={0} aria-valuemax={100} aria-valuenow={value}><span style={{width:value+'%'}}/></div>;}
export function OkrWorkspace({data,objectiveId}:{data:Data;objectiveId?:string}){
 const [portfolio,setPortfolio]=useState<OkrPortfolio>(()=>loadPortfolio(data.organization.id,data.organization.name,data.user.role==='ADMIN'));
 const linkedObjective=portfolio.objectives.find(goal=>goal.id===objectiveId);
 const [activeCycle,setActiveCycle]=useState(()=>linkedObjective?.cycleId??portfolio.cycles.find(c=>c.status==='ACTIVE')?.id??portfolio.cycles[0]?.id??'');
 const [tab,setTab]=useState<Tab>(okrTabFromUrl),[selectedPillars,setSelectedPillars]=useState<string[]>([]),[listView,setListView]=useState<'tree'|'table'>('tree');
 const [summaryDetail,setSummaryDetail]=useState<SummaryDetail|null>(null);
 const [showAllResults,setShowAllResults]=useState(false);
 const [expandedResults,setExpandedResults]=useState<Record<string,boolean>>({});
 const [search,setSearch]=useState(''),[scope,setScope]=useState('ALL');
 const [selectedId,setSelectedId]=useState<string|null>(linkedObjective?.id??null),[detailTab,setDetailTab]=useState<DetailTab>('results');
 const [form,setForm]=useState<FormKind>(null),[draft,setDraft]=useState<Draft>({}),[cycleManagerOpen,setCycleManagerOpen]=useState(false);
 const [cycleDraft,setCycleDraft]=useState<CycleDraft>(initialCycleDraft);
 const [feedback,setFeedback]=useState(''),[error,setError]=useState('');
 const [today,setToday]=useState(()=>new Date());
 const ref=useRef<HTMLDivElement>(null);
 const canEdit=data.user.role==='ADMIN';
 // Refresh pacing after each local midnight, including when a background tab is reopened.
 useEffect(()=>{
  const sync=()=>{setTab(okrTabFromUrl());setSelectedId(null);};
  window.addEventListener('popstate',sync);
  window.addEventListener('hashchange',sync);
  return()=>{window.removeEventListener('popstate',sync);window.removeEventListener('hashchange',sync);};
 },[]);
 useEffect(()=>{
  let timer:number;
  const refresh=()=>{const now=new Date();setToday(now);const tomorrow=new Date(now.getFullYear(),now.getMonth(),now.getDate()+1);timer=window.setTimeout(refresh,Math.max(1000,tomorrow.getTime()-now.getTime()+1000));};
  const onVisible=()=>{if(document.visibilityState==='visible'){window.clearTimeout(timer);refresh();}};
  refresh();document.addEventListener('visibilitychange',onVisible);
  return()=>{window.clearTimeout(timer);document.removeEventListener('visibilitychange',onVisible);};
 },[]);
 useEffect(()=>{if(!selectedId&&!form&&!cycleManagerOpen)return;const listener=(e:KeyboardEvent)=>{if(e.key==='Escape'){if(form)setForm(null);else if(cycleManagerOpen)setCycleManagerOpen(false);}};window.addEventListener('keydown',listener);return()=>window.removeEventListener('keydown',listener);},[selectedId,form,cycleManagerOpen]);
 const cycle=portfolio.cycles.find(c=>c.id===activeCycle)??portfolio.cycles[0]??null;
 const objectives=useMemo(()=>cycle?activeObjectives(portfolio,cycle.id):[],[portfolio,cycle?.id]);
 const selected=portfolio.objectives.find(x=>x.id===selectedId)??null;
 const selectedResults=portfolio.keyResults.filter(x=>x.objectiveId===selectedId);
 const results=portfolio.keyResults.filter(x=>objectives.some(g=>g.id===x.objectiveId));
 const checkins=portfolio.checkins.filter(x=>results.some(k=>k.id===x.keyResultId)).slice().sort((a,b)=>b.createdAt.localeCompare(a.createdAt));
 const owner=(g:OkrObjective)=>g.ownerUnitId?data.units.find(u=>u.id===g.ownerUnitId)?.name??'واحد نامشخص':'کل سازمان';
 const metric=(id:SummaryDetail,name:string,value:string,description:string)=> <button type="button" className="okr-metric" onClick={()=>setSummaryDetail(id)}><span>{name}</span><strong>{value}</strong><small>{description}</small></button>;
 const average=objectives.length?Math.round(objectives.reduce((sum,g)=>sum+objectiveProgress(portfolio,g.id),0)/objectives.length):0;
 const paceById=useMemo(()=>new Map(objectives.map(g=>[g.id,objectivePace(portfolio,g.id,today)])),[objectives,portfolio,today]);
 const pace=(g:OkrObjective)=>paceById.get(g.id)??objectivePace(portfolio,g.id,today);
 const riskCount=objectives.filter(g=>['AT_RISK','OFF_TRACK'].includes(pace(g).status)).length;
 const onTrackCount=objectives.filter(g=>pace(g).status==='ON_TRACK').length;
 const unscoredCount=objectives.length-riskCount-onTrackCount;
 const open=(id:string)=>{setSelectedId(id);setDetailTab('results');setFeedback('');};
 const showForm=(kind:FormKind,d:Draft={})=>{
  if(!canEdit){setError('برای ثبت اطلاعات، دسترسی ویرایش لازم است.');return;}
  if(kind==='cycle'){
   const existing=portfolio.cycles.find(c=>c.id===d.cycleId);
   if(existing){
    const suggestion=suggestCycleDates(existing.title);
    setCycleDraft({
     title:existing.title,
     start:isoToJalaliInput(existing.startDate)||suggestion?.start||'',
     end:isoToJalaliInput(existing.endDate)||suggestion?.end||'',
     editedStart:Boolean(existing.startDate),editedEnd:Boolean(existing.endDate)
    });
   }else setCycleDraft({...initialCycleDraft});
  }
  setDraft(d);setForm(kind);setError('');setFeedback('');
 };
 const changeCycleName=(title:string)=>{
  setCycleDraft(prev=>{
   const suggestion=suggestCycleDates(title);
   return{...prev,title,
    start:!prev.editedStart&&suggestion?suggestion.start:prev.start,
    end:!prev.editedEnd&&suggestion?suggestion.end:prev.end
   };
  });
 };
 const restoreCycleSuggestion=()=>{
  const suggestion=suggestCycleDates(cycleDraft.title);
  if(suggestion)setCycleDraft(prev=>({...prev,start:suggestion.start,end:suggestion.end,editedStart:false,editedEnd:false}));
 };
 const write=(next:OkrPortfolio,message:string)=>{
  if(!canEdit)return false;
  try{localStorage.setItem('nama-okr-workspace-v1:'+data.organization.id,JSON.stringify(next));}
  catch{setError('ذخیرهٔ تغییرات OKR در مرورگر ممکن نیست.');return false;}
  setPortfolio(next);setFeedback(message);setError('');return true;
 };
 const cycleDateFormat=new Intl.DateTimeFormat('fa-IR-u-ca-persian',{year:'numeric',month:'short',day:'numeric'});
 const cycleDates=(start:string,end:string)=>start&&end?cycleDateFormat.format(new Date(start+'T12:00:00'))+' تا '+cycleDateFormat.format(new Date(end+'T12:00:00')):'تاریخ شروع و پایان ثبت نشده';
 const selectCycle=(id:string)=>{setActiveCycle(id);setSelectedId(null);setSelectedPillars([]);setCycleManagerOpen(false);setFeedback('');};
 const pillars=strategicPillars(portfolio);
 const activePillars=pillars.filter(axis=>axis.active);
 const cyclePillars=pillars.filter(axis=>axis.active||objectives.some(goal=>goal.pillar===axis.name));
 function addPillar(event:FormEvent<HTMLFormElement>){
  event.preventDefault();
  if(!canEdit)return;
  const formElement=event.currentTarget;
  const name=String(new FormData(formElement).get('pillarName')??'').trim().replace(/\s+/g,' ');
  if(!name||name.length>80){setError('نام محور باید بین ۱ تا ۸۰ کاراکتر باشد.');return;}
  if(pillars.some(axis=>axis.name===name)){setError('محوری با این نام وجود دارد.');return;}
  if(write({...portfolio,pillars:[...pillars,{name,active:true}]},'محور استراتژیک اضافه شد.'))formElement.reset();
 }
 function togglePillar(name:string,active:boolean){
  const saved=write({...portfolio,pillars:pillars.map(axis=>axis.name===name?{...axis,active}:axis)},
   active?'محور استراتژیک فعال شد.':'محور استراتژیک غیرفعال شد.');
  if(saved&&!active&&!objectives.some(goal=>goal.pillar===name))setSelectedPillars(previous=>previous.filter(item=>item!==name));
 }

 const filtered=objectives.filter(g=>(scope==='ALL'||g.level===scope)&&(!search.trim()||(g.title+' '+g.code+' '+owner(g)).includes(search.trim())));
 function saveForm(e:FormEvent<HTMLFormElement>){
  e.preventDefault();
  if(!canEdit)return;
  const values=new FormData(e.currentTarget);
  try{
   if(form==='checkin'){
    const value=Number(values.get('value'));
    const next=registerCheckIn(portfolio,{keyResultId:draft.keyResultId??'',value,note:String(values.get('note')??'')},actionTime());
    if(write(next,'Check-in در فضای آزمایشی ذخیره شد.'))setForm(null);return;
   }
   if(form==='cycle'){
    const title=cycleDraft.title.trim();
    if(title.length<4||title.length>70)throw Error('نام دوره باید بین ۴ تا ۷۰ کاراکتر باشد.');
    const {startDate,endDate}=validateCycleRange(cycleDraft.start,cycleDraft.end);
    if(portfolio.cycles.some(c=>c.id!==draft.cycleId&&c.title.trim()===title))throw Error('دوره‌ای با همین نام قبلاً ثبت شده است.');
    if(draft.cycleId){
     const existing=portfolio.cycles.find(c=>c.id===draft.cycleId);
     if(!existing)throw Error('دوره برای ویرایش پیدا نشد.');
     if(!write({...portfolio,cycles:portfolio.cycles.map(c=>c.id===draft.cycleId?{...c,title,startDate,endDate}:c)},'نام و تاریخ‌های دوره ذخیره شد.'))return;
    }else{
     const id='cycle-'+Date.now();
     if(!write({...portfolio,cycles:[...portfolio.cycles,{id,title,status:'PLANNING' as const,startDate,endDate}]},'دوره جدید با بازه زمانی شمسی ثبت شد.'))return;
     setActiveCycle(id);
    }
    setForm(null);return;
   }
   if(form==='objective'){
    if(!cycle)throw Error('ابتدا یک دوره ایجاد کنید.');
    const title=String(values.get('title')??'').trim();
    if(title.length<8||title.length>220)throw Error('عنوان هدف باید بین ۸ تا ۲۲۰ کاراکتر باشد.');
    const parentId=String(values.get('parentId')??'')||null;
    const ownerUnitId=String(values.get('ownerUnitId')??'')||null;
    const level=parentId?'DEPARTMENT' as const:'COMPANY' as const;
    const objectivePillar=String(values.get('pillar')??'');
    if(!activePillars.some(axis=>axis.name===objectivePillar))throw Error('یک محور استراتژیک فعال انتخاب کنید.');
    const objective:OkrObjective={id:'obj-'+Date.now(),code:'O-'+String(Date.now()).slice(-5),title,description:String(values.get('description')??'').slice(0,500),cycleId:cycle.id,parentId,level,ownerUnitId,pillar:objectivePillar,confidence:'ON_TRACK'};
    if(write(withObjective(portfolio,objective),'هدف جدید در فضای آزمایشی اضافه شد.')){setForm(null);open(objective.id);}return;
   }
   if(form==='kr'){
    const title=String(values.get('title')??'').trim();
    const baseline=Number(values.get('baseline')),target=Number(values.get('target'));
    if(title.length<8||title.length>220)throw Error('عنوان نتیجه کلیدی باید بین ۸ تا ۲۲۰ کاراکتر باشد.');
    if(!Number.isFinite(baseline)||!Number.isFinite(target)||baseline===target)throw Error('مقدار مبنا و هدف باید عددی و متفاوت باشند.');
    const kpiId=String(values.get('kpiId')??'')||null;
    const kr:OkrKeyResult={id:'kr-'+Date.now(),objectiveId:draft.objectiveId??'',title,baseline,target,current:baseline,unit:String(values.get('unit')??'').trim().slice(0,25),kpiId,weight:1};
    if(write(withKeyResult(portfolio,kr),'نتیجه کلیدی در فضای آزمایشی اضافه شد.'))setForm(null);return;
   }
  }catch(err){setError(err instanceof Error?err.message:'ذخیره انجام نشد.');}
 }
 const summary=<div className="okr-metrics">
  {metric('objectives','اهداف دوره',number.format(objectives.length),'سازمانی و دپارتمانی')}
  {metric('results','نتایج کلیدی',number.format(results.length),'مقادیر قابل سنجش')}
  {metric('progress','میانگین تحقق',number.format(average)+'٪','میانگین اهداف فعال')}
  {metric('risk','نیازمند پیگیری',number.format(riskCount),'مقایسه تحقق با زمان دوره')}
 </div>;
 const goalsById=new Map(objectives.map(goal=>[goal.id,goal]));
 const includedIds=new Set<string>();
 for(const goal of objectives){
  if(selectedPillars.length&&!selectedPillars.includes(goal.pillar))continue;
  let current:OkrObjective|undefined=goal;
  while(current&&!includedIds.has(current.id)){
   includedIds.add(current.id);
   current=current.parentId?goalsById.get(current.parentId):undefined;
  }
 }
 const visibleGoals=objectives.filter(goal=>includedIds.has(goal.id));
 const roots=visibleGoals.filter(goal=>!goal.parentId||!includedIds.has(goal.parentId));
 function renderGoal(goal:OkrObjective){
  const children=visibleGoals.filter(item=>item.parentId===goal.id);
  return <li key={goal.id}>
   <button style={goalTone(goal)} type="button" className="okr-tree-goal" aria-label={'جزئیات هدف '+goal.title} onClick={()=>open(goal.id)}>
    <bdi>{goal.code}</bdi><strong>{goal.title}</strong><small>{owner(goal)}</small>
    <span className="okr-tree-progress"><Progress value={objectiveProgress(portfolio,goal.id)}/>{number.format(objectiveProgress(portfolio,goal.id))}٪</span><Status value={pace(goal).status}/>
   </button>
   {children.length>0&&<ul>{children.map(renderGoal)}</ul>}
  </li>;
 }
 const strategy=<>
  {summary}
  <div className="okr-strategy-content">
  <section className="okr-panel okr-strategy-tree">
   <div className="okr-panel-head"><h3>درخت اهداف</h3>
    <details className="okr-axis-filter">
     <summary>محور استراتژیک · {selectedPillars.length?number.format(selectedPillars.length):'همه محورها'}</summary>
     <div className="panel okr-axis-options">
      <label><input type="checkbox" checked={!selectedPillars.length} onChange={()=>setSelectedPillars([])}/>همه محورها</label>
      {cyclePillars.map(axis=><label key={axis.name}>
       <input type="checkbox" checked={selectedPillars.includes(axis.name)} onChange={event=>setSelectedPillars(previous=>event.target.checked?[...previous,axis.name]:previous.filter(name=>name!==axis.name))}/>
       {axis.name}{!axis.active&&' (غیرفعال)'}
      </label>)}
     </div>
    </details>
   </div>
   {roots.length?<ul className="okr-tree-list">{roots.map(renderGoal)}</ul>:<p className="okr-empty">هدفی برای نمایش وجود ندارد.</p>}
  </section>
  <div className="okr-bottom-grid">
   <div className="okr-panel"><div className="okr-panel-head"><h3>ردیابی ارتباط‌ها در نما</h3><small>OKR → KPI</small></div>
    <button type="button" className="okr-info-row" onClick={()=>setSummaryDetail('linked')}><span><ChartNoAxesCombined size={15}/>نتایج کلیدی دارای KPI مرتبط</span><strong>{number.format(results.filter(k=>k.kpiId&&data.kpis.some(x=>x.id===k.kpiId)).length)}</strong></button>
    <button type="button" className="okr-info-row" onClick={()=>setSummaryDetail('departments')}><span><Building2 size={15}/>دپارتمان‌های دارای هدف</span><strong>{number.format(new Set(objectives.map(x=>x.ownerUnitId).filter(Boolean)).size)}</strong></button>
   </div>
   <div className="okr-panel"><div className="okr-panel-head"><h3>مرور دوره</h3><small>{cycle?.title??'دوره انتخاب نشده'}</small></div>
    <button type="button" className="okr-info-row" onClick={()=>setSummaryDetail('onTrack')}><span><CheckCircle2 size={15}/>هدف‌های در مسیر</span><strong>{number.format(onTrackCount)}</strong></button>
    <button type="button" className="okr-info-row" onClick={()=>setSummaryDetail('risk')}><span><AlertTriangle size={15}/>نیازمند پیگیری</span><strong>{number.format(riskCount)}</strong></button>
    <button type="button" className="okr-info-row" onClick={()=>setSummaryDetail('unscored')}><span><History size={15}/>بدون مبنا / شروع‌نشده</span><strong>{number.format(unscoredCount)}</strong></button><button type="button" className="okr-info-row" onClick={()=>setSummaryDetail('checkins')}><span><Activity size={15}/>Check-in ثبت‌شده</span><strong>{number.format(checkins.length)}</strong></button>
   </div>
  </div>
  </div>
 </>;
 const detailNames:Record<SummaryDetail,string>={
  objectives:'اهداف دوره',results:'نتایج کلیدی',progress:'تحقق اهداف',risk:'اهداف نیازمند پیگیری',
  linked:'نتایج کلیدی دارای KPI مرتبط',departments:'دپارتمان‌های دارای هدف',onTrack:'هدف‌های در مسیر',
  unscored:'اهداف بدون مبنا یا شروع‌نشده',checkins:'تاریخچه Check-inها',
 };
 const linkedResults=results.filter(kr=>data.kpis.some(kpi=>kpi.id===kr.kpiId));
 const statusFilter=summaryDetail==='risk'?['AT_RISK','OFF_TRACK']:summaryDetail==='onTrack'?['ON_TRACK']:
  summaryDetail==='unscored'?['NOT_STARTED','NO_DATA']:null;
 const detailGoals=objectives.filter(goal=>!statusFilter||statusFilter.includes(pace(goal).status));
 const detailResults=summaryDetail==='linked'?linkedResults:results;
 const detailDate=new Intl.DateTimeFormat('fa-IR-u-ca-persian',{dateStyle:'medium',timeZone:'Asia/Tehran'});
 function openFromSummary(id:string){setSummaryDetail(null);open(id);}
 const resultsFor = (goal:OkrObjective) => results.filter(row=>row.objectiveId===goal.id);
 const isExpanded = (goal:OkrObjective) => expandedResults[goal.id]??showAllResults;
 function resultBadge(goal:OkrObjective){
  const count=resultsFor(goal).length;
  const expanded=isExpanded(goal);
  return count>0&&<button aria-expanded={expanded} type="button" className="okr-kr-badge"
    aria-label={(expanded?'جمع کردن ':'نمایش ')+number.format(count)+' نتیجهٔ کلیدی '+goal.title}
    onClick={()=>setExpandedResults(old=>({...old,[goal.id]:!expanded}))}><bdi>{number.format(count)} KR</bdi><ChevronDown size={12}/></button>;
 }
 function inlineResults(goal:OkrObjective){
  const rows=resultsFor(goal);
  if(!isExpanded(goal)||!rows.length)return null;
  return <ul className="okr-inline-results">{rows.map(result=><li key={result.id}>
   <div className="okr-kr-caption"><strong>{result.title}</strong> <small>(مبنا: {number.format(result.baseline)}، فعلی: {number.format(result.current)}، هدف: {number.format(result.target)}{result.unit?' '+result.unit:''})</small></div><div className="okr-kr-progress"><Progress value={keyResultProgress(result)}/><b>{number.format(keyResultProgress(result))}٪</b></div>
  </li>)}</ul>;
 }
 function goalTone(goal:OkrObjective){
  const index=data.units.findIndex(unit=>unit.id===goal.ownerUnitId);
  return index<0?undefined:{backgroundColor:'hsl('+((index*137.508)%360)+' 51% 95%)'};
 }
 const goals=<div className="okr-goals-content">
  <div className="okr-goal-toolbar"><label className="okr-search"><Search size={17}/><input value={search} placeholder="جست‌وجو در نام هدف، کد و دپارتمان…" onChange={e=>setSearch(e.target.value)} aria-label="جست‌وجوی اهداف"/></label>
   <select aria-label="سطح اهداف" value={scope} onChange={e=>setScope(e.target.value)}><option value="ALL">همه سطوح</option><option value="COMPANY">سازمانی</option><option value="DEPARTMENT">دپارتمانی</option></select>
   <div className="okr-view-toggle" role="group" aria-label="نمایش اهداف"><button className={listView==='tree'?'active':''} onClick={()=>setListView('tree')} aria-pressed={listView==='tree'}><LayoutList size={16}/>درختی</button><button className={listView==='table'?'active':''} onClick={()=>setListView('table')} aria-pressed={listView==='table'}><Table2 size={16}/>جدولی</button></div>
   <div className="okr-view-toggle" role="group" aria-label="نمایش نتایج کلیدی">
    <button type="button" aria-label="فقط اهداف" aria-pressed={!showAllResults} className={!showAllResults?'active':''} onClick={()=>{setShowAllResults(false);setExpandedResults({});}}><Target size={16}/>فقط اهداف</button>
    <button type="button" aria-label="اهداف و نتایج کلیدی" aria-pressed={showAllResults} className={showAllResults?'active':''} onClick={()=>{setShowAllResults(true);setExpandedResults({});}}><ListTree size={16}/>اهداف و نتایج کلیدی</button>
   </div>
  </div>
  <section className="okr-panel">{filtered.length?listView==='tree'?<div className="okr-list">
   {filtered.map(g=><div key={g.id} className="okr-goal-entry"><div className="okr-goal-row-wrap">{resultBadge(g)}<div className="okr-list-row" style={goalTone(g)}>
    <div className={'okr-list-title '+(g.parentId?'is-child':'')}><small>{g.code} · {g.level==='COMPANY'?'سازمانی':'دپارتمانی'}</small><div className="okr-goal-name"><button type="button" className="text-button" onClick={()=>open(g.id)}>{g.title}</button></div><small>{owner(g)}</small></div>
    <div className="okr-list-progress"><Progress value={objectiveProgress(portfolio,g.id)}/><strong className="okr-objective-percent">{number.format(objectiveProgress(portfolio,g.id))}٪</strong></div><Status value={pace(g).status}/>
   </div></div>{inlineResults(g)}</div>)}
  </div>:<div className="okr-table-wrap"><table><thead><tr><th>هدف</th><th>مالک</th><th>نتایج کلیدی</th><th>تحقق</th><th>وضعیت</th></tr></thead><tbody>{filtered.map(g=><Fragment key={g.id}><tr style={goalTone(g)}><td><button type="button" className="text-button" onClick={()=>open(g.id)}>{g.title}</button><small>{g.code}</small></td><td>{owner(g)}</td><td>{resultBadge(g)}</td><td>{number.format(objectiveProgress(portfolio,g.id))}٪</td><td><Status value={pace(g).status}/></td></tr>{isExpanded(g)&&resultsFor(g).length>0&&<tr style={goalTone(g)}><td colSpan={5}>{inlineResults(g)}</td></tr>}</Fragment>)}</tbody></table></div>:<p className="okr-empty">هدفی با این شرایط پیدا نشد.</p>}</section>
 </div>;
 const monitoring=<div className="okr-monitor-content">
  <div className="okr-monitor-grid">
   <section className="okr-panel"><div className="okr-panel-head"><div><h3 id="okr-department-progress-title">تحقق اهداف به تفکیک دپارتمان</h3><small>درصد پیشرفت واقعی اهداف</small></div></div>
    <div className="okr-monitor-list" role="region" aria-labelledby="okr-department-progress-title" tabIndex={0}>
    {objectives.map(g=><button className="okr-monitor-row" key={g.id} onClick={()=>open(g.id)}><strong>{owner(g)}</strong><Progress value={objectiveProgress(portfolio,g.id)}/><b>{number.format(objectiveProgress(portfolio,g.id))}٪</b></button>)}
    {!objectives.length&&<p className="okr-empty">هنوز هدفی ثبت نشده است.</p>}
    </div>
   </section>
   <section className="okr-panel"><div className="okr-panel-head"><h3 id="okr-risk-title">اهداف نیازمند اقدام</h3><small>ریسک و انحراف</small></div>
    <div className="okr-monitor-list" role="region" aria-labelledby="okr-risk-title" tabIndex={0}>
    {objectives.filter(g=>['AT_RISK','OFF_TRACK'].includes(pace(g).status)).map(g=><button className="okr-risk-row" key={g.id} onClick={()=>open(g.id)}><span><strong>{g.title}</strong><small>{owner(g)} · تحقق {number.format(pace(g).actual)}٪</small></span><Status value={pace(g).status}/></button>)}
    {!riskCount&&<p className="okr-empty">هدف پرریسکی در این دوره ثبت نشده است.</p>}
    </div>
   </section>
  </div>
  <section className="okr-panel okr-checkins"><div className="okr-panel-head"><h3 id="okr-checkins-title">آخرین Check-inها</h3><small>پیشرفت و توضیحات ثبت‌شده</small></div>
   <div className="okr-monitor-list" role="region" aria-labelledby="okr-checkins-title" tabIndex={0}>
   {checkins.map(c=>{const kr=portfolio.keyResults.find(k=>k.id===c.keyResultId);return <div className="okr-checkin-row" key={c.id}><div><strong>{kr?.title??'نتیجه کلیدی'}</strong><small>{c.note||'بدون توضیح'} · {new Intl.DateTimeFormat('fa-IR-u-ca-persian',{dateStyle:'medium'}).format(new Date(c.createdAt))}</small></div><span><b>{number.format(c.value)} {kr?.unit}</b><Status value={objectivePace(portfolio,c.objectiveId,today).status}/></span></div>;})}
   {!checkins.length&&<p className="okr-empty">Check-in برای این دوره ثبت نشده است. از جزئیات هر هدف می‌توانید مقدار جدید ثبت کنید.</p>}
   </div>
  </section>
 </div>;
 return <div ref={ref} className={'okr-workspace okr-workspace-'+tab}>
  <div className="module-toolbar">
   <nav className="process-workspace-tabs" aria-label="بخش‌های مدیریت OKR">{(['strategy','goals','monitor']as Tab[]).map((t,i)=><button key={t} className={tab===t?'active':''} aria-current={tab===t?'page':undefined} onClick={()=>go(t==='strategy'?'/okr':'/okr?tab='+t)}>{i===0?<Network size={17}/>:i===1?<Target size={17}/>:<ChartColumnIncreasing size={17}/>}<span>{titleByTab[t]}</span></button>)}</nav>
   <div className="okr-heading-actions"><label className="okr-cycle-control"><CalendarDays size={16}/><select aria-label="دوره OKR" value={cycle?.id??''} onChange={e=>{setActiveCycle(e.target.value);setSelectedId(null);setSelectedPillars([]);}}>{!portfolio.cycles.length&&<option value="">دوره‌ای تعریف نشده</option>}{portfolio.cycles.map(c=><option key={c.id} value={c.id}>{c.title} {c.status==='PLANNING'?'· برنامه‌ریزی':''}</option>)}</select><ChevronDown size={13}/></label>
    {canEdit&&<button className="okr-button okr-button-muted" onClick={()=>{setSelectedId(null);setCycleManagerOpen(true);setError('');setFeedback('');}}><CalendarDays size={15}/>مدیریت دوره‌ها</button>}
    {canEdit&&<button className="okr-button okr-button-primary" onClick={()=>showForm('objective')}><Plus size={17}/>هدف جدید</button>}
   </div>
  </div>
  {feedback&&<p className="okr-feedback" role="status">{feedback}<button onClick={()=>setFeedback('')} aria-label="بستن پیام">×</button></p>}
  {error&&!form&&<p className="okr-error" role="alert">{error}<button onClick={()=>setError('')}>×</button></p>}
  {canEdit&&<details className="okr-pillar-management">
   <summary>مدیریت محورهای استراتژیک</summary>
   <p>محور غیرفعال برای هدف جدید قابل انتخاب نیست. اهداف قبلی آن در نقشه و گزارش‌ها باقی می‌مانند.</p>
   <form onSubmit={addPillar}>
    <label>نام محور جدید<input name="pillarName" maxLength={80} required/></label>
    <button className="okr-button okr-button-primary" type="submit"><Plus size={16}/>افزودن محور</button>
   </form>
   {pillars.length?<ul>{pillars.map(axis=><li key={axis.name}><label>
    <input type="checkbox" checked={axis.active} onChange={e=>togglePillar(axis.name,e.target.checked)} aria-label={'فعال بودن محور '+axis.name}/>
    <span>{axis.name}</span><small>{axis.active?'فعال':'غیرفعال'}</small>
   </label></li>)}</ul>:<p>هنوز محوری تعریف نشده است.</p>}
  </details>}

  {!cycle&&<p className="okr-empty">برای شروع، از «مدیریت دوره‌ها» یک دوره هدف‌گذاری بسازید.</p>}
  {tab==='strategy'?strategy:tab==='goals'?goals:monitoring}
  {summaryDetail&&<Modal className="okr-detail okr-modal" label={detailNames[summaryDetail]} onClose={()=>setSummaryDetail(null)}>
   <header><h2>{detailNames[summaryDetail]}</h2><button type="button" className="okr-icon-button" aria-label="بستن جزئیات" onClick={()=>setSummaryDetail(null)}><X size={20}/></button></header>
   {summaryDetail==='checkins'?<ul className="okr-summary-list">{checkins.map(c=><li key={c.id}><strong>{portfolio.keyResults.find(k=>k.id===c.keyResultId)?.title}</strong><small>{detailDate.format(new Date(c.createdAt))} · {number.format(c.previous)} ← {number.format(c.value)}</small>{c.note&&<p>{c.note}</p>}</li>)}</ul>:
    summaryDetail==='results'||summaryDetail==='linked'?<ul className="okr-summary-list">{detailResults.map(kr=><li key={kr.id}><button type="button" className="text-button" onClick={()=>openFromSummary(kr.objectiveId)}>{kr.title}</button><small>{number.format(keyResultProgress(kr))}٪</small>{summaryDetail==='linked'&&<Link to={'/kpis/'+kr.kpiId}>{data.kpis.find(kpi=>kpi.id===kr.kpiId)?.name}</Link>}</li>)}</ul>:
    summaryDetail==='departments'?<ul className="okr-summary-list">{data.units.filter(unit=>objectives.some(goal=>goal.ownerUnitId===unit.id)).map(unit=><li key={unit.id}><strong>{unit.name}</strong>{objectives.filter(goal=>goal.ownerUnitId===unit.id).map(goal=><button type="button" key={goal.id} className="text-button" onClick={()=>openFromSummary(goal.id)}>{goal.title}</button>)}</li>)}</ul>:
    <ul className="okr-summary-list">{detailGoals.map(goal=><li key={goal.id}><button type="button" className="text-button" onClick={()=>openFromSummary(goal.id)}>{goal.title}</button><small>{owner(goal)} · {number.format(objectiveProgress(portfolio,goal.id))}٪</small></li>)}</ul>}
   <p className="okr-empty okr-summary-empty">موردی ثبت نشده است.</p>
  </Modal>}
  {selected&&!form&&<Modal className="okr-detail okr-modal" label="جزئیات هدف OKR" onClose={()=>setSelectedId(null)}>
   <header><div><span className="okr-code">{selected.code}</span><h2>{selected.title}</h2><p>{owner(selected)} · {cycle?.title}{selected.pillar&&<> · {selected.pillar}</>}</p></div><button className="okr-icon-button" aria-label="بستن جزئیات" onClick={()=>setSelectedId(null)}><X size={20}/></button></header>
   <div className="okr-detail-summary"><span>پیشرفت واقعی هدف</span><strong>{number.format(objectiveProgress(portfolio,selected.id))}٪</strong><Progress value={objectiveProgress(portfolio,selected.id)}/><div><Status value={pace(selected).status}/><small>({paceExplanation[pace(selected).status]})</small></div></div>
   {selected.description&&<p className="okr-description">{selected.description}</p>}
   <div className="okr-detail-tabs" role="tablist" aria-label="اطلاعات هدف">{(['results','links','history']as DetailTab[]).map((key,i)=><button role="tab" aria-selected={detailTab===key} className={detailTab===key?'active':''} key={key} onClick={()=>setDetailTab(key)}>{['نتایج کلیدی','ارتباطات','تاریخچه'][i]}</button>)}</div>
   {detailTab==='results'&&<div className="okr-detail-body">{selectedResults.map(kr=><div className="okr-result" key={kr.id}><div className="okr-result-head"><strong>{kr.title}</strong><span>{number.format(keyResultProgress(kr))}٪</span></div><Progress value={keyResultProgress(kr)}/><div className="okr-value-row"><span>مبنا: <b>{number.format(kr.baseline)}</b></span><span>فعلی: <b>{number.format(kr.current)}</b></span><span>هدف: <b>{number.format(kr.target)} {kr.unit}</b></span></div>{canEdit&&<button className="okr-button okr-button-muted" onClick={()=>showForm('checkin',{keyResultId:kr.id})}><Activity size={15}/>ثبت Check-in</button>}</div>)}
    {!selectedResults.length&&<p className="okr-empty">نتیجه کلیدی برای این هدف تعریف نشده است.</p>}
    {canEdit&&<button className="okr-button okr-add-kr" onClick={()=>showForm('kr',{objectiveId:selected.id})}><Plus size={16}/>تعریف نتیجه کلیدی</button>}
   </div>}
   {detailTab==='links'&&<div className="okr-detail-body"><h3><ChartNoAxesCombined size={17}/>KPIهای مرتبط</h3>{selectedResults.filter(k=>k.kpiId&&data.kpis.some(item=>item.id===k.kpiId)).map(k=>{const linked=data.kpis.find(item=>item.id===k.kpiId)!;return <Link key={k.id} to={'/kpis/'+linked.id} className="okr-related-link" >{linked.name}<ArrowUpLeft size={16}/></Link>;})}{!selectedResults.some(k=>data.kpis.some(item=>item.id===k.kpiId))&&<p className="okr-empty">ارتباط KPI ثبت نشده است.</p>}<p className="okr-note">این پیوندها، ارتباط مستندشده را نمایش می‌دهند و نشان‌دهنده اثر علّی اثبات‌شده نیستند.</p></div>}
   {detailTab==='history'&&<div className="okr-detail-body">{portfolio.checkins.filter(c=>c.objectiveId===selected.id).slice().reverse().map(c=><div className="okr-history-row" key={c.id}><strong>{portfolio.keyResults.find(k=>k.id===c.keyResultId)?.title}</strong><small>{new Intl.DateTimeFormat('fa-IR-u-ca-persian',{dateStyle:'medium'}).format(new Date(c.createdAt))}</small><p>{c.note||'ثبت مقدار نتیجه کلیدی'}</p><span>{number.format(c.previous)} ← {number.format(c.value)}</span></div>)}{!portfolio.checkins.some(c=>c.objectiveId===selected.id)&&<p className="okr-empty">هنوز تغییری برای این هدف ثبت نشده است.</p>}</div>}
  </Modal>}
  {canEdit&&cycleManagerOpen&&<div className="okr-form-backdrop okr-cycle-backdrop" onPointerDown={e=>{if(e.target===e.currentTarget)setCycleManagerOpen(false);}}><section className="okr-cycle-manager" role="dialog" aria-modal={form?undefined:true} aria-label="مدیریت دوره‌های OKR">
    <header className="okr-cycle-manager-header"><div><h2>مدیریت دوره‌های OKR</h2><p>تمام دوره‌های تعریف‌شده را مرور کنید یا یک دوره جدید بسازید.</p></div><button className="okr-icon-button" aria-label="بستن مدیریت دوره‌ها" onClick={()=>setCycleManagerOpen(false)}><X size={19}/></button></header>
    <div className="okr-cycle-manager-tools"><span>{number.format(portfolio.cycles.length)} دوره تعریف‌شده</span>{canEdit&&<button className="okr-button okr-button-primary" onClick={()=>showForm('cycle')}><Plus size={16}/>دوره جدید</button>}</div>
    {feedback&&<p className="okr-feedback" role="status">{feedback}</p>}
    <div className="okr-cycle-list">{portfolio.cycles.map(c=>{const cycleObjectives=portfolio.objectives.filter(o=>o.cycleId===c.id),ids=new Set(cycleObjectives.map(o=>o.id)),countKrs=portfolio.keyResults.filter(k=>ids.has(k.objectiveId)).length,selectedCycle=c.id===cycle?.id;return <article key={c.id} className={'okr-cycle-item '+(selectedCycle?'selected':'')}>
      <div className="okr-cycle-item-heading"><h3>{c.title}</h3><span className={'okr-cycle-state '+(c.status==='ACTIVE'?'is-active':c.status==='CLOSED'?'is-closed':'is-planning')}>{c.status==='ACTIVE'?'فعال':c.status==='CLOSED'?'بسته‌شده':'برنامه‌ریزی'}</span></div>
      <p className="okr-cycle-dates"><CalendarDays size={15}/>{cycleDates(c.startDate,c.endDate)}</p>
      <div className="okr-cycle-counts"><span>{number.format(cycleObjectives.length)} هدف</span><span>{number.format(countKrs)} نتیجه کلیدی</span></div>
      <div className="okr-cycle-actions"><button className={'okr-button '+(selectedCycle?'okr-button-muted':'okr-button-primary')} onClick={()=>selectCycle(c.id)}>{selectedCycle?'دوره انتخاب‌شده':'مشاهده دوره'}<ChevronLeft size={15}/></button>{canEdit&&<button className="okr-button okr-button-muted" onClick={()=>showForm('cycle',{cycleId:c.id})}>ویرایش تاریخ‌ها</button>}</div>
    </article>;})}{!portfolio.cycles.length&&<p className="okr-empty">هنوز دوره‌ای تعریف نشده است. از «دوره جدید» شروع کنید.</p>}</div>
   </section></div>}
  {canEdit&&form&&<div className="okr-form-backdrop" onPointerDown={e=>{if(e.target===e.currentTarget)setForm(null);}}><form className="okr-form" onSubmit={saveForm} role="dialog" aria-label="فرم مدیریت OKR" aria-modal="true"><header><h2>{form==='checkin'?'ثبت Check-in':form==='kr'?'تعریف نتیجه کلیدی':form==='objective'?'هدف جدید':(draft.cycleId?'ویرایش دوره':'ایجاد دوره جدید')}</h2><button type="button" aria-label="بستن فرم" onClick={()=>setForm(null)}><X size={19}/></button></header>
   {form==='cycle'&&<><label>نام دوره<input name="title" required minLength={4} maxLength={70} placeholder="مثلاً بهار ۱۴۰۶" value={cycleDraft.title} onChange={e=>changeCycleName(e.target.value)}/></label><div className="okr-form-numbers"><label>تاریخ شروع (شمسی)<input name="startDate" inputMode="numeric" autoComplete="off" required placeholder="۱۴۰۶/۰۱/۰۱" value={cycleDraft.start} onChange={e=>setCycleDraft(prev=>({...prev,start:e.target.value,editedStart:true}))}/></label><label>تاریخ پایان (شمسی)<input name="endDate" inputMode="numeric" autoComplete="off" required placeholder="۱۴۰۶/۰۳/۳۱" value={cycleDraft.end} onChange={e=>setCycleDraft(prev=>({...prev,end:e.target.value,editedEnd:true}))}/></label></div><div className="okr-cycle-form-help"><span>با نامی مثل «بهار ۱۴۰۶» بازه به‌طور خودکار پیشنهاد می‌شود. می‌توانید هر دو تاریخ را تغییر دهید.</span>{suggestCycleDates(cycleDraft.title)&&<button type="button" className="okr-text-button" onClick={restoreCycleSuggestion}>بازگردانی تاریخ پیشنهادی</button>}</div></>}
   {form==='objective'&&<><label>عنوان هدف<input name="title" required minLength={8} maxLength={220} placeholder="هدف روشن و نتیجه‌محور"/></label><label>توضیح<textarea name="description" maxLength={500} rows={2}/></label><label>هدف بالادستی<select name="parentId"><option value="">هدف سازمانی (ریشه)</option>{objectives.filter(x=>x.level==='COMPANY').map(g=><option key={g.id} value={g.id}>{g.title}</option>)}</select></label><label>واحد مالک<select name="ownerUnitId"><option value="">کل سازمان</option>{data.units.map(unit=><option key={unit.id} value={unit.id}>{unit.name}</option>)}</select></label><label>محور استراتژیک<select name="pillar" required defaultValue=""><option value="" disabled>{activePillars.length?'انتخاب محور':'محور فعالی وجود ندارد'}</option>{activePillars.map(axis=><option key={axis.name} value={axis.name}>{axis.name}</option>)}</select></label>{!activePillars.length&&<p className="okr-note">از «مدیریت محورهای استراتژیک» یک محور اضافه یا فعال کنید.</p>}</>}
   {form==='kr'&&<><label>عنوان نتیجه کلیدی<input name="title" required minLength={8} maxLength={220} placeholder="کاهش / افزایش عددی قابل سنجش"/></label><div className="okr-form-numbers"><label>مقدار مبنا<input name="baseline" required type="number" step="any" defaultValue={10}/></label><label>مقدار هدف<input name="target" required type="number" step="any" defaultValue={5}/></label></div><label>واحد سنجش<input name="unit" maxLength={25} placeholder="روز، درصد، عدد…"/></label><label>ارتباط با KPI موجود<select name="kpiId"><option value="">بدون KPI مرتبط</option>{data.kpis.map(k=><option key={k.id} value={k.id}>{k.name}</option>)}</select></label></>}
   {form==='checkin'&&<>{(()=>{const kr=portfolio.keyResults.find(k=>k.id===draft.keyResultId);return <><p className="okr-form-subtitle">{kr?.title}</p><label>مقدار واقعی جدید ({kr?.unit})<input type="number" step="any" required name="value" defaultValue={kr?.current}/></label><p className="okr-note">مبنا: {number.format(kr?.baseline??0)} · هدف: {number.format(kr?.target??0)}</p><p className="okr-note">وضعیت «در مسیر / نیازمند توجه / خارج از مسیر» به‌صورت خودکار از پیشرفت واقعی و زمان دوره محاسبه می‌شود.</p><label>توضیحات و موانع<textarea name="note" rows={3} maxLength={800}/></label></>;})()}</>}
   {error&&<p className="okr-error" role="alert">{error}</p>}
   <footer><button type="submit" className="okr-button okr-button-primary"><Save size={16}/>ذخیره آزمایشی</button><button type="button" className="okr-button okr-button-muted" onClick={()=>setForm(null)}>انصراف</button></footer>
  </form></div>}
 </div>;
}
