export class UIHTMLRenderer {
  static renderLoadingHTML() {
    const shimmer = 'background: linear-gradient(90deg, #e2e8f0 0%, #f8fafc 45%, #e2e8f0 100%); background-size: 200% 100%; animation: selopti-skeleton-shimmer 1.4s ease-in-out infinite;';
    const block = (height, width = '100%', radius = '10px') => `
      <div style="height: ${height}; width: ${width}; border-radius: ${radius}; ${shimmer}"></div>
    `;

    return `
      <div class="selopti-container selopti-loading" style="font-family: 'Inter', system-ui, sans-serif; background: rgba(255, 255, 255, 0.95); backdrop-filter: blur(10px); border-radius: 16px; padding: 20px; margin-top: 16px; box-shadow: 0 10px 25px rgba(0,0,0,0.08), inset 0 1px 0 rgba(255,255,255,1); border: 1px solid rgba(0,0,0,0.05); color: #1e293b; width: 100%; box-sizing: border-box; overflow: hidden;">
        <style>
          @keyframes selopti-skeleton-shimmer {
            0% { background-position: 200% 0; }
            100% { background-position: -200% 0; }
          }
        </style>
        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px; flex-wrap: wrap; gap: 8px;">
          <div style="display: flex; align-items: center; gap: 12px;">
            <div style="width: 36px; height: 36px; border-radius: 10px; background: linear-gradient(135deg, #bfdbfe 0%, #93c5fd 100%);"></div>
            <div style="display: flex; flex-direction: column; gap: 8px; min-width: 180px;">
              ${block('18px', '150px', '8px')}
              ${block('12px', '110px', '999px')}
            </div>
          </div>
          <div style="display: flex; flex-direction: column; gap: 8px; min-width: 120px; align-items: flex-end; flex: 0 0 auto;">
            ${block('22px', '120px', '999px')}
            ${block('22px', '96px', '999px')}
          </div>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 24px;">
          <div style="background: #f8fafc; padding: 16px; border-radius: 12px; border: 1px solid #e2e8f0; display: flex; flex-direction: column; gap: 10px; min-width: 0;">
            ${block('12px', '92px', '999px')}
            ${block('24px', '140px', '10px')}
            ${block('11px', '90px', '8px')}
          </div>
          <div style="background: #f8fafc; padding: 16px; border-radius: 12px; border: 1px solid #e2e8f0; display: flex; flex-direction: column; gap: 10px; min-width: 0;">
            ${block('12px', '120px', '999px')}
            ${block('24px', '150px', '10px')}
            ${block('11px', '100px', '8px')}
          </div>
        </div>

        <div style="margin-bottom: 20px; background: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; padding: 16px; box-shadow: 0 2px 4px rgba(0,0,0,0.02); display: flex; flex-direction: column; gap: 12px;">
          <div style="display: flex; justify-content: space-between; align-items: center; gap: 8px; flex-wrap: wrap;">
            ${block('16px', '140px', '8px')}
            ${block('12px', '60px', '999px')}
          </div>
          ${block('120px', '100%', '10px')}
          <div style="display: flex; justify-content: space-between; gap: 12px; flex-wrap: wrap;">
            ${block('14px', '120px', '8px')}
            ${block('14px', '100px', '8px')}
          </div>
        </div>

        <div style="display: flex; flex-direction: column; gap: 16px;">
          <div style="background: #ffffff; border-radius: 12px; border: 1px solid #f1f5f9; padding: 16px; box-shadow: 0 2px 4px rgba(0,0,0,0.02); display: flex; flex-direction: column; gap: 10px;">
            ${block('16px', '150px', '8px')}
            ${block('44px', '100%', '10px')}
            ${block('44px', '100%', '10px')}
            ${block('44px', '100%', '10px')}
          </div>
          <div style="background: #ffffff; border-radius: 12px; border: 1px solid #f1f5f9; padding: 16px; box-shadow: 0 2px 4px rgba(0,0,0,0.02); display: flex; flex-direction: column; gap: 10px;">
            ${block('16px', '190px', '8px')}
            ${block('44px', '100%', '10px')}
            ${block('44px', '100%', '10px')}
          </div>
        </div>

        <div style="margin-top: 16px; border-top: 1px solid #e2e8f0; padding-top: 16px; display: grid; gap: 10px;">
          ${block('14px', '180px', '8px')}
          ${block('12px', '100%', '8px')}
          ${block('12px', '92%', '8px')}
          ${block('12px', '88%', '8px')}
          ${block('14px', '160px', '8px')}
          ${block('12px', '100%', '8px')}
          ${block('12px', '86%', '8px')}
        </div>
      </div>
    `;
  }

  static renderDetailsHTML(data, averageRentM2) {
    const classic = data.simulations?.classic;
    const coloc = data.simulations?.collocation;
    const rentEst = data.rentEstimate;
    const priceHistory = Array.isArray(data.priceHistory?.history)
      ? data.priceHistory.history
      : [];

    if (!classic) return '';

    const formatCurr = (val) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(val);
    const formatPct = (val) => new Intl.NumberFormat('fr-FR', { style: 'percent', minimumFractionDigits: 1, maximumFractionDigits: 2 }).format(val / 100);

    const formatDateInfo = (dateString) => {
      if (!dateString) return { dateStr: 'N/A', daysAgoStr: '', diffDays: null };
      try {
        const d = new Date(dateString);
        if (isNaN(d.getTime())) return { dateStr: dateString, daysAgoStr: '', diffDays: null };
        
        const dCopy = new Date(d);
        dCopy.setHours(0,0,0,0);
        const today = new Date();
        today.setHours(0,0,0,0);
        const diffTime = today - dCopy;
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        
        let daysAgoStr = '';
        if (diffDays === 0) daysAgoStr = "(Aujourd'hui)";
        else if (diffDays === 1) daysAgoStr = "(Hier)";
        else if (diffDays > 1) daysAgoStr = `(Il y a ${diffDays} jours)`;
        else if (diffDays < 0) daysAgoStr = `(Dans ${Math.abs(diffDays)} jours)`;

        const dateStr = new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }).format(d);
        return { dateStr, daysAgoStr, diffDays };
      } catch (e) {
        return { dateStr: dateString, daysAgoStr: '', diffDays: null };
      }
    };

    let createdInfo = { dateStr: 'N/A', daysAgoStr: '' };
    let updatedInfo = { dateStr: 'N/A', daysAgoStr: '' };
    if (data.timeMetadata) {
      data.timeMetadata.forEach(([label, value]) => {
        if (label === 'Date de création') createdInfo = formatDateInfo(value);
        if (label === 'Date de mise à jour') updatedInfo = formatDateInfo(value);
      });
    }

    const isMarketOld = createdInfo.diffDays != null && createdInfo.diffDays >= 180;
    const marketBadge = createdInfo.dateStr !== 'N/A' ? `
      <span style="background: ${isMarketOld ? '#fff7ed' : '#ecfdf5'}; color: ${isMarketOld ? '#c2410c' : '#166534'}; padding: 4px 8px; border-radius: 999px; font-size: 11px; font-weight: 700; display: inline-flex; align-items: center; gap: 4px; border: 1px solid ${isMarketOld ? '#fdba74' : '#86efac'}; line-height: 1;">
        ${isMarketOld ? 'Marché > 6 mois' : 'Marché récent'}
      </span>` : '';

    //return `<pre style="white-space: pre-wrap; word-break: break-word; background: #f8fafc; padding: 12px; border-radius: 8px; border: 1px solid #e2e8f0;">${this.escapeHTML(JSON.stringify(data, null, 2))}</pre>`;

    return `
      <div class="selopti-container" style="font-family: 'Inter', system-ui, sans-serif; background: rgba(255, 255, 255, 0.95); backdrop-filter: blur(10px); border-radius: 16px; padding: 20px; margin-top: 16px; box-shadow: 0 10px 25px rgba(0,0,0,0.08), inset 0 1px 0 rgba(255,255,255,1); border: 1px solid rgba(0,0,0,0.05); color: #1e293b; transition: transform 0.2s ease, box-shadow 0.2s ease; width: 100%; box-sizing: border-box;">
        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px; flex-wrap: wrap; gap: 8px;">
          <div style="display: flex; align-items: center;">
            <div style="background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); width: 36px; height: 36px; border-radius: 10px; display: flex; align-items: center; justify-content: center; margin-right: 12px; box-shadow: 0 4px 10px rgba(37, 99, 235, 0.3);">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>
            </div>
            <h3 style="margin: 0; font-size: 20px; font-weight: 700; background: linear-gradient(to right, #1e293b, #334155); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">Selopti Insights</h3>
          </div>
          
          <div style="display: flex; flex-direction: column; gap: 6px; align-items: flex-end;">
            ${marketBadge}
            ${createdInfo.dateStr !== 'N/A' ? `
            <span style="background: #f1f5f9; color: #475569; padding: 4px 8px; border-radius: 6px; font-size: 11px; font-weight: 600; display: flex; align-items: center; gap: 4px; border: 1px solid #e2e8f0; line-height: 1;">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
              Publié : ${createdInfo.dateStr} <span style="font-weight: 400; opacity: 0.8;">${createdInfo.daysAgoStr}</span>
            </span>` : ''}
            ${updatedInfo.dateStr !== 'N/A' && updatedInfo.dateStr !== createdInfo.dateStr ? `
            <span style="background: #fffbeb; color: #b45309; padding: 4px 8px; border-radius: 6px; font-size: 11px; font-weight: 600; display: flex; align-items: center; gap: 4px; border: 1px solid #fde68a; line-height: 1;">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path><path d="M3 3v5h5"></path><path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"></path><path d="M16 21v-5h5"></path></svg>
              MàJ : ${updatedInfo.dateStr} <span style="font-weight: 400; opacity: 0.8;">${updatedInfo.daysAgoStr}</span>
            </span>` : ''}
          </div>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 24px;">
          <div style="background: #f8fafc; padding: 16px; border-radius: 12px; border: 1px solid #e2e8f0; position: relative; overflow: hidden; min-width: 0;">
            <div style="position: absolute; top: 0; right: 0; width: 40px; height: 40px; background: linear-gradient(135deg, transparent 50%, rgba(59, 130, 246, 0.1) 50%);"></div>
            <span style="display: flex; align-items: center; gap: 6px; font-size: 12px; color: #64748b; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px;">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path></svg>
              Loyer Est.
            </span>
            <div style="font-size: 22px; font-weight: 800; color: #0f172a;">${formatCurr(classic.monthlyRent)} <span style="font-size: 13px; font-weight: 500; color: #64748b;">/m</span></div>
            ${rentEst && rentEst.rentPerSqm ? `<div style="font-size: 11px; color: #94a3b8; margin-top: 4px;">Ref: ${formatCurr(rentEst.rentPerSqm)}/m²</div>` : ''}
          </div>
          <div style="background: #f8fafc; padding: 16px; border-radius: 12px; border: 1px solid #e2e8f0; position: relative; overflow: hidden; min-width: 0;">
            <div style="position: absolute; top: 0; right: 0; width: 40px; height: 40px; background: linear-gradient(135deg, transparent 50%, rgba(239, 68, 68, 0.1) 50%);"></div>
            <span style="display: flex; align-items: center; gap: 6px; font-size: 12px; color: #64748b; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px;">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12V7H5a2 2 0 0 1 0-4h14v4"></path><path d="M3 5v14a2 2 0 0 0 2 2h16v-5"></path><path d="M18 12a2 2 0 0 0 0 4h4v-4Z"></path></svg>
              Mensualité Prêt
            </span>
            <div style="font-size: 22px; font-weight: 800; color: #0f172a;">${formatCurr(classic.monthlyMortgage)} <span style="font-size: 13px; font-weight: 500; color: #64748b;">/m</span></div>
            <div style="font-size: 11px; color: #94a3b8; margin-top: 4px;">${data.simulations.loanDetails.durationYears} ans @ ${formatPct(data.simulations.loanDetails.rate * 100)}</div>
          </div>
        </div>

        ${this.renderPriceTrend(priceHistory, formatCurr)}

        <!-- Classic Scenario -->
        <div style="margin-bottom: ${coloc ? '20px' : '0'}; background: #ffffff; border-radius: 12px; border: 1px solid #f1f5f9; padding: 16px; box-shadow: 0 2px 4px rgba(0,0,0,0.02);">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
            <h4 style="margin: 0; font-size: 15px; font-weight: 700; color: #334155; display: flex; align-items: center; gap: 6px;">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#64748b" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path></svg>
              Location Classique
            </h4>
          </div>
          <div style="display: flex; flex-direction: column; gap: 8px;">
            <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px 12px; border-radius: 10px; background: ${classic.netCashflowMonthly >= 0 ? '#ecfdf5' : '#fef2f2'}; border: 1px solid ${classic.netCashflowMonthly >= 0 ? '#a7f3d0' : '#fecaca'};">
              <div style="font-size: 12px; color: ${classic.netCashflowMonthly >= 0 ? '#059669' : '#dc2626'}; font-weight: 600;">Cashflow Net mensuel</div>
              <div style="font-size: 16px; font-weight: 800; color: ${classic.netCashflowMonthly >= 0 ? '#065f46' : '#991b1b'};">${formatCurr(classic.netCashflowMonthly)} <span style="font-size: 13px; font-weight: 500; opacity: 0.8;">/m</span></div>
            </div>
            <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px 12px; border-radius: 10px; background: #eff6ff; border: 1px solid #bfdbfe;">
              <div style="font-size: 12px; color: #2563eb; font-weight: 600;">Rentabilité Brute</div>
              <div style="font-size: 16px; font-weight: 800; color: #1e3a8a;">${formatPct(classic.rentabilityBrute)}</div>
            </div>
            <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px 12px; border-radius: 10px; background: #f0fdf4; border: 1px solid #bbf7d0;">
              <div style="font-size: 12px; color: #16a34a; font-weight: 600;">Rentabilité Nette charges</div>
              <div style="font-size: 16px; font-weight: 800; color: #14532d;">${formatPct(classic.rentabilityNette)}</div>
            </div>
          </div>
        </div>

        <!-- Coloc Scenario -->
        ${coloc ? `
        <div style="background: #ffffff; border-radius: 12px; border: 1px solid #f1f5f9; padding: 16px; box-shadow: 0 2px 4px rgba(0,0,0,0.02);">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
            <h4 style="margin: 0; font-size: 15px; font-weight: 700; color: #334155; display: flex; align-items: center; gap: 6px;">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#64748b" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
              Colocation (${coloc.params.bedrooms} ch.)
            </h4>
            <span style="font-size: 12px; font-weight: 600; color: #8b5cf6; background: #ede9fe; padding: 2px 8px; border-radius: 10px;">${formatCurr(coloc.roomPrice)}/ch · ${coloc.params.privateM2PerRoom}m²</span>
          </div>
          <div style="display: flex; flex-direction: column; gap: 8px;">
            <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px 12px; border-radius: 10px; background: ${coloc.netCashflowMonthly >= 0 ? '#ecfdf5' : '#fef2f2'}; border: 1px solid ${coloc.netCashflowMonthly >= 0 ? '#a7f3d0' : '#fecaca'};">
              <div style="font-size: 12px; color: ${coloc.netCashflowMonthly >= 0 ? '#059669' : '#dc2626'}; font-weight: 600;">Cashflow Net mensuel</div>
              <div style="font-size: 16px; font-weight: 800; color: ${coloc.netCashflowMonthly >= 0 ? '#065f46' : '#991b1b'};">${formatCurr(coloc.netCashflowMonthly)} <span style="font-size: 13px; font-weight: 500; opacity: 0.8;">/m</span></div>
            </div>
            <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px 12px; border-radius: 10px; background: #faf5ff; border: 1px solid #e9d5ff;">
              <div style="font-size: 12px; color: #9333ea; font-weight: 600;">Rentabilité Brute</div>
              <div style="font-size: 16px; font-weight: 800; color: #581c87;">${formatPct(coloc.rentabilityBrute)}</div>
            </div>
            <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px 12px; border-radius: 10px; background: #f5f3ff; border: 1px solid #ddd6fe;">
              <div style="font-size: 12px; color: #7c3aed; font-weight: 600;">Rentabilité Nette charges</div>
              <div style="font-size: 16px; font-weight: 800; color: #4c1d95;">${formatPct(coloc.rentabilityNette)}</div>
            </div>
          </div>
        </div>
        ` : ''}
        <!-- Détails Techniques & Financiers -->
        <div style="margin-top: 16px; border-top: 1px solid #e2e8f0; padding-top: 16px; font-size: 13px; color: #475569; line-height: 1.6; word-break: break-word;">
          <h5 style="margin: 0 0 8px 0; font-size: 14px; color: #1e293b;">Paramètres de calcul :</h5>
          <ul style="margin: 0 0 12px 0; padding-left: 20px;">
            <li><strong>Prix affiché (page) :</strong> ${formatCurr(data.simulations.loanDetails.propertyPrice)}
              
            </li>
            <li><strong>Apport (20%) :</strong> ${formatCurr(data.simulations.loanDetails.downPayment)}</li>
            <li><strong>Montant du prêt :</strong> ${formatCurr(data.simulations.loanDetails.loanAmount)}</li>
            <li><strong>Frais mensuels estimés :</strong> ${formatCurr(classic.monthlyFrais)} (${formatCurr(classic.annualFrais)}/an)</li>
            <li><strong>Revenus Locatifs (Classique) :</strong> ${formatCurr(classic.annualRevenue)}/an</li>
            <li><strong>Loyer moyen zone (€/m²) :</strong> ${averageRentM2 ? averageRentM2 + ' €' : 'N/A'}</li>
            ${coloc ? `<li><strong>Revenus Locatifs (Coloc) :</strong> ${formatCurr(coloc.annualRevenue)}/an</li>` : ''}
          </ul>

          <h5 style="margin: 0 0 8px 0; font-size: 14px; color: #1e293b;">Informations Extraites (Charges/Taxes) :</h5>
          <ul style="margin: 0 0 12px 0; padding-left: 20px;">
            ${data.priceInfo && data.priceInfo.length ? data.priceInfo.map(([label, value]) => `<li><strong>${label} :</strong> ${value}</li>`).join('') : '<li>Aucune charge/taxe extraite.</li>'}
          </ul>
          
          <h5 style="margin: 0 0 8px 0; font-size: 14px; color: #1e293b;">Énergie & DPE :</h5>
          <ul style="margin: 0 0 12px 0; padding-left: 20px;">
            ${data.energy && data.energy.length ? data.energy.map(([label, value]) => `<li><strong>${label} :</strong> ${value}</li>`).join('') : '<li>Non renseigné</li>'}
          </ul>

          ${data.georisques ? `
          <h5 style="margin: 0 0 8px 0; font-size: 14px; color: #1e293b;">Risques (Géorisques) :</h5>
          ${this.formatGeorisques(data.georisques)}
          ` : ''}
        </div>
        
      </div> 
    `; 
  }

  static formatGeorisques(georisques) {
    if (!georisques || Object.keys(georisques).length === 0) return '<div>Aucun risque identifié.</div>';
    let html = '<div style="background: #f8fafc; padding: 12px; border-radius: 8px; border: 1px solid #e2e8f0; font-size: 12px; overflow-x: auto;">';
    for (const [key, val] of Object.entries(georisques)) {
      if (Array.isArray(val)) {
        // Flatten elements, handling arrays of arrays
        const children = val.map(v => Array.isArray(v) ? v[0] : v);
        // Filter out any child that is identical to the category name
        const filteredChildren = children.filter(child => child.toLowerCase() !== key.toLowerCase());

        if (filteredChildren.length === 0) {
          // If only the category name was present, display normally
          html += `<div style="margin-bottom: 6px;"><strong>${key}</strong></div>`;
        } else {
          // Sub-list for additional details
          html += `<div style="margin-bottom: 6px;"><strong>${key} :</strong>`;
          html += `<ul style="margin: 4px 0 8px 0; padding-left: 24px; color: #475569; list-style-type: disc;">`;
          filteredChildren.forEach(child => {
            html += `<li>${child}</li>`;
          });
          html += `</ul></div>`;
        }
      } else {
        html += `<div style="margin-bottom: 6px;"><strong>${key} :</strong> ${typeof val === 'object' ? JSON.stringify(val) : val}</div>`;
      }
    }
    html += '</div>';
    return html;
  }

  static renderPriceTrend(history, formatCurr) {
    if (!Array.isArray(history) || history.length === 0) return '';

    const points = history
      .filter((item) => Number.isFinite(Number(item?.price)) && Number(item?.price) > 0)
      .slice(-24)
      .map((item) => ({
        price: Number(item.price),
        capturedAt: item?.capturedAt ?? null,
      }));

    if (points.length === 0) return '';

    const first = points[0].price;
    const last = points.at(-1).price;
    const delta = last - first;
    const deltaPct = first > 0 ? (delta / first) * 100 : 0;
    const trendColor = delta >= 0 ? '#16a34a' : '#dc2626';

    return `
      <div style="margin-bottom: 20px; background: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; padding: 16px; box-shadow: 0 2px 4px rgba(0,0,0,0.02);">
        <div style="display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 10px; gap: 8px; flex-wrap: wrap;">
          <h4 style="margin: 0; font-size: 15px; font-weight: 700; color: #334155;">Evolution du prix</h4>
          <div style="font-size: 12px; color: #64748b;">${points.length} points</div>
        </div>
        ${this._buildSparkline(points)}
        <div style="margin-top: 10px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px;">
          <div style="font-size: 13px; color: #334155;">
            Dernier prix: <strong>${formatCurr(last)}</strong>
          </div>
          <div style="font-size: 13px; color: ${trendColor}; font-weight: 700;">
            ${delta >= 0 ? '+' : ''}${formatCurr(delta)} (${delta >= 0 ? '+' : ''}${deltaPct.toFixed(2)}%)
          </div>
        </div>
      </div>
    `;
  }

  static _buildSparkline(points) {
    const width = 560;
    const height = 120;
    const min = Math.min(...points.map((p) => p.price));
    const max = Math.max(...points.map((p) => p.price));
    const range = Math.max(1, max - min);
    const stepX = points.length > 1 ? width / (points.length - 1) : width;

    const coords = points.map((point, idx) => {
      const x = idx * stepX;
      const y = height - ((point.price - min) / range) * height;
      return `${x.toFixed(2)},${y.toFixed(2)}`;
    });
    const lineCoords = points.length === 1
      ? `0,${(height / 2).toFixed(2)} ${width},${(height / 2).toFixed(2)}`
      : coords.join(' ');

    const firstLabel = points[0]?.capturedAt
      ? new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: 'short' }).format(new Date(points[0].capturedAt))
      : 'Debut';
    const lastLabel = points[points.length - 1]?.capturedAt
      ? new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: 'short' }).format(new Date(points[points.length - 1].capturedAt))
      : 'Maintenant';

    return `
      <div style="background: linear-gradient(180deg, #f8fafc, #ffffff); border: 1px solid #e2e8f0; border-radius: 10px; padding: 10px;">
        <svg viewBox="0 0 ${width} ${height}" preserveAspectRatio="none" style="width: 100%; height: 120px; display: block;">
          <polyline fill="none" stroke="#2563eb" stroke-width="3" stroke-linejoin="round" stroke-linecap="round" points="${lineCoords}"></polyline>
        </svg>
        <div style="display: flex; justify-content: space-between; margin-top: 6px; color: #94a3b8; font-size: 11px;">
          <span>${firstLabel}</span>
          <span>${lastLabel}</span>
        </div>
      </div>
    `;
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
