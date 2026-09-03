import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { OfflineBadge } from './OfflineBadge';

describe('OfflineBadge', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('온라인이면 아무것도 렌더하지 않는다', () => {
    vi.stubGlobal('navigator', { onLine: true });
    const { container } = render(<OfflineBadge />);
    expect(container).toBeEmptyDOMElement();
  });

  it('오프라인이면 안내 문구를 보여준다', () => {
    vi.stubGlobal('navigator', { onLine: false });
    render(<OfflineBadge />);
    expect(screen.getByText(/오프라인 모드/)).toBeInTheDocument();
  });
});
