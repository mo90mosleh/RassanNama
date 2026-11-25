import {useId,useLayoutEffect,useRef,useState} from 'react';
import type {ProcessRelation} from './types';

type Connection={key:string;path:string;related:boolean};

export function ProcessMapConnections({relations,layoutKey}:{relations:ProcessRelation[];layoutKey:string}){
 const layer=useRef<SVGSVGElement>(null);
 const arrow=useId();
 const [connections,setConnections]=useState<Connection[]>([]);
 useLayoutEffect(()=>{
  const grid=layer.current?.parentElement;
  if(!grid)return;
  const cards=new Map(Array.from(grid.querySelectorAll<HTMLElement>('[data-process-id]'),card=>[card.dataset.processId,card]));
  const update=()=>{
   const bounds=grid.getBoundingClientRect();
   const rects=new Map(Array.from(cards,([id,card])=>[id,card.getBoundingClientRect()]));
   setConnections(relations.flatMap((relation,index)=>{
    const source=rects.get(relation.source_process_id),target=rects.get(relation.target_process_id);
    if(!source||!target)return [];
    const sameColumn=Math.abs(source.left-target.left)<2;
    const right=sameColumn||source.left<target.left;
    const x=(right?source.right:source.left)-bounds.left;
    const end=(sameColumn||!right?target.right:target.left)-bounds.left;
    const y=source.top+source.height/2-bounds.top;
    const endY=target.top+target.height/2-bounds.top;
    const lane=(index%4)*3;
    const out=x+(right?8+lane:-8-lane);
    const into=sameColumn?out:end+(right?-8-lane:8+lane);
    const top=Math.min(source.top,target.top)-bounds.top-5-lane;
    const path=sameColumn?`M ${x} ${y} H ${out} V ${endY} H ${end}`:
     `M ${x} ${y} H ${out} V ${top} H ${into} V ${endY} H ${end}`;
    return [{key:relation.id??String(index),path,related:relation.relation_type==='RELATED'}];
   }));
  };
  const observer=new ResizeObserver(update);
  observer.observe(grid);
  cards.forEach(card=>observer.observe(card));
  update();
  return ()=>observer.disconnect();
 },[relations,layoutKey]);
 return <svg ref={layer} className="pm-connection-layer" aria-hidden="true">
  <defs><marker id={arrow} viewBox="0 0 6 6" refX="6" refY="3" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
   <path d="M0 0 6 3 0 6z" fill="currentColor"/>
  </marker></defs>
  {connections.map(({key,path,related})=><path key={key} className={related?'pm-related-connection':undefined} d={path} markerStart={related?`url(#${arrow})`:undefined} markerEnd={`url(#${arrow})`}/>)}
 </svg>;
}
