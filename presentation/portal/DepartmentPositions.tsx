import {useEffect,useRef,useState,type CSSProperties} from 'react';
import {ChevronDown,ChevronLeft} from 'lucide-react';
import {departmentPositionRows} from './department-position-rows';
import {PeopleAvatars} from './PersonContacts';
import {number} from './ui';
import type {ChartItem, DepartmentPosition} from './chart-layout';

type Props = {
 item: ChartItem;
 limit: number;
 onPosition: (id: string) => void;
 onPeople: (position: DepartmentPosition, id?: string) => void;
};

export function DepartmentPositions({item, limit, onPosition, onPeople}: Props) {
 const [expanded,setExpanded]=useState<Set<string>>(()=>new Set());
 const list=useRef<HTMLUListElement>(null);
 const highlighted=useRef<HTMLLIElement>(null);
 const positions=item.departmentPositions??[];
 const reveal=item.departmentReveal;
 const revealedPerson=reveal?.personId;
 const allRows=departmentPositionRows(positions);
 const byId=new Map(allRows.map(row=>[row.position.id,row]));
 const counts=new Map<string,number>();
 for(const {position,depth} of allRows){
  if(depth>0&&position.parentId) counts.set(position.parentId,(counts.get(position.parentId)??0)+1);
 }
 const target=positions.find(position=>position.people.some(person=>person.id===revealedPerson));
 useEffect(()=>{
  if(!target)return;
  setExpanded(previous=>{
   const next=new Set(previous);
   let parentId=target.parentId;
   const visited=new Set<string>();
   while(parentId&&!visited.has(parentId)&&byId.has(parentId)){
    visited.add(parentId);
    next.add(parentId);
    parentId=byId.get(parentId)?.position.parentId??null;
   }
   return next;
  });
  const frame=requestAnimationFrame(()=>{
   if(list.current&&highlighted.current)list.current.scrollTop=highlighted.current.offsetTop-8;
  });
  return()=>cancelAnimationFrame(frame);
 },[reveal?.nonce]);
 if(!positions.length)return null;
 const hidden=new Set<string>();
 const rows=allRows.filter(({position,depth})=>{
  if(depth===0||!position.parentId)return true;
  const parent=byId.get(position.parentId);
  if(hidden.has(position.parentId)||(parent&&parent.depth>0&&!expanded.has(position.parentId))){
   hidden.add(position.id);
   return false;
  }
  return true;
 });
 const rowById=new Map(rows.map(({position},index)=>[position.id,index]));
 return <ul ref={list} className="flow-department-positions nowheel" aria-label={'سمت‌های '+item.label}>
  {rows.map(({position,depth},index)=>{
   const parentIndex=position.parentId?rowById.get(position.parentId):undefined;
   const linked=depth>0&&parentIndex!==undefined&&parentIndex<index;
   const first=position.people.find(person=>person.id===revealedPerson)??position.people[0];
   const remaining=position.people.length-1;
   const childCount=counts.get(position.id)??0;
   const open=expanded.has(position.id);
   const isHighlighted=target?.id===position.id;
   return <li ref={isHighlighted?highlighted:undefined} key={position.id} data-highlighted={isHighlighted||undefined}
    className={linked?'department-position-child':undefined}
    style={{'--level':Math.min(depth,5),'--parent-distance':linked?index-parentIndex:0} as CSSProperties}>
    <PeopleAvatars people={isHighlighted&&first?[first,...position.people.filter(person=>person!==first)]:position.people} limit={limit} onOpen={id=>onPeople(position,id)}/>
    <button type="button" className="department-position-title nodrag nopan" title={position.title}
     onClick={event=>{event.stopPropagation();onPosition(position.roleId??position.id);}}>
     <strong>{position.title}</strong>
     <small title={first?.display_name}>{first?.display_name??'بدون فرد تخصیص‌یافته'}{remaining>0&&' · '+number.format(remaining)+' نفر دیگر'}</small>
    </button>
    {depth>0&&childCount>0&&<button type="button" className="department-team-toggle nodrag nopan" aria-expanded={open}
     aria-label={(open?'جمع کردن':'نمایش')+' زیرمجموعهٔ '+(first?.display_name??position.title)+'، '+number.format(childCount)+' سمت'}
     onClick={event=>{
      event.stopPropagation();
      setExpanded(previous=>{
       const next=new Set(previous);
       if(next.has(position.id))next.delete(position.id);else next.add(position.id);
       return next;
      });
     }}>{number.format(childCount)}{open?<ChevronDown size={14}/>:<ChevronLeft size={14}/>}</button>}
   </li>;
  })}
 </ul>;
}
