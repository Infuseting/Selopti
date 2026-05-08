export class UIHTMLRenderer {
  static renderDetailsHTML(data) {
    return `
      <div class="selopti-details">
        <h3>Selopti</h3>
        <pre>${this.escapeHTML(JSON.stringify({
      data,
    }, null, 2))}</pre>
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
