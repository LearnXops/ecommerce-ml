import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from '@/contexts/AuthContext';
import AdminDashboard from '@/pages/AdminDashboard';
import { api } from '@/utils/api';

// Mock the API
vi.mock('@/utils/api');
const mockedApi = api as any;

// Mock react-router-dom
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom') as any;
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

// Mock AuthContext
const mockUser = {
  _id: '1',
  email: 'admin@test.com',
  firstName: 'Admin',
  lastName: 'User',
  role: 'admin' as const,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: mockUser,
    loading: false,
  }),
  AuthProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

const renderWithRouter = (component: React.ReactElement) => {
  return render(
    <BrowserRouter>
      <AuthProvider>
        {component}
      </AuthProvider>
    </BrowserRouter>
  );
};

describe('AdminDashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock API responses
    mockedApi.get.mockImplementation((url: string) => {
      if (url === '/auth/users/stats') {
        return Promise.resolve({
          data: {
            success: true,
            data: {
              totalUsers: 100,
              adminUsers: 5,
              customerUsers: 95,
              recentRegistrations: 10,
              recentUsers: [
                {
                  _id: '1',
                  firstName: 'John',
                  lastName: 'Doe',
                  email: 'john@test.com',
                  role: 'customer',
                  createdAt: new Date().toISOString(),
                },
              ],
            },
          },
        });
      }
      
      if (url.includes('/products')) {
        return Promise.resolve({
          data: {
            success: true,
            data: {
              data: [
                {
                  _id: '1',
                  name: 'Test Product',
                  price: 99.99,
                  category: 'electronics',
                  createdAt: new Date().toISOString(),
                },
              ],
              pagination: { total: 1 },
            },
          },
        });
      }
      
      if (url.includes('/orders')) {
        return Promise.resolve({
          data: {
            success: true,
            data: {
              data: [
                {
                  _id: '1',
                  totalAmount: 199.99,
                  status: 'pending',
                  createdAt: new Date().toISOString(),
                },
              ],
              pagination: { total: 1 },
            },
          },
        });
      }
      
      return Promise.reject(new Error('Unknown endpoint'));
    });
  });

  it('renders admin dashboard with stats', async () => {
    renderWithRouter(<AdminDashboard />);

    expect(screen.getByText('Admin Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Overview of your ecommerce platform')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('100')).toBeInTheDocument(); // Total users
      expect(screen.getByText('Users')).toBeInTheDocument();
      expect(screen.getByText('Products')).toBeInTheDocument();
      expect(screen.getByText('Orders')).toBeInTheDocument();
    });
  });

  it('displays quick action buttons', async () => {
    renderWithRouter(<AdminDashboard />);

    await waitFor(() => {
      expect(screen.getByText('Manage Users')).toBeInTheDocument();
      expect(screen.getByText('Manage Products')).toBeInTheDocument();
      expect(screen.getByText('Manage Orders')).toBeInTheDocument();
      expect(screen.getByText('Analytics')).toBeInTheDocument();
    });
  });

  it('displays recent activity tables', async () => {
    renderWithRouter(<AdminDashboard />);

    await waitFor(() => {
      expect(screen.getByText('Recent Users')).toBeInTheDocument();
      expect(screen.getByText('Recent Orders')).toBeInTheDocument();
    });
  });

  it('handles API errors gracefully', async () => {
    mockedApi.get.mockRejectedValue(new Error('API Error'));

    renderWithRouter(<AdminDashboard />);

    await waitFor(() => {
      expect(screen.getByText(/Failed to fetch dashboard data/)).toBeInTheDocument();
    });
  });
});