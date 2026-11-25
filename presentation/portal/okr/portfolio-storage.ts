import {portfolioIsValid, withoutProcessLinks, type OkrPortfolio} from './model';

export function loadPortfolio(orgId: string, _orgName: string, canEdit: boolean): OkrPortfolio {
  try {
    const saved = canEdit ? localStorage.getItem('nama-okr-workspace-v1:' + orgId) : null;
    if (saved) {
      const value: unknown = JSON.parse(saved);
      if (portfolioIsValid(value)) return withoutProcessLinks(value);
    }
  } catch {}
  return {cycles: [], objectives: [], keyResults: [], checkins: []};
}
