import {Settings} from 'lucide-react';

export function ProcessIcon({size = 24}: {size?: number}) {
  return <svg width={size} height={size} viewBox="0 0 28 28" fill="none"
    stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
    aria-hidden="true" focusable="false">
    <path d="M2.6 10.6Q3.1 6.3 7.5 3.8m-4.8-.8 4.8.8-.9 4.2M25.4 17.4q-.5 4.3-4.9 6.8m4.8.8-4.8-.8.9-4.2"/>
    <Settings x="3.5" y="3.5" width="21" height="21" strokeWidth={2.2}/>
  </svg>;
}
