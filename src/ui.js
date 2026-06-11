export class UIHTMLRenderer {

  // ─────────────────────────────────────────────────────────────────────────
  //  Formatters
  // ─────────────────────────────────────────────────────────────────────────

  static _fmt(val) {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency', currency: 'EUR', maximumFractionDigits: 0,
    }).format(val ?? 0);
  }

  static _pct(val, digits = 1) {
    return `${Number(val ?? 0).toFixed(digits)} %`;
  }

  /**
   * Escape a raw HTML string for use as an HTML attribute value.
   * The browser unescapes it automatically when reading .dataset.*
   */
  static _attrEsc(html) {
    return html.replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
  }

  /**
   * Build a structured tooltip HTML string ready to be injected via innerHTML.
   * Escape the result with _attrEsc() before putting it in a data-* attribute.
   *
   * @param {{ title:string, subtitle?:string, sections?:Array<Array<{k?,v?,sep?,text?,bold?,dim?}>>, footer?:string }} config
   */
  static _tipBuild({ title, subtitle, sections = [], footer } = {}) {
    const R = 'font-family:Inter,system-ui,sans-serif;font-size:12px;';
    const parts = [];
    if (title)    parts.push(`<div style="${R}font-weight:700;color:#fff;margin-bottom:${subtitle ? 1 : 5}px;">${title}</div>`);
    if (subtitle) parts.push(`<div style="${R}font-size:11px;color:#94a3b8;margin-bottom:6px;">${subtitle}</div>`);
    for (const section of sections) {
      for (const item of section) {
        if (item.sep) {
          parts.push('<div style="border-top:1px solid rgba(255,255,255,0.15);margin:4px 0;"></div>');
        } else if (item.k !== undefined) {
          const iStyle = item.indent ? 'padding-left:10px;' : '';
          let kColor;
          if (item.bold)        kColor = '#fff';
          else if (item.indent) kColor = '#94a3b8';
          else                  kColor = '#cbd5e1';
          const vStyle = item.bold ? 'font-weight:700;color:#fff;' : 'font-weight:600;color:#fff;';
          parts.push(
            `<div style="${R}display:flex;justify-content:space-between;gap:14px;${iStyle}line-height:1.6;">` +
            `<span style="color:${kColor};">${item.k}</span>` +
            `<span style="${vStyle}white-space:nowrap;">${item.v}</span></div>`,
          );
        } else if (item.text) {
          const tColor = item.dim ? '#64748b' : '#94a3b8';
          parts.push(`<div style="${R}font-size:11px;color:${tColor};margin-top:2px;">${item.text}</div>`);
        }
      }
    }
    if (footer) {
      parts.push(
        '<div style="border-top:1px solid rgba(255,255,255,0.12);margin-top:5px;padding-top:4px;">' +
        `<span style="font-size:10px;color:#64748b;">${footer}</span></div>`,
      );
    }
    return parts.join('');
  }

  // ─────────────────────────────────────────────────────────────────────────
  //  Signal config
  // ─────────────────────────────────────────────────────────────────────────

  static _signalCfg(signal) {
    const map = {
      GO:        { text: '#166534', bg: '#f0fdf4', border: '#86efac', bar: '#22c55e', emoji: '✓' },
      ATTENTION: { text: '#92400e', bg: '#fffbeb', border: '#fcd34d', bar: '#f59e0b', emoji: '!' },
      STOP:      { text: '#991b1b', bg: '#fef2f2', border: '#fca5a5', bar: '#ef4444', emoji: '✕' },
    };
    return map[signal] ?? { text: '#475569', bg: '#f8fafc', border: '#e2e8f0', bar: '#94a3b8', emoji: '?' };
  }

  // ─────────────────────────────────────────────────────────────────────────
  //  Component helpers
  // ─────────────────────────────────────────────────────────────────────────

  static _kpiCard({ label, value, sub = '', tip = '', accent = '#0f172a', bgCard = '#f8fafc', borderCard = '#e2e8f0' }) {
    const tipAttr = tip ? ` data-selopti-tip="${tip}" style="font-size: 10px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.7px; margin-bottom: 6px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; cursor: help; text-decoration: underline dotted #94a3b8; text-underline-offset: 2px;"` : ` style="font-size: 10px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.7px; margin-bottom: 6px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;"`;
    return `
      <div style="background: ${bgCard}; border: 1px solid ${borderCard}; border-radius: 12px; padding: 13px 14px; min-width: 0; box-sizing: border-box;">
        <div${tipAttr}>${label}</div>
        <div style="font-size: 20px; font-weight: 800; color: ${accent}; line-height: 1.1;">${value}</div>
        ${sub ? `<div style="font-size: 11px; color: #94a3b8; margin-top: 4px; line-height: 1.3;">${sub}</div>` : ''}
      </div>`;
  }

  static _scenarioRow(label, value, { bg, border, textLabel, textValue }) {
    return `
      <div style="display: flex; justify-content: space-between; align-items: center; padding: 9px 12px; border-radius: 9px; background: ${bg}; border: 1px solid ${border};">
        <span style="font-size: 12px; font-weight: 600; color: ${textLabel};">${label}</span>
        <span style="font-size: 15px; font-weight: 800; color: ${textValue};">${value}</span>
      </div>`;
  }

  static _flagChip({ type, message }) {
    const cfg = {
      warning: { bg: '#fffbeb', border: '#fcd34d', text: '#92400e', icon: '&#9888;' },
      ok:      { bg: '#f0fdf4', border: '#86efac', text: '#166534', icon: '&#10003;' },
      info:    { bg: '#eff6ff', border: '#93c5fd', text: '#1e40af', icon: '&#8505;' },
    }[type] ?? { bg: '#f8fafc', border: '#e2e8f0', text: '#475569', icon: '&middot;' };

    return `
      <div style="display: flex; align-items: flex-start; gap: 8px; padding: 9px 12px; border-radius: 9px; background: ${cfg.bg}; border: 1px solid ${cfg.border};">
        <span style="font-size: 13px; flex-shrink: 0; color: ${cfg.text}; font-weight: 900; line-height: 1.5;">${cfg.icon}</span>
        <span style="font-size: 12px; color: ${cfg.text}; line-height: 1.5;">${this.escapeHTML(message)}</span>
      </div>`;
  }

  // ─────────────────────────────────────────────────────────────────────────
  //  Sections
  // ─────────────────────────────────────────────────────────────────────────

  static _renderHeader(data) {
    const parseDate = (str) => {
      if (!str) return null;
      try {
        const d = new Date(str);
        if (Number.isNaN(d.getTime())) return null;
        const today = new Date(); today.setHours(0, 0, 0, 0);
        const copy  = new Date(d); copy.setHours(0, 0, 0, 0);
        const diff  = Math.floor((today - copy) / 86400000);
        let label;
        if (diff === 0)      label = 'Auj.';
        else if (diff === 1) label = 'Hier';
        else                 label = `${diff}j`;
        const dateStr = new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: 'short' }).format(d);
        return { dateStr, label, diff };
      } catch { return null; }
    };

    let created = null, updated = null;
    if (data.timeMetadata) {
      for (const [lbl, val] of data.timeMetadata) {
        if (lbl === 'Date de création')    created = parseDate(val);
        if (lbl === 'Date de mise à jour') updated = parseDate(val);
      }
    }

    const isOld = created?.diff >= 180;

    const pill = (text, bg, color, border) =>
      `<span style="display:inline-flex;align-items:center;font-size:10px;font-weight:700;padding:3px 8px;border-radius:999px;background:${bg};color:${color};border:1px solid ${border};white-space:nowrap;">${text}</span>`;

    const badges = [
      created && pill(
        `Publié ${created.dateStr} · ${created.label}`,
        isOld ? '#fff7ed' : '#f0fdf4',
        isOld ? '#c2410c' : '#166534',
        isOld ? '#fed7aa' : '#bbf7d0',
      ),
      updated && updated.dateStr !== created?.dateStr && pill(
        `MàJ ${updated.dateStr} · ${updated.label}`,
        '#fffbeb', '#b45309', '#fde68a',
      ),
    ].filter(Boolean).join('');

    const structure = data.roiScore?.structure_detectee;
    const structBadge = structure
      ? `<span style="display:inline-flex;align-items:center;font-size:10px;font-weight:700;padding:2px 7px;border-radius:999px;background:#ede9fe;color:#6d28d9;border:1px solid #ddd6fe;">${this.escapeHTML(structure)}</span>`
      : '';
    const negotiableBadge = isOld
      ? `<span style="display:inline-flex;align-items:center;font-size:10px;font-weight:700;padding:2px 7px;border-radius:999px;background:#fff7ed;color:#c2410c;border:1px solid #fdba74;">Négociable</span>`
      : '';

    return `
      <div style="padding:14px 20px 12px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;border-bottom:1px solid #f1f5f9;">
        <div style="display:flex;align-items:center;gap:10px;">
          <div style="background:linear-gradient(135deg,#3b82f6,#1d4ed8);width:32px;height:32px;border-radius:9px;display:flex;align-items:center;justify-content:center;flex-shrink:0;box-shadow:0 2px 8px rgba(37,99,235,0.3);">
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
          </div>
          <div>
            <div style="font-size:14px;font-weight:800;color:#0f172a;line-height:1.2;letter-spacing:-0.2px;">Selopti Insights</div>
            <div style="margin-top:4px;display:flex;gap:4px;flex-wrap:wrap;">${structBadge}${negotiableBadge}</div>
          </div>
        </div>
        <div style="display:flex;flex-wrap:wrap;gap:4px;justify-content:flex-end;">${badges}</div>
      </div>`;
  }

  static _renderVerdict(roiScore) {
    if (!roiScore) return '';
    const { verdict } = roiScore;
    const { signal, score, raisons } = verdict;
    const cfg = this._signalCfg(signal);
    const barW = Math.min(100, (score / 10) * 100).toFixed(1);

    const chips = raisons.map(r =>
      `<span style="display:inline-flex;align-items:center;font-size:11px;font-weight:600;color:${cfg.text};background:rgba(0,0,0,0.07);padding:3px 10px;border-radius:999px;white-space:nowrap;">${this.escapeHTML(r)}</span>`,
    ).join('');

    const scoreTip = UIHTMLRenderer._attrEsc(UIHTMLRenderer._tipBuild({
      title:    'Score ROI /10',
      subtitle: 'Mod\u00e8le continu — 5 crit\u00e8res',
      sections: [[
        { k: 'Rentabilit\u00e9 nette',   v: '0\u20136 pts', bold: true },
        { k: '\u2265 7\u00a0%',          v: '6 pts', indent: true },
        { k: '5\u20137\u00a0%',          v: '5\u20136', indent: true },
        { k: '4\u20135\u00a0%',          v: '3,5\u20135', indent: true },
        { k: '3\u20134\u00a0%',          v: '2,5\u20133,5', indent: true },
        { k: '< 2\u00a0%',              v: '\u2264 1,5 pts', indent: true },
        { sep: true },
        { k: 'Cashflow',              v: '0\u20132 pts', bold: true },
        { k: '\u2265 +500\u00a0\u20ac', v: '2 pts', indent: true },
        { k: '0\u2013+200\u00a0\u20ac', v: '0,8\u20131,4', indent: true },
        { k: '\u2212700 \u00e0 0',      v: '0\u20130,8', indent: true },
        { sep: true },
        { k: 'GRM',                   v: '0\u20131 pt', bold: true },
        { k: '\u2264 10\u00d7',        v: '1 pt', indent: true },
        { k: '10\u201320\u00d7',       v: '0,05\u20131', indent: true },
        { k: '> 20\u00d7',             v: '0 pt', indent: true },
        { sep: true },
        { k: 'DPE',                   v: 'malus', bold: true },
        { k: 'A/B/C/D',               v: '0', indent: true },
        { k: 'E',                     v: '\u22120,15', indent: true },
        { k: 'F',                     v: '\u22120,4', indent: true },
        { k: 'G ou inconnu',          v: '\u22120,8 / \u22120,2', indent: true },
        { sep: true },
        { k: 'Donn\u00e9es structur\u00e9es', v: '\u00b10,3 pt', bold: true },
        { k: 'TF + Copro extraites',  v: '+0,3', indent: true },
        { k: '1 manquante',           v: '\u22120,1', indent: true },
        { k: '2 manquantes',          v: '\u22120,3', indent: true },
      ], [
        { text: 'GO \u2265 7 \u00b7 ATTENTION 4\u20136,9 \u00b7 STOP < 4' },
      ]],
    }));

    return `
      <div style="padding:16px 20px;background:${cfg.bg};border-bottom:1px solid ${cfg.border};">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;gap:8px;flex-wrap:wrap;">
          <div style="display:flex;align-items:center;gap:12px;">
            <div style="width:44px;height:44px;border-radius:11px;background:${cfg.bar};display:flex;align-items:center;justify-content:center;flex-shrink:0;box-shadow:0 2px 8px rgba(0,0,0,0.15);">
              <span style="font-size:18px;font-weight:900;color:#fff;line-height:1;">${cfg.emoji}</span>
            </div>
            <div>
              <div style="font-size:20px;font-weight:900;color:${cfg.text};line-height:1;letter-spacing:-0.5px;">${signal}</div>
              <div style="font-size:11px;color:${cfg.text};opacity:0.65;margin-top:2px;font-weight:500;">Signal d'investissement</div>
            </div>
          </div>
          <div style="text-align:right;flex-shrink:0;">
            <span data-selopti-tip="${scoreTip}" style="font-size:28px;font-weight:900;color:${cfg.text};line-height:1;letter-spacing:-1px;cursor:help;text-decoration:underline dotted;text-underline-offset:3px;">${score}</span>
            <span style="font-size:14px;font-weight:500;color:${cfg.text};opacity:0.55;"> / 10</span>
          </div>
        </div>
        <div style="background:rgba(0,0,0,0.1);border-radius:999px;height:6px;margin-bottom:12px;overflow:hidden;">
          <div style="background:${cfg.bar};width:${barW}%;height:100%;border-radius:999px;"></div>
        </div>
        <div style="display:flex;flex-wrap:wrap;gap:5px;">${chips}</div>
      </div>`;
  }

  static _renderKPIGrid(roiScore) {
    if (!roiScore) return '';
    const { kpis, amortissement_annuel_estime: amort, resultat_fiscal_estime: resFiscal,
            structure_detectee: structure, charges_detail: cd, amort_detail: ad, fiscal_detail: fd } = roiScore;

    const cfPos  = kpis.cashflow_mensuel >= 0;
    const cfWarn = !cfPos && kpis.cashflow_mensuel >= -500;
    const cfVal  = `${cfPos ? '+' : ''}${this._fmt(kpis.cashflow_mensuel)}`;
    let cfAccent;
    let cfBg;
    let cfBorder;
    if (cfPos) {
      cfAccent = '#15803d';
      cfBg = '#f0fdf4';
      cfBorder = '#bbf7d0';
    } else if (cfWarn) {
      cfAccent = '#d97706';
      cfBg = '#fffbeb';
      cfBorder = '#fde68a';
    } else {
      cfAccent = '#dc2626';
      cfBg = '#fef2f2';
      cfBorder = '#fecaca';
    }

    // -- Dynamic tooltips built from detail objects ------------------------
    const f   = UIHTMLRenderer._fmt.bind(UIHTMLRenderer);
    const B   = UIHTMLRenderer._tipBuild.bind(UIHTMLRenderer);
    const esc = UIHTMLRenderer._attrEsc.bind(UIHTMLRenderer);

    // Helper: build the charge sub-rows (indent level)
    const chargeRows = (unit, mult) => {
      if (!cd) return [];
      const u = unit === 'm' ? '/m' : '/an';
      const m = mult;
      const rows = [
        { k: 'Extraites (copro, TF\u2026)', v: `${f(cd.extraites * m)}${u}`, indent: true },
        { k: 'PNO [est.]',                 v: `${f(cd.pno       * m)}${u}`, indent: true },
        { k: 'Entretien [est.]',           v: `${f(cd.entretien * m)}${u}`, indent: true },
        { k: 'Vacance [est.]',             v: `${f(cd.vacance   * m)}${u}`, indent: true },
      ];
      if (cd.tf_estimee    > 0) rows.push({ k: 'TF [est.]',    v: `${f(cd.tf_estimee    * m)}${u}`, indent: true });
      if (cd.copro_estimee > 0) rows.push({ k: 'Copro [est.]', v: `${f(cd.copro_estimee * m)}${u}`, indent: true });
      return rows;
    };

    const notairePct = cd ? Math.round(cd.frais_notaire / (cd.prix_bien || 1) * 100) : 0;
    const cfSign     = kpis.cashflow_mensuel >= 0 ? '+' : '';

    const tipBrute = esc(B({
      title:    'Rentabilit\u00e9 Brute',
      subtitle: 'Loyers annuels \u00f7 Prix total acquisition',
      sections: [cd ? [
        { k: 'Loyer', v: `${f(cd.loyer)}/m \u00d7 12` },
        { k: 'Loyers bruts', v: `${f(kpis.loyers_annuels_bruts)}/an`, bold: true },
        { sep: true },
        { k: 'Prix du bien', v: f(cd.prix_bien) },
        { k: `Frais de notaire (${notairePct}\u00a0%)`, v: f(cd.frais_notaire) },
        { k: '= Prix total acq.', v: f(cd.prix_total), bold: true },
        { sep: true },
        { k: 'Rentabilit\u00e9 brute', v: `${kpis.rentabilite_brute_pct?.toFixed(1)}\u00a0%`, bold: true },
      ] : [{ k: 'Rentabilit\u00e9 brute', v: `${kpis.rentabilite_brute_pct?.toFixed(1)}\u00a0%`, bold: true }]],
      footer: '< 4\u00a0% \u26a0 \u00b7 4\u20136\u00a0% \u2713 \u00b7 > 6\u00a0% \u2605',
    }));

    const tipNette = esc(B({
      title:    'Rentabilit\u00e9 Nette',
      subtitle: '(Loyers \u2212 Charges) \u00f7 Prix acq. \u00b7 Hors cr\u00e9dit',
      sections: [cd ? [
        { k: 'Loyers bruts', v: `${f(kpis.loyers_annuels_bruts)}/an` },
        { sep: true },
        { k: 'Charges totales', v: `\u2212 ${f(cd.total * 12)}/an` },
        ...chargeRows('an', 12),
        { sep: true },
        { k: 'Rentabilit\u00e9 nette', v: `${kpis.rentabilite_nette_pct?.toFixed(1)}\u00a0%`, bold: true },
      ] : [{ k: 'Rentabilit\u00e9 nette', v: `${kpis.rentabilite_nette_pct?.toFixed(1)}\u00a0%`, bold: true }]],
      footer: 'Objectif min. 3\u00a0% \u00b7 Bon \u2265 4\u00a0%',
    }));

    const tipCf = esc(B({
      title:    'Cashflow mensuel',
      subtitle: 'Loyer \u2212 Charges \u2212 Cr\u00e9dit',
      sections: [cd ? [
        { k: 'Loyer', v: `${f(cd.loyer)}/m` },
        { sep: true },
        { k: 'Charges totales', v: `\u2212 ${f(cd.total)}/m` },
        ...chargeRows('m', 1),
        { sep: true },
        { k: 'Cr\u00e9dit', v: `\u2212 ${f(cd.credit)}/m` },
        { sep: true },
        { k: '= Cashflow', v: `${cfSign}${f(kpis.cashflow_mensuel)}/m`, bold: true },
      ] : [{ k: '= Cashflow', v: `${cfSign}${f(kpis.cashflow_mensuel)}/m`, bold: true }]],
      footer: '> 0\u00a0\u20ac \u2192 autofinanci\u00e9 \u00b7 < 0\u00a0\u20ac \u2192 effort d\u2019\u00e9pargne',
    }));

    const tipGrm = esc(B({
      title:    'Gross Rent Multiplier',
      subtitle: 'Prix acq. \u00f7 Loyers annuels bruts',
      sections: [cd ? [
        { k: 'Prix acq.', v: f(cd.prix_total) },
        { k: 'Loyers/an', v: f(kpis.loyers_annuels_bruts) },
        { sep: true },
        { k: '= GRM', v: `${kpis.grm?.toFixed(1)}\u00d7`, bold: true },
      ] : [{ k: 'GRM', v: `${kpis.grm?.toFixed(1)}\u00d7`, bold: true }]],
      footer: '< 15 excellent \u00b7 15\u201320 correct \u00b7 > 20 \u26a0',
    }));

    const tipAmort = ad ? esc(B({
      title:    'Amortissement LMNP',
      subtitle: 'D\u00e9duction comptable annuelle \u00b7 r\u00e9gime r\u00e9el',
      sections: [[
        { k: 'Prix du bien', v: f(ad.prix_bien) },
        { k: `Terrain (${Math.round(ad.terrain_pct * 100)}\u00a0%)`, v: `\u2212 ${f(ad.terrain)}` },
        { k: '= Base amortissable', v: f(ad.base), bold: true },
        { sep: true },
        { k: 'Structure (60\u00a0%, 50\u00a0ans)',    v: `${f(ad.structure)}/an`,     indent: true },
        { k: 'Toiture (10\u00a0%, 25\u00a0ans)',      v: `${f(ad.toiture)}/an`,       indent: true },
        { k: 'Fa\u00e7ade (5\u00a0%, 25\u00a0ans)',   v: `${f(ad.facade)}/an`,        indent: true },
        { k: 'Installations (15\u00a0%, 15\u00a0ans)',v: `${f(ad.installations)}/an`, indent: true },
        { k: 'Mobilier (10\u00a0%, 7\u00a0ans)',      v: `${f(ad.mobilier)}/an`,      indent: true },
        { sep: true },
        { k: '= Total amortissement', v: `${f(ad.total)}/an`, bold: true },
      ]],
      footer: 'R\u00e9duit ou supprime l\u2019imposition des loyers LMNP.',
    })) : null;

    const fiscalSign   = fd?.resultat >= 0 ? '+' : '';
    const fiscalFooter = fd?.resultat < 0 ? 'D\u00e9ficit \u2192 reportable, imp\u00f4t = 0\u00a0\u20ac.' : 'B\u00e9n\u00e9fice imposable.';
    const tipFiscal = fd ? esc(B({
      title:    'R\u00e9sultat Fiscal LMNP',
      subtitle: 'Loyers effectifs \u2212 Charges \u2212 Amortissements',
      sections: [[
        { k: `Loyers (${fd.mois_loues}\u00a0mois lou\u00e9s)`, v: `${f(fd.loyers_effectifs)}/an` },
        { k: 'Charges totales',  v: `\u2212 ${f(fd.charges_annuelles)}/an` },
        { k: 'Amortissements',   v: `\u2212 ${f(fd.amortissement)}/an` },
        { sep: true },
        { k: '= R\u00e9sultat fiscal', v: `${fiscalSign}${f(fd.resultat)}/an`, bold: true },
      ]],
      footer: fiscalFooter,
    })) : null;

    const cards = [
      this._kpiCard({
        label: 'Rentabilité Brute',
        value: this._pct(kpis.rentabilite_brute_pct),
        sub:   `Prix acq. ${this._fmt(kpis.prix_total_acquisition)}`,
        tip:   tipBrute,
        accent:     kpis.rentabilite_brute_pct >= 4 ? '#15803d' : '#dc2626',
        bgCard:     kpis.rentabilite_brute_pct >= 4 ? '#f0fdf4' : '#fef2f2',
        borderCard: kpis.rentabilite_brute_pct >= 4 ? '#bbf7d0' : '#fecaca',
      }),
      this._kpiCard({
        label: 'Rentabilité Nette',
        value: this._pct(kpis.rentabilite_nette_pct),
        sub:   `Loyers ${this._fmt(kpis.loyers_annuels_bruts)}/an`,
        tip:   tipNette,
        accent:     kpis.rentabilite_nette_pct >= 3 ? '#15803d' : '#dc2626',
        bgCard:     kpis.rentabilite_nette_pct >= 3 ? '#f0fdf4' : '#fef2f2',
        borderCard: kpis.rentabilite_nette_pct >= 3 ? '#bbf7d0' : '#fecaca',
      }),
      this._kpiCard({
        label: 'Cashflow',
        value: `${cfVal} <span style="font-size:11px;font-weight:500;opacity:0.55;">/m</span>`,
        sub:   cfPos ? 'Autofinancé ✓' : `Effort épargne ${this._fmt(kpis.effort_epargne_mensuel)}/m`,
        tip:   tipCf,
        accent:     cfAccent,
        bgCard:     cfBg,
        borderCard: cfBorder,
      }),
      this._kpiCard({
        label: 'GRM',
        value: `${kpis.grm}×`,
        sub:   'Gross Rent Multiplier',
        tip:   tipGrm,
        accent:     kpis.grm <= 20 ? '#0f172a' : '#dc2626',
        bgCard:     kpis.grm <= 20 ? '#f8fafc' : '#fef2f2',
        borderCard: kpis.grm <= 20 ? '#e2e8f0' : '#fecaca',
      }),
    ];

    if (structure === 'LMNP' && amort !== null) {
      cards.push(this._kpiCard({
        label: 'Amortissement LMNP',
        value: `${this._fmt(amort)}/an`,
        sub:   '5 composants décomposés',
        tip:   tipAmort ?? '',
        accent: '#7c3aed', bgCard: '#faf5ff', borderCard: '#ddd6fe',
      }));
    }
    if (structure === 'LMNP' && resFiscal !== null) {
      cards.push(this._kpiCard({
        label: 'Résultat Fiscal',
        value: `${resFiscal >= 0 ? '+' : ''}${this._fmt(resFiscal)}/an`,
        sub:   resFiscal < 0 ? 'Déficit LMNP → Impôt = 0 €' : 'Bénéfice imposable',
        tip:   tipFiscal ?? '',
        accent:     resFiscal < 0 ? '#15803d' : '#0f172a',
        bgCard:     resFiscal < 0 ? '#f0fdf4' : '#f8fafc',
        borderCard: resFiscal < 0 ? '#bbf7d0' : '#e2e8f0',
      }));
    }

    return `
      <div style="padding:16px 20px 0;display:grid;grid-template-columns:repeat(2,1fr);gap:10px;">
        ${cards.join('')}
      </div>`;
  }

  static _renderLoanRow(simulations, classic, coloc) {
    if (!classic) return '';
    const loanDetails = simulations?.loanDetails || {};
    const bestRent    = coloc?.monthlyRent ?? classic.monthlyRent;
    const fmtRate     = loanDetails.rate ? `${(loanDetails.rate * 100).toFixed(2)} %` : '—';

    return `
      <div style="padding:12px 20px 0;display:grid;grid-template-columns:1fr 1fr;gap:10px;">
        <div style="background:#eff6ff;border-radius:12px;padding:12px 16px;border:1px solid #bfdbfe;">
          <div style="font-size:10px;font-weight:700;color:#3b82f6;text-transform:uppercase;letter-spacing:0.6px;margin-bottom:5px;">${coloc ? 'Loyer (coloc)' : 'Loyer estimé'}</div>
          <div style="font-size:20px;font-weight:800;color:#1e40af;line-height:1;">${this._fmt(bestRent)}<span style="font-size:11px;font-weight:500;color:#60a5fa;">/m</span></div>
          <div style="font-size:10px;color:#93c5fd;margin-top:3px;">${this._fmt(bestRent * 12)}/an</div>
        </div>
        <div style="background:#faf5ff;border-radius:12px;padding:12px 16px;border:1px solid #e9d5ff;">
          <div style="font-size:10px;font-weight:700;color:#8b5cf6;text-transform:uppercase;letter-spacing:0.6px;margin-bottom:5px;">Mensualité crédit</div>
          <div style="font-size:20px;font-weight:800;color:#5b21b6;line-height:1;">${this._fmt(classic.monthlyMortgage)}<span style="font-size:11px;font-weight:500;color:#a78bfa;">/m</span></div>
          <div style="font-size:10px;color:#c4b5fd;margin-top:3px;">${loanDetails.durationYears ?? '?'} ans · ${fmtRate}</div>
        </div>
      </div>`;
  }

  static _renderScenario(scenario, title, opts) {
    if (!scenario) return '';
    const { colorAccent, colorBg, colorBorder, colorBadge, badgeText } = opts;
    const cfPos = scenario.netCashflowMonthly >= 0;
    const cfStyle = {
      bg:        cfPos ? '#f0fdf4' : '#fef2f2',
      border:    cfPos ? '#bbf7d0' : '#fecaca',
      textLabel: cfPos ? '#166534' : '#991b1b',
      textValue: cfPos ? '#14532d' : '#7f1d1d',
    };

    return `
      <div style="background:#fff;border-radius:12px;border:1px solid ${colorBorder};overflow:hidden;">
        <div style="display:flex;justify-content:space-between;align-items:center;padding:10px 14px;background:${colorBg};border-bottom:1px solid ${colorBorder};">
          <div style="font-size:12px;font-weight:700;color:${colorAccent};">${title}</div>
          ${badgeText ? `<span style="font-size:10px;font-weight:700;color:#fff;background:${colorBadge};padding:2px 8px;border-radius:999px;">${badgeText}</span>` : ''}
        </div>
        <div style="padding:10px;display:flex;flex-direction:column;gap:6px;">
          ${this._scenarioRow(
            'Cashflow mensuel net',
            `${scenario.netCashflowMonthly >= 0 ? '+' : ''}${this._fmt(scenario.netCashflowMonthly)}/m`,
            cfStyle,
          )}
          ${this._scenarioRow(
            'Rentabilité Brute',
            this._pct(scenario.rentabilityBrute),
            { bg: '#eff6ff', border: '#bfdbfe', textLabel: '#2563eb', textValue: '#1e3a8a' },
          )}
          ${this._scenarioRow(
            'Rentabilité Nette charges',
            this._pct(scenario.rentabilityNette),
            { bg: '#f0fdf4', border: '#bbf7d0', textLabel: '#16a34a', textValue: '#14532d' },
          )}
        </div>
      </div>`;
  }

  static _renderDataQualityBanner(roiScore) {
    if (!roiScore) return '';
    const estimatedCount = (roiScore.hypotheses ?? []).filter(h => h.startsWith('[ESTIMÉ]')).length;
    if (estimatedCount < 4) return '';

    // Extract short labels from hypotheses for display
    const labels = (roiScore.hypotheses ?? [])
      .filter(h => h.startsWith('[ESTIMÉ]'))
      .map(h => {
        const raw = h.replace(/^\[ESTIMÉ\]\s*/, '').split(':')[0].trim();
        return `<span style="display:inline-flex;align-items:center;font-size:10px;font-weight:600;color:#92400e;background:rgba(0,0,0,0.06);padding:1px 7px;border-radius:999px;white-space:nowrap;">${this.escapeHTML(raw)}</span>`;
      })
      .join('');

    return `
      <div style="padding:11px 20px;background:#fffbeb;border-bottom:1px solid #fcd34d;display:flex;align-items:flex-start;gap:10px;">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#d97706" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0;margin-top:2px;"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
        <div>
          <div style="font-size:12px;font-weight:700;color:#92400e;margin-bottom:5px;">${estimatedCount} données estimées — analyse indicative, vérifiez avant d’investir</div>
          <div style="display:flex;flex-wrap:wrap;gap:3px;">${labels}</div>
        </div>
      </div>`;
  }

  static _renderBreakEven(roiScore) {
    const be = roiScore?.break_even;
    if (!be) return '';

    const { chambres_min_coloc: chMin, chambres_total_coloc: chMax, mois_min_classique: mMin } = be;
    const hasColoc   = chMin !== null && chMax !== null;
    const hasClassic = mMin !== null;
    if (!hasColoc && !hasClassic) return '';

    const barStyle = (fill, color, bg) =>
      `<div style="background:${bg};border-radius:999px;height:7px;overflow:hidden;margin-top:8px;">
        <div style="background:${color};width:${fill}%;height:100%;border-radius:999px;transition:width .4s ease;"></div>
      </div>`;

    const colocCard = hasColoc ? (() => {
      const pct  = Math.min(100, (chMin / chMax) * 100);
      const ok   = chMin <= chMax;
      const col  = ok ? '#7c3aed' : '#dc2626';
      const bg   = ok ? '#faf5ff' : '#fef2f2';
      const bdr  = ok ? '#ddd6fe' : '#fecaca';
      const dots = Array.from({ length: chMax }, (_, i) => {
        const filled = i < chMin;
        return `<div style="width:16px;height:16px;border-radius:4px;background:${filled ? col : '#e2e8f0'};flex-shrink:0;"></div>`;
      }).join('');
      return `
        <div style="background:${bg};border:1px solid ${bdr};border-radius:12px;padding:14px 16px;min-width:0;">
          <div style="font-size:10px;font-weight:700;color:${col};text-transform:uppercase;letter-spacing:0.6px;margin-bottom:10px;">Seuil colocation</div>
          <div style="font-size:22px;font-weight:900;color:${col};line-height:1;">
            ${chMin}<span style="font-size:13px;font-weight:600;opacity:0.6;"> / ${chMax} ch.</span>
          </div>
          <div style="font-size:11px;color:#64748b;margin-top:4px;">chambres min. pour couvrir les charges</div>
          <div style="display:flex;gap:4px;flex-wrap:wrap;margin-top:10px;">${dots}</div>
          ${barStyle(pct, col, '#e2e8f0')}
        </div>`;
    })() : '';

    const classicCard = hasClassic ? (() => {
      const pct   = Math.min(100, (mMin / 12) * 100);
      const ok    = mMin <= 10;
      const tight = !ok && mMin <= 12;
      let col, bg, bdr;
      if (ok)         { col = '#0369a1'; bg = '#f0f9ff'; bdr = '#bae6fd'; }
      else if (tight) { col = '#d97706'; bg = '#fffbeb'; bdr = '#fde68a'; }
      else            { col = '#dc2626'; bg = '#fef2f2'; bdr = '#fecaca'; }
      const mDisp = mMin >= 12 ? '≥ 12' : String(mMin);
      return `
        <div style="background:${bg};border:1px solid ${bdr};border-radius:12px;padding:14px 16px;min-width:0;">
          <div style="font-size:10px;font-weight:700;color:${col};text-transform:uppercase;letter-spacing:0.6px;margin-bottom:10px;">Seuil location classique</div>
          <div style="font-size:22px;font-weight:900;color:${col};line-height:1;">
            ${mDisp}<span style="font-size:13px;font-weight:600;opacity:0.6;"> / 12 mois</span>
          </div>
          <div style="font-size:11px;color:#64748b;margin-top:4px;">mois de location min. pour couvrir les charges</div>
          ${barStyle(pct, col, '#e2e8f0')}
        </div>`;
    })() : '';

    return `
      <div style="padding:14px 20px 0;">
        <div style="font-size:10px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:0.7px;margin-bottom:8px;">Seuils de rentabilité</div>
        <div style="display:grid;grid-template-columns:${hasColoc && hasClassic ? '1fr 1fr' : '1fr'};gap:10px;">
          ${colocCard}
          ${classicCard}
        </div>
      </div>`;
  }

  static _renderFlags(flags) {
    if (!flags || flags.length === 0) return '';
    return `
      <div style="padding:14px 20px 0;">
        <div style="font-size:10px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:0.7px;margin-bottom:8px;">Alertes &amp; Observations</div>
        <div style="display:flex;flex-direction:column;gap:5px;">
          ${flags.map(f => this._flagChip(f)).join('')}
        </div>
      </div>`;
  }

  static _renderPriceTrendSection(points) {
    if (!points || points.length < 1) return '';
    const first    = points[0].price;
    const last     = points.at(-1).price;
    const delta    = last - first;
    const deltaPct = first > 0 ? (delta / first) * 100 : 0;
    const col      = delta >= 0 ? '#16a34a' : '#dc2626';
    const sign     = delta >= 0 ? '+' : '';
    const hasChange = points.length >= 2;

    return `
      <div style="margin:14px 20px 0;border-radius:12px;border:1px solid #e2e8f0;overflow:hidden;">
        <div style="padding:11px 16px;background:#f8fafc;border-bottom:1px solid #e2e8f0;display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap;">
          <span style="font-size:13px;font-weight:600;color:#334155;display:flex;align-items:center;gap:7px;">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#64748b" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
            Évolution du prix
          </span>
          ${hasChange
            ? `<span style="font-size:11px;font-weight:700;color:${col};">${sign}${this._fmt(delta)} (${sign}${deltaPct.toFixed(1)} %)</span>`
            : `<span style="font-size:11px;color:#94a3b8;">1 point</span>`
          }
        </div>
        <div style="padding:12px 16px;">
          ${this._buildSparkline(points)}
          <div style="display:flex;justify-content:space-between;margin-top:8px;font-size:11px;">
            <span style="color:#94a3b8;">${this._fmt(first)}</span>
            <span style="font-weight:700;color:${col};">${this._fmt(last)}</span>
          </div>
        </div>
      </div>`;
  }

  static _renderDetailsSection(data, averageRentM2) {
    const classic    = data.simulations?.classic;
    const coloc      = data.simulations?.collocation;
    const loanDetails = data.simulations?.loanDetails || {};
    const roi         = data.roiScore;

    const li = (label, val) => {
      const v = String(val ?? 'N/A');
      const isEst = v.startsWith('[ESTIMÉ]');
      const display = isEst ? v.replace(/^\[ESTIMÉ\]\s*/, '') : v;
      const badge = isEst
        ? ` <span style="display:inline-flex;font-size:9px;font-weight:700;padding:1px 5px;border-radius:4px;background:#fef3c7;color:#92400e;border:1px solid #fcd34d;vertical-align:middle;">estimé</span>`
        : '';
      return `<li style="padding:2px 0;"><strong>${this.escapeHTML(label)} :</strong> ${this.escapeHTML(display)}${badge}</li>`;
    };

    const paramItems = [
      li('Prix affiché', this._fmt(loanDetails.propertyPrice ?? 0)),
      roi && li('Prix total acquisition (notaire incl.)', this._fmt(roi.kpis.prix_total_acquisition)),
      li('Apport (20 %)', this._fmt(loanDetails.downPayment ?? 0)),
      li('Montant du prêt', this._fmt(loanDetails.loanAmount ?? 0)),
      classic && li('Charges parsées mensuelles', this._fmt(classic.monthlyFrais ?? 0)),
      averageRentM2 && li('Loyer moyen zone', `${averageRentM2} €/m²`),
      coloc && li('Prix par chambre (coloc)', this._fmt(coloc.roomPrice ?? 0)),
    ].filter(Boolean).join('');

    const hypothesesItems = (roi?.hypotheses ?? []).map(h => {
      const isEst = h.startsWith('[ESTIMÉ]');
      return `<li style="padding:2px 0;color:${isEst ? '#d97706' : '#475569'};">${this.escapeHTML(h)}</li>`;
    }).join('');

    const chargesItems = (data.priceInfo ?? []).map(([l, v]) => li(l, v)).join('');
    const energyItems  = (data.energy ?? []).map(([l, v]) => li(l, v)).join('');

    const ul  = `margin:0 0 14px 0;padding-left:18px;font-size:12px;color:#475569;line-height:1.8;`;
    const h5  = `margin:0 0 6px 0;font-size:11px;font-weight:700;color:#334155;text-transform:uppercase;letter-spacing:0.6px;`;

    return `
      <div style="margin:14px 20px 20px;border-radius:12px;overflow:hidden;border:1px solid #e2e8f0;">
        <details>
          <summary style="padding:12px 16px;cursor:pointer;list-style:none;display:flex;justify-content:space-between;align-items:center;background:#f8fafc;user-select:none;">
            <span style="font-size:13px;font-weight:600;color:#334155;display:flex;align-items:center;gap:7px;">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#64748b" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
              Détails &amp; Hypothèses
            </span>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
          </summary>
          <div style="padding:14px 16px;border-top:1px solid #e2e8f0;">
            ${paramItems     ? `<h5 style="${h5}">Paramètres de calcul</h5><ul style="${ul}">${paramItems}</ul>` : ''}
            ${hypothesesItems ? `<h5 style="${h5}">Hypothèses <span style="color:#f59e0b;">[ESTIMÉ]</span></h5><ul style="${ul}">${hypothesesItems}</ul>` : ''}
            ${chargesItems   ? `<h5 style="${h5}">Charges &amp; Taxes extraites</h5><ul style="${ul}">${chargesItems}</ul>` : ''}
            ${energyItems    ? `<h5 style="${h5}">Énergie &amp; DPE</h5><ul style="${ul}">${energyItems}</ul>` : ''}
            ${data.georisques ? `<h5 style="${h5}">Risques (Géorisques)</h5>${this.formatGeorisques(data.georisques)}` : ''}
          </div>
        </details>
      </div>`;
  }

  // ─────────────────────────────────────────────────────────────────────────
  //  Loading skeleton
  // ─────────────────────────────────────────────────────────────────────────

  static renderLoadingHTML() {
    const anim = `background:linear-gradient(90deg,#e2e8f0 0%,#f8fafc 45%,#e2e8f0 100%);background-size:200% 100%;animation:selopti-shimmer 1.4s ease-in-out infinite;`;
    const blk  = (h, w = '100%', r = '8px') =>
      `<div style="height:${h};width:${w};border-radius:${r};${anim}"></div>`;

    return `
      <div class="selopti-container selopti-loading" style="font-family:'Inter',system-ui,sans-serif;background:#fff;border-radius:16px;padding:0;margin-top:16px;box-shadow:0 4px 24px rgba(0,0,0,0.06);border:1px solid #e2e8f0;color:#0f172a;width:100%;box-sizing:border-box;overflow:hidden;position:relative;z-index:20;">
        <style>
          @keyframes selopti-shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}
          details>summary::-webkit-details-marker{display:none}
          details>summary::marker{display:none}
        </style>
        <div style="padding:14px 20px 12px;display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid #f1f5f9;">
          <div style="display:flex;align-items:center;gap:10px;">
            <div style="width:32px;height:32px;border-radius:9px;${anim}flex-shrink:0;"></div>
            <div style="display:flex;flex-direction:column;gap:6px;">${blk('14px','110px')}${blk('10px','60px','999px')}</div>
          </div>
          <div style="display:flex;flex-direction:column;gap:4px;align-items:flex-end;">${blk('18px','120px','999px')}${blk('18px','90px','999px')}</div>
        </div>
        <div style="padding:16px 20px;background:#f8fafc;border-bottom:1px solid #e2e8f0;">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;">
            <div style="display:flex;align-items:center;gap:12px;">
              <div style="width:44px;height:44px;border-radius:11px;${anim}flex-shrink:0;"></div>
              <div style="display:flex;flex-direction:column;gap:6px;">${blk('18px','55px')}${blk('11px','110px','999px')}</div>
            </div>
            ${blk('26px','55px','6px')}
          </div>
          ${blk('6px','100%','999px')}
          <div style="margin-top:12px;display:flex;gap:6px;">${blk('22px','110px','999px')}${blk('22px','140px','999px')}</div>
        </div>
        <div style="padding:16px 20px 0;display:grid;grid-template-columns:1fr 1fr;gap:10px;">
          ${[0,1,2,3].map(() => `
            <div style="background:#f8fafc;border-radius:12px;padding:13px 14px;border:1px solid #e2e8f0;display:flex;flex-direction:column;gap:8px;">
              ${blk('10px','65%','999px')}${blk('20px','80%','6px')}${blk('10px','55%','999px')}
            </div>`).join('')}
        </div>
        <div style="padding:12px 20px 0;display:grid;grid-template-columns:1fr 1fr;gap:10px;">
          <div style="background:#f8fafc;border-radius:12px;padding:12px 16px;border:1px solid #e2e8f0;display:flex;flex-direction:column;gap:6px;">${blk('10px','55px','999px')}${blk('20px','75%','6px')}</div>
          <div style="background:#f8fafc;border-radius:12px;padding:12px 16px;border:1px solid #e2e8f0;display:flex;flex-direction:column;gap:6px;">${blk('10px','75px','999px')}${blk('20px','75%','6px')}</div>
        </div>
        <div style="padding:16px 20px;display:flex;flex-direction:column;gap:12px;">
          <div style="border-radius:12px;border:1px solid #e2e8f0;overflow:hidden;">
            <div style="padding:10px 14px;background:#f8fafc;border-bottom:1px solid #e2e8f0;">${blk('12px','110px')}</div>
            <div style="padding:10px;display:flex;flex-direction:column;gap:6px;">
              ${[0,1,2].map(() => blk('34px','100%','9px')).join('')}
            </div>
          </div>
        </div>
      </div>`;
  }

  // ─────────────────────────────────────────────────────────────────────────
  //  Main render
  // ─────────────────────────────────────────────────────────────────────────

  static renderDetailsHTML(data, averageRentM2) {
    const classic  = data.simulations?.classic;
    const coloc    = data.simulations?.collocation;
    const roiScore = data.roiScore;
    const history  = Array.isArray(data.priceHistory?.history) ? data.priceHistory.history : [];

    if (!classic) return '';

    const pricePoints = history
      .filter(i => Number.isFinite(Number(i?.price)) && Number(i.price) > 0)
      .slice(-24)
      .map(i => ({ price: Number(i.price), capturedAt: i.capturedAt ?? null }));

    const scenarioClassic = this._renderScenario(classic, 'Location Classique', {
      colorAccent: '#1e40af',
      colorBg:     '#eff6ff',
      colorBorder: '#bfdbfe',
      colorBadge:  '#3b82f6',
      badgeText:   null,
    });

    const scenarioColoc = coloc
      ? this._renderScenario(coloc, `Colocation — ${coloc.params?.bedrooms ?? '?'} chambres`, {
          colorAccent: '#5b21b6',
          colorBg:     '#faf5ff',
          colorBorder: '#ddd6fe',
          colorBadge:  '#8b5cf6',
          badgeText:   coloc.roomPrice ? `${this._fmt(coloc.roomPrice)}/ch` : null,
        })
      : '';

    return `
      <div class="selopti-container" style="font-family:'Inter',system-ui,sans-serif;background:#fff;border-radius:16px;padding:0;margin-top:16px;box-shadow:0 4px 24px rgba(0,0,0,0.07);border:1px solid #e2e8f0;color:#0f172a;width:100%;box-sizing:border-box;overflow:hidden;position:relative;z-index:20;">
        <style>
          details>summary::-webkit-details-marker{display:none}
          details>summary::marker{display:none}
        </style>

        ${this._renderHeader(data)}
        ${roiScore ? this._renderVerdict(roiScore)         : ''}
        ${roiScore ? this._renderDataQualityBanner(roiScore) : ''}
        ${roiScore ? this._renderKPIGrid(roiScore)         : ''}
        ${this._renderLoanRow(data.simulations, classic, coloc)}

        <div style="padding:16px 20px 0;display:flex;flex-direction:column;gap:12px;">
          ${scenarioClassic}
          ${scenarioColoc}
        </div>

        ${roiScore ? this._renderBreakEven(roiScore)      : ''}
        ${roiScore ? this._renderFlags(roiScore.flags) : ''}
        ${this._renderPriceTrendSection(pricePoints)}
        ${this._renderDetailsSection(data, averageRentM2)}
      </div>`;
  }

  // ─────────────────────────────────────────────────────────────────────────
  //  Utilities
  // ─────────────────────────────────────────────────────────────────────────

  /** @deprecated kept for external callers. */
  static renderPriceTrend(history, _formatCurr) {
    const points = (Array.isArray(history) ? history : [])
      .filter(i => Number.isFinite(Number(i?.price)) && Number(i.price) > 0)
      .slice(-24)
      .map(i => ({ price: Number(i.price), capturedAt: i.capturedAt ?? null }));
    return this._renderPriceTrendSection(points);
  }

  static formatGeorisques(georisques) {
    if (!georisques || Object.keys(georisques).length === 0) return '<div>Aucun risque identifié.</div>';
    let html = '<div style="background:#f8fafc;padding:12px;border-radius:8px;border:1px solid #e2e8f0;font-size:12px;overflow-x:auto;">';
    for (const [key, val] of Object.entries(georisques)) {
      if (Array.isArray(val)) {
        const children = val.map(v => Array.isArray(v) ? v[0] : v);
        const filtered = children.filter(c => c?.toLowerCase() !== key.toLowerCase());
        if (filtered.length === 0) {
          html += `<div style="margin-bottom:6px;"><strong>${this.escapeHTML(key)}</strong></div>`;
        } else {
          html += `<div style="margin-bottom:6px;"><strong>${this.escapeHTML(key)} :</strong>`;
          html += `<ul style="margin:4px 0 8px 0;padding-left:24px;color:#475569;list-style-type:disc;">`;
          filtered.forEach(c => { html += `<li>${this.escapeHTML(String(c))}</li>`; });
          html += `</ul></div>`;
        }
      } else {
        html += `<div style="margin-bottom:6px;"><strong>${this.escapeHTML(key)} :</strong> ${this.escapeHTML(typeof val === 'object' ? JSON.stringify(val) : String(val))}</div>`;
      }
    }
    html += '</div>';
    return html;
  }

  static _buildSparkline(points) {
    const W     = 560;
    const H     = 120;
    const min   = Math.min(...points.map(p => p.price));
    const max   = Math.max(...points.map(p => p.price));
    const range = Math.max(1, max - min);
    const stepX = points.length > 1 ? W / (points.length - 1) : W;

    const coords = points.map((p, i) => {
      const x = i * stepX;
      const y = H - ((p.price - min) / range) * H;
      return `${x.toFixed(2)},${y.toFixed(2)}`;
    });
    const line = points.length === 1
      ? `0,${(H / 2).toFixed(2)} ${W},${(H / 2).toFixed(2)}`
      : coords.join(' ');

    const fmtDate = d => d
      ? new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: 'short' }).format(new Date(d))
      : '';

    return `
      <div style="background:linear-gradient(180deg,#f8fafc,#fff);border:1px solid #e2e8f0;border-radius:10px;padding:10px;">
        <svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" style="width:100%;height:100px;display:block;">
          <polyline fill="none" stroke="#3b82f6" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round" points="${line}"/>
        </svg>
        <div style="display:flex;justify-content:space-between;margin-top:6px;color:#94a3b8;font-size:10px;">
          <span>${fmtDate(points[0]?.capturedAt)}</span>
          <span>${fmtDate(points.at(-1)?.capturedAt)}</span>
        </div>
      </div>`;
  }

  static escapeHTML(value) {
    return String(value)
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#39;');
  }
}
