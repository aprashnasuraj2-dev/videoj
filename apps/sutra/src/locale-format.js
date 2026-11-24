const NE_DIGITS=Object.freeze({'0':'०','1':'१','2':'२','3':'३','4':'४','5':'५','6':'६','7':'७','8':'८','9':'९'});
const MONTHS=Object.freeze({
 en:Object.freeze(['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']),
 ne:Object.freeze(['जनवरी','फेब्रुअरी','मार्च','अप्रिल','मे','जुन','जुलाई','अगस्ट','सेप्टेम्बर','अक्टोबर','नोभेम्बर','डिसेम्बर'])
});

export function resolveFormatLocale(locale='en'){
 return locale==='ne'?'ne':'en';
}
const digits=(value,locale)=>resolveFormatLocale(locale)==='ne'
 ?String(value).replace(/[0-9]/g,d=>NE_DIGITS[d]):String(value);
export function formatNumber(value,locale='en'){
 if(typeof value!=='number'||!Number.isFinite(value))throw new TypeError('Finite number required.');
 const base=new Intl.NumberFormat('en-US',{maximumFractionDigits:2}).format(value);
 return digits(base,locale);
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
const pad2=n=>String(n).padStart(2,'0');
export function formatIsoDateTime(value,locale='en'){
 if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,3})?)?Z$/.test(value))
  throw new TypeError('UTC ISO timestamp required.');
 const date=new Date(value);
 if(Number.isNaN(date.getTime()))throw new TypeError('Valid UTC ISO timestamp required.');
 const selected=resolveFormatLocale(locale);
 const text=`${pad2(date.getUTCDate())} ${MONTHS[selected][date.getUTCMonth()]} ${date.getUTCFullYear()}, ${pad2(date.getUTCHours())}:${pad2(date.getUTCMinutes())} UTC`;
 return digits(text,selected);
}
