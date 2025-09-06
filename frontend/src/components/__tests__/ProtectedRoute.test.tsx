import { describe, it, expect, vi } from 'vitest';
import { screen } from '@testing-library/react';
import { render } from '@/test/utils';
import ProtectedRoute from '@/components/ProtectedRoute';
import { User } from '@/types';

// Mock the auth context
const mockUser: User = {
  _id: '1',
  email: 'test@example.com',
  firstName: 'Test',
  lastName: 'User',
  role: 'customer',
  createdAt: '2023-01-01T00:00:00Z',
  updatedAt: '2023-01-01T00:00:00Z',
};

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: vi.fn(),
}));

describe('ProtectedRoute', () => {
  it('renders children when user is authenticated', () => {
    vi.mocked(require('@/contexts/AuthContext').useAuth).mockReturnValue({
      user: mockUser,
      loading: false,
    });

    render(
      <ProtectedRoute>
        <div>Protected Content</div>
      </ProtectedRoute>
    );

    expect(screen.getByText('Protected Content')).toBeInTheDocument();
  });

  it('shows loading spinner when loading', () => {
    vi.mocked(require('@/contexts/AuthContext').useAuth).mockReturnValue({
      user: null,
      loading: true,
    });

    render(
      <ProtectedRoute>
        <div>Protected Content</div>
      </ProtectedRoute>
    );

    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('redirects to login when user is not authenticated', () => {
    vi.mocked(require('@/contexts/AuthContext').useAuth).mockReturnValue({
      user: null,
      loading: false,
    });

    render(
      <ProtectedRoute>
        <div>Protected Content</div>
      </ProtectedRoute>
    );

    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
  });

  it('redirects non-admin users from admin-only routes', () => {
    vi.mocked(require('@/contexts/AuthContext').useAuth).mockReturnValue({
      user: mockUser,
      loading: false,
    });

    render(
      <ProtectedRoute adminOnly>
        <div>Admin Content</div>
      </ProtectedRoute>
    );

    expect(screen.queryByText('Admin Content')).not.toBeInTheDocument();
  });

  it('allows admin users to access admin-only routes', () => {
    const adminUser = { ...mockUser, role: 'admin' as const };
    vi.mocked(require('@/contexts/AuthContext').useAuth).mockReturnValue({
      user: adminUser,
      loading: false,
    });

    render(
      <ProtectedRoute adminOnly>
        <div>Admin Content</div>
      </ProtectedRoute>
    );

    expect(screen.getByText('Admin Content')).toBeInTheDocument();
  });
});