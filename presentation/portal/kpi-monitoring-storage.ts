import type {Data} from './types';
import type {PowerBiReport} from './PowerBiReports';

export type ChartKind = 'line' | 'bar' | 'pie';
export type Theme = 'ocean' | 'forest' | 'sunset';
export type Card = {id: string; kpiId: string; kind: ChartKind; theme?: Theme; labels?: boolean};
type Revision = {value: number; note: string; actor: string; savedAt: string};
export type Measurement = {kpiId: string; date: string; revisions: Revision[]};
export type Model = {cards: Card[]; measurements: Measurement[]; reports: PowerBiReport[]};

const empty: Model = {cards: [], measurements: [], reports: []};
export const current = (measurement: Measurement) => measurement.revisions[measurement.revisions.length - 1];
export function storageKey(data: Data) { return 'nama-kpi-monitoring-v1:' + data.organization.id; }

export function read(key: string): Model {
  try {
    const saved: Model | null = JSON.parse(localStorage.getItem(key) ?? 'null');
    if (Array.isArray(saved?.cards) && Array.isArray(saved.measurements)) {
      return {...saved,reports:Array.isArray(saved.reports)?saved.reports:[]};
    }
  } catch {}
  return empty;
}

export function availablePowerBiReports(data: Data) {
  return read(storageKey(data)).reports;
}

export function latestKpiValue(data: Data, id: string) {
  const latest = read(storageKey(data)).measurements.filter(row => row.kpiId === id)
    .sort((a, b) => b.date.localeCompare(a.date))[0];
  return latest && current(latest);
}
