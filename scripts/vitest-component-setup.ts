import '@testing-library/jest-dom/vitest';

import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

class DeterministicResizeObserver implements ResizeObserver {
  disconnect(): void {}
  observe(): void {}
  unobserve(): void {}
}

if (!globalThis.ResizeObserver) globalThis.ResizeObserver = DeterministicResizeObserver;
if (!Element.prototype.scrollIntoView) Element.prototype.scrollIntoView = () => undefined;

afterEach(() => cleanup());
