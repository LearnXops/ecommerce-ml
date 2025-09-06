import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useCart } from '@/hooks/useCart';
import { api } from '@/utils/api';

// Mock the API
vi.mock('@/utils/api');

// Mock the auth context
const mockUser = {
  _id: 'user1',
  email: 'test@example.com',
  firstName: 'Test',
  lastName: 'User',
  role: 'customer' as const,
  createdAt: '2023-01-01T00:00:00Z',
  updatedAt: '2023-01-01T00:00:00Z',
};

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: mockUser,
  }),
}));

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
};

describe('useCart', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetches cart data for authenticated user', async () => {
    const mockCartData = {
      items: [
        {
          productId: 'product1',
          product: {
            _id: 'product1',
            name: 'Test Product',
            price: 29.99,
            images: ['test.jpg'],
            inventory: 10,
          },
          quantity: 2,
          price: 29.99,
        },
      ],
      totalAmount: 59.98,
    };

    vi.mocked(api.get).mockResolvedValue({
      data: { data: mockCartData },
    });

    const { result } = renderHook(() => useCart(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.cart).toEqual(mockCartData);
    });

    expect(api.get).toHaveBeenCalledWith('/cart/user1');
  });

  it('adds item to cart', async () => {
    vi.mocked(api.post).mockResolvedValue({
      data: { data: {} },
    });

    const { result } = renderHook(() => useCart(), {
      wrapper: createWrapper(),
    });

    result.current.addToCart('product1', 2);

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/cart/user1/items', {
        productId: 'product1',
        quantity: 2,
      });
    });
  });

  it('updates cart item quantity', async () => {
    vi.mocked(api.put).mockResolvedValue({
      data: { data: {} },
    });

    const { result } = renderHook(() => useCart(), {
      wrapper: createWrapper(),
    });

    result.current.updateCartItem('item1', 3);

    await waitFor(() => {
      expect(api.put).toHaveBeenCalledWith('/cart/user1/items/item1', {
        quantity: 3,
      });
    });
  });

  it('removes item from cart', async () => {
    vi.mocked(api.delete).mockResolvedValue({
      data: { data: {} },
    });

    const { result } = renderHook(() => useCart(), {
      wrapper: createWrapper(),
    });

    result.current.removeFromCart('item1');

    await waitFor(() => {
      expect(api.delete).toHaveBeenCalledWith('/cart/user1/items/item1');
    });
  });
});