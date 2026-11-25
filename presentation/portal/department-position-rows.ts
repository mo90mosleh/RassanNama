import type {DepartmentPosition} from './chart-layout';

export function departmentPositionRows(positions:DepartmentPosition[]){
 const ids=new Set(positions.map(position=>position.id));
 const children=new Map<string,DepartmentPosition[]>();
 for(const position of positions){
  if(!position.parentId||!ids.has(position.parentId))continue;
  const group=children.get(position.parentId)??[];
  group.push(position);
  children.set(position.parentId,group);
 }
 const visited=new Set<string>();
 const rows:{position:DepartmentPosition;depth:number}[]=[];
 function visit(position:DepartmentPosition,depth:number){
  if(visited.has(position.id))return;
  visited.add(position.id);
  rows.push({position,depth});
  for(const child of children.get(position.id)??[])visit(child,depth+1);
 }
 for(const position of positions)if(!position.parentId||!ids.has(position.parentId))visit(position,0);
 for(const position of positions)visit(position,0);
 return rows;
}
