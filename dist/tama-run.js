(() => {
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const friends = [["mametchi-ef9b7a", "Мамэтчи", "wiki/img/63cdaa578fb5fd01edc2.webp"],
    ["kuchipatchi-3442ce", "Кучипатчи", "wiki/img/758e81a779f661be1e0d.webp"],
    ["amefuratchi-fcfd9c", "Амэфуратчи", "wiki/img/042deea336fd48df8683.webp"],
    ["ananatchi-cd56e2", "Ананатчи", "wiki/img/c3c28dac425ca4cb58b1.webp"],
    ["ankotchi-c9a0ac", "Анкотчи", "wiki/img/3d6293f5aafed15a0eee.webp"],
    ["avovotchi-97078b", "Авовотчи", "wiki/img/705761dfe520bfc28ce2.webp"],
    ["axolopatchi-ea2b0e", "Аксолопатчи", "wiki/img/f40db7eaf0954e9b8385.webp"],
    ["azaratchi-3eef8e", "Азаратчи", "wiki/img/ccce22596869032c344f.webp"],
    ["batatchi-e9172a", "Бататчи", "wiki/img/d62fe00d92f94c172814.webp"],
    ["batchi-76829c", "Батчи", "wiki/img/5f4dccb4c20582a20c51.webp"],
    ["beavertchi-4d04ab", "Бэавэртчи", "wiki/img/b45b9040d311fd532139.webp"],
    ["bigsmile-26595f", "Bigsmile", "wiki/img/d0fdade9c73df6d92fee.webp"],
    ["chodracotchi-591009", "Чодракотчи", "wiki/img/f1473ce2c3c474910910.webp"],
    ["eagletchi-209087", "Эаглэтчи", "wiki/img/d16c4482a3a2b45c6149.webp"],
    ["elizardotchi-3cfa08", "Элизардотчи", "wiki/img/31144d92bf536788dc77.webp"],
    ["gemtchi-ced31f", "Гэмтчи", "wiki/img/f5a2c87ce24209e6a555.webp"],
    ["gumax-7da9d1", "Gumax", "wiki/img/0b1e346f5fc4d5fe0e49.webp"],
    ["gusokutchi-099a91", "Гусокутчи", "wiki/img/063b7fb688d73af542e2.webp"],
    ["heavytchi-c71259", "Хэавитчи", "wiki/img/e2c1bfcbb1cad4a78869.webp"],
    ["hobohorntchi-8201e9", "Хобохорнтчи", "wiki/img/4066f30d172f4016a6f7.webp"],
    ["hoppentchi-bcb312", "Хоппэнтчи", "wiki/img/d42394c07616a372b97d.webp"],
    ["horhotchi-44fb75", "Хорхотчи", "wiki/img/fe8793edf22a682c6261.webp"],
    ["hoshimortchi-c6e792", "Хошимортчи", "wiki/img/f7021aa769706418ac87.webp"],
    ["hypertchi-97e0b5", "Хипэртчи", "wiki/img/01d203260be136ca4e01.webp"],
    ["iguanatchi-108571", "Игуанатчи", "wiki/img/d709c798d3ccd361ad28.webp"],
    ["imoritchi-b9a1ac", "Иморитчи", "wiki/img/e783124e994b2abf415f.webp"],
    ["irukatchi-8acc6f", "Ирукатчи", "wiki/img/681bffb2f1e4387662a2.webp"],
    ["ishikorotchi-c77f78", "Ишикоротчи", "wiki/img/9007fec94fbec950f837.webp"],
    ["kachitchi-46073e", "Качитчи", "wiki/img/44680d00b57225f8fcd3.webp"],
    ["kametchi-bd3e16", "Камэтчи", "wiki/img/c80e217d07023791dfb5.webp"],
    ["kanokotchi-5e1dab", "Канокотчи", "wiki/img/f4bf9ef5dab9209b386d.webp"],
    ["kikitchi-e360a2", "Кикитчи", "wiki/img/b4e16bb4f85f525b2547.webp"],
    ["kiwitchi-2025-ffac23", "Kiwitchi (2025)", "wiki/img/9db59af2d92699459a09.webp"],
    ["konkotchi-01ccb4", "Конкотчи", "wiki/img/d44e39df16df648d8f9f.webp"],
    ["kuikuitchi-dd3ee9", "Куикуитчи", "wiki/img/83363c532bd2d5199bb9.webp"],
    ["kujiratchi-46cb67", "Кудзиратчи", "wiki/img/e33efc31861f650bd7e3.webp"],
    ["kumarstchi-326e52", "Кумарстчи", "wiki/img/615060af345961bf7056.webp"],
    ["kuraratchi-b33acb", "Кураратчи", "wiki/img/b87f52337502c0877e6b.webp"]];

  function pickFriends(previous, count) {
    const pool = friends.filter(([id]) => !previous.includes(id));
    const picks = [];
    while (picks.length < count) {
      const index = Math.floor(Math.random() * pool.length);
      picks.push(pool.splice(index, 1)[0]);
    }
    return picks;
  }

  function readGroup(getStorage, key, fallback = []) {
    try {
      const ids = JSON.parse(getStorage().getItem(key));
      if (Array.isArray(ids) && ids.length <= 3) return ids;
    } catch {}
    return fallback;
  }

  function updateCover() {
    const slots = [...document.querySelectorAll('.w-art .w-sticker')];
    if (!slots.length) return;
    const key = 'tamawiki.lastCoverFriends';
    const group = pickFriends(readGroup(() => localStorage, key), slots.length);
    const family = document.querySelectorAll('.family img');
    slots.forEach((slot, index) => {
      const [id, name, path] = group[index];
      slot.href = '/wiki/' + id + '.html';
      slot.dataset.wEntry = id;
      slot.removeAttribute('data-w-name');
      const portrait = slot.querySelector('img');
      portrait.alt = name;
      portrait.src = '/' + path;
      if (family[index]) family[index].src = portrait.src;
    });
    try { localStorage.setItem(key, JSON.stringify(group.map(([id]) => id))); } catch {}
  }


  // Referrers omit fragments. Remember which atlas tab an article was opened from.
  const atlasTabs = {'#guide':'В «Мой Paradise»', '#devices':'К устройствам', '#characters':'К персонажам'};
  const sourceKey = 'tamawiki.articleOrigin';
  const homePath = path => path === '/' || path === '/index.html';
  if (homePath(location.pathname)) {
    document.addEventListener('click', event => {
      const anchor = event.target.closest?.('a[href]');
      if (!anchor || anchor.origin !== location.origin) return;
      const destination = anchor.pathname.match(/^\/wiki\/([^/]+?)(?:\.html)?$/)?.[1] ||
        anchor.hash.match(/^#wiki\/(.+)$/)?.[1];
      if (!destination) return;
      const tab = location.hash || '#characters';
      if (atlasTabs[tab]) {
        try { sessionStorage.setItem(sourceKey, JSON.stringify({destination, tab})); } catch {}
      }
    }, true);
  }
  const returnLink = document.querySelector('[data-atlas-return]');
  if (returnLink && document.referrer) {
    const from = new URL(document.referrer);
    const slug = location.pathname.split('/').pop().replace(/\.html$/, '');
    if (from.origin === location.origin) {
      if (homePath(from.pathname)) {
        try {
          const origin = JSON.parse(sessionStorage.getItem(sourceKey));
          if (origin?.destination === slug && atlasTabs[origin.tab]) {
            returnLink.href = '/' + origin.tab;
            returnLink.textContent = atlasTabs[origin.tab];
          }
        } catch {}
      } else if (/^\/(devices|characters)(\.html)?$/.test(from.pathname)) {
        returnLink.href = from.pathname;
        returnLink.textContent = from.pathname.includes('devices') ? 'К списку устройств' : 'К списку персонажей';
      }
    }
  }

  updateCover();
  function emergeFromCloud() {
    if (motion.matches) return;
    const art = document.querySelector('.w-art');
    if (!art || !art.offsetWidth) return;
    const cloud = art.getBoundingClientRect();
    art.querySelectorAll('.w-sticker').forEach((sticker, index) => {
      const portrait = sticker.querySelector('img');
      const resting = sticker.getBoundingClientRect();
      const x = cloud.left + cloud.width * .47 - resting.left - resting.width / 2;
      const y = cloud.top + cloud.height * .54 - resting.top - resting.height / 2;
      portrait.animate([
        { transform: `translate(${x}px,${y}px) scale(.08)`, opacity: 0 },
        { offset: .72, transform: 'translateY(-8px) scale(1.04)', opacity: 1 },
        { transform: 'none', opacity: 1 }
      ], { duration: 580, delay: index * 95, easing: 'cubic-bezier(.2,.7,.22,1)', fill: 'backwards' });
    });
  }
  if (document.documentElement.dataset.introPending) {
    window.addEventListener('atlas-intro-end', emergeFromCloud, {once:true});
  } else {
    requestAnimationFrame(emergeFromCloud);
  }
  const runnersKey = 'tamawiki.lastRunFriends';
  let lastGroup = [];
  const directionKey = 'tamawiki.lastRunDirection';
  let lastDirection;
  function nextDirection() {
    try { lastDirection = sessionStorage.getItem(directionKey) || lastDirection; } catch {}
    const rightward = lastDirection ? lastDirection === 'left' : Math.random() < 0.5;
    lastDirection = rightward ? 'right' : 'left';
    try { sessionStorage.setItem(directionKey, lastDirection); } catch {}
    return rightward;
  }
  let active;
  function stop() {
    active?.remove();
    active = undefined;
  }
  function run() {
    stop();
    if (motion.matches || document.hidden) return;
    const track = document.createElement('div');
    active = track;
    track.setAttribute('aria-hidden', 'true');
    track.style.cssText = 'position:fixed;inset:auto 0 max(12px,env(safe-area-inset-bottom)) 0;height:72px;overflow:hidden;pointer-events:none;z-index:9998';
    document.body.append(track);
    const group = pickFriends(readGroup(() => sessionStorage, runnersKey, lastGroup), 3);
    const runners = group.map(([, , path]) => {
      const runner = document.createElement('span');
      runner.style.cssText = 'position:absolute;visibility:hidden;bottom:6px;width:clamp(36px,5vw,62px);aspect-ratio:1';
      const image = new Image();
      image.src = '/' + path;
      image.alt = '';
      image.style.cssText = 'width:100%;height:100%;object-fit:contain';
      runner.append(image);
      track.append(runner);
      return {runner, image};
    });
    // Start together so each character enters the screen already visible.
    Promise.allSettled(runners.map(({image}) => image.decode())).then(() => {
      if (active !== track) return;
      lastGroup = group.map(([id]) => id);
      try { sessionStorage.setItem(runnersKey, JSON.stringify(lastGroup)); } catch {}
      const rightward = nextDirection();
      const destination = rightward ? 'translateX(calc(100vw + 110%))' : 'translateX(calc(-100vw - 110%))';
      const trips = runners.map(({runner,image}, index) => {
        runner.style[rightward ? 'right' : 'left'] = '100%';
        runner.style.visibility = 'visible';
        image.style.scale = rightward ? '-1 1' : '1';
        image.animate([
          {transform:'translateY(0) rotate(-7deg)'},
          {transform:'translateY(-7px) rotate(5deg)',offset:0.48},
          {transform:'translateY(0) rotate(-7deg)'}
        ], {duration:165 + index*10,iterations:8});
        return runner.animate([
          {transform:'translateX(0)'},
          {transform:destination}
        ], {duration:1050,delay:index*105,easing:'linear',fill:'forwards'}).finished;
      });
      Promise.allSettled(trips).then(() => { if (active === track) stop(); });
    });
  }
  function atlasRoute(url) {
    const hash = new URL(url).hash;
    if (!hash || hash === '#characters') return 'characters';
    if (/^#(?:devices|guide|wiki\/.+)$/.test(hash)) return hash;
    return null;
  }
  window.addEventListener('hashchange', event => {
    if (location.pathname !== '/' && !location.pathname.endsWith('/index.html')) return;
    const next = atlasRoute(event.newURL);
    if (next && next !== atlasRoute(event.oldURL)) run();
  });
  const internal = document.referrer && new URL(document.referrer).origin === location.origin;
  if (internal && performance.getEntriesByType('navigation')[0]?.type !== 'reload') run();
  window.addEventListener('pageshow', event => { if (event.persisted) run(); });
  window.addEventListener('pagehide', stop);
  motion.addEventListener('change', () => { if (motion.matches) stop(); });
})();
