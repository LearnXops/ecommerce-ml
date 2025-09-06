import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from '@/contexts/AuthContext';
import AdminUsers from '@/pages/AdminUsers';
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
const mockAdminUser = {
  _id: 'admin1',
  email: 'admin@test.com',
  firstName: 'Admin',
  lastName: 'User',
  role: 'admin' as const,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

const mockUsers = [
  {
    _id: 'user1',
    email: 'user1@test.com',
    firstName: 'John',
    lastName: 'Doe',
    role: 'customer' as const,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    _id: 'user2',
    email: 'user2@test.com',
    firstName: 'Jane',
    lastName: 'Smith',
    role: 'admin' as const,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: mockAdminUser,
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

describe('AdminUsers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock successful API response
    mockedApi.get.mockResolvedValue({
      data: {
        success: true,
        data: {
          data: mockUsers,
          pagination: {
            page: 1,
            limit: 20,
            total: 2,
            totalPages: 1,
            hasNext: false,
            hasPrev: false,
          },
        },
      },
    });
  });

  it('renders user management page', async () => {
    renderWithRouter(<AdminUsers />);

    expect(screen.getByText('User Management')).toBeInTheDocument();
    expect(screen.getByText('Manage all platform users')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('Jane Smith')).toBeInTheDocument();
    });
  });

  it('displays user information correctly', async () => {
    renderWithRouter(<AdminUsers />);

    await waitFor(() => {
      expect(screen.getByText('user1@test.com')).toBeInTheDocument();
      expect(screen.getByText('user2@test.com')).toBeInTheDocument();
      expect(screen.getAllByText('Customer')).toHaveLength(1);
      expect(screen.getAllByText('Admin')).toHaveLength(1);
    });
  });

  it('allows searching users', async () => {
    const user = userEvent.setup();
    renderWithRouter(<AdminUsers />);

    const searchInput = screen.getByPlaceholderText('Search users...');
    await user.type(searchInput, 'John');

    await waitFor(() => {
      expect(mockedApi.get).toHaveBeenCalledWith(
        expect.stringContaining('search=John')
      );
    });
  });

  it('allows filtering by role', async () => {
    const user = userEvent.setup();
    renderWithRouter(<AdminUsers />);

    const roleSelect = screen.getByLabelText('Role');
    await user.click(roleSelect);
    
    const customerOption = screen.getByText('Customer');
    await user.click(customerOption);

    await waitFor(() => {
      expect(mockedApi.get).toHaveBeenCalledWith(
        expect.stringContaining('role=customer')
      );
    });
  });

  it('opens edit dialog when edit button is clicked', async () => {
    const user = userEvent.setup();
    renderWithRouter(<AdminUsers />);

    await waitFor(() => {
      const editButtons = screen.getAllByTestId('edit-user-button');
      expect(editButtons).toHaveLength(2); // Both users should have edit buttons
    });

    const editButtons = screen.getAllByTestId('edit-user-button');
    await user.click(editButtons[0]);

    expect(screen.getByText('Update User Role')).toBeInTheDocument();
    expect(screen.getByText('Update role for: John Doe')).toBeInTheDocument();
  });

  it('updates user role successfully', async () => {
    const user = userEvent.setup();
    mockedApi.put.mockResolvedValue({
      data: {
        success: true,
        data: {
          user: { ...mockUsers[0], role: 'admin' },
        },
      },
    });

    renderWithRouter(<AdminUsers />);

    await waitFor(() => {
      const editButtons = screen.getAllByTestId('edit-user-button');
      expect(editButtons).toHaveLength(2);
    });

    const editButtons = screen.getAllByTestId('edit-user-button');
    await user.click(editButtons[0]);

    // Change role to admin
    const roleSelect = screen.getByLabelText('Role');
    await user.click(roleSelect);
    const adminOption = screen.getByRole('option', { name: 'Admin' });
    await user.click(adminOption);

    const updateButton = screen.getByText('Update Role');
    await user.click(updateButton);

    await waitFor(() => {
      expect(mockedApi.put).toHaveBeenCalledWith(
        '/auth/users/user1/role',
        { role: 'admin' }
      );
    });
  });

  it('handles API errors gracefully', async () => {
    mockedApi.get.mockRejectedValue(new Error('API Error'));

    renderWithRouter(<AdminUsers />);

    await waitFor(() => {
      expect(screen.getByText(/Failed to fetch users/)).toBeInTheDocument();
    });
  });

  it('clears filters when clear button is clicked', async () => {
    const user = userEvent.setup();
    renderWithRouter(<AdminUsers />);

    // Set some filters first
    const searchInput = screen.getByPlaceholderText('Search users...');
    await user.type(searchInput, 'test');

    const clearButton = screen.getByText('Clear Filters');
    await user.click(clearButton);

    expect(searchInput).toHaveValue('');
  });

  it('does not show edit button for current admin user', async () => {
    // Mock API to return current admin user in the list
    mockedApi.get.mockResolvedValue({
      data: {
        success: true,
        data: {
          data: [mockAdminUser, ...mockUsers],
          pagination: {
            page: 1,
            limit: 20,
            total: 3,
            totalPages: 1,
            hasNext: false,
            hasPrev: false,
          },
        },
      },
    });

    renderWithRouter(<AdminUsers />);

    await waitFor(() => {
      const editButtons = screen.getAllByTestId('edit-user-button');
      // Should only have 2 edit buttons (not for the current admin user)
      expect(editButtons).toHaveLength(2);
    });
  });


});