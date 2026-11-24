const LOCALES=Object.freeze({
 en:'en-US-u-ca-gregory-nu-latn',
 ne:'ne-NP-u-ca-gregory-nu-deva'
});

export function resolveFormatLocale(locale='en'){
 return Object.hasOwn(LOCALES,locale)?locale:'en';
}
export function formatNumber(value,locale='en'){
 if(typeof value!=='number'||!Number.isFinite(value))throw new TypeError('Finite number required.');
 return new Intl.NumberFormat(LOCALES[resolveFormatLocale(locale)],{maximumFractionDigits:2}).format(value);
}
export function formatMilliseconds(value,locale='en'){
 if(typeof value!=='number'||!Number.isFinite(value)||value<0)throw new TypeError('Non-negative milliseconds required.');
 return formatNumber(Math.round(value),locale)+' ms';
}
export function formatMillisecondPair(current,limit,locale='en'){
 if(typeof current!=='number'||typeof limit!=='number'||!Number.isFinite(current)||!Number.isFinite(limit)||current<0||limit<=0)
  throw new TypeError('Valid millisecond pair required.');
 return formatMilliseconds(current,locale)+' / '+formatMilliseconds(limit,locale);
}
export function formatIsoDateTime(value,locale='en'){
 if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,3})?)?Z$/.test(value))
  throw new TypeError('UTC ISO timestamp required.');
 const date=new Date(value);
 if(Number.isNaN(date.getTime()))throw new TypeError('Valid UTC ISO timestamp required.');
 const formatted=new Intl.DateTimeFormat(LOCALES[resolveFormatLocale(locale)],{
  year:'numeric',month:'short',day:'2-digit',hour:'2-digit',minute:'2-digit',
  hourCycle:'h23',timeZone:'UTC'
 }).format(date);
 return formatted+' UTC';
}
