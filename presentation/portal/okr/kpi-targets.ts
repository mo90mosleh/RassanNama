import type {OkrPortfolio} from './model';

const localDate=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Tehran',year:'numeric',month:'2-digit',day:'2-digit'});

export function activeKpiTargets(portfolio:OkrPortfolio, today=localDate.format(new Date())){
 const cycles=new Set(portfolio.cycles.filter(cycle=>cycle.status==='ACTIVE'&&cycle.startDate<=today&&today<=cycle.endDate).map(cycle=>cycle.id));
 const objectives=new Set(portfolio.objectives.filter(goal=>cycles.has(goal.cycleId)).map(goal=>goal.id));
 const targets=new Map<string,number[]>();
 for(const result of portfolio.keyResults){
  if(!result.kpiId||!objectives.has(result.objectiveId)||!Number.isFinite(result.target))continue;
  const values=targets.get(result.kpiId)??[];
  if(!values.includes(result.target))values.push(result.target);
  targets.set(result.kpiId,values);
 }
 return targets;
}
