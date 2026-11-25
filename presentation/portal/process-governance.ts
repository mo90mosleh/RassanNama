import type {Data} from './types';

const governanceSections = ['apqc', 'raci', 'doa'] as const;
export type GovernanceSection = typeof governanceSections[number];

export function governanceSectionForPath(path: string) {
  return governanceSections.find(section => path === '/process-governance/' + section);
}

export const apqcSource = 'https://www.apqc.org/resource-library/resource-listing/apqc-process-classification-framework-pcf-cross-industry-pdf-12';
export const categories = [
  ['1.0', 'چشم‌انداز و راهبرد'], ['2.0', 'توسعه محصول و خدمت'],
  ['3.0', 'بازاریابی و فروش'], ['4.0', 'مدیریت زنجیره تأمین کالاهای فیزیکی'],
  ['5.0', 'ارائه خدمات'], ['6.0', 'خدمات مشتریان'],
  ['7.0', 'سرمایه انسانی'], ['8.0', 'فناوری اطلاعات'],
  ['9.0', 'منابع مالی'], ['10.0', 'دارایی‌ها'],
  ['11.0', 'ریسک، انطباق و تاب‌آوری'], ['12.0', 'روابط بیرونی'],
  ['13.0', 'قابلیت‌های کسب‌وکار'],
] as const;

export const raciRoles = {R: 'مسئول اجرا', A: 'پاسخ‌گو', C: 'طرف مشورت', I: 'مطلع'};
export type RaciRole = keyof typeof raciRoles;
export type RaciRow = {id: string; activity: string; roles: Record<string, RaciRole>};
export type DoaRow = {id: string; decision: string; position: string; condition: string; limit: string; escalation: string};
export type Governance = {apqc: string; raci: RaciRow[]; doa: DoaRow[]};
export const emptyGovernance: Governance = {apqc: '', raci: [], doa: []};

const positions = {
  ceo: '47533c9d-1b84-5b45-aa6e-35b308a82042',
  sales: 'd8dd58ea-e98f-5f67-88d1-74f9b545e7bc',
  planning: '56ee4da0-a334-5242-8a6a-ed29b2b6de63',
  procurement: '8b67d25b-e11c-5acc-b5ed-754190a9a1a3',
  production: 'e314bd6f-a8cd-5f78-949d-d1bbd32e84d5',
  quality: '273d3012-96c2-5a34-b9e1-45d0cac26d0e',
  service: '9422edd2-1a42-5de1-8b7b-866afcf529bb',
  finance: '9717dc7d-f1e9-5ed1-8c25-8cefe9dd9e2a',
};

const samples = {
  'P-01': {activity: 'بررسی قیمت و ظرفیت تحویل سفارش', responsible: positions.sales, accountable: positions.ceo, consulted: positions.planning, decision: 'تأیید تخفیف سفارش', condition: 'سفارش با شرایط پرداخت مصوب', limit: 'تا ۵٪ مبلغ سفارش', authority: positions.sales},
  'P-03': {activity: 'دریافت و مقایسه پیشنهاد تأمین‌کنندگان', responsible: positions.procurement, accountable: positions.production, consulted: positions.quality, decision: 'تأیید خرید مواد اولیه', condition: 'تأمین‌کننده تأییدشده و بودجه مصوب', limit: 'تا ۵۰۰ میلیون ریال', authority: positions.procurement},
  'P-07': {activity: 'بررسی درخواست و احراز شرایط گارانتی', responsible: positions.service, accountable: positions.ceo, consulted: positions.quality, decision: 'تأیید تعویض قطعه در گارانتی', condition: 'خرابی مشمول گارانتی و قطعه موجود', limit: 'تا ۳۰ میلیون ریال', authority: positions.service},
} as const;

const sampleClassifications: Record<string, string> = {
  'P-01': '3.5.4.1', 'P-02': '4.1.4', 'P-03': '4.2.3', 'P-04': '4.3.2',
  'P-05': '4.3.3', 'P-06': '4.4.4', 'P-07': '6.3.4', 'P-08': '9.2.2',
  'P-09': '7.3.4', 'P-10': '1.2.6.3', 'P-11': '3.5.3', 'P-12': '3.5.4.1',
  'P-13': '4.3.1', 'P-14': '4.2.4', 'P-15': '4.3.2', 'P-16': '4.3.2',
  'P-17': '4.3.3', 'P-18': '13.3.3', 'P-19': '4.3.2', 'P-20': '4.4.2',
  'P-21': '13.3.3', 'P-22': '4.4.3', 'P-23': '4.4.3', 'P-24': '6.2.4',
  'P-25': '6.2.2', 'P-26': '9.2.3',
};

export function sampleGovernance(data: Data) {
  const valid = new Set(data.positions.map(position => position.id));
  return Object.fromEntries(data.nodes.flatMap(node => {
    const sample = samples[node.code as keyof typeof samples];
    const apqc = sampleClassifications[node.code ?? ''];
    if (node.kind !== 'PROCESS' || !apqc) return [];
    if (!sample || !valid.has(sample.responsible)) return [[node.id, {...emptyGovernance, apqc}]];
    return [[node.id, {
      apqc,
      raci: [{id: 'sample-raci', activity: sample.activity, roles: {
        [sample.responsible]: 'R', [sample.accountable]: 'A', [sample.consulted]: 'C', [positions.finance]: 'I',
      }}],
      doa: [{id: 'sample-doa', decision: sample.decision, position: sample.authority,
        condition: sample.condition, limit: sample.limit, escalation: positions.ceo}],
    } satisfies Governance]];
  }));
}
