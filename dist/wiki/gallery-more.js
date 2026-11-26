(() => {
  const grid = document.querySelector('.article-gallery');
  if (!grid) return;
  const more = document.querySelector('#gallery [data-page]');
  const thumbs = () => Array.from(grid.querySelectorAll('figure a'));
  let items = thumbs().map(link => ({
    full: link.href, src: link.querySelector('img').src, caption: link.querySelector('img').alt
  }));
  let allItems = items;
  let loaded = !more, request;
  function loadAll() {
    if (loaded) return Promise.resolve();
    if (!request) request = fetch(more.dataset.page).then(response => {
      if (!response.ok) throw new Error('Gallery unavailable');
      return response.json();
    }).then(doc => {
      items = doc.gallery.map(entry => {
        const src = entry.src ? '/' + entry.src.replace(/^\/+/, '') : entry.remote;
        return {src, full:entry.large || src, caption:entry.caption || 'Изображение', sprite:entry.sprite};
      }).filter(entry => entry.src);
      allItems = items;
      loaded = true;
    }).finally(() => { request = undefined; });
    return request;
  }

  const template = grid.firstElementChild.cloneNode(true);
  function appendTiles(batch) {
      const fragment = document.createDocumentFragment();
      for (const item of batch) {
        const tile = template.cloneNode(true);
        tile.querySelector('a').href = item.full;
        const image = tile.querySelector('img');
        image.src = item.src;
        image.alt = tile.querySelector('figcaption').textContent = item.caption;
        fragment.append(tile);
      }
      const first = fragment.querySelector('a');
      grid.append(fragment);
      if (more) {
        more.hidden = thumbs().length >= items.length;
        more.textContent = 'Показать ещё · всего ' + items.length;
      }
      return first;

  }
  const filters = document.querySelector('.album-filters');
  if (filters) {
    filters.hidden = false;
    let generation = 0;
    filters.addEventListener('click', async event => {
      const button = event.target.closest('button');
      if (!button) return;
      const token = ++generation;
      try { await loadAll(); } catch { return; }
      if (token !== generation) return;
      items = button.dataset.set === 'all' ? allItems :
        button.dataset.set.split(',').map(Number).map(index => allItems[index]).filter(Boolean);
      grid.replaceChildren();
      appendTiles(items.slice(0, 12));
      for (const tab of filters.querySelectorAll('button')) {
        tab.setAttribute('aria-pressed', String(tab === button));
      }
    });
  }
  let expanding = false;
  more?.addEventListener('click', async event => {
    if (event.ctrlKey || event.metaKey || event.altKey || event.shiftKey) return;
    event.preventDefault();
    if (expanding) return;
    expanding = true;
    try {
      await loadAll();
      const offset = thumbs().length;
      const first = appendTiles(items.slice(offset, offset + 24));
      first?.focus();
    } catch { location.assign(more.href); }
    finally { expanding = false; }
  });

  const dialog = document.createElement('dialog');
  dialog.className = 'gallery-viewer';
  dialog.setAttribute('aria-label','Просмотр галереи');
  dialog.innerHTML = '<div class="viewer-head"><strong></strong><button type="button" aria-label="Закрыть">×</button></div><div class="viewer-stage"></div><div class="viewer-controls"><button type="button" aria-label="Предыдущее изображение">‹</button><div aria-live="polite"><small></small><p></p></div><button type="button" aria-label="Следующее изображение">›</button></div>';
  document.body.append(dialog);
  dialog.querySelector('strong').textContent = document.querySelector('h1').innerText;
  const stage = dialog.querySelector('.viewer-stage');
  const [close, prev, next] = dialog.querySelectorAll('button');
  let index = 0, opener;
  function render() {
    const item = items[index], image = new Image();
    image.alt = item.caption;
    image.referrerPolicy = 'no-referrer';
    if (item.sprite) image.className = 'pixel';
    image.onerror = () => {
      if (image.getAttribute('src') !== item.src) image.src = item.src;
      else if (stage.contains(image)) stage.textContent = 'Не удалось загрузить изображение';
    };
    stage.replaceChildren(image);
    image.src = item.full;
    dialog.querySelector('small').textContent = (index + 1) + ' из ' + items.length;
    dialog.querySelector('.viewer-controls p').textContent = item.caption;
    prev.disabled = next.disabled = items.length < 2;
  }
  function step(change) {
    index = (index + change + items.length) % items.length;
    render();
  }
  grid.addEventListener('click', event => {
    const link = event.target.closest('a');
    if (!link || event.ctrlKey || event.metaKey || event.altKey || event.shiftKey) return;
    event.preventDefault();
    opener = link;
    index = thumbs().indexOf(link);
    render();
    dialog.showModal();
    close.focus();
    if (!loaded) loadAll().then(() => { if (dialog.open) render(); }).catch(() => {});
  });
  close.onclick = () => dialog.close();
  prev.onclick = () => step(-1);
  next.onclick = () => step(1);
  dialog.addEventListener('close', () => opener?.focus({preventScroll:true}));
  dialog.addEventListener('keydown', event => {
    if (!['ArrowLeft','ArrowRight'].includes(event.key)) return;
    event.preventDefault();
    step(event.key === 'ArrowLeft' ? -1 : 1);
  });
  dialog.addEventListener('click', event => {
    if (event.target !== dialog) return;
    const r = dialog.getBoundingClientRect();
    if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) dialog.close();
  });
  let start;
  stage.addEventListener('touchstart', event => {
    start = event.touches.length === 1 ? event.touches[0] : null;
  }, {passive:true});
  stage.addEventListener('touchcancel', () => { start = null; });
  stage.addEventListener('touchend', event => {
    if (!start) return;
    const delta = event.changedTouches[0].clientX - start.clientX;
    if (Math.abs(delta) > 48 && Math.abs(delta) > 1.4 * Math.abs(event.changedTouches[0].clientY - start.clientY)) step(delta < 0 ? 1 : -1);
    start = null;
  }, {passive:true});
})();
