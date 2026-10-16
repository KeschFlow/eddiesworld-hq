// Same-origin endpoint must first be mounted in the verified existing Worker.
(() => {
  const button = document.getElementById('product-download');
  const status = document.getElementById('delivery-status');
  if (!button || !status) return;
  const url = new URL(location.href);
  const session = url.searchParams.get('session_id');
  url.searchParams.delete('session_id');
  history.replaceState(null, '', url.pathname + url.search + url.hash);
  const product = button.dataset.product;
  if (!/^cs_(?:test|live)_[A-Za-z0-9_]{8,240}$/.test(session || '')) return;
  const deliveryBase = product === 'calendar'
    ? 'https://kf001-owner-backend.keschflow.workers.dev/api/delivery/'
    : '/api/delivery/';
  let busy = false;
  button.hidden = false;
  button.disabled = false;
  status.textContent = (session.startsWith('cs_test_') ? 'Testbestellung: ' : '') + 'Die Zahlung wird beim Download sicher geprüft.';
  button.addEventListener('click', async () => {
    if (busy) return;
    busy = true; button.disabled = true;
    const post = (action, body) => fetch(deliveryBase + action, {
      method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(body),
      credentials:'omit', cache:'no-store', referrerPolicy:'no-referrer'
    });
    try {
      const authorization = await post('authorize', {session, product});
      if (!authorization.ok) throw Error();
      const {token} = await authorization.json();
      const download = await post('download', {token});
      if (!download.ok || !download.headers.get('Content-Type')?.startsWith('application/pdf')) throw Error();
      const objectUrl = URL.createObjectURL(await download.blob());
      const link = document.createElement('a');
      link.href = objectUrl; link.download = product + '.pdf'; link.click();
      setTimeout(() => URL.revokeObjectURL(objectUrl), 60000);
      status.textContent = 'Die serverseitige Prüfung war erfolgreich. Der Download wurde gestartet.';
    } catch {
      status.textContent = 'Download nicht freigegeben. Zahlung oder Auslieferung konnte nicht bestätigt werden.';
    } finally { busy = false; button.disabled = false; }
  });
})();
