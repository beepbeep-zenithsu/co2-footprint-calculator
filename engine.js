/* =========================================================
   CO₂ Footprint Calculator – calculation engine
   Pure functions only (no DOM), so it can be tested in Node.

   Formula used everywhere:
       CO₂ (kg) = amount used  ×  conversion figure (kg CO₂ per unit)
   ========================================================= */
(function (root) {
  'use strict';

  /* ---------- 1. CONVERSION FIGURES (the ONLY place to edit) ----------
     Keep these identical to the figures cited in your Part A report.   */
  const GWP = { CH4: 28, N2O: 265 };            // IPCC AR5, 100-year

  // Fuel: litres → kg CO₂e, using the method in Assignment Appendix B:
  //   litres × density (kg/L) × calorific value (MJ/kg) → energy (GJ)
  //   energy × (CO₂ + CH₄×GWP + N₂O×GWP) per GJ
  function fuelKgPerLitre(f) {
    const gjPerLitre = (f.density * f.ncv) / 1000;
    const kgPerGJ = f.co2 + (f.ch4 * GWP.CH4 + f.n2o * GWP.N2O) / 1000; // CH4/N2O are g per GJ
    return gjPerLitre * kgPerGJ;
  }

  const FACTORS = {
    electricity: {
      kgPerUnit: 0.567, per: 'kWh (1 unit on your bill)',
      source: 'Bangladesh grid average – value used in the Carbon Atlas project data (Part A). Replace with the exact figure cited in Part A (e.g. IGES / BPDB).'
    },
    petrol: {
      kgPerUnit: fuelKgPerLitre({ density: 0.755, ncv: 44.3, co2: 69.3, ch4: 33, n2o: 3.2 }), per: 'litre',
      source: 'IPCC 2006 Guidelines default values (petrol/gasoline, road transport); density 0.755 kg/L as in Assignment Appendix B; GWP from IPCC AR5.'
    },
    diesel: {
      kgPerUnit: fuelKgPerLitre({ density: 0.87, ncv: 43.0, co2: 74.1, ch4: 3.9, n2o: 3.9 }), per: 'litre',
      source: 'IPCC 2006 Guidelines default values (diesel, per Assignment Appendix B: CO₂ 74.1, CH₄ 3.9, N₂O 3.9); density 0.87 kg/L; GWP from IPCC AR5.'
    },
    gas: {
      kgPerUnit: 2.04, per: 'm³',
      source: 'Natural gas factor used in the Carbon Atlas project data (Part A).'
    },
    refrigerant: {
      kgPerUnit: 2088, per: 'kg leaked / refilled',
      source: 'Global warming potential of the common AC gas R-410A (2088), as used in the Carbon Atlas project data (Part A).'
    }
  };

  /* ---------- 2. QUESTIONS (inputs) ---------- */
  const L = [
    { id: 'litres', label: 'litres', mult: 1 },
    { id: 'kL', label: 'thousand litres', mult: 1e3 },
    { id: 'ML', label: 'million litres', mult: 1e6 }
  ];
  const INPUTS = [
    { key: 'electricity', category: 'electricity', factor: 'electricity',
      units: [{ id: 'kWh', label: 'units (kWh)', mult: 1 }, { id: 'MWh', label: 'thousand units (MWh)', mult: 1e3 }, { id: 'GWh', label: 'million units (GWh)', mult: 1e6 }] },
    { key: 'petrol', category: 'vehicles', factor: 'petrol', units: L },
    { key: 'dieselVehicle', category: 'vehicles', factor: 'diesel', units: L },
    { key: 'dieselHeat', category: 'heating', factor: 'diesel', units: L },
    { key: 'gas', category: 'heating', factor: 'gas',
      units: [{ id: 'm3', label: 'cubic metres (m³)', mult: 1 }, { id: 'km3', label: 'thousand m³', mult: 1e3 }, { id: 'Mm3', label: 'million m³', mult: 1e6 }] },
    { key: 'refrigerant', category: 'cooling', factor: 'refrigerant',
      units: [{ id: 'kg', label: 'kg', mult: 1 }, { id: 't', label: 'tonnes', mult: 1000 }] }
  ];

  const CATEGORIES = {
    electricity: { label: 'Electricity', color: '#E0123F' },
    vehicles:    { label: 'Vehicles', color: '#F59E0B' },
    heating:     { label: 'Generators & heating', color: '#0EA5A4' },
    cooling:     { label: 'Cooling gases', color: '#3B82F6' }
  };

  const AUDIENCES = {
    home:    { label: 'My home',            desc: 'A house or flat',                 noun: 'home' },
    small:   { label: 'Small business',     desc: 'Shop, workshop, small office',    noun: 'small business' },
    large:   { label: 'Large organisation', desc: 'Factory, university, hospital',   noun: 'large organisation' },
    country: { label: 'City or country',    desc: 'A big-picture estimate',          noun: 'country' }
  };

  /* ---------- 3. TYPICAL VALUES for the comparison line ----------
     Worked out with the SAME conversion figures from example monthly usage. */
  const TYPICAL = {
    home:  { desc: 'about 150 units of electricity and 15 litres of petrol a month',
             monthly: { electricity: 150, petrol: 15 } },
    small: { desc: 'about 3,000 units of electricity, 100 litres of petrol and 50 litres of diesel a month',
             monthly: { electricity: 3000, petrol: 100, dieselVehicle: 50 } },
    large: { desc: 'about 150,000 units of electricity, 7,000 litres of diesel and 1,000 m³ of gas a month, plus 20 kg of AC gas a year',
             monthly: { electricity: 150000, dieselVehicle: 2000, dieselHeat: 5000, gas: 1000 }, yearly: { refrigerant: 20 } }
  };
  const COUNTRY_TOTAL_KG = 1e11; // Bangladesh ≈ 100 million tonnes CO₂ a year (Global Carbon Project, rounded)

  /* ---------- 4. CORE CALCULATION ---------- */
  function calculate(values, period) {
    const mult = period === 'monthly' ? 12 : 1;
    const byCategory = { electricity: 0, vehicles: 0, heating: 0, cooling: 0 };
    const byItem = {};
    INPUTS.forEach(function (inp) {
      const v = values[inp.key];
      const n = parseFloat(v && v.value);
      if (!isFinite(n) || n <= 0) { byItem[inp.key] = 0; return; }
      const unit = inp.units.find(function (u) { return u.id === v.unit; }) || inp.units[0];
      const kg = n * unit.mult * FACTORS[inp.factor].kgPerUnit * mult; // kg CO₂ per YEAR
      byItem[inp.key] = kg;
      byCategory[inp.category] += kg;
    });
    const totalKg = Object.keys(byCategory).reduce(function (s, k) { return s + byCategory[k]; }, 0);
    return { totalKg: totalKg, byCategory: byCategory, byItem: byItem, period: period };
  }

  function validate(values) {
    const errors = {};
    INPUTS.forEach(function (inp) {
      const raw = values[inp.key] ? values[inp.key].value : '';
      if (raw === '' || raw == null) return;
      const n = Number(raw);
      if (!isFinite(n) || n < 0) errors[inp.key] = 'Please enter a number that is 0 or more.';
    });
    return errors;
  }

  function benchmarkKg(audience) {
    if (audience === 'country') return COUNTRY_TOTAL_KG;
    const t = TYPICAL[audience];
    const vals = {};
    INPUTS.forEach(function (i) { vals[i.key] = { value: '', unit: i.units[0].id }; });
    Object.keys(t.monthly || {}).forEach(function (k) { vals[k].value = t.monthly[k]; });
    let kg = calculate(vals, 'monthly').totalKg;
    if (t.yearly) {
      const y = {};
      INPUTS.forEach(function (i) { y[i.key] = { value: '', unit: i.units[0].id }; });
      Object.keys(t.yearly).forEach(function (k) { y[k].value = t.yearly[k]; });
      kg += calculate(y, 'yearly').totalKg;
    }
    return kg;
  }

  /* ---------- 5. FORMATTING ---------- */
  function num(n, d) { return n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: d }); }

  // {num, unit} for the big headline number
  function headline(kg) {
    if (kg < 1000) return { num: num(Math.round(kg), 0), unit: 'kg of CO₂ per year' };
    const t = kg / 1000;
    if (t < 10) return { num: num(t, 2), unit: 'tonnes of CO₂ per year' };
    if (t < 100) return { num: num(t, 1), unit: 'tonnes of CO₂ per year' };
    if (t < 1e6) return { num: num(Math.round(t), 0), unit: 'tonnes of CO₂ per year' };
    return { num: num(t / 1e6, 1), unit: 'million tonnes of CO₂ per year' };
  }
  function fmtMass(kg) {
    if (kg < 1000) return num(Math.round(kg), 0) + ' kg';
    const t = kg / 1000;
    if (t < 10) return num(t, 2) + ' tonnes';
    if (t < 100) return num(t, 1) + ' tonnes';
    if (t < 1e6) return num(Math.round(t), 0) + ' tonnes';
    return num(t / 1e6, 1) + ' million tonnes';
  }

  /* ---------- 6. COMPARISON LINE ---------- */
  function compare(totalKg, audience) {
    const bench = benchmarkKg(audience);
    if (audience === 'country') {
      const pct = (totalKg / bench) * 100;
      const p = pct < 0.01 ? 'less than 0.01%' : (pct < 10 ? num(pct, 2) : num(pct, 0)) + '%';
      return 'For scale: Bangladesh as a whole gives off roughly 100 million tonnes of CO₂ a year. Your figure is ' + p + ' of that.';
    }
    const ratio = totalKg / bench;
    let verdict;
    if (ratio > 1.2) verdict = (ratio >= 10 ? num(Math.round(ratio), 0) : num(ratio, 1)) + ' times higher than that';
    else if (ratio < 0.8) verdict = 'about ' + Math.round((1 - ratio) * 100) + '% lower than that';
    else verdict = 'about the same';
    return 'A typical ' + AUDIENCES[audience].noun + ' (' + TYPICAL[audience].desc + ') gives off roughly ' +
      fmtMass(bench) + ' a year. Yours is ' + verdict + '.';
  }

  /* ---------- 7. TIPS – generated from the actual result ---------- */
  const TIP_TEXT = {
    electricity: {
      home:    function (c) { return 'Switch to LED bulbs, use a fan before the AC, and unplug idle chargers and TVs. Cutting your electricity by just 10% would save about ' + c.save10 + ' a year.'; },
      small:   function (c) { return 'Use LED lighting, switch equipment off overnight and keep AC filters clean. A 10% cut in electricity would save about ' + c.save10 + ' a year – and a rooftop solar quote is worth asking for.'; },
      large:   function (c) { return 'Check your biggest electricity users (AC, motors, lighting) and schedule them around working hours. A 10% cut would save about ' + c.save10 + ' a year.'; },
      country: function (c) { return 'Efficient appliances, cleaner power sources and smarter cooling all help. A 10% cut in electricity use would save about ' + c.save10 + ' a year.'; }
    },
    vehicles: {
      home:    function (c) { return 'Combine trips, keep tyres properly inflated, and walk, cycle or take a bus for short journeys. Using 10% less fuel would save about ' + c.save10 + ' a year.'; },
      small:   function (c) { return 'Plan delivery routes, service vehicles regularly and switch engines off when waiting. Using 10% less fuel would save about ' + c.save10 + ' a year.'; },
      large:   function (c) { return 'Track fuel use per vehicle, share rides for staff transport and service engines on schedule. A 10% cut in fuel would save about ' + c.save10 + ' a year.'; },
      country: function (c) { return 'Public transport, well-maintained vehicles and less idling in traffic all cut fuel use. A 10% cut would save about ' + c.save10 + ' a year.'; }
    },
    generator: function (c) { return 'Only run generators when the mains power is really off, match the generator size to the load, and service it regularly. Using 10% less diesel would save about ' + c.save10 + ' a year.'; },
    gas: function (c) { return 'Fix leaking pipes and burners, switch off pilot flames when not needed, and insulate boilers and ovens. Using 10% less gas would save about ' + c.save10 + ' a year.'; },
    cooling: function (c) { return 'Refilled AC or fridge gas means it leaked out. Ask your technician to check for leaks at every service and fix them quickly – every 1 kg that escapes is roughly ' + num(FACTORS.refrigerant.kgPerUnit / 1000, 1) + ' tonnes of CO₂. Cutting your leaks by 10% would save about ' + c.save10 + ' a year.'; }
  };

  function tipFor(cat, audience, result, pct) {
    const kg = result.byCategory[cat];
    const ctx = { save10: fmtMass(kg * 0.10) };
    let text, name = CATEGORIES[cat].label;
    if (cat === 'heating') {
      text = (result.byItem.dieselHeat >= result.byItem.gas) ? TIP_TEXT.generator(ctx) : TIP_TEXT.gas(ctx);
    } else if (cat === 'cooling') {
      text = TIP_TEXT.cooling(ctx);
    } else {
      text = TIP_TEXT[cat][audience](ctx);
    }
    return { cat: cat, name: name, pct: pct, text: text };
  }

  function joinAnd(a) { return a.length < 2 ? a.join('') : a.slice(0, -1).join(', ') + ' or ' + a[a.length - 1]; }

  function tips(result, audience) {
    if (!(result.totalKg > 0)) return [];
    const cats = Object.keys(result.byCategory)
      .filter(function (k) { return result.byCategory[k] > 0; })
      .sort(function (a, b) { return result.byCategory[b] - result.byCategory[a]; });
    const pctOf = function (k) { return Math.round((result.byCategory[k] / result.totalKg) * 100); };
    const out = [];

    // Tip 1 – the biggest source
    const first = tipFor(cats[0], audience, result, pctOf(cats[0]));
    first.title = 'Biggest source: ' + first.name + ' (' + first.pct + '%)';
    if (audience !== 'country' && result.totalKg > benchmarkKg(audience) * 1.2) {
      first.text += ' Your total is above a typical ' + AUDIENCES[audience].noun + ', so this is the best place to start.';
    }
    out.push(first);

    // Tip 2 – the next source, or a nudge if only one source was entered
    if (cats.length > 1) {
      const second = tipFor(cats[1], audience, result, pctOf(cats[1]));
      second.title = 'Next: ' + second.name + ' (' + second.pct + '%)';
      out.push(second);
    } else {
      const missing = Object.keys(CATEGORIES).filter(function (k) { return k !== cats[0]; })
        .map(function (k) { return CATEGORIES[k].label.toLowerCase(); });
      out.push({
        cat: 'more', pct: 100,
        title: 'Add the rest for a fuller picture',
        text: 'You only entered ' + CATEGORIES[cats[0]].label.toLowerCase() + '. Go back and add ' + joinAnd(missing) +
          ' if they apply – small things like backup generators and gas leaks often add up. Then set a goal: a 20% cut in ' +
          CATEGORIES[cats[0]].label.toLowerCase() + ' would save about ' + fmtMass(result.byCategory[cats[0]] * 0.20) + ' a year.'
      });
    }
    return out;
  }

  const api = {
    FACTORS: FACTORS, INPUTS: INPUTS, CATEGORIES: CATEGORIES, AUDIENCES: AUDIENCES, TYPICAL: TYPICAL,
    calculate: calculate, validate: validate, compare: compare, tips: tips, benchmarkKg: benchmarkKg,
    headline: headline, fmtMass: fmtMass
  };
  root.CFC = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
