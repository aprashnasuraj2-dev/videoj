export function externalConsentDialog({dialog, purpose, url, approve, deny}) {
  return (contact, {signal}) => new Promise(resolve => {
    let settled = false;
    function finish(decision) {
      if (settled) return;
      settled = true;
      signal?.removeEventListener('abort', decline);
      dialog.removeEventListener('cancel', cancel);
      approve.removeEventListener('click', accept);
      deny.removeEventListener('click', decline);
      if (dialog.open) dialog.close();
      resolve({decision, scope: 'once'});
    }
    const accept = () => finish('allow'), decline = () => finish('deny');
    const cancel = event => { event.preventDefault(); decline(); };
    if (signal?.aborted || dialog.open) { resolve({decision:'deny',scope:'once'}); return; }
    purpose.textContent = contact.purpose;
    url.textContent = contact.resource ?? contact.origin;
    dialog.addEventListener('cancel', cancel);
    signal?.addEventListener('abort', decline, {once: true});
    approve.addEventListener('click', accept);
    deny.addEventListener('click', decline);
    dialog.showModal();
  });
}
