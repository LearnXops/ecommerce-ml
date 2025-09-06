import { renderHook, act, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import { useRecommendations } from '../useRecommendations';
import * as api from '@/utils/api';
import { AuthProvider } from '@/contexts/AuthContext';
import React from 'react';

// Mock the API
vi.mock('@/utils/api', () => ({
  recommendationApi: {
    getRecommendations: vi.fn(),
    trackInteraction: vi.fn()
  }
}));

// Mock AuthContext
const mockUser = {
  _id: 'user123',
  email: 'test@example.com',
  firstName: 'Test',
  lastName: 'User',
  role: 'customer' as const,
  createdAt: '2023-01-01',
  updatedAt: '2023-01-01'
};

const mockAuthContext = {
  user: mockUser,
  login: vi.fn(),
  register: vi.fn(),
  logout: vi.fn(),
  loading: false
};

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => mockAuthContext,
  AuthProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>
}));

const mockRecommendations = [
  {
    productId: '1',
    product: {
      _id: '1',
      name: 'Test Product 1',
      description: 'Test description',
      price: 29.99,
      category: 'Electronics',
      images: ['test.jpg'],
      inventory: 10,
      tags: ['test'],
      createdAt: '2023-01-01',
      updatedAt: '2023-01-01'
    },
    score: 0.9,
    reason: 'Similar to your purchases'
  }
];

describe('useRecommendations', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Clear sessionStorage
    sessionStorage.clear();
  });

  it('fetches recommendations on mount', async () => {
    const mockGetRecommendations = vi.spyOn(api.recommendationApi, 'getRecommendations')
      .mockResolvedValue({
        success: true,
        data: mockRecommendations,
        user_id: 'user123',
        count: 1
      });

    const { result } = renderHook(() => useRecommendations(10));

    expect(result.current.loading).toBe(true);

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(mockGetRecommendations).toHaveBeenCalledWith('user123', 10);
    expect(result.current.recommendations).toEqual(mockRecommendations);
    expect(result.current.error).toBeNull();
  });

  it('handles API errors gracefully', async () => {
    const mockGetRecommendations = vi.spyOn(api.recommendationApi, 'getRecommendations')
      .mockRejectedValue(new Error('API Error'));

    const { result } = renderHook(() => useRecommendations());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.recommendations).toEqual([]);
    expect(result.current.error).toBe('Failed to load recommendations');
  });

  it('handles unsuccessful API response', async () => {
    const mockGetRecommendations = vi.spyOn(api.recommendationApi, 'getRecommendations')
      .mockResolvedValue({
        success: false,
        data: null,
        user_id: 'user123',
        count: 0
      });

    const { result } = renderHook(() => useRecommendations());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.recommendations).toEqual([]);
    expect(result.current.error).toBe('Failed to load recommendations');
  });

  it('does not fetch recommendations when user is not logged in', () => {
    // Mock no user
    mockAuthContext.user = null;
    
    const mockGetRecommendations = vi.spyOn(api.recommendationApi, 'getRecommendations');

    renderHook(() => useRecommendations());

    expect(mockGetRecommendations).not.toHaveBeenCalled();
  });

  it('tracks interactions correctly', async () => {
    const mockTrackInteraction = vi.spyOn(api.recommendationApi, 'trackInteraction')
      .mockResolvedValue({ success: true });

    vi.spyOn(api.recommendationApi, 'getRecommendations')
      .mockResolvedValue({
        success: true,
        data: mockRecommendations,
        user_id: 'user123',
        count: 1
      });

    const { result } = renderHook(() => useRecommendations());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    await act(async () => {
      await result.current.trackInteraction('product123', 'view');
    });

    expect(mockTrackInteraction).toHaveBeenCalledWith({
      userId: 'user123',
      productId: 'product123',
      interactionType: 'view',
      sessionId: expect.any(String)
    });
  });

  it('generates and stores session ID', async () => {
    const mockTrackInteraction = vi.spyOn(api.recommendationApi, 'trackInteraction')
      .mockResolvedValue({ success: true });

    vi.spyOn(api.recommendationApi, 'getRecommendations')
      .mockResolvedValue({
        success: true,
        data: mockRecommendations,
        user_id: 'user123',
        count: 1
      });

    const { result } = renderHook(() => useRecommendations());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    await act(async () => {
      await result.current.trackInteraction('product123', 'view');
    });

    // Check that session ID was stored
    expect(sessionStorage.getItem('sessionId')).toBeTruthy();
  });

  it('refreshes recommendations after purchase interaction', async () => {
    const mockGetRecommendations = vi.spyOn(api.recommendationApi, 'getRecommendations')
      .mockResolvedValue({
        success: true,
        data: mockRecommendations,
        user_id: 'user123',
        count: 1
      });

    const mockTrackInteraction = vi.spyOn(api.recommendationApi, 'trackInteraction')
      .mockResolvedValue({ success: true });

    const { result } = renderHook(() => useRecommendations());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Clear the initial call
    mockGetRecommendations.mockClear();

    await act(async () => {
      await result.current.trackInteraction('product123', 'purchase');
    });

    // Wait for the delayed refetch
    await waitFor(() => {
      expect(mockGetRecommendations).toHaveBeenCalledTimes(1);
    }, { timeout: 2000 });
  });

  it('refetch function works correctly', async () => {
    const mockGetRecommendations = vi.spyOn(api.recommendationApi, 'getRecommendations')
      .mockResolvedValue({
        success: true,
        data: mockRecommendations,
        user_id: 'user123',
        count: 1
      });

    const { result } = renderHook(() => useRecommendations());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Clear the initial call
    mockGetRecommendations.mockClear();

    await act(async () => {
      await result.current.refetch();
    });

    expect(mockGetRecommendations).toHaveBeenCalledTimes(1);
  });

  // Restore user for other tests
  afterEach(() => {
    mockAuthContext.user = mockUser;
  });
});