import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { ProtectedRoute } from './ProtectedRoute';

// Mock useAuth hook
const mockUseAuth = vi.fn();

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}));

// Helper to render ProtectedRoute with router context
function renderWithRouter(
  ui: React.ReactNode,
  { initialEntries = ['/protected'] } = {}
) {
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <Routes>
        <Route path="/auth" element={<div>Auth Page</div>} />
        <Route path="/inventar" element={<div>Inventar Page</div>} />
        <Route path="/prodajalec" element={<div>Prodajalec Page</div>} />
        <Route path="/protected" element={ui} />
      </Routes>
    </MemoryRouter>
  );
}

describe('ProtectedRoute', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Loading state', () => {
    it('should show loading spinner when auth is loading', () => {
      mockUseAuth.mockReturnValue({
        user: null,
        activeRole: null,
        availableRoles: [],
        loading: true,
      });

      renderWithRouter(
        <ProtectedRoute allowedRoles={['admin']}>
          <div>Protected Content</div>
        </ProtectedRoute>
      );

      expect(screen.getByText('Nalaganje...')).toBeInTheDocument();
      expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
    });

    it('should show spinner animation', () => {
      mockUseAuth.mockReturnValue({
        user: null,
        activeRole: null,
        availableRoles: [],
        loading: true,
      });

      renderWithRouter(
        <ProtectedRoute allowedRoles={['admin']}>
          <div>Protected Content</div>
        </ProtectedRoute>
      );

      const spinner = document.querySelector('.animate-spin');
      expect(spinner).toBeInTheDocument();
    });
  });

  describe('Unauthenticated user', () => {
    it('should redirect to /auth when user is not logged in', () => {
      mockUseAuth.mockReturnValue({
        user: null,
        activeRole: null,
        availableRoles: [],
        loading: false,
      });

      renderWithRouter(
        <ProtectedRoute allowedRoles={['admin']}>
          <div>Protected Content</div>
        </ProtectedRoute>
      );

      expect(screen.getByText('Auth Page')).toBeInTheDocument();
      expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
    });
  });

  describe('Authenticated user with correct role', () => {
    it('should render children when user has allowed role', () => {
      mockUseAuth.mockReturnValue({
        user: { id: 'user-1', email: 'test@test.com' },
        activeRole: 'admin',
        availableRoles: ['admin'],
        loading: false,
      });

      renderWithRouter(
        <ProtectedRoute allowedRoles={['admin']}>
          <div>Protected Content</div>
        </ProtectedRoute>
      );

      expect(screen.getByText('Protected Content')).toBeInTheDocument();
    });

    it('should render children when user has one of multiple allowed roles', () => {
      mockUseAuth.mockReturnValue({
        user: { id: 'user-1', email: 'test@test.com' },
        activeRole: 'inventar',
        availableRoles: ['inventar'],
        loading: false,
      });

      renderWithRouter(
        <ProtectedRoute allowedRoles={['admin', 'inventar']}>
          <div>Protected Content</div>
        </ProtectedRoute>
      );

      expect(screen.getByText('Protected Content')).toBeInTheDocument();
    });

    it('should allow access if user has role in availableRoles', () => {
      mockUseAuth.mockReturnValue({
        user: { id: 'user-1', email: 'test@test.com' },
        activeRole: 'prodajalec', // Different active role
        availableRoles: ['prodajalec', 'admin'], // But has admin in available
        loading: false,
      });

      renderWithRouter(
        <ProtectedRoute allowedRoles={['admin']}>
          <div>Protected Content</div>
        </ProtectedRoute>
      );

      expect(screen.getByText('Protected Content')).toBeInTheDocument();
    });
  });

  describe('Authenticated user without correct role', () => {
    it('should redirect admin to /inventar when not allowed', () => {
      mockUseAuth.mockReturnValue({
        user: { id: 'user-1', email: 'test@test.com' },
        activeRole: 'admin',
        availableRoles: ['admin'],
        loading: false,
      });

      renderWithRouter(
        <ProtectedRoute allowedRoles={['prodajalec']}>
          <div>Protected Content</div>
        </ProtectedRoute>
      );

      expect(screen.getByText('Inventar Page')).toBeInTheDocument();
      expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
    });

    it('should redirect inventar to /inventar when not allowed', () => {
      mockUseAuth.mockReturnValue({
        user: { id: 'user-1', email: 'test@test.com' },
        activeRole: 'inventar',
        availableRoles: ['inventar'],
        loading: false,
      });

      renderWithRouter(
        <ProtectedRoute allowedRoles={['prodajalec']}>
          <div>Protected Content</div>
        </ProtectedRoute>
      );

      expect(screen.getByText('Inventar Page')).toBeInTheDocument();
    });

    it('should redirect prodajalec to /prodajalec when not allowed', () => {
      mockUseAuth.mockReturnValue({
        user: { id: 'user-1', email: 'test@test.com' },
        activeRole: 'prodajalec',
        availableRoles: ['prodajalec'],
        loading: false,
      });

      renderWithRouter(
        <ProtectedRoute allowedRoles={['admin']}>
          <div>Protected Content</div>
        </ProtectedRoute>
      );

      expect(screen.getByText('Prodajalec Page')).toBeInTheDocument();
    });

    it('should redirect to /auth when no active role', () => {
      mockUseAuth.mockReturnValue({
        user: { id: 'user-1', email: 'test@test.com' },
        activeRole: null,
        availableRoles: [],
        loading: false,
      });

      renderWithRouter(
        <ProtectedRoute allowedRoles={['admin']}>
          <div>Protected Content</div>
        </ProtectedRoute>
      );

      expect(screen.getByText('Auth Page')).toBeInTheDocument();
    });
  });

  describe('Role combinations', () => {
    it('should allow prodajalec to access prodajalec routes', () => {
      mockUseAuth.mockReturnValue({
        user: { id: 'user-1', email: 'test@test.com' },
        activeRole: 'prodajalec',
        availableRoles: ['prodajalec'],
        loading: false,
      });

      renderWithRouter(
        <ProtectedRoute allowedRoles={['prodajalec']}>
          <div>Prodajalec Content</div>
        </ProtectedRoute>
      );

      expect(screen.getByText('Prodajalec Content')).toBeInTheDocument();
    });

    it('should allow user with multiple roles to access any allowed route', () => {
      mockUseAuth.mockReturnValue({
        user: { id: 'user-1', email: 'test@test.com' },
        activeRole: 'prodajalec',
        availableRoles: ['prodajalec', 'admin', 'inventar'],
        loading: false,
      });

      renderWithRouter(
        <ProtectedRoute allowedRoles={['inventar']}>
          <div>Inventar Content</div>
        </ProtectedRoute>
      );

      // User has inventar in availableRoles
      expect(screen.getByText('Inventar Content')).toBeInTheDocument();
    });

    it('should check all three allowed roles', () => {
      mockUseAuth.mockReturnValue({
        user: { id: 'user-1', email: 'test@test.com' },
        activeRole: 'inventar',
        availableRoles: ['inventar'],
        loading: false,
      });

      renderWithRouter(
        <ProtectedRoute allowedRoles={['admin', 'inventar', 'prodajalec']}>
          <div>Any Role Content</div>
        </ProtectedRoute>
      );

      expect(screen.getByText('Any Role Content')).toBeInTheDocument();
    });
  });
});
