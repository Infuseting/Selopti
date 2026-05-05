class CardUI {
  static COLORS = {
    TEXT: "#666",
    PINK: "#e54b6d", // SeLoger pink
    BLUE: "#4a90e2"  // Nice blue
  };

  /**
   * Creates a standard styled element for the card.
   */
  static createInfoTag(text, className = "") {
    const p = document.createElement("p");
    p.textContent = text;
    Object.assign(p.style, {
      fontSize: "12px",
      color: this.COLORS.TEXT,
      marginTop: "4px",
      fontWeight: "600"
    });
    if (className) p.classList.add(className);
    return p;
  }

  /**
   * Extension point: Easily add more elements here.
   */
  static injectFeatures(target, cardId) {
    // Feature 1: ID Display
    const idTag = this.createInfoTag(`ID: ${cardId}`, "selopti-id-tag");
    target.appendChild(idTag);
  }

  /**
   * Injects the profitability calculation block at the very top.
   */
  static injectProfitability(target, profitability, cardId) {
    const existing = target.querySelector(`#selopti-profitability-${cardId}`);
    if (existing) return;

    const container = document.createElement("div");
    container.id = `selopti-profitability-${cardId}`;
    Object.assign(container.style, {
      fontSize: "13px",
      fontWeight: "bold",
      padding: "6px",
      marginBottom: "8px",
      marginTop: "8px",
      borderRadius: "4px",
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center"
    });

    const isPositive = profitability.cashflow >= 0;
    if (isPositive) {
      container.style.backgroundColor = "#e8f8f5";
      container.style.borderLeft = "4px solid #2ecc71";
      container.style.color = "#27ae60";
    } else {
      container.style.backgroundColor = "#fdedec";
      container.style.borderLeft = "4px solid #e74c3c";
      container.style.color = "#c0392b";
    }

    const sign = isPositive ? "+" : "";
    const cashflowValue = Math.round(profitability.cashflow);

    container.innerHTML = `<span>💸 Rentabilité estimée :</span> <span>${sign}${cashflowValue} € / mois</span>`;
    
    // Tooltip detail
    container.title = 
      `Loyer estimé : ${Math.round(profitability.estimatedRent)} €/mois\n` +
      `Crédit (20 ans à 4%, +8% notaire) : -${Math.round(profitability.monthlyLoan)} €/mois\n` +
      `Charges + Taxe Foncière : -${Math.round(profitability.monthlyCharges)} €/mois`;

    // Inject just before the financials block, or append if not found
    const financialsBlock = target.querySelector(`#selopti-financials-${cardId}`);
    if (financialsBlock) {
      target.insertBefore(container, financialsBlock);
    } else {
      target.appendChild(container);
    }
  }

  /**
   * Injects the financial block (energy estimate, charges, property tax).
   */
  static injectFinancials(target, financials, cardId) {
    const existing = target.querySelector(`#selopti-financials-${cardId}`);
    if (existing) return;

    const container = document.createElement("div");
    container.id = `selopti-financials-${cardId}`;
    container.className = "selopti-financials-block";
    Object.assign(container.style, {
      fontSize: "12px",
      marginTop: "8px",
      padding: "6px",
      backgroundColor: "#f8f9fa",
      borderLeft: "3px solid #3498db",
      borderRadius: "4px",
      display: "flex",
      flexDirection: "column",
      gap: "4px"
    });

    if (financials.energy) {
      const p = document.createElement("div");
      p.innerHTML = `<strong>⚡ Énergie :</strong> ${financials.energy}`;
      p.style.color = "#d35400";
      container.appendChild(p);
    }

    if (financials.charges && financials.charges.amount) {
      const p = document.createElement("div");
      const freq = financials.charges.frequency === "monthly" ? "mensuel" : "annuel";
      p.innerHTML = `<strong>💰 Charges :</strong> ${financials.charges.amount} € (${freq})`;
      p.style.color = "#2980b9";
      container.appendChild(p);
    }

    if (financials.taxeFonciere) {
      const p = document.createElement("div");
      p.innerHTML = `<strong>🏛️ Taxe Foncière :</strong> ${financials.taxeFonciere} €`;
      p.style.color = "#8e44ad";
      container.appendChild(p);
    }

    if (container.children.length > 0) {
      target.appendChild(container);
    }
  }

  /**
   * Injects the elevator information.
   */
  static injectElevator(target, info) {
    const elevatorTag = this.createInfoTag(`Ascenseur : ${info}`, "selopti-elevator-tag");
    elevatorTag.style.color = this.COLORS.BLUE;
    target.appendChild(elevatorTag);
  }

  /**
   * Injects the number of bedrooms.
   */
  static injectBedrooms(target, count) {
    const plural = parseInt(count) > 1 ? "s" : "";
    const bedroomTag = this.createInfoTag(`Chambre${plural} : ${count}`, "selopti-bedroom-tag");
    bedroomTag.style.color = "#27ae60"; // Green color
    target.appendChild(bedroomTag);
  }

  /**
   * Injects the geographic coordinates as a Google Maps link.
   */
  static injectCoordinates(target, coords, cardId) {
    const existingP = target.querySelector(`#selopti-geo-${cardId}`);
    if (existingP) {
      // Update existing element to prevent duplication
      const a = existingP.querySelector("a");
      if (a) {
        a.href = `https://www.google.com/maps?q=${coords.lat},${coords.lng}`;
        a.textContent = `📍 Voir sur la carte (${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)})`;
      }
      return;
    }

    const mapsLink = `https://www.google.com/maps?q=${coords.lat},${coords.lng}`;
    
    const p = document.createElement("p");
    p.id = `selopti-geo-${cardId}`;
    p.className = "selopti-geo-tag";
    Object.assign(p.style, {
      fontSize: "12px",
      marginTop: "4px",
      fontWeight: "600"
    });
    
    const a = document.createElement("a");
    a.href = mapsLink;
    a.target = "_blank";
    a.textContent = `📍 Voir sur la carte (${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)})`;
    a.style.color = "#d35400"; // Orange color
    a.style.textDecoration = "none";
    
    a.addEventListener("mouseover", () => a.style.textDecoration = "underline");
    a.addEventListener("mouseout", () => a.style.textDecoration = "none");
    
    p.appendChild(a);
    target.appendChild(p);
  }



  /**
   * Injects the environmental risks (Georisques).
   */
  static injectGeorisques(target, risques, cardId) {
    const existing = target.querySelector(`#selopti-georisques-${cardId}`);
    if (existing) return;

    const p = document.createElement("p");
    p.id = `selopti-georisques-${cardId}`;
    p.className = "selopti-georisques-tag";
    Object.assign(p.style, {
      fontSize: "12px",
      marginTop: "4px",
      fontWeight: "600",
      color: "#c0392b"
    });
    
    if (risques && risques.length > 0) {
      p.innerHTML = `<strong>⚠️ Géorisques :</strong><ul style="margin: 4px 0 0 16px; padding: 0;"><li>${risques.join('</li><li>')}</li></ul>`;
    } else {
      p.textContent = `✅ Aucun risque majeur recensé (Géorisques)`;
      p.style.color = "#27ae60";
    }

    target.appendChild(p);
  }
}
