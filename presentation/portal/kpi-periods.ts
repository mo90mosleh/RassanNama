import {isoToJalaliInput, normalizePersianDigits} from './okr/persian-cycle-dates';

const months = new Intl.DateTimeFormat('fa-IR-u-ca-persian', {month:'short', year:'numeric', timeZone:'UTC'});
const days = new Intl.DateTimeFormat('fa-IR-u-ca-persian', {day:'numeric', month:'short', timeZone:'UTC'});
const number = new Intl.NumberFormat('fa-IR', {useGrouping:false});

export function measurementPeriod(date: string, frequency: string | null) {
  const timestamp = new Date(date + 'T00:00:00Z');
  const format = frequency?.trim().toLowerCase() ?? '';
  const [year, month] = normalizePersianDigits(isoToJalaliInput(date)).split('/').map(Number);
  const week = Math.floor((timestamp.getTime() / 86400000 - 2) / 7);
  if (/ماهانه|monthly/.test(format)) return {index:year*12+month, label:months.format(timestamp)};
  if (/فصل|quarter/.test(format)) {
    const quarter = Math.floor((month-1)/3);
    return {index:year*4+quarter, label:['بهار','تابستان','پاییز','زمستان'][quarter]+' '+number.format(year)};
  }
  if (/سالانه|annual|yearly/.test(format)) return {index:year,label:number.format(year)};
  if (/هفتگی|weekly/.test(format)) return {index:week,label:'از '+days.format(new Date((week*7+2)*86400000))};
  return {index:timestamp.getTime()/86400000,label:days.format(timestamp)};
}

export function latestPerPeriod<T extends {date: string}>(rows:T[], frequency:string|null) {
  const periods = new Map<number, {index:number; label:string; row:T}>();
  for (const row of rows) {
    const period = measurementPeriod(row.date, frequency);
    const previous = periods.get(period.index);
    if (!previous || previous.row.date <= row.date) periods.set(period.index,{...period,row});
  }
  return [...periods.values()].sort((a,b)=>a.index-b.index);
}
