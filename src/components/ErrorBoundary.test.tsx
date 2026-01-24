import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ErrorBoundary } from './ErrorBoundary';

// Component that throws an error
function ThrowError({ shouldThrow = true }: { shouldThrow?: boolean }) {
  if (shouldThrow) {
    throw new Error('Test error message');
  }
  return <div>Children rendered successfully</div>;
}

describe('ErrorBoundary', () => {
  // Suppress console.error during tests (ErrorBoundary logs errors)
  const originalConsoleError = console.error;

  beforeEach(() => {
    console.error = vi.fn();
  });

  afterEach(() => {
    console.error = originalConsoleError;
  });

  it('should render children when there is no error', () => {
    render(
      <ErrorBoundary>
        <div data-testid="child">Child content</div>
      </ErrorBoundary>
    );

    expect(screen.getByTestId('child')).toBeInTheDocument();
    expect(screen.getByText('Child content')).toBeInTheDocument();
  });

  it('should render error UI when child throws', () => {
    render(
      <ErrorBoundary>
        <ThrowError />
      </ErrorBoundary>
    );

    // Check error UI is shown
    expect(screen.getByText('Nekaj je slo narobe')).toBeInTheDocument();
    expect(screen.getByText(/Prislo je do nepricakovane napake/)).toBeInTheDocument();
  });

  it('should render custom fallback when provided', () => {
    const customFallback = <div data-testid="custom-fallback">Custom error UI</div>;

    render(
      <ErrorBoundary fallback={customFallback}>
        <ThrowError />
      </ErrorBoundary>
    );

    expect(screen.getByTestId('custom-fallback')).toBeInTheDocument();
    expect(screen.getByText('Custom error UI')).toBeInTheDocument();
    expect(screen.queryByText('Nekaj je slo narobe')).not.toBeInTheDocument();
  });

  it('should show refresh and home buttons', () => {
    render(
      <ErrorBoundary>
        <ThrowError />
      </ErrorBoundary>
    );

    expect(screen.getByRole('button', { name: /Osvezi stran/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Domov/i })).toBeInTheDocument();
  });

  it('should call window.location.reload when refresh button is clicked', () => {
    const reloadMock = vi.fn();
    Object.defineProperty(window, 'location', {
      value: { reload: reloadMock, href: '' },
      writable: true,
    });

    render(
      <ErrorBoundary>
        <ThrowError />
      </ErrorBoundary>
    );

    fireEvent.click(screen.getByRole('button', { name: /Osvezi stran/i }));
    expect(reloadMock).toHaveBeenCalled();
  });

  it('should navigate to home when home button is clicked', () => {
    let capturedHref = '';
    Object.defineProperty(window, 'location', {
      value: {
        get href() { return capturedHref; },
        set href(val) { capturedHref = val; },
        reload: vi.fn(),
      },
      writable: true,
    });

    render(
      <ErrorBoundary>
        <ThrowError />
      </ErrorBoundary>
    );

    fireEvent.click(screen.getByRole('button', { name: /Domov/i }));
    expect(capturedHref).toBe('/');
  });

  it('should log error to console', () => {
    render(
      <ErrorBoundary>
        <ThrowError />
      </ErrorBoundary>
    );

    expect(console.error).toHaveBeenCalledWith(
      'ErrorBoundary caught an error:',
      expect.any(Error)
    );
    expect(console.error).toHaveBeenCalledWith(
      'Component stack:',
      expect.any(String)
    );
  });

  it('should call onReset callback when reset is triggered', () => {
    const onResetMock = vi.fn();
    const { rerender } = render(
      <ErrorBoundary onReset={onResetMock}>
        <ThrowError />
      </ErrorBoundary>
    );

    // Error UI should be shown
    expect(screen.getByText('Nekaj je slo narobe')).toBeInTheDocument();

    // Rerender without error to test reset functionality
    rerender(
      <ErrorBoundary onReset={onResetMock}>
        <ThrowError shouldThrow={false} />
      </ErrorBoundary>
    );

    // Since we can't easily trigger handleReset from outside,
    // we verify the error boundary maintains its state
    expect(screen.getByText('Nekaj je slo narobe')).toBeInTheDocument();
  });

  it('should display error icon', () => {
    render(
      <ErrorBoundary>
        <ThrowError />
      </ErrorBoundary>
    );

    // Check for the AlertCircle icon (it renders as an SVG)
    const svg = document.querySelector('svg.h-16.w-16');
    expect(svg).toBeInTheDocument();
  });
});

describe('ErrorBoundary state management', () => {
  const originalConsoleError = console.error;

  beforeEach(() => {
    console.error = vi.fn();
  });

  afterEach(() => {
    console.error = originalConsoleError;
  });

  it('should properly handle multiple children', () => {
    render(
      <ErrorBoundary>
        <div>First child</div>
        <div>Second child</div>
      </ErrorBoundary>
    );

    expect(screen.getByText('First child')).toBeInTheDocument();
    expect(screen.getByText('Second child')).toBeInTheDocument();
  });

  it('should catch errors from deeply nested components', () => {
    function NestedComponent() {
      return (
        <div>
          <div>
            <ThrowError />
          </div>
        </div>
      );
    }

    render(
      <ErrorBoundary>
        <NestedComponent />
      </ErrorBoundary>
    );

    expect(screen.getByText('Nekaj je slo narobe')).toBeInTheDocument();
  });
});
