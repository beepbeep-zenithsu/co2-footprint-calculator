/* CO₂ Footprint Calculator – interface (flip cards, form, result) */
(function () {
  'use strict';
  const E = window.CFC;

  /* ---------- steps ---------- */
  const STEPS = [
    { id: 'who',         label: 'Start' },
    { id: 'electricity', label: 'Electricity' },
    { id: 'vehicles',    label: 'Vehicles' },
    { id: 'heating',     label: 'Heat & power' },
    { id: 'cooling',     label: 'Cooling' },
    { id: 'result',      label: 'Result' }
  ];

  /* ---------- icons (inline SVG, no downloads needed) ---------- */
  const svg = function (inner) {
    return '<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + inner + '</svg>';
  };
  const ICONS = {
    who: svg('<path d="M3 11l9-8 9 8"/><path d="M5 10v10h14V10"/>'),
    electricity: svg('<polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>'),
    vehicles: svg('<path d="M5 16l1.5-5.5A2 2 0 0 1 8.4 9h7.2a2 2 0 0 1 1.9 1.5L19 16"/><rect x="3" y="16" width="18" height="4" rx="1.5"/><circle cx="7.5" cy="18" r=".6"/><circle cx="16.5" cy="18" r=".6"/>'),
    heating: svg('<path d="M12 2c1 4 5 6 5 11a5 5 0 0 1-10 0c0-2 1-3 2-4 0 2 1 3 2 3 0-4-1-6 1-10z"/>'),
    cooling: svg('<line x1="12" y1="2" x2="12" y2="22"/><line x1="4" y1="7" x2="20" y2="17"/><line x1="20" y1="7" x2="4" y2="17"/>'),
    result: svg('<path d="M21 12A9 9 0 1 1 12 3v9z"/><path d="M15 3.5A9 9 0 0 1 20.5 9H15z"/>')
  };
  const CHECK = svg('<polyline points="20 6 9 17 4 12"/>').replace('width="24" height="24"', 'width="16" height="16"');

  /* ---------- plain-language question text ---------- */
  const per = function () { return state.period === 'monthly' ? 'each month' : 'each year'; };
  const CARDS = {
    electricity: {
      title: 'Electricity', sub: 'Power from the mains – lights, fans, AC, machines.',
      fields: [{
        key: 'electricity',
        q: function () { return 'How much electricity is used ' + per() + '?'; },
        hint: {
          home: 'Look at your electricity bill – it shows “units” or kWh.',
          small: 'Add up the bills for all your shops, workshops or offices.',
          large: 'Add up the bills for all buildings and sites.',
          country: 'Use national or city energy statistics (often in million units, GWh).'
        }
      }]
    },
    vehicles: {
      title: 'Vehicles', sub: 'Petrol and diesel burned by cars, bikes, trucks and buses.',
      fields: [
        { key: 'petrol', q: function () { return 'How many litres of petrol are used ' + per() + '?'; },
          hint: { home: 'Cars and motorbikes. Fuel receipts help.', small: 'Company cars, bikes and small vehicles.', large: 'All petrol-powered fleet vehicles.', country: 'National petrol sales (often in million litres).' } },
        { key: 'dieselVehicle', q: function () { return 'How many litres of diesel are used in vehicles ' + per() + '?'; },
          hint: { home: 'Leave blank if you have no diesel vehicle.', small: 'Vans, pick-ups, delivery trucks.', large: 'Trucks, buses and staff transport.', country: 'National road diesel sales (often in million litres).' } }
      ]
    },
    heating: {
      title: 'Generators & heating', sub: 'Backup power, boilers, ovens and gas burners.',
      fields: [
        { key: 'dieselHeat', q: function () { return 'How many litres of diesel go into generators or boilers ' + per() + '?'; },
          hint: { home: 'Leave blank if you have no generator (IPS/UPS batteries don’t count).', small: 'Backup generator, boiler or oven.', large: 'All generators, boilers and heaters.', country: 'Diesel used for power and industry.' } },
        { key: 'gas', q: function () { return 'How much pipeline natural gas is used ' + per() + '?'; },
          hint: { home: 'Your gas bill shows cubic metres (m³). Leave blank if you use cylinders.', small: 'Cooking, boilers or heating – see your gas bill.', large: 'Boilers, cooking and process heating.', country: 'National gas use for heat and industry (million m³).' } }
      ]
    },
    cooling: {
      title: 'Cooling gases', sub: 'Gas that leaks out of air-conditioners and fridges.',
      fields: [{
        key: 'refrigerant',
        q: function () { return 'How many kg of AC or fridge gas were refilled ' + per() + '?'; },
        hint: {
          home: 'When a technician tops up your AC gas, the receipt shows kg. Usually 0 – leave blank if never.',
          small: 'Check the service receipts for AC and fridges. Leave blank if none.',
          large: 'Check the maintenance logs for AC plants and chillers. Leave blank if none.',
          country: 'Only if you have national data; otherwise leave blank.'
        }
      }]
    }
  };

  /* ---------- state ---------- */
  const state = { step: 0, maxStep: 0, audience: 'home', period: 'monthly', values: {}, result: null };
  E.INPUTS.forEach(function (i) { state.values[i.key] = { value: '', unit: i.units[0].id }; });
  window.CFC_STATE = state; // the chatbot reads this

  function defaultUnits() {
    E.INPUTS.forEach(function (i) {
      const v = state.values[i.key];
      if (v.value === '') v.unit = state.audience === 'country' ? i.units[i.units.length - 1].id : i.units[0].id;
    });
  }

  /* ---------- helpers ---------- */
  const $ = function (id) { return document.getElementById(id); };
  const esc = function (s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };
  const reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let busy = false;

  /* ---------- renderers ---------- */
  function renderProgress() {
    let html = '';
    STEPS.forEach(function (s, i) {
      const cls = i === state.step ? 'current' : (i < state.step ? 'done' : '');
      const clickable = i <= state.maxStep && i !== state.step;
      html += '<button type="button" class="dot ' + cls + '" data-go="' + i + '"' + (clickable ? '' : ' disabled') + ' aria-label="' + s.label + '">' +
        '<span class="circle">' + (i < state.step ? CHECK : (i + 1)) + '</span><span class="lbl">' + s.label + '</span></button>';
      if (i < STEPS.length - 1) html += '<span class="bar ' + (i < state.step ? 'done' : '') + '"></span>';
    });
    $('progress').innerHTML = html;
    $('stepText').textContent = 'Step ' + (state.step + 1) + ' of ' + STEPS.length;
  }

  function periodToggle() {
    return '<div class="period"><span>My numbers are per</span><div class="seg" role="group" aria-label="Time period">' +
      '<button type="button" data-period="monthly" class="' + (state.period === 'monthly' ? 'on' : '') + '">Month</button>' +
      '<button type="button" data-period="yearly" class="' + (state.period === 'yearly' ? 'on' : '') + '">Year</button></div></div>';
  }

  function head(id, title, sub) {
    return '<div class="card-head"><div class="icon">' + ICONS[id] + '</div><div><h2>' + title + '</h2><p class="sub">' + sub + '</p></div></div>';
  }

  function renderWho() {
    let html = head('who', 'Who is this for?', 'Pick the closest match. This only changes the units and the comparison at the end.');
    html += '<div class="choices">';
    Object.keys(E.AUDIENCES).forEach(function (k) {
      const a = E.AUDIENCES[k];
      html += '<button type="button" class="choice ' + (state.audience === k ? 'on' : '') + '" data-aud="' + k + '"><strong>' + a.label + '</strong><span>' + a.desc + '</span></button>';
    });
    html += '</div>';
    html += '<p class="skip" style="margin-top:18px">It takes about a minute. Leave any question blank if it doesn’t apply.</p>';
    return html;
  }

  function renderQuestions(id) {
    const c = CARDS[id];
    let html = head(id, c.title, c.sub) + periodToggle();
    c.fields.forEach(function (f) {
      const inp = E.INPUTS.find(function (i) { return i.key === f.key; });
      const v = state.values[f.key];
      html += '<div class="field"><label for="f-' + f.key + '">' + f.q() + '</label>' +
        '<p class="hint">' + f.hint[state.audience] + '</p>' +
        '<div class="row"><input id="f-' + f.key + '" data-key="' + f.key + '" type="number" inputmode="decimal" min="0" step="any" placeholder="0" value="' + esc(v.value) + '">' +
        '<select data-unit="' + f.key + '" aria-label="Unit">' +
        inp.units.map(function (u) { return '<option value="' + u.id + '"' + (u.id === v.unit ? ' selected' : '') + '>' + u.label + '</option>'; }).join('') +
        '</select></div><p class="err" id="e-' + f.key + '" hidden></p></div>';
    });
    return html;
  }

  /* ---- pie chart (SVG, no libraries) ---- */
  function pieSvg(parts, total) {
    const cx = 100, cy = 100, r = 92;
    const pt = function (a) { return [cx + r * Math.cos(a), cy + r * Math.sin(a)]; };
    let a0 = -Math.PI / 2, out = '';
    parts.forEach(function (p) {
      const f = p.kg / total;
      const title = '<title>' + esc(p.label) + ': ' + Math.round(f * 100) + '%</title>';
      if (f > 0.9999) {
        out += '<circle cx="' + cx + '" cy="' + cy + '" r="' + r + '" fill="' + p.color + '">' + title + '</circle>';
        return;
      }
      const a1 = a0 + f * 2 * Math.PI;
      const s = pt(a0), e = pt(a1);
      out += '<path d="M' + cx + ' ' + cy + ' L' + s[0].toFixed(2) + ' ' + s[1].toFixed(2) + ' A' + r + ' ' + r + ' 0 ' + (f > 0.5 ? 1 : 0) + ' 1 ' +
        e[0].toFixed(2) + ' ' + e[1].toFixed(2) + ' Z" fill="' + p.color + '" stroke="#fff" stroke-width="2">' + title + '</path>';
      if (f >= 0.08) {
        const m = a0 + (a1 - a0) / 2;
        out += '<text x="' + (cx + r * 0.62 * Math.cos(m)).toFixed(1) + '" y="' + (cy + r * 0.62 * Math.sin(m) + 5).toFixed(1) +
          '" text-anchor="middle" font-size="14" font-weight="700" fill="#fff">' + Math.round(f * 100) + '%</text>';
      }
      a0 = a1;
    });
    return '<svg class="pie" viewBox="0 0 200 200" role="img" aria-label="Pie chart of where your CO₂ comes from">' + out + '</svg>';
  }

  function renderResult() {
    const res = state.result;
    if (!(res.totalKg > 0)) {
      return head('result', 'Nothing to show yet', 'Go back and enter at least one number.') +
        '<p class="empty">Your answers are all empty or zero, so there is nothing to add up.</p>';
    }
    const h = E.headline(res.totalKg);
    const parts = Object.keys(res.byCategory)
      .filter(function (k) { return res.byCategory[k] > 0; })
      .sort(function (a, b) { return res.byCategory[b] - res.byCategory[a]; })
      .map(function (k) { return { kg: res.byCategory[k], label: E.CATEGORIES[k].label, color: E.CATEGORIES[k].color }; });

    let html = '<p class="eyebrow">Your estimated footprint</p>' +
      '<div class="big"><span class="num">' + h.num + '</span><span class="unit">' + h.unit + '</span></div>' +
      '<p class="compare">' + esc(E.compare(res.totalKg, state.audience)) + '</p>';

    html += '<div class="pie-wrap">' + pieSvg(parts, res.totalKg) + '<ul class="legend">' +
      parts.map(function (p) {
        return '<li><span class="swatch" style="background:' + p.color + '"></span><span class="name">' + p.label + '</span>' +
          '<span class="val">' + E.fmtMass(p.kg) + '</span><span class="pct">' + Math.round((p.kg / res.totalKg) * 100) + '%</span></li>';
      }).join('') + '</ul></div>';

    html += '<h3>2 ways to bring it down</h3>' +
      E.tips(res, state.audience).map(function (t) {
        return '<div class="tip"><strong>' + esc(t.title) + '</strong><p>' + esc(t.text) + '</p></div>';
      }).join('');

    html += '<details class="how"><summary>How was this worked out?</summary><ul>' +
      '<li>Each answer is turned into a yearly amount, then multiplied by how much CO₂ that energy or fuel gives off.</li>' +
      '<li>1 unit (kWh) of electricity ≈ ' + E.FACTORS.electricity.kgPerUnit + ' kg CO₂</li>' +
      '<li>1 litre of petrol ≈ ' + E.FACTORS.petrol.kgPerUnit.toFixed(2) + ' kg CO₂</li>' +
      '<li>1 litre of diesel ≈ ' + E.FACTORS.diesel.kgPerUnit.toFixed(2) + ' kg CO₂</li>' +
      '<li>1 m³ of natural gas ≈ ' + E.FACTORS.gas.kgPerUnit + ' kg CO₂</li>' +
      '<li>1 kg of AC gas that leaks ≈ ' + E.FACTORS.refrigerant.kgPerUnit + ' kg CO₂</li>' +
      '<li>Sources: IPCC 2006 fuel defaults and grid figures from the project data. This is a rough estimate, not an official audit.</li>' +
      '</ul></details>';
    return html;
  }

  function renderCard() {
    const id = STEPS[state.step].id;
    $('card').innerHTML = id === 'who' ? renderWho() : (id === 'result' ? renderResult() : renderQuestions(id));
    renderProgress();
    renderNav();
  }

  function renderNav() {
    const last = state.step === STEPS.length - 1;
    const beforeResult = state.step === STEPS.length - 2;
    let html = state.step > 0 ? '<button type="button" class="btn" data-act="back">' + (last ? 'Change my answers' : 'Back') + '</button>' : '<span></span>';
    if (last) html += '<button type="button" class="btn primary" data-act="restart">Start again</button>';
    else html += '<button type="button" class="btn primary" data-act="next">' + (beforeResult ? 'See my footprint' : 'Next') + '</button>';
    $('nav').innerHTML = html;
  }

  /* ---------- flip navigation ---------- */
  function go(n) {
    n = Math.max(0, Math.min(STEPS.length - 1, n));
    if (busy || n === state.step) return;
    if (n > state.step && !checkStep()) return;
    if (n === STEPS.length - 1) state.result = E.calculate(state.values, state.period);
    const dir = n > state.step ? 1 : -1;
    const card = $('card');
    const swap = function () {
      state.step = n;
      state.maxStep = Math.max(state.maxStep, n);
      renderCard();
      window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' });
    };
    if (reduceMotion || !card.animate) { swap(); return; }
    busy = true;
    card.animate(
      [{ transform: 'rotateY(0deg)', opacity: 1 }, { transform: 'rotateY(' + (-90 * dir) + 'deg)', opacity: 0 }],
      { duration: 220, easing: 'cubic-bezier(.22,1,.36,1)', fill: 'forwards' }
    ).finished.then(function () {
      swap();
      return card.animate(
        [{ transform: 'rotateY(' + (90 * dir) + 'deg)', opacity: 0 }, { transform: 'rotateY(0deg)', opacity: 1 }],
        { duration: 260, easing: 'cubic-bezier(.22,1,.36,1)' }
      ).finished;
    }).catch(function () { swap(); }).then(function () {
      card.getAnimations().forEach(function (a) { a.cancel(); });
      busy = false;
    });
  }

  function checkStep() {
    const id = STEPS[state.step].id;
    if (!CARDS[id]) return true;
    const errs = E.validate(state.values);
    let firstBad = null;
    CARDS[id].fields.forEach(function (f) {
      const el = $('e-' + f.key), input = $('f-' + f.key);
      if (errs[f.key]) {
        el.textContent = errs[f.key]; el.hidden = false; input.classList.add('bad');
        if (!firstBad) firstBad = input;
      } else { el.hidden = true; input.classList.remove('bad'); }
    });
    if (firstBad) firstBad.focus();
    return !firstBad;
  }

  /* ---------- events ---------- */
  document.addEventListener('click', function (e) {
    const t = e.target.closest('[data-go],[data-act],[data-period],[data-aud]');
    if (!t) return;
    if (t.dataset.go !== undefined) go(+t.dataset.go);
    else if (t.dataset.act === 'next') go(state.step + 1);
    else if (t.dataset.act === 'back') go(state.step - 1);
    else if (t.dataset.act === 'restart') {
      E.INPUTS.forEach(function (i) { state.values[i.key] = { value: '', unit: i.units[0].id }; });
      state.audience = 'home'; state.period = 'monthly'; state.result = null; state.maxStep = 0;
      go(0);
    } else if (t.dataset.period) {
      state.period = t.dataset.period; renderCard();
    } else if (t.dataset.aud) {
      state.audience = t.dataset.aud; defaultUnits(); renderCard();
    }
  });
  document.addEventListener('input', function (e) {
    if (e.target.dataset && e.target.dataset.key) {
      state.values[e.target.dataset.key].value = e.target.value;
      e.target.classList.remove('bad');
      const err = $('e-' + e.target.dataset.key); if (err) err.hidden = true;
    }
  });
  document.addEventListener('change', function (e) {
    if (e.target.dataset && e.target.dataset.unit) state.values[e.target.dataset.unit].unit = e.target.value;
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' && e.target.matches && e.target.matches('#card input')) { e.preventDefault(); go(state.step + 1); }
  });
  document.addEventListener('wheel', function () {
    if (document.activeElement && document.activeElement.type === 'number') document.activeElement.blur();
  }, { passive: true });

  defaultUnits();
  renderCard();
})();
