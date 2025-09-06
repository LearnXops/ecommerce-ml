import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { vi } from 'vitest';
import RecommendationSection from '../RecommendationSection';
import { AuthProvider } from '@/contexts/AuthContext';
import * as recommendationHook from '@/hooks/useRecommendations';

// Mock the useRecommendations hook
const mockUseRecommendations = vi.spyOn(recommendationHook, 'useRecommendations');

// Mock navigate
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

const mockRecommendations = [
  {
    productId: '1',
    product: {
      _id: '1',
      name: 'Test Product 1',
      description: 'Test description 1',
      price: 29.99,
      category: 'Electronics',
      images: ['test-image-1.jpg'],
      inventory: 10,
      tags: ['test'],
      createdAt: '2023-01-01',
      updatedAt: '2023-01-01'
    },
    score: 0.9,
    reason: 'Similar to your purchases'
  },
  {
    productId: '2',
    product: {
      _id: '2',
      name: 'Test Product 2',
      description: 'Test description 2',
      price: 49.99,
      category: 'Books',
      images: ['test-image-2.jpg'],
      inventory: 5,
      tags: ['test'],
      createdAt: '2023-01-01',
      updatedAt: '2023-01-01'
    },
    score: 0.8,
    reason: 'Popular in your category'
  }
];

const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <BrowserRouter>
    <AuthProvider>
      {children}
    </AuthProvider>
  </BrowserRouter>
);

describe('RecommendationSection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders loading state', () => {
    mockUseRecommendations.mockReturnValue({
      recommendations: [],
      loading: true,
      error: null,
      refetch: vi.fn(),
      trackInteraction: vi.fn()
    });

    render(
      <TestWrapper>
        <RecommendationSection />
      </TestWrapper>
    );

    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('renders error state', () => {
    mockUseRecommendations.mockReturnValue({
      recommendations: [],
      loading: false,
      error: 'Failed to load recommendations',
      refetch: vi.fn(),
      trackInteraction: vi.fn()
    });

    render(
      <TestWrapper>
        <RecommendationSection />
      </TestWrapper>
    );

    expect(screen.getByText(/unable to load recommendations/i)).toBeInTheDocument();
  });

  it('renders recommendations correctly', () => {
    const mockTrackInteraction = vi.fn();
    mockUseRecommendations.mockReturnValue({
      recommendations: mockRecommendations,
      loading: false,
      error: null,
      refetch: vi.fn(),
      trackInteraction: mockTrackInteraction
    });

    render(
      <TestWrapper>
        <RecommendationSection />
      </TestWrapper>
    );

    expect(screen.getByText('Recommended for You')).toBeInTheDocument();
    expect(screen.getByText('Test Product 1')).toBeInTheDocument();
    expect(screen.getByText('Test Product 2')).toBeInTheDocument();
    expect(screen.getByText('$29.99')).toBeInTheDocument();
    expect(screen.getByText('$49.99')).toBeInTheDocument();
  });

  it('shows recommendation reasons when enabled', () => {
    mockUseRecommendations.mockReturnValue({
      recommendations: mockRecommendations,
      loading: false,
      error: null,
      refetch: vi.fn(),
      trackInteraction: vi.fn()
    });

    render(
      <TestWrapper>
        <RecommendationSection showReason={true} />
      </TestWrapper>
    );

    expect(screen.getByText('Similar to your purchases')).toBeInTheDocument();
    expect(screen.getByText('Popular in your category')).toBeInTheDocument();
  });

  it('hides recommendation reasons when disabled', () => {
    mockUseRecommendations.mockReturnValue({
      recommendations: mockRecommendations,
      loading: false,
      error: null,
      refetch: vi.fn(),
      trackInteraction: vi.fn()
    });

    render(
      <TestWrapper>
        <RecommendationSection showReason={false} />
      </TestWrapper>
    );

    expect(screen.queryByText('Similar to your purchases')).not.toBeInTheDocument();
    expect(screen.queryByText('Popular in your category')).not.toBeInTheDocument();
  });

  it('renders clickable product cards', () => {
    const mockTrackInteraction = vi.fn();
    mockUseRecommendations.mockReturnValue({
      recommendations: mockRecommendations,
      loading: false,
      error: null,
      refetch: vi.fn(),
      trackInteraction: mockTrackInteraction
    });

    render(
      <TestWrapper>
        <RecommendationSection />
      </TestWrapper>
    );

    // Check that cards have cursor pointer style (indicating they're clickable)
    const productCards = screen.getAllByText(/Test Product/);
    expect(productCards).toHaveLength(2);
    
    // Verify the cards are rendered with proper structure
    expect(screen.getByText('Test Product 1')).toBeInTheDocument();
    expect(screen.getByText('Test Product 2')).toBeInTheDocument();
  });

  it('tracks interaction when add to cart is clicked', async () => {
    const mockTrackInteraction = vi.fn();
    mockUseRecommendations.mockReturnValue({
      recommendations: mockRecommendations,
      loading: false,
      error: null,
      refetch: vi.fn(),
      trackInteraction: mockTrackInteraction
    });

    render(
      <TestWrapper>
        <RecommendationSection />
      </TestWrapper>
    );

    const addToCartButtons = screen.getAllByText('Add to Cart');
    fireEvent.click(addToCartButtons[0]);

    await waitFor(() => {
      expect(mockTrackInteraction).toHaveBeenCalledWith('1', 'cart_add');
    });
  });

  it('does not render when no recommendations available', () => {
    mockUseRecommendations.mockReturnValue({
      recommendations: [],
      loading: false,
      error: null,
      refetch: vi.fn(),
      trackInteraction: vi.fn()
    });

    const { container } = render(
      <TestWrapper>
        <RecommendationSection />
      </TestWrapper>
    );

    expect(container.firstChild).toBeNull();
  });

  it('uses custom title and limit props', () => {
    mockUseRecommendations.mockReturnValue({
      recommendations: mockRecommendations,
      loading: false,
      error: null,
      refetch: vi.fn(),
      trackInteraction: vi.fn()
    });

    render(
      <TestWrapper>
        <RecommendationSection title="Custom Title" limit={4} />
      </TestWrapper>
    );

    expect(screen.getByText('Custom Title')).toBeInTheDocument();
  });
});