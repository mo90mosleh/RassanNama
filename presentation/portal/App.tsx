import {openTableRow,useTableSort} from './SortableTable';
import {routeQuery} from './ui';
import {ProcessIcon} from './ProcessIcon';
import {DashboardDate, DashboardSearch, DashboardWidgets, rememberVisit} from './DashboardWidgets';
import {QuickLinks} from './QuickLinks';
import {latestKpiValue} from './kpi-monitoring-storage';
import './process-workspace.css';
import {governanceSectionForPath} from './process-governance';
import{kpiOrganization}from'./kpi-organization';
import{PageContextProvider}from'./namayar/PageContextProvider';import{Namayar}from'./namayar/Namayar';
import{useOrganizationFilters,OrganizationFilters,OrganizationFilterNote}from'./OrganizationFilters';
import{Shell}from'./Shell';
import{Login}from'./Login';import{authClient,signOut}from'./auth';
import{Documents,Requirements}from'./References';import{ProcessProfile}from'./ProcessDetail';
import{lazy,Suspense,useEffect,useState,type FormEvent}from'react';import{LayoutDashboard,Network,ClipboardList,ChartNoAxesCombined,Settings as SettingsIcon,ChevronLeft,ChevronDown,ArrowLeft,UserRound,ShieldCheck,Save,LogIn,Menu,X}from'lucide-react';
import{loadData,loadInitialSnapshot,mutate,config}from'./api';import type{Data,Process}from'./types';import{Heading,Empty,Link,go,currentPath,number,errorMessage}from'./ui';import logo from'./assets/rassan-en.png';import{TargetArrowIcon}from'./TargetArrowIcon';import'./style.css';import'./mobile.css';import'./assistance-layout.css';import'./design-system.css';import'./chart-shell.css';

const KpiMonitoring=lazy(()=>import('./KpiMonitoring').then(module=>({default:module.KpiMonitoring})));
const Chart=lazy(()=>import('./Chart').then(module=>({default:module.Chart})));
const ProcessWorkspace=lazy(()=>import('./ProcessWorkspace').then(module=>({default:module.ProcessWorkspace})));
const OkrWorkspace=lazy(()=>import('./okr/OkrWorkspace').then(module=>({default:module.OkrWorkspace})));
const readiness:Record<string,string>={UNASSESSED:'بررسی‌نشده',DEFINED:'تعریف‌شده',GAP:'نیازمند داده',READY:'آمادهٔ پایش'};

function Badge({value}:{value:string}){return <span className={'badge status-'+value.toLowerCase()}>{readiness[value]??value}</span>;}
function Skeleton(){
 return <div className="loading nama-loading" role="status">
  <span>در حال دریافت اطلاعات…</span>
  <svg className="nama-loading-art" viewBox="0 0 224 144" width="224" height="144" aria-hidden="true">
   <rect width="224" height="144" rx="16" fill="#fff"/>
   <ellipse cx="112" cy="126" rx="97" ry="10" fill="#eaf2ed"/>
   <path d="M62 88v23m39-23v23M55 112h16m24 0h16" fill="none" stroke="#303030" strokeWidth="11" strokeLinecap="round"/>
   <g className="nama-loading-head">
    <rect x="38" y="16" width="92" height="74" rx="23" fill="#303030"/>
    <path className="nama-loading-eyes" d="M73 48v12m27-12v12" stroke="#faf5ed" strokeWidth="9" strokeLinecap="round"/>
   </g>
   <path d="M130 59h54l-13 43h-55z" fill="#267e68"/>
   <path d="M135 65h41l-9 29h-42z" fill="#dcefe5"/>
   <path className="nama-loading-data" d="M135 74h24m-26 7h15m-17 7h22M196 32h14m-14 22h14m-14 22h14" fill="none" stroke="#62a18a" strokeWidth="3" strokeLinecap="round"/>
   <rect x="95" y="102" width="78" height="11" rx="4" fill="#405853"/>
   <g fill="none" stroke="#303030" strokeWidth="8" strokeLinecap="round">
    <path className="nama-loading-hand" d="m79 78 23 19"/>
    <path className="nama-loading-hand" d="m103 77 19 20"/>
   </g>
  </svg>
 </div>;
}
function Dashboard({data}:{data:Data}) {
 return <><div className="dashboard-top"><DashboardDate/><DashboardSearch data={data}/></div><QuickLinks data={data}/><DashboardWidgets data={data}/></>;
}
function KPIList({data,id,reportId}:{data:Data;id?:string;reportId?:string}){const [search,setSearch]=useState(''),[status,setStatus]=useState(''),[scope,setScope]=useState(''),filter=useOrganizationFilters(data,'kpis');const sort=useTableSort();const columnLabels=['کد','عنوان شاخص','سطح ارزیابی','سمت یا دپارتمان مرتبط','تناوب','آمادگی داده','مقدار واقعی'];if(id){const k=data.kpis.find(x=>x.id===id),latest=latestKpiValue(data,id);if(!k)return <Empty title="شاخص پیدا نشد" text="شاخص موردنظر در دسترس نیست."/>;return <><div className="kpi-profile-page"><Heading title={k.name} description="شناسنامهٔ شاخص عملکرد" action={<bdi className="code">{k.code}</bdi>}/><div className="detail-grid"><section className="panel padded"><div className="panel-title"><h2>تعریف شاخص</h2><Badge value={k.readiness_status}/></div><p className="description">{k.description}</p><div className="formula"><small>فرمول</small><p>{k.formula_text??'ثبت نشده'}</p></div><div className="facts"><div><span>سطح ارزیابی</span><b>{kpiOrganization(data,k.id).label}</b></div><div><span>دپارتمان مرتبط</span><b>{kpiOrganization(data,k.id).units.map(u=>u.name).join('، ')||'تعیین نشده'}</b></div><div><span>سمت مرتبط</span><b>{kpiOrganization(data,k.id).roles.map(p=>p.title).join('، ')||'—'}</b></div><div><span>واحد سنجش</span><b>{k.unit??'—'}</b></div><div><span>تناوب</span><b>{k.frequency??'—'}</b></div><div><span>منبع داده</span><b>{k.data_source??'—'}</b></div></div></section>{latest?<section className="panel padded"><h2>آخرین مقدار ثبت‌شده</h2><p>{number.format(latest.value)} {k.unit}</p><Link to="/kpis">داشبورد شاخص‌ها</Link></section>:<Empty title="هنوز اندازه‌گیری ثبت نشده است" text="مقدار واقعی پس از ثبت اندازه‌گیری در این بخش نمایش داده می‌شود."/>}</div><Requirements data={data} kpiId={k.id}/></div></>;}
 const rows=data.kpis.filter(k=>{
 const organization=kpiOrganization(data,k.id);
 return (!search||(k.name+' '+k.code).includes(search))&&(!status||k.readiness_status===status)&&(!scope||organization.scope===scope)&&(!filter.kpiIds||filter.kpiIds.has(k.id));});const profiles=(values?:ReadonlyMap<string,number>)=><><div className="toolbar"><input className="search" aria-label="جست‌وجو در شاخص‌ها" placeholder="جست‌وجوی نام یا کد شاخص…" value={search} onChange={e=>setSearch(e.target.value)}/><select aria-label="سطح ارزیابی" value={scope} onChange={e=>setScope(e.target.value)}><option value="">همهٔ شاخص‌ها</option><option value="DEPARTMENT">شاخص‌های دپارتمان</option><option value="POSITION">شاخص‌های سمت سازمانی</option><option value="ORGANIZATION">سازمانی</option></select><select aria-label="وضعیت آمادگی" value={status} onChange={e=>setStatus(e.target.value)}><option value="">همهٔ وضعیت‌ها</option>{Object.entries(readiness).map(([k,v])=><option value={k} key={k}>{v}</option>)}</select><OrganizationFilters data={data} filter={filter}/></div><OrganizationFilterNote filter={filter} kpi/>{sort.mobilePicker(columnLabels)}<section className="panel table-wrap"><table><thead><tr>{columnLabels.map(sort.header)}</tr></thead><tbody>{sort.ordered(rows,(k,i)=>{
 const org=kpiOrganization(data,k.id);
 return [k.code,k.name,org.label,org.roles.map(role=>role.title).join('، ')||org.units.map(unit=>unit.name).join('، '),k.frequency,readiness[k.readiness_status]??k.readiness_status,values?.get(k.id)][i];
 }).map(k=>{const latest=values?.get(k.id);return <tr key={k.id} className="clickable-table-row" onClick={event=>openTableRow(event,'/kpis/'+k.id)}><td data-label="کد"><bdi className="code">{k.code}</bdi></td><td data-label="عنوان شاخص"><Link to={'/kpis/'+k.id}>{k.name}</Link><small>{k.data_source}</small></td><td data-label="سطح ارزیابی"><span className="badge neutral">{kpiOrganization(data,k.id).label}</span></td><td data-label="سمت یا دپارتمان مرتبط">{kpiOrganization(data,k.id).roles.map(p=><div key={p.id}>{p.title}<small>{data.units.find(u=>u.id===p.org_unit_id)?.name}</small></div>)}{!kpiOrganization(data,k.id).roles.length&&(kpiOrganization(data,k.id).units.map(u=>u.name).join("، ")||"تعیین نشده")}</td><td data-label="تناوب">{k.frequency}</td><td data-label="آمادگی داده"><Badge value={k.readiness_status}/></td><td data-label="مقدار واقعی" className="muted">{latest===undefined?"ثبت نشده":number.format(latest)+" "+(k.unit??"")}</td></tr>;})}</tbody></table>{!rows.length&&<p className="empty-inline">شاخصی با این مشخصات پیدا نشد.</p>}</section></>;return <KpiMonitoring reportId={reportId} key={data.organization.id+":"+data.user.role} data={data} profiles={profiles}/>;}
function SettingsPage({data,refresh}:{data:Data;refresh:()=>Promise<void>}){const [error,setError]=useState(''),[success,setSuccess]=useState(''),[pending,setPending]=useState(false),[image,setImage]=useState<string|null|undefined>(undefined),[encoding,setEncoding]=useState(false);const org=data.organization;
 async function imageChange(file:File|undefined){if(!file)return;setError('');if(file.size>1048576||!['image/png','image/jpeg','image/webp'].includes(file.type)){setError('فایل PNG، JPEG یا WebP با حجم کمتر از ۱ مگابایت انتخاب کنید.');return;}setEncoding(true);try{const bitmap=await createImageBitmap(file);if(bitmap.width*bitmap.height>4e6){bitmap.close();throw Error('ابعاد تصویر بیش از حد مجاز است.');}const canvas=document.createElement('canvas'),ratio=Math.min(512/bitmap.width,512/bitmap.height,1);canvas.width=Math.max(1,Math.round(bitmap.width*ratio));canvas.height=Math.max(1,Math.round(bitmap.height*ratio));canvas.getContext('2d')!.drawImage(bitmap,0,0,canvas.width,canvas.height);bitmap.close();setImage(canvas.toDataURL('image/webp',.9));}catch(e){setError(errorMessage(e));}finally{setEncoding(false);}}
 async function save(e:FormEvent<HTMLFormElement>){e.preventDefault();if(pending||encoding)return;setPending(true);setError('');setSuccess('');try{const fields=Object.fromEntries(new FormData(e.currentTarget));if(image!==undefined)fields.logo_data_url=image as string;await mutate('organization','PATCH',fields);await refresh();setSuccess('تنظیمات سازمان ذخیره شد.');setImage(undefined);}catch(e){setError(errorMessage(e));}finally{setPending(false);}}
 return <><Heading title="تنظیمات سازمان" description="نام، لوگو و رنگ فضای سازمان را مدیریت کنید."/><section className="panel settings-panel"><h2>سازمان و هویت بصری</h2><form onSubmit={save}><label>نام سازمان<input name="name" defaultValue={org.name} required maxLength={150}/></label><label>نام نمایشی سامانه<input name="display_name" defaultValue={org.display_name} required maxLength={150}/></label><label>رنگ اصلی برند<input name="primary_color" type="color" defaultValue={org.primary_color}/></label><div className="logo-preview"><img src={image===undefined?org.logo_data_url??logo:image??logo} alt="لوگوی فعلی سازمان"/></div><label>لوگوی سازمان<input type="file" aria-label="لوگوی سازمان" aria-describedby="logo-hint" accept="image/png,image/jpeg,image/webp" onChange={e=>void imageChange(e.target.files?.[0])}/><small id="logo-hint">حداکثر ۱ مگابایت؛ PNG، JPEG یا WebP</small></label>{(image||org.logo_data_url)&&<button className="text-button" type="button" onClick={()=>setImage(null)}>بازگرداندن لوگوی پیش‌فرض</button>}{error&&<p className="alert error" role="alert">{error}</p>}{success&&<p className="alert success" role="status">{success}</p>}<button className="primary" disabled={pending||encoding}><Save size={16}/>{pending?'در حال ذخیره…':encoding?'در حال آماده‌سازی تصویر…':'ذخیره تغییرات'}</button></form></section></>;
}
function AccessDenied(){return <><Heading title="دسترسی محدود" description="این بخش فقط برای مدیر سامانه قابل دسترسی است."/><section className="panel empty"><ShieldCheck size={40}/><h2>به حساب مدیر نیاز دارید</h2><p>با حساب مجاز وارد فضای مدیریت شوید.</p>{config.adminUrl?<a className="primary" href={config.adminUrl}>ورود به فضای مدیریت</a>:<p>این نسخه برای مشاهده و ثبت بازخورد است.</p>}</section></>;}
export function App(){const[data,setData]=useState<Data|null>(null),[error,setError]=useState(''),[path,setPath]=useState(currentPath); useEffect(()=>{
 if(!data)return;
 const record=()=>{
  const current=currentPath(),query=routeQuery();
  const param=current==='/organization/chart'&&query.has('node')?query.toString():
   (current==='/kpis'||current==='/okr')&&query.has('tab')?'tab='+encodeURIComponent(query.get('tab')!):'';
  rememberVisit(data,current+(param?'?'+param:''));
 };
 record();
 window.addEventListener('popstate',record);
 window.addEventListener('hashchange',record);
 return()=>{window.removeEventListener('popstate',record);window.removeEventListener('hashchange',record);};
 },[data,path]);
async function refresh(){const v=await loadData();setData(v);setError('');}useEffect(()=>{
 let cancelled=false,liveStarted=false;
 const startLive=()=>{
  if(cancelled||liveStarted)return;
  liveStarted=true;
  void refresh().catch(e=>{if(!cancelled)setError(errorMessage(e));});
 };
 if(config.mode==='public'&&config.authEnabled&&config.snapshotPath){
  // Give the local public snapshot first chance to paint. If it is slow or
  // unavailable, never hold the live request beyond the short grace window.
  const fallbackTimer=window.setTimeout(startLive,2000);
  void loadInitialSnapshot().then(snapshot=>{
   if(!cancelled&&snapshot)setData(previous=>previous??snapshot);
  }).catch(()=>{/* Live data remains available. */}).finally(()=>{
   window.clearTimeout(fallbackTimer);
   startLive();
  });
  return()=>{cancelled=true;window.clearTimeout(fallbackTimer);};
 }
 startLive();
 return()=>{cancelled=true;};
 },[]);useEffect(()=>{const update=()=>setPath(currentPath());window.addEventListener('popstate',update);window.addEventListener('hashchange',update);return()=>{window.removeEventListener('popstate',update);window.removeEventListener('hashchange',update);};},[]);
 useEffect(()=>{if(!authClient)return;const{data:{subscription}}=authClient.auth.onAuthStateChange(event=>{if(['SIGNED_IN','SIGNED_OUT','USER_UPDATED','PASSWORD_RECOVERY'].includes(event)){setTimeout(()=>{void refresh().catch(e=>setError(errorMessage(e)));if(event==='PASSWORD_RECOVERY')go('/login');},0);}});return()=>subscription.unsubscribe();},[]);
 if(error&&!data)return <main className="startup"><section className="panel padded"><h1>دریافت اطلاعات انجام نشد</h1><p role="alert">{error}</p><button className="primary" onClick={()=>void refresh().catch(e=>setError(errorMessage(e)))}>تلاش دوباره</button></section></main>;if(!data)return <Skeleton/>;
 let content:React.ReactNode;const governanceSection=governanceSectionForPath(path);const admin=data.user.role==='ADMIN';if(path==='/login'&&config.authEnabled)content=<Login refresh={refresh}/>;else if(path==='/dashboard')content=<Dashboard data={data}/>;else if(path==='/organization/chart')content=<Chart data={data} refresh={refresh}/>;else if(path==='/architecture')content=<ProcessWorkspace data={data} section="architecture" refresh={refresh}/>;else if(governanceSection)content=<ProcessWorkspace data={data} section={governanceSection==='apqc'?'apqc':'catalog'} refresh={refresh}/>;else if(path==='/process-map')content=<ProcessWorkspace data={data} section="map" refresh={refresh}/>;else if(path==='/okr'||path.startsWith('/okr/'))content=<OkrWorkspace key={path+':'+data.organization.id+':'+data.user.role} data={data} objectiveId={path.split('/')[2]}/>;else if(path==='/processes')content=<ProcessWorkspace data={data} section="catalog" refresh={refresh}/>;else if(path.startsWith('/processes/'))content=<ProcessWorkspace data={data} section="catalog" detailId={path.split('/')[2]} refresh={refresh}/>;else if(path==='/kpis')content=<KPIList data={data}/>;else if(path.startsWith('/kpis/power-bi/'))content=<KPIList key={path} data={data} reportId={path.split('/')[3]}/>;else if(path.startsWith('/kpis/'))content=<KPIList key={path} id={path.split('/')[2]} data={data}/>;else if(path==='/settings')content=admin?<SettingsPage data={data} refresh={refresh}/>:<AccessDenied/>;else if(path==='/admin')content=admin?<><Heading title="پنل مدیریت" description="مدیریت اطلاعات سازمان، ساختار و شناسنامه‌ها"/><div className="admin-grid">{[['/settings','تنظیمات سازمان','نام، لوگو و رنگ سازمان',SettingsIcon],['/organization/chart','ساختار سازمانی','واحدها، سمت‌ها، افراد و تخصیص‌ها',Network],['/processes','شناسنامهٔ فرآیندها','ثبت و تکمیل اطلاعات فرآیند',ClipboardList]].map(([to,title,desc,Icon])=>{const Component=Icon as typeof SettingsIcon;return <Link to={to as string} className="panel admin-card" key={to as string}><Component size={28}/><h2>{title as string}</h2><p>{desc as string}</p><ArrowLeft size={17}/></Link>;})}</div></>:<AccessDenied/>;else if(path==='/documents')content=<><Heading title="مستندات" description="فایل‌ها و منابع مرتبط با فرآیندها"/><Documents data={data}/></>;else content=<><Heading title="صفحه پیدا نشد"/><Link to="/dashboard" className="primary">بازگشت به داشبورد</Link></>;
 return <PageContextProvider data={data} path={path}><Shell data={data} path={path}><Suspense fallback={<Skeleton/>}>{content}</Suspense></Shell> <Namayar key={data.user.role+':'+Boolean(data.user.email)}/></PageContextProvider>;
}
