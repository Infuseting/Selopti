const TARGET_SELECTOR = 'div[data-testid="cardmfe-description-box-text-test-id"]';

function normalizeTestId(id) {
  return String(id).replace(/[^a-zA-Z0-9_-]/g, '-');
}

export class SeloptiInserter {
  constructor(root = document) {
    this.root = root;
    this.containers = new Map();
  }

  getTarget(hostElement) {
    if (!hostElement) {
      return null;
    }

    if (hostElement.matches && hostElement.matches(TARGET_SELECTOR)) {
      return hostElement;
    }

    return hostElement.querySelector(TARGET_SELECTOR);
  }

  ensureContainer(id, hostElement) {
    const target = this.getTarget(hostElement);
    if (!target) {
      return null;
    }

    const testId = `selopti-text-${normalizeTestId(id)}`;
    const existingContainer = target.querySelector(`:scope > div[data-testid="${testId}"]`);
    if (existingContainer) {
      this.containers.set(testId, existingContainer);
      return existingContainer;
    }

    const container = document.createElement('div');
    container.dataset.testid = testId;
    target.appendChild(container);
    this.containers.set(testId, container);

    return container;
  }

  insertHTML(id, hostElement, html) {
    const container = this.ensureContainer(id, hostElement);
    if (!container) {
      return null;
    }

    // Effacer le contenu existant pour éviter les duplications
    container.innerHTML = '';

    const template = document.createElement('template');
    template.innerHTML = html;
    const fragment = template.content.cloneNode(true);
    container.appendChild(fragment);

    return container;
  }
}