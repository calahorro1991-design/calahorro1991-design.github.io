// ─── BINGO WASM ──────────────────────────────────────────────────────────────
let bM, bState, bLoaded = false, bDonRetirePot = 0;
const bApi = {};
const BFUNCS = [
  ['init',            null,     []],
  ['get_state',       'number', []],
  ['select_bet',      'number', ['number']],
  ['generate_card',   'number', []],
  ['reroll_card',     'number', []],
  ['draw',            'number', []],
  ['buy_extra_ball',  'number', []],
  ['skip_extra_balls','number', []],
  ['finish_freegames','number', []],
  ['play_don',        'number', ['number']],
  ['exit_don',        'number', []],
  ['save_game',       'number', []],
  ['load_history',    'number', []],
  ['reset_round',     null,     []],
];

function toggleBingo(btn) {
  const panel = document.getElementById('bingo-panel');
  const open  = panel.style.display === 'block';
  panel.style.display = open ? 'none' : 'block';
  btn.innerHTML = open ? '▶ &nbsp;Demo Interactiva' : '◼ &nbsp;Cerrar Demo';
  if (!open && !bLoaded) {
    bLoaded = true;
    const sc = document.createElement('script');
    sc.src = 'wasm/bingo.js';
    sc.onerror = () => {
      document.getElementById('bp-loading').innerHTML =
        '<span style="color:#e05252">bingo.js not found — run <code>make -f Makefile.wasm</code> first</span>';
    };
    sc.onload = () => {
      BingoModule().then(mod => {
        bM = mod;
        BFUNCS.forEach(([name, ret, args]) => {
          const wrap = bM.cwrap('bingo_' + name, ret, args);
          bApi[name] = ret === 'number'
            ? (...a) => { const p = wrap(...a); return p ? JSON.parse(bM.UTF8ToString(p)) : null; }
            : wrap;
        });
        bApi.init();
        document.getElementById('bp-loading').style.display = 'none';
        document.getElementById('bp-app').style.display     = 'block';
        bState = bApi.get_state();
        bRender(bState);
      });
    };
    document.head.appendChild(sc);
  }
}

function bRender(s) {
  bState = s;
  document.getElementById('bp-credits').textContent = 'Credits: ' + s.credits.toFixed(2) + '€';
  document.querySelectorAll('#bingo-panel .b-panel').forEach(p => p.classList.remove('active'));
  switch (s.phase) {
    case 'IDLE':        bBshow('bp-bet'); break;
    case 'BET_SELECTED':
      bState = bApi.generate_card(); s = bState;
      /* fall through */
    case 'CARD_READY':
      bRenderCard('bp-card-grid', s.card, []);
      document.getElementById('bp-bet-info').textContent =
        s.betCost.toFixed(2) + '€ · prize ' + s.prizePerBall.toFixed(2) + '€/ball';
      bBshow('bp-card');
      break;
    case 'EXTRA_BALLS':
      bRenderCard('bp-extra-card', s.card, s.hits, s.extraBallsHit);
      document.getElementById('bp-hits').textContent     = s.totalHits;
      document.getElementById('bp-base-win').textContent = s.baseWinnings.toFixed(2) + '€';
      bRenderExtraOffer(s);
      bBshow('bp-extra');
      break;
    case 'FREEGAMES':
      bRenderCard('bp-fg-card', s.card, [], []);
      bRenderFreegames(s);
      bBshow('bp-freegames');
      break;
    case 'DOUBLE_OR_NOTHING':
      document.getElementById('bp-don-pot').textContent   = s.pot.toFixed(2);
      document.getElementById('bp-don-round').textContent = s.donRounds;
      document.getElementById('bp-don-result').textContent = '';
      bBshow('bp-don');
      break;
    case 'ROUND_OVER':
      bRenderSummary(s);
      bBshow('bp-over');
      break;
  }
  bSetStatus('');
}

function bBshow(id) { document.getElementById(id).classList.add('active'); }

function bRenderCard(gridId, card, hits, extraHits) {
  extraHits = extraHits || [];
  const hitSet = new Set(hits), xSet = new Set(extraHits);
  const grid = document.getElementById(gridId);
  const frag = document.createDocumentFragment();
  card.forEach(n => {
    const d = document.createElement('div');
    d.className = 'b-cell';
    d.textContent = n;
    if (xSet.has(n))        d.classList.add('xhit');
    else if (hitSet.has(n)) d.classList.add('hit');
    frag.appendChild(d);
  });
  grid.innerHTML = '';
  grid.appendChild(frag);
}

function bAnimateDraw(drawResult) {
  bBshow('bp-drawing');
  bSetStatus('Drawing 30 balls...');
  bRenderCard('bp-draw-card', drawResult.card, []);
  const ballsEl = document.getElementById('bp-draw-balls');
  ballsEl.innerHTML = '';
  const hitSet = new Set(drawResult.hits);
  let i = 0;
  const step = () => {
    if (i >= drawResult.draw.length) {
      bRenderCard('bp-draw-card', drawResult.card, drawResult.hits);
      setTimeout(() => bRender(drawResult), 900);
      return;
    }
    const n = drawResult.draw[i];
    const b = document.createElement('div');
    b.className = hitSet.has(n) ? 'b-ball hit-b' : 'b-ball drawn';
    b.textContent = n;
    ballsEl.appendChild(b);
    i++;
    setTimeout(step, 60);
  };
  step();
}

function bRenderExtraOffer(s) {
  const cursor = s.extraBallCursor;
  if (cursor >= 10) { bSkipExtra(); return; }
  const ball   = s.extraBallPool[cursor];
  const isFree = (cursor === s.freeBallIndex);
  const cost   = isFree ? 'FREE!' : s.extraBallCost.toFixed(2) + '€';
  const el = document.getElementById('bp-extra-display');
  el.innerHTML =
    '<div class="b-ball ' + (isFree ? 'free-b' : 'drawn') + '" style="width:52px;height:52px;font-size:18px;margin-bottom:.5rem">?</div>' +
    '<div class="b-info-row"><div class="b-chip">Ball ' + (cursor + 1) + '/10 &nbsp; Cost: <span>' + cost + '</span></div>' +
    (s.extraBallsBought.length ? '<div class="b-chip">Extra won: <span>' + s.extraBallWinnings.toFixed(2) + '€</span></div>' : '') +
    '</div>';
  document.getElementById('bp-extra-lbl').textContent =
    'Extra ball ' + (cursor + 1) + '/10  —  ' + (isFree ? 'This one is FREE!' : 'Cost: ' + cost);
}

function bRenderFreegames(s) {
  const cardSet = new Set(s.card);
  const content = document.getElementById('bp-fg-content');
  content.innerHTML = '';
  document.getElementById('bp-fg-hits').textContent = s.freegameHits.length;
  document.getElementById('bp-fg-win').textContent  = s.freegameWinnings.toFixed(2) + '€';
  document.getElementById('bp-fg-btn').style.display = 'none';
  let drawIdx = 0;
  const showNextDraw = () => {
    if (drawIdx >= s.freeDraws.length) {
      document.getElementById('bp-fg-btn').style.display = 'flex';
      return;
    }
    const fd = s.freeDraws[drawIdx];
    const wrap = document.createElement('div');
    wrap.className = 'b-fg-draw';
    wrap.innerHTML = '<div class="b-fg-num">FREEGAME ' + (drawIdx + 1) + '</div><div class="b-balls" id="bfg' + drawIdx + '"></div>';
    content.appendChild(wrap);
    const bw = document.getElementById('bfg' + drawIdx);
    let bi = 0;
    const step = () => {
      if (bi >= fd.length) { drawIdx++; setTimeout(showNextDraw, 300); return; }
      const n = fd[bi];
      const b = document.createElement('div');
      b.className = cardSet.has(n) ? 'b-ball hit-b' : 'b-ball drawn';
      b.textContent = n;
      bw.appendChild(b);
      bi++;
      setTimeout(step, 35);
    };
    step();
  };
  showNextDraw();
}

function bRenderSummary(s) {
  const extraCosts = s.extraBallCost * s.paidExtraBalls;
  // If DON was played, pot replaces all individual winnings (won=doubled, lost=0)
  const netWinnings = s.playedDon
    ? (s.wonDon ? s.pot : 0)
    : (s.baseWinnings + s.extraBallWinnings + s.freegameWinnings);
  const total = netWinnings - extraCosts - s.betCost;
  const flash = document.getElementById('bp-flash');
  if (s.credits <= 0) {
    flash.className = 'b-flash lost'; flash.textContent = 'OUT OF CREDITS';
  } else if (total >= 0) {
    flash.className = 'b-flash won'; flash.textContent = '+' + total.toFixed(2) + '€ THIS ROUND';
  } else {
    flash.className = 'b-flash lost'; flash.textContent = total.toFixed(2) + '€ THIS ROUND';
  }
  let donText;
  if (!s.playedDon) {
    donText = '—';
  } else if (s.wonDon) {
    donText = 'WON → ' + s.pot.toFixed(2) + '€';
  } else {
    donText = 'LOST';
  }
  const rows = [
    ['Bet',               '−' + s.betCost.toFixed(2) + '€'],
    ['Base hits',         s.totalHits],
    ['Base winnings',     '+' + s.baseWinnings.toFixed(2) + '€'],
    ['Extra ball hits',   s.extraBallsHit.length],
    ['Extra winnings',    '+' + s.extraBallWinnings.toFixed(2) + '€'],
    ['Extra ball cost',   extraCosts > 0 ? '−' + extraCosts.toFixed(2) + '€' : '—'],
    ['Freegame hits',     s.freegameHits.length],
    ['Freegame won',      '+' + s.freegameWinnings.toFixed(2) + '€'],
    ['Double or Nothing', donText],
  ];
  if (s.playedDon && !s.wonDon && bDonRetirePot > 0) {
    rows.push(['If retired', '+' + bDonRetirePot.toFixed(2) + '€', true]);
  }
  document.getElementById('bp-summary').innerHTML = rows.map(([k, v, amber]) =>
    amber
      ? '<div class="b-sum-row" style="border-color:rgba(239,159,39,.3);background:var(--amber-dim)"><span>' + k + '</span><span style="color:var(--amber)">' + v + '</span></div>'
      : '<div class="b-sum-row"><span>' + k + '</span><span class="val">' + v + '</span></div>'
  ).join('');
}

function bSelectBet(i)  { bRender(bApi.select_bet(i)); }
function bRerollCard()  { bRender(bApi.reroll_card()); }
function bStartDraw()   { bAnimateDraw(bApi.draw()); }
function bBuyExtra() {
  const s = bApi.buy_extra_ball();
  if (s.phase === 'DOUBLE_OR_NOTHING') { bRender(s); return; }
  bRenderCard('bp-extra-card', s.card, s.hits, s.extraBallsHit);
  document.getElementById('bp-hits').textContent     = s.totalHits;
  document.getElementById('bp-base-win').textContent = s.baseWinnings.toFixed(2) + '€';
  const boughtBall = s.extraBallPool[s.extraBallCursor - 1];
  const wasHit = s.extraBallsHit.includes(boughtBall);
  const el = document.getElementById('bp-extra-display');
  document.querySelectorAll('#bp-extra .b-btn').forEach(b => b.disabled = true);
  el.innerHTML =
    '<div style="font-size:9px;letter-spacing:.15em;color:var(--text3);margin-bottom:.4rem">BALL OBTAINED</div>' +
    '<div class="b-ball ' + (wasHit ? 'hit-b' : 'drawn') + '" style="width:52px;height:52px;font-size:18px;margin-bottom:.4rem">' + boughtBall + '</div>' +
    (wasHit
      ? '<div style="color:var(--purple);font-size:11px;letter-spacing:.08em">¡HIT! +' + s.prizePerBall.toFixed(2) + '€</div>'
      : '<div style="color:var(--text3);font-size:11px;letter-spacing:.08em">No match</div>');
  document.getElementById('bp-extra-lbl').textContent = wasHit ? 'Cardboard ball!' : 'No match';
  setTimeout(() => {
    document.querySelectorAll('#bp-extra .b-btn').forEach(b => b.disabled = false);
    bRenderExtraOffer(s);
  }, 1200);
}
function bSkipExtra()     { bRender(bApi.skip_extra_balls()); }
function bFinishFG()      { bRender(bApi.finish_freegames()); }
function bPlayDon(choice) {
  bDonRetirePot = bState ? bState.pot : 0;
  const s = bApi.play_don(choice);
  bState = s;
  document.getElementById('bp-don-pot').textContent   = s.pot.toFixed(2);
  document.getElementById('bp-don-round').textContent = s.donRounds;
  const drawnIsRed = s.wonDon ? (choice === 1) : (choice === 2);
  const cardColor  = drawnIsRed ? '#e05252' : 'var(--purple)';
  const cardSymbol = drawnIsRed ? '♥ RED' : '♠ BLUE';
  const flash = document.getElementById('bp-don-result');
  flash.innerHTML =
    '<div style="display:inline-flex;align-items:center;gap:10px;margin-top:4px">' +
      '<div style="border:.5px solid ' + cardColor + ';color:' + cardColor + ';padding:.3rem .7rem;' +
           'font-family:\'Rajdhani\',sans-serif;font-size:.95rem;font-weight:700;border-radius:2px">' + cardSymbol + '</div>' +
      '<span style="color:' + (s.wonDon ? 'var(--green-light)' : '#e05252') + ';font-size:12px">' +
        (s.wonDon ? '✓ Won! Pot → ' + s.pot.toFixed(2) + '€' : '✗ Lost! Pot gone.') +
      '</span>' +
    '</div>';
  document.querySelectorAll('#bp-don .b-don-card, #bp-don .b-btn.amber').forEach(el => {
    el.style.pointerEvents = 'none'; el.style.opacity = '.4';
  });
  if (s.phase === 'ROUND_OVER') {
    setTimeout(() => bRender(s), 1500);
    return;
  }
  setTimeout(() => {
    document.querySelectorAll('#bp-don .b-don-card, #bp-don .b-btn.amber').forEach(el => {
      el.style.pointerEvents = ''; el.style.opacity = '';
    });
  }, 1000);
}
function bExitDon()  { bRender(bApi.exit_don()); }
function bNewRound() {
  bDonRetirePot = 0;
  bApi.save_game();
  bApi.reset_round();
  document.querySelectorAll('#bingo-panel .b-panel').forEach(p => p.classList.remove('active'));
  bBshow('bp-bet');
  bSetStatus('');
}
function bSetStatus(msg) { document.getElementById('bp-status').textContent = msg; }
