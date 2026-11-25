import {Modal} from './Modal';
import{useMemo,useState,type FormEvent}from'react';
import{Search,Plus,Link2,Building2,ArrowUpLeft,ArrowRight,PenLine,Trash2,X}from'lucide-react';
import type{Data,ProcessRelation,ProcessRelationType}from'./types';
import{Link,errorMessage,number}from'./ui';
import{config,mutate}from'./api';
import{usePageSelection}from'./namayar/PageContextProvider';
import{duplicateRelation,initialProcessFocus,loadProcessRelationOverlay,mergeProcessRelations,processNeighbors,processRelationTypes,removeDraftRelation,saveProcessRelationOverlay,upsertDraftRelation,validRelation,type RelationOverlay}from'./process-relationships';
import{normalizeSearch}from'./architecture-navigation';
import{ProcessMapConnections}from'./ProcessMapConnections';
import'./process-map.css';

export function ProcessMap({data,refresh}:{data:Data;refresh:()=>Promise<void>}){
 const editable=data.user.role==='ADMIN';
 const demo=editable&&config.mode==='public'&&!config.authEnabled;
 const [overlay,setOverlay]=useState<RelationOverlay>(()=>demo?loadProcessRelationOverlay(data):{additions:[],updates:[],deletedIds:[]});
 const relations=useMemo(()=>demo?mergeProcessRelations(data.relations??[],overlay):data.relations??[],[data.relations,overlay,demo]);
 const processes=data.nodes.filter(n=>n.kind==='PROCESS');
 const [unlinkedOpen,setUnlinkedOpen]=useState(false);
 const [detailsOpen,setDetailsOpen]=useState(false);
 const [focus,setFocus]=useState(()=>initialProcessFocus(data.nodes,data.relations??[]));
 const [search,setSearch]=useState(''),[department,setDepartment]=useState(''),[edit,setEdit]=useState<ProcessRelation|null|undefined>(undefined),[busy,setBusy]=useState(false),[message,setMessage]=useState(''),[error,setError]=useState('');
 const current=processes.find(p=>p.id===focus);
 usePageSelection('/process-map',current?{kind:'process',id:current.id}:null);
 const neighbors=useMemo(()=>current?processNeighbors(relations,current.id):[],[relations,current?.id]);
 const filtered=processes.filter(p=>(!department||p.owner_org_unit_id===department)&&normalizeSearch(p.name+' '+(p.code??'')).includes(normalizeSearch(search.trim())));
 const departments=data.units.filter(u=>processes.some(p=>p.owner_org_unit_id===u.id));
 const byId=new Map(processes.map(p=>[p.id,p]));
 const reveal=(id:string)=>{setFocus(id);setDetailsOpen(true);setSearch('');setMessage('');};
 const writeOverlay=(next:RelationOverlay)=>{saveProcessRelationOverlay(data,next);setOverlay(next);};
 const save=async(e:FormEvent<HTMLFormElement>)=>{
  e.preventDefault();if(!editable)return;
  const f=new FormData(e.currentTarget);
  const item:ProcessRelation={id:edit?.id,source_process_id:String(f.get('source_process_id')??''),target_process_id:String(f.get('target_process_id')??''),relation_type:String(f.get('relation_type')??'RELATED') as ProcessRelationType,note:String(f.get('note')??'').trim()};
  if(!validRelation(item,data.nodes)){setError('مبدأ و مقصد باید دو فرآیند معتبر و متفاوت باشند.');return;}
  if(item.note&&item.note.length>400){setError('توضیح رابطه باید حداکثر ۴۰۰ کاراکتر باشد.');return;}
  if(duplicateRelation(relations,item,edit?.id)){setError('این رابطه قبلاً ثبت شده است.');return;}
  setBusy(true);setError('');setMessage('');
  try{
   if(demo){
    const next=upsertDraftRelation(overlay,data.relations??[],{...item,id:item.id??'local-'+crypto.randomUUID(),content_status:'DRAFT'});
    writeOverlay(next);
   }else{
    await mutate(edit?.id?'relations/'+edit.id:'relations',edit?.id?'PATCH':'POST',item);
    await refresh();
   }
   setFocus(item.source_process_id);setEdit(undefined);setMessage(demo?'ارتباط به‌صورت آزمایشی در همین مرورگر ذخیره شد.':'ارتباط در اطلاعات سازمان ذخیره شد.');
  }catch(err){setError(errorMessage(err));}finally{setBusy(false);}
 };
 const remove=async(rel:ProcessRelation)=>{
  if(!editable||!rel.id)return;
  if(!window.confirm('این ارتباط از نقشه فرآیندها حذف شود؟'))return;
  setBusy(true);setError('');setMessage('');
  try{
   if(demo)writeOverlay(removeDraftRelation(overlay,data.relations??[],rel.id));
   else{await mutate('relations/'+rel.id,'DELETE');await refresh();}
   setMessage(demo?'حذف ارتباط فقط در همین مرورگر ثبت شد.':'ارتباط حذف شد.');
  }catch(err){setError(errorMessage(err));}finally{setBusy(false);}
 };
 const linked = new Set(relations.flatMap(row=>[row.source_process_id,row.target_process_id]));
 const unlinked = filtered.filter(node=>!linked.has(node.id));
 const groups = new Map<string, {title:string;nodes:Data['nodes']}>();
 for(const node of filtered){
  if(!linked.has(node.id))continue;
  const parent=data.nodes.find(item=>item.id===node.parent_id&&item.kind==='GROUP');
  const key=parent?.id??'';
  const group=groups.get(key)??{title:parent?.name??'سایر فرآیندهای مرتبط',nodes:[]};
  group.nodes.push(node);
  groups.set(key,group);
 }
 const processCard=(node:Data['nodes'][number])=><button key={node.id} type="button" data-process-id={node.id} className="pm-value-step" onClick={()=>{setUnlinkedOpen(false);reveal(node.id);}}>
  <bdi>{node.code}</bdi><span>{node.name}</span>
 </button>;
 return <div className="process-map">
  <div className="process-map-tools">
   <div className="process-map-search-wrap"><label className="process-map-search"><Search size={17}/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="نام یا کد فرآیند را پیدا کنید…" aria-label="جست‌وجوی فرآیند روی نقشه"/>{search&&<button className="icon-button" aria-label="پاک کردن جست‌وجو" onClick={()=>setSearch('')}><X size={14}/></button>}</label>
    {search.trim()&&<div className="pm-search-results" aria-label="نتایج جست‌وجوی نقشه">{filtered.length?filtered.map(p=><button key={p.id} onClick={()=>reveal(p.id)}><strong>{p.name}</strong><small>{data.units.find(u=>u.id===p.owner_org_unit_id)?.name??'بدون دپارتمان'} · {p.code}</small></button>):<p>فرآیندی پیدا نشد.</p>}</div>}
   </div>
   <select className="pm-department-filter" aria-label="دپارتمان نقشه" value={department} onChange={e=>{const value=e.target.value;setDepartment(value);if(value){const first=processes.find(p=>p.owner_org_unit_id===value);if(first)setFocus(first.id);}}}><option value="">همه دپارتمان‌ها</option>{departments.map(u=><option key={u.id} value={u.id}>{u.name}</option>)}</select>
   <div className="process-map-toolbar-actions">
    {editable&&<button className="primary process-map-add" onClick={()=>{setEdit(null);setError('');}}><Plus size={16}/>تعریف ارتباط</button>}
    <button type="button" className="secondary pm-unlinked-button" onClick={()=>setUnlinkedOpen(true)}>فرآیندهای بدون ارتباط · {number.format(unlinked.length)}</button>
   </div>
  </div>
  {message&&<p role="status" className="alert success">{message}</p>}{error&&edit===undefined&&<p role="alert" className="alert error">{error}</p>}
  <div className="process-map-body">
   <section className="panel process-map-canvas-panel pm-value-panel" aria-label="فرآیندهای مرتبط">
    <div className="pm-chain-grid">
     <ProcessMapConnections relations={relations} layoutKey={filtered.map(node=>node.id).join(',')}/>
     {[...groups].map(([id,{title,nodes}])=><section className="pm-chain" key={id}>
      <h2>{title}</h2>
      <ul>{nodes.map(node=><li key={node.id}>{processCard(node)}</li>)}</ul>
     </section>)}
    </div>
    {!groups.size&&<p className="muted">فرآیند مرتبطی با فیلتر فعلی پیدا نشد.</p>}
   </section>
  </div>
  {unlinkedOpen&&<Modal className="process-map-dialog" label="فرآیندهای بدون ارتباط" onClose={()=>setUnlinkedOpen(false)}>
    <header className="pm-side-title"><h2>فرآیندهای بدون ارتباط</h2><button type="button" className="icon-button" aria-label="بستن" onClick={()=>setUnlinkedOpen(false)}><X size={20}/></button></header>
    <div className="pm-chain-extras">{unlinked.length?unlinked.map(processCard):<p>فرآیندی بدون ارتباط در این نما وجود ندارد.</p>}</div>
  </Modal>}
  {current&&detailsOpen&&edit===undefined&&<Modal className="process-map-dialog" label="جزئیات ارتباط‌های فرآیند" onClose={()=>setDetailsOpen(false)}>
    <header className="pm-side-title"><Link2 size={17}/><h2>جزئیات ارتباط‌ها</h2><button type="button" className="icon-button" aria-label="بستن جزئیات ارتباط‌ها" onClick={()=>setDetailsOpen(false)}><X size={20}/></button></header>
    <section className="pm-selected-profile"><bdi className="code">{current.code}</bdi><h3>{current.name}</h3><p className="process-map-owner"><Building2 size={14}/>{data.units.find(u=>u.id===current.owner_org_unit_id)?.name??'واحد مالک نامشخص'}</p><Link to={'/processes/'+current.id} className="process-map-profile">مشاهده شناسنامه<ArrowUpLeft size={14}/></Link></section>
    <p className="process-map-description">{data.profiles.find(p=>p.process_id===current.id)?.objective??current.summary??'توضیح ثبت نشده'}</p>
    <div className="process-map-side-heading"><strong>ارتباط‌های این فرآیند</strong><span>{number.format(neighbors.length)} رابطه</span></div>
    <div className="pm-relations-list">{neighbors.length?neighbors.map((r,i)=>{const other=byId.get(r.otherId);return <article key={r.id??i} className="process-map-neighbor">
     <div className="pm-relation-badges"><span className={'process-map-type type-'+r.relation_type}>{processRelationTypes[r.relation_type]}</span><span>{r.relation_type==='RELATED'?'دوطرفه':r.direction==='incoming'?'مقصد این ارتباط':'مبدأ این ارتباط'}</span></div>
     <button className="process-map-link" onClick={()=>reveal(r.otherId)}>{other?.name??'فرآیند نامشخص'}<ArrowRight size={14}/></button>
     <small className="pm-neighbor-department"><Building2 size={12}/>{data.units.find(u=>u.id===other?.owner_org_unit_id)?.name??'بدون دپارتمان'}</small>
     {r.relation_type!=='RELATED'&&<p className="pm-relation-route">{byId.get(r.source_process_id)?.name} ← {processRelationTypes[r.relation_type]} ← {byId.get(r.target_process_id)?.name}</p>}
     {r.note&&<p className="pm-relation-note">{r.note}</p>}
     {editable&&<div className="process-map-actions"><button aria-label={'ویرایش ارتباط با '+(other?.name??'')} onClick={()=>{setEdit(r);setError('');}}><PenLine size={15}/></button><button aria-label={'حذف ارتباط با '+(other?.name??'')} disabled={busy} onClick={()=>void remove(r)}><Trash2 size={15}/></button></div>}
    </article>;}):<div className="pm-empty-relations"><Link2 size={24}/><strong>ارتباطی ثبت نشده است</strong><p>این فرآیند در نقشه مستقل است.</p></div>}</div>
  </Modal>}
  {editable&&edit!==undefined&&<div className="process-map-modal-backdrop" onPointerDown={e=>{if(e.target===e.currentTarget)setEdit(undefined);}}><form className="process-map-form" role="dialog" aria-modal="true" aria-label="تعریف ارتباط فرآیندها" onSubmit={e=>void save(e)}>
   <header><h2>{edit?'ویرایش ارتباط فرآیندها':'تعریف ارتباط جدید'}</h2><button type="button" className="icon-button" aria-label="بستن فرم ارتباط" onClick={()=>setEdit(undefined)}><X size={20}/></button></header>
   <label>فرآیند مبدأ<select name="source_process_id" required defaultValue={edit?.source_process_id??current?.id??''}>{processes.map(p=><option value={p.id} key={p.id}>{p.name}</option>)}</select></label>
   <label>نوع ارتباط<select name="relation_type" required defaultValue={edit?.relation_type??'RELATED'}>{Object.entries(processRelationTypes).map(([id,label])=><option key={id} value={id}>{label}</option>)}</select></label>
   <label>فرآیند مقصد<select name="target_process_id" required defaultValue={edit?.target_process_id??processes.find(p=>p.id!==current?.id)?.id}>{processes.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></label>
   <label>توضیح ارتباط<textarea name="note" rows={3} maxLength={400} defaultValue={edit?.note??''} placeholder="این دو فرآیند چه ورودی، خروجی یا وابستگی مشترکی دارند؟"/></label>
   <p className="process-map-hint">ارتباط «مرتبط با» دوطرفه است؛ ارتباط‌های دیگر با مبدأ و مقصد مشخص ذخیره می‌شوند.</p>
   {error&&<p className="alert error" role="alert">{error}</p>}
   <footer><button className="primary" type="submit" disabled={busy}>{busy?'در حال ذخیره…':'ذخیره ارتباط'}</button><button className="secondary" type="button" onClick={()=>setEdit(undefined)} disabled={busy}>انصراف</button></footer>
  </form></div>}
 </div>;
}
