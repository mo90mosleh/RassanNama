import{preloadRoute}from'./route-preload';
import type{MouseEvent,ReactNode}from'react';import{ArrowRight}from'lucide-react';import{config}from'./api';
export const number=new Intl.NumberFormat('fa-IR');
export function currentPath(){return config.mode==='public'?(location.hash.startsWith('#/')?location.hash.slice(1).split('?')[0]:'/dashboard'):(location.pathname==='/'?'/dashboard':location.pathname);}
export function pageScroll(){const app=document.getElementById('main');return{x:app?.scrollLeft??window.scrollX,y:app?.scrollTop??window.scrollY};}
export function scrollPage(x:number,y:number){const app=document.getElementById('main');if(app)app.scrollTo({left:x,top:y,behavior:'instant'});else window.scrollTo({left:x,top:y,behavior:'instant'});}
export function routeQuery() {
 return new URLSearchParams(config.mode==='public'?location.hash.split('?')[1]:location.search);
}
export function go(path:string){
 const destination=new URL(config.mode==='public'?'#'+path:path,location.href);
 if(destination.href===location.href)return;
 const depth=Number(history.state?.namaDepth)||0;
 if(!Number.isFinite(history.state?.namaDepth))history.replaceState({...history.state,namaDepth:0},'');
 history.pushState({namaDepth:depth+1},'',destination);
 window.dispatchEvent(new PopStateEvent('popstate'));
 window.dispatchEvent(new Event('orgdocs:route'));
 scrollPage(0,0);
}
export function BackButton(){
 return <button className="secondary global-back" aria-label="بازگشت به صفحهٔ قبل" title="بازگشت به صفحهٔ قبل"
  onClick={()=>{if(history.state?.namaDepth>0){history.back();return;}
   if(currentPath()!=='/dashboard'){const target=config.mode==='public'?'#/dashboard':'/dashboard';history.replaceState({...history.state,namaDepth:0},'',target);window.dispatchEvent(new PopStateEvent('popstate'));window.dispatchEvent(new Event('orgdocs:route'));scrollPage(0,0);}}}>
  <ArrowRight size={16}/><span>بازگشت</span></button>;
}
export function Link({to,children,className,ariaLabel}:{to:string;children:ReactNode;className?:string;ariaLabel?:string}){return <a href={config.mode==='public'?'#'+to:to} className={className} aria-label={ariaLabel} title={ariaLabel} onPointerEnter={()=>preloadRoute(to)} onFocus={()=>preloadRoute(to)} onClick={(e:MouseEvent)=>{if(e.button||e.ctrlKey||e.metaKey||e.shiftKey||e.altKey)return;e.preventDefault();go(to);}}>{children}</a>;}
export function Heading({title,description,action}:{title:string;description?:string;action?:ReactNode}){return <div className="heading" data-tour="page-heading"><div><h1>{title}</h1>{description&&<p>{description}</p>}</div>{action}</div>;}
export function Empty({title,text}:{title:string;text:string}){return <section className="panel empty"><h2>{title}</h2><p>{text}</p></section>;}
export const errorMessage=(e:unknown)=>e instanceof Error?e.message:'ارتباط برقرار نشد؛ دوباره تلاش کنید.';
