/* CO₂ Helper – a small rule-based chatbot (no internet or AI service needed).
   It matches keywords (longest match wins), can explain the user's own result,
   and can do quick conversions like "how much CO2 is 200 kWh?". */
(function () {
  'use strict';
  const E = window.CFC;
  const S = function () { return window.CFC_STATE; };

  const f = E.FACTORS;
  const fx = function (n) { return n.toFixed(2); };

  /* ---------- knowledge base ---------- */
  const KB = [
    /* small talk */
    { k: ['how are you', 'how r u', 'how is it going', "how's it going", 'you okay'],
      a: 'Doing great, thanks! 🌱 Ask me about your result, how the numbers are worked out, or how to cut your CO₂.' },
    { k: ['hello', 'hi', 'hey', 'hiya', 'howdy', 'salam', 'assalamu alaikum', 'good morning', 'good evening', 'good afternoon', 'yo'],
      a: 'Hello! 👋 I’m the CO₂ Helper. I can explain the questions, your result, or ways to reduce your footprint. What would you like to know?' },
    { k: ['thanks', 'thank you', 'thx', 'cheers', 'appreciate'], a: 'You’re welcome! 😊 Anything else I can help with?' },
    { k: ['bye', 'goodbye', 'see you', 'later'], a: 'Bye! Every small cut in CO₂ counts. 🌍' },
    { k: ['who are you', 'your name', 'what are you', 'are you a bot', 'are you ai', 'are you human', 'are you real'],
      a: 'I’m the CO₂ Helper, a simple built-in assistant. I work offline using a set of ready answers (no AI service behind me), so I’m best at questions about this calculator and carbon footprints.' },
    { k: ['what can you do', 'help me', 'help', 'what can i ask'],
      a: 'You can ask me things like:\n• How is my result calculated?\n• Where do I find my kWh?\n• What is CO₂?\n• How can I reduce it?\n• Explain my result\n• Or a quick sum, e.g. “CO₂ of 200 kWh”' },

    /* using the tool */
    { k: ['how do i start', 'how to use', 'how does this work', 'how it works', 'get started', 'what is this', 'what does this do'],
      a: 'It’s 4 quick steps:\n1. Choose who it’s for (home, business…).\n2. Answer a few questions about electricity, fuel, gas and AC gas – leave blank whatever doesn’t apply.\n3. Tap “See my footprint”.\n4. You get one number, a pie chart and 2 tips.' },
    { k: ['monthly or yearly', 'month or year', 'per month', 'per year', 'monthly', 'yearly', 'annual'],
      a: 'Use whichever is easier – the toggle at the top of each question switches between month and year. The result is always shown per year.' },
    { k: ['units', 'unit', 'mwh', 'gwh', 'million litres', 'thousand litres', 'convert'],
      a: 'Each box has a unit menu next to it. For big numbers, change it to thousands or millions (e.g. GWh for electricity, million litres for fuel). 1 MWh = 1,000 kWh and 1 GWh = 1,000,000 kWh.' },
    { k: ['start again', 'restart', 'reset', 'start over', 'new calculation'],
      a: 'On the result page tap “Start again” to clear everything and begin a new estimate.' },
    { k: ['leave blank', 'skip', 'dont know', "don't know", 'do not know', 'not sure', 'no idea'],
      a: 'No problem – leave it blank and it counts as zero. A rough guess is fine too; this tool gives an estimate, not an exact audit.' },
    { k: ['home', 'house', 'household', 'family'],
      a: 'For a home, the biggest items are usually electricity (fans, AC, fridge) and fuel for a car or motorbike. Choose “My home” on the first page.' },
    { k: ['business', 'company', 'factory', 'organisation', 'organization', 'university', 'office', 'shop'],
      a: 'Choose “Small business” or “Large organisation” on the first page. Add up the bills and fuel for all your buildings and vehicles, then use the unit menu if the numbers are big.' },
    { k: ['country', 'city', 'national', 'nation'],
      a: 'Choose “City or country” – the units switch to millions automatically. Use official energy statistics for the numbers. The result is compared with Bangladesh’s total (roughly 100 million tonnes a year).' },

    /* where to find numbers */
    { k: ['find my kwh', 'where do i find', 'kwh on my bill', 'electricity bill', 'meter', 'how much electricity', 'what is kwh', 'kwh'],
      a: 'A “kWh” (kilowatt-hour) is one “unit” of electricity. Your monthly electricity bill or prepaid meter shows the units used. Example: a 1,000 W heater on for 1 hour uses 1 kWh.' },
    { k: ['how many litres', 'litres', 'liters', 'fuel receipt', 'how much fuel'],
      a: 'Add up the litres from your fuel receipts, or estimate: litres ≈ distance driven ÷ kilometres per litre. Example: 300 km a month at 12 km/L ≈ 25 litres.' },
    { k: ['cubic metre', 'cubic meter', 'm3', 'm³', 'gas bill', 'natural gas', 'pipeline gas', 'titas'],
      a: 'Pipeline natural gas is measured in cubic metres (m³) on your gas bill. If you use gas cylinders (LPG) instead, leave this blank – cylinders aren’t included in this simple tool.' },
    { k: ['lpg', 'cylinder', 'cooking gas'],
      a: 'LPG cylinders aren’t included in this simple calculator, so leave the gas question blank if that’s what you use. Pipeline natural gas (on a gas bill in m³) is included.' },
    { k: ['refrigerant', 'ac gas', 'cooling gas', 'freon', 'r410', 'r-410', 'aircon', 'air conditioner', 'air-conditioner', 'fridge gas', 'gas refill'],
      a: 'Air-conditioners and fridges contain a gas that can leak. When a technician refills it, that amount has escaped into the air. The gas is very powerful – 1 kg is like ' + f.refrigerant.kgPerUnit + ' kg of CO₂. Check your service receipt; if there’s no refill, enter 0 or leave it blank.' },
    { k: ['generator', 'ips', 'ups', 'backup power', 'load shedding'],
      a: 'Diesel generators burn fuel, so enter the litres in the “Generators & heating” step. IPS/UPS battery systems don’t burn fuel themselves – their emissions come from the electricity used to charge them, which is already in your electricity bill.' },
    { k: ['petrol or diesel', 'petrol vs diesel', 'diesel vs petrol', 'difference between petrol'],
      a: 'Per litre, diesel gives off a bit more CO₂ (about ' + fx(f.diesel.kgPerUnit) + ' kg) than petrol (about ' + fx(f.petrol.kgPerUnit) + ' kg) because it is denser. Use the fuel your vehicle actually burns.' },
    { k: ['solar', 'renewable', 'rooftop'],
      a: 'Solar panels replace grid electricity, so every unit they produce avoids about ' + f.electricity.kgPerUnit + ' kg of CO₂. Try entering only the grid electricity you still buy to see the difference.' },

    /* concepts */
    { k: ['what is co2', 'what is co₂', 'carbon dioxide', 'what is carbon', 'carbon footprint', 'what is a carbon footprint', 'footprint'],
      a: 'Your carbon footprint is the amount of CO₂ (carbon dioxide) released by the energy and fuel you use. CO₂ traps heat in the atmosphere, which drives climate change. We measure it in kg or tonnes (1 tonne = 1,000 kg).' },
    { k: ['co2e', 'co₂e', 'greenhouse', 'methane', 'ghg', 'global warming'],
      a: 'Fuels and cooling gases release other warming gases too (like methane). To keep things simple, they’re all converted into the “equivalent amount of CO₂”, so you only see one number.' },
    { k: ['tonne', 'ton ', 'tonnes', 'what is a tonne', 'kg or tonne'],
      a: 'A tonne is 1,000 kg. Small results show in kg, larger ones in tonnes, and country-size ones in million tonnes.' },
    { k: ['why electricity', 'electricity emit', 'electricity give off', 'why does electricity'],
      a: 'Most electricity is made by burning gas, oil or coal in power plants, so each unit you use causes CO₂ at the power station – about ' + f.electricity.kgPerUnit + ' kg per kWh in this calculator.' },
    { k: ['average', 'typical', 'compare', 'comparison', 'benchmark', 'is that a lot', 'is that high', 'is this high', 'good or bad'],
      a: function () {
        const s = S();
        if (s && s.result && s.result.totalKg > 0) return E.compare(s.result.totalKg, s.audience);
        return 'Finish the questions and I’ll compare your result with a typical home, small business, large organisation, or country – it appears right under your big number.';
      } },

    /* accuracy / sources / privacy */
    { k: ['accurate', 'accuracy', 'precise', 'exact', 'reliable', 'trust', 'correct'],
      a: 'It’s a good rough estimate, not an audit. It only covers electricity, vehicle fuel, generator/heating fuel, natural gas and AC-gas leaks – not things like food, flights or waste – so real totals will be higher.' },
    { k: ['how is it calculated', 'how is my result calculated', 'how calculated', 'how do you calculate', 'formula', 'calculation', 'calculate', 'how is this worked out', 'method', 'how did you get'],
      a: 'Simple maths: amount used × CO₂ per unit, added together.\n• Electricity: ' + f.electricity.kgPerUnit + ' kg per kWh\n• Petrol: ' + fx(f.petrol.kgPerUnit) + ' kg per litre\n• Diesel: ' + fx(f.diesel.kgPerUnit) + ' kg per litre\n• Natural gas: ' + f.gas.kgPerUnit + ' kg per m³\n• AC gas leaks: ' + f.refrigerant.kgPerUnit + ' kg per kg\nMonthly answers are multiplied by 12 to give a yearly total.' },
    { k: ['source', 'sources', 'reference', 'where do the numbers', 'emission factor', 'ipcc', 'defra', 'cite'],
      a: 'The conversion numbers come from IPCC 2006 default fuel values, plus the grid, gas and AC-gas figures from the project data. The “How was this worked out?” drop-down on the result page lists them.' },
    { k: ['privacy', 'data', 'stored', 'saved', 'private', 'secure', 'safe'],
      a: 'Everything stays on your device. Nothing you type is sent anywhere or saved – close the page and it’s gone.' },
    { k: ['scope', 'scope 1', 'scope 2'],
      a: 'You don’t need to worry about that! The calculator handles the technical side behind the scenes and just asks about your bills and fuel.' },
    { k: ['pie', 'chart', 'graph', 'pie chart'],
      a: 'The pie chart shows which activity contributes most. The bigger the slice, the bigger the share of your total CO₂.' },

    /* result-aware */
    { k: ['my result', 'my footprint', 'my total', 'explain my result', 'explain result', 'what does my result mean', 'my number', 'what is my', 'how much did i'],
      a: function () {
        const s = S();
        if (!s || !s.result || !(s.result.totalKg > 0)) return 'I don’t see a result yet. Answer the questions and tap “See my footprint”, then ask me again!';
        const h = E.headline(s.result.totalKg);
        const top = Object.keys(s.result.byCategory).sort(function (a, b) { return s.result.byCategory[b] - s.result.byCategory[a]; })[0];
        return 'Your estimate is ' + h.num + ' ' + h.unit.replace(' per year', '') + ' a year. The biggest source is ' + E.CATEGORIES[top].label.toLowerCase() + ' (' + Math.round(s.result.byCategory[top] / s.result.totalKg * 100) + '%). ' + E.compare(s.result.totalKg, s.audience);
      } },
    { k: ['biggest source', 'biggest', 'largest', 'main source', 'where does most'],
      a: function () {
        const s = S();
        if (!s || !s.result || !(s.result.totalKg > 0)) return 'Once you’ve got a result, I can tell you which activity is the biggest source. Finish the questions first!';
        const top = Object.keys(s.result.byCategory).sort(function (a, b) { return s.result.byCategory[b] - s.result.byCategory[a]; })[0];
        return 'Your biggest source is ' + E.CATEGORIES[top].label.toLowerCase() + ' – about ' + Math.round(s.result.byCategory[top] / s.result.totalKg * 100) + '% of your total (' + E.fmtMass(s.result.byCategory[top]) + ' a year).';
      } },
    { k: ['reduce', 'lower', 'cut', 'save', 'improve', 'tips', 'tip', 'how can i', 'what can i do', 'less co2', 'decrease'],
      a: function () {
        const s = S();
        if (s && s.result && s.result.totalKg > 0) {
          const t = E.tips(s.result, s.audience);
          return 'Based on your result:\n1. ' + t[0].title + ' – ' + t[0].text + '\n\n2. ' + t[1].title + ' – ' + t[1].text;
        }
        return 'General wins: use LED lights and efficient AC, switch things off when not in use, combine car trips or use public transport, service generators and AC regularly, and fix gas leaks. Finish the calculator and I’ll give tips based on your own numbers.';
      } }
  ];

  const FALLBACK = 'Hmm, I’m not sure about that one. Try asking about how the result is calculated, where to find your kWh or litres, what CO₂ is, or how to reduce your footprint. 🙂';

  /* ---------- matching (longest keyword wins) ---------- */
  const escRe = function (s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); };
  function matches(text, kw) {
    if (kw.length <= 4 && kw.indexOf(' ') < 0) return new RegExp('(^|\\W)' + escRe(kw) + '(\\W|$)', 'i').test(text);
    return text.indexOf(kw) >= 0;
  }

  /* ---------- quick conversions: "co2 of 200 kwh", "50 litres of diesel" ---------- */
  function quickCalc(text) {
    const m = text.match(/(\d[\d,]*\.?\d*)\s*(kwh|mwh|gwh|units?|litres?|liters?|ltrs?|l|m3|m³|cubic metres?|cubic meters?|kg)\b/i);
    if (!m) return null;
    const n = parseFloat(m[1].replace(/,/g, ''));
    const u = m[2].toLowerCase();
    let kg, label;
    if (/^(kwh|mwh|gwh|units?)$/.test(u)) {
      const mult = u === 'gwh' ? 1e6 : u === 'mwh' ? 1000 : 1;
      kg = n * mult * f.electricity.kgPerUnit; label = m[1] + ' ' + m[2] + ' of electricity';
    } else if (/^(litres?|liters?|ltrs?|l)$/.test(u)) {
      if (/petrol|gasoline|octane/.test(text)) { kg = n * f.petrol.kgPerUnit; label = m[1] + ' litres of petrol'; }
      else if (/diesel/.test(text)) { kg = n * f.diesel.kgPerUnit; label = m[1] + ' litres of diesel'; }
      else return 'Is that petrol or diesel? Tell me like “' + m[1] + ' litres of diesel” and I’ll work it out.';
    } else if (/^(m3|m³|cubic)/.test(u)) {
      kg = n * f.gas.kgPerUnit; label = m[1] + ' m³ of natural gas';
    } else if (u === 'kg') {
      if (/refrigerant|ac gas|cooling gas|freon|fridge/.test(text)) { kg = n * f.refrigerant.kgPerUnit; label = m[1] + ' kg of leaked AC gas'; }
      else return null;
    }
    if (kg == null) return null;
    return label + ' ≈ ' + E.fmtMass(kg) + ' of CO₂.';
  }

  function reply(raw) {
    const text = raw.toLowerCase().trim();
    const q = quickCalc(text);
    if (q) return q;
    let best = null;
    KB.forEach(function (e) {
      e.k.forEach(function (kw) {
        if (matches(text, kw) && (!best || kw.length > best.score)) best = { score: kw.length, a: e.a };
      });
    });
    if (!best) return FALLBACK;
    return typeof best.a === 'function' ? best.a() : best.a;
  }

  /* ---------- UI ---------- */
  const root = document.getElementById('chat');
  const GREETING = 'Hi! I’m the CO₂ Helper 🌱 Ask me anything about this calculator or how to cut your footprint.';
  const CHIPS = ['How is it calculated?', 'Where do I find my kWh?', 'What is CO₂?', 'How can I reduce it?'];

  root.innerHTML =
    '<div class="chat-nudge" id="chatNudge" hidden>Need help? Ask me! 👋</div>' +
    '<button type="button" class="chat-fab pulse" id="chatFab" aria-label="Open chat">' +
      '<svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 15a2 2 0 0 1-2 2H8l-5 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg></button>' +
    '<section class="chat-panel" id="chatPanel" hidden aria-label="Chat with CO₂ Helper">' +
      '<div class="chat-head"><div class="avatar"><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M11 20A7 7 0 0 1 4 13c0-5 4-9 16-9 0 12-4 16-9 16z"/></svg></div>' +
        '<div class="who"><b>CO₂ Helper</b><small id="chatStatus">Online</small></div>' +
        '<button type="button" class="icon-btn" id="chatClear" aria-label="Clear chat" title="Clear chat"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/></svg></button>' +
        '<button type="button" class="icon-btn" id="chatClose" aria-label="Close chat"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button></div>' +
      '<div class="chat-body" id="chatBody"></div>' +
      '<form class="chat-form" id="chatForm" autocomplete="off"><input id="chatInput" type="text" placeholder="Type your question…" aria-label="Your question">' +
        '<button type="submit" id="chatSend" aria-label="Send"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg></button></form>' +
    '</section>';

  const $ = function (id) { return document.getElementById(id); };
  const body = $('chatBody'), input = $('chatInput'), sendBtn = $('chatSend');
  let typing = false;

  function add(text, who) {
    const d = document.createElement('div');
    d.className = 'msg ' + who; d.textContent = text;
    body.appendChild(d); body.scrollTop = body.scrollHeight; return d;
  }
  function chips() {
    const w = document.createElement('div'); w.className = 'chips'; w.id = 'chatChips';
    const list = (S() && S().result) ? ['Explain my result', 'How can I reduce it?', 'How is it calculated?'] : CHIPS;
    list.forEach(function (c) {
      const b = document.createElement('button'); b.type = 'button'; b.className = 'chip'; b.textContent = c;
      b.onclick = function () { send(c); }; w.appendChild(b);
    });
    body.appendChild(w); body.scrollTop = body.scrollHeight;
  }
  function reset() { body.innerHTML = ''; add(GREETING, 'bot'); chips(); }

  function send(t) {
    t = t.trim(); if (!t || typing) return;
    const old = $('chatChips'); if (old) old.remove();
    add(t, 'me'); input.value = ''; typing = true; sendBtn.disabled = true; $('chatStatus').textContent = 'Typing…';
    const dots = document.createElement('div'); dots.className = 'msg bot typing'; dots.innerHTML = '<i></i><i></i><i></i>';
    body.appendChild(dots); body.scrollTop = body.scrollHeight;
    setTimeout(function () {
      dots.remove(); add(reply(t), 'bot');
      typing = false; sendBtn.disabled = false; $('chatStatus').textContent = 'Online'; input.focus();
    }, 450 + Math.random() * 350);
  }

  function toggle(open) {
    const p = $('chatPanel');
    const show = open === undefined ? p.hidden : open;
    p.hidden = !show; $('chatNudge').hidden = true; $('chatFab').classList.remove('pulse');
    $('chatFab').setAttribute('aria-label', show ? 'Close chat' : 'Open chat');
    if (show) { if (!body.children.length) reset(); setTimeout(function () { input.focus({ preventScroll: true }); }, 50); }
  }

  $('chatFab').onclick = function () { toggle(); };
  $('chatClose').onclick = function () { toggle(false); };
  $('chatClear').onclick = reset;
  $('chatForm').onsubmit = function (e) { e.preventDefault(); send(input.value); };
  input.addEventListener('input', function () { sendBtn.disabled = typing || !input.value.trim(); });
  sendBtn.disabled = true;

  // Friendly nudge after a few seconds, once
  setTimeout(function () { if ($('chatPanel').hidden) $('chatNudge').hidden = false; }, 4000);
  setTimeout(function () { $('chatNudge').hidden = true; }, 11000);
})();
