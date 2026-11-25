import type{Person}from'./types';
import dagre from '@dagrejs/dagre';
export type DepartmentPosition={id:string;roleId?:string;parentId:string|null;title:string;people:Person[]};
export type ChartItem={id:string;parentId:string|null;label:string;subtitle?:string;kind:'unit'|'position';closed:boolean;childCount:number;selected:boolean;seatCount?:number;mixed?:boolean;unitId?:string;descendantCount?:number;previewChildren?:string[];analysisValue?:number;analysisLabel?:string;tone?:string;people?:Person[];departmentPositions?:DepartmentPosition[];departmentReveal?:{personId:string;nonce:number}};
export type ChartDirection='horizontal'|'vertical';
export function chartNodeSize(item:ChartItem,admin:boolean) {
 if(item.departmentPositions) return {width:308,height:222};
 return {width:212,height:(admin?124:104)+(item.kind==='position'||item.people?.length?24:0)};
}
export function layoutChart(items:ChartItem[],admin=false,direction:ChartDirection='horizontal'){
 const departments=items.some(item=>item.departmentPositions);
 const graph=new dagre.graphlib.Graph().setGraph({rankdir:direction==='vertical'?'TB':'RL',nodesep:departments?18:10,ranksep:departments?52:42,marginx:0,marginy:0}).setDefaultEdgeLabel(()=>({}));
 const ids=new Set(items.map(n=>n.id));
 for(const n of items)graph.setNode(n.id,chartNodeSize(n,admin));
 for(const n of items)if(n.parentId&&ids.has(n.parentId))graph.setEdge(n.parentId,n.id);
 dagre.layout(graph);
 return items.map(n=>{const {x,y,width,height}=graph.node(n.id);return{...n,x:x-width/2,y:y-height/2,width,height};});
}
// Follow IDs only. No synthetic parents and no changes to stored reporting relationships.
export function visibleChartItems(items:ChartItem[],closed:Set<string>,focusId:string|null){
 const byId=new Map(items.map(n=>[n.id,n]));
 return items.filter(n=>{if(n.id===focusId)return true;let parent=n.parentId;const visited=new Set([n.id]);while(parent){if(visited.has(parent)||closed.has(parent))return false;visited.add(parent);if(parent===focusId)return true;parent=byId.get(parent)?.parentId??null;}return !focusId;});
}
