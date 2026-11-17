/* Optional enhancement only. All routes and confirmations work without JavaScript. */
document.querySelectorAll('[data-copy-url]').forEach((button)=>{
 button.addEventListener('click',async()=>{
  const status=document.getElementById('copy-status');
  if(!status)return;
  if(!navigator.clipboard?.writeText){status.textContent='Copy is unavailable in this browser; use the public kit URL in the address bar.';status.focus();return;}
  try{await navigator.clipboard.writeText(button.getAttribute('data-copy-url'));status.textContent='Kit link copied. This is a shareable concept page, not a checkout.';}
  catch{status.textContent='Copy was blocked; you can copy the kit address from the browser.';}
  status.focus();
 });
});
