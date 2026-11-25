import {useRef, useState} from 'react';
import {CalendarDays} from 'lucide-react';
import {isoToJalaliInput, jalaliToIso, normalizePersianDigits} from './okr/persian-cycle-dates';
import {number} from './ui';

const months = ['فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور', 'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند'];
const weekdays = ['ش', 'ی', 'د', 'س', 'چ', 'پ', 'ج'];
const years = Array.from({length: 501}, (_, index) => 1200 + index);

function calendarMonth(value: string) {
  const today = new Date().toLocaleDateString('sv-SE', {timeZone: 'Asia/Tehran'});
  const [year, month] = normalizePersianDigits(isoToJalaliInput(value || today)).split('/').map(Number);
  return {year, month};
}

export function JalaliDatePicker({label, value, onChange}: {
  label: string; value: string; onChange: (value: string) => void;
}) {
  const [month, setMonth] = useState(() => calendarMonth(value));
  const details = useRef<HTMLDetailsElement>(null);
  const trigger = useRef<HTMLElement>(null);
  const first = jalaliToIso(month.year, month.month, 1);
  const leading = first ? (new Date(first).getUTCDay() + 1) % 7 : 0;
  const days = month.month <= 6 ? 31 : month.month < 12 || jalaliToIso(month.year, 12, 30) ? 30 : 29;

  function close() {
    if (details.current) details.current.open = false;
    trigger.current?.focus();
  }

  return <details ref={details} className="kpi-date-picker"
    onBlur={event => {
      if (event.relatedTarget && !event.currentTarget.contains(event.relatedTarget)) event.currentTarget.open = false;
    }}
    onKeyDown={event => { if (event.key === 'Escape') close(); }}>
    <summary ref={trigger} onClick={() => setMonth(calendarMonth(value))}>
      <CalendarDays size={16}/>{label}<bdi className={value?'':'kpi-date-empty'} aria-label={value?undefined:'بدون تاریخ'}>{isoToJalaliInput(value) || 'ــــ/ــ/ــ'}</bdi>
    </summary>
    <div className="panel jalali-calendar" aria-label={label}>
      <div className="jalali-calendar-month">
        <select aria-label="ماه" value={month.month} onChange={event => setMonth({...month, month: Number(event.target.value)})}>
          {months.map((name, index) => <option key={name} value={index + 1}>{name}</option>)}
        </select>
        <select aria-label="سال" value={month.year} onChange={event => setMonth({...month, year: Number(event.target.value)})}>
          {years.map(year => <option key={year} value={year}>{number.format(year).replace(/٬/g, '')}</option>)}
        </select>
      </div>
      <div className="jalali-calendar-days">
        {weekdays.map(day => <span key={day} aria-hidden="true">{day}</span>)}
        {Array.from({length: leading}, (_, index) => <span key={'empty-' + index}/>)}
        {Array.from({length: days}, (_, index) => {
          const day = index + 1;
          const iso = first ? new Date(Date.parse(first) + index * 86400000).toISOString().slice(0, 10) : '';
          return <button type="button" key={day} disabled={!iso} aria-pressed={value === iso}
            aria-label={number.format(day) + ' ' + months[month.month - 1]}
            onClick={() => {onChange(iso);close();}}>{number.format(day)}</button>;
        })}
      </div>
      <button type="button" className="text-button" onClick={() => {onChange('');close();}}>پاک کردن تاریخ</button>
    </div>
  </details>;
}
