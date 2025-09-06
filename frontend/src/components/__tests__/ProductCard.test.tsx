import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, fireEvent } from '@testing-library/react';
import { render } from '@/test/utils';
import ProductCard from '@/components/ProductCard';
import { Product } from '@/types';

// Mock the hooks
vi.mock('@/hooks/useCart', () => ({
  useCart: () => ({
    addToCart: vi.fn(),
  }),
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom') as any;
  return {
    ...actual,
    useNavigate: () => vi.fn(),
  };
});

const mockProduct: Product = {
  _id: '1',
  name: 'Test Product',
  description: 'This is a test product description',
  price: 29.99,
  category: 'Electronics',
  images: ['test-image.jpg'],
  inventory: 10,
  tags: ['test', 'product'],
  createdAt: '2023-01-01T00:00:00Z',
  updatedAt: '2023-01-01T00:00:00Z',
};

describe('ProductCard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders product information correctly', () => {
    render(<ProductCard product={mockProduct} />);

    expect(screen.getByText('Test Product')).toBeInTheDocument();
    expect(screen.getByText('$29.99')).toBeInTheDocument();
    expect(screen.getByText('Electronics')).toBeInTheDocument();
    expect(screen.getByText('In stock: 10')).toBeInTheDocument();
  });

  it('truncates long descriptions', () => {
    const longDescriptionProduct = {
      ...mockProduct,
      description: 'A'.repeat(150),
    };

    render(<ProductCard product={longDescriptionProduct} />);

    const description = screen.getByText(/A{100}\.\.\.$/);
    expect(description).toBeInTheDocument();
  });

  it('disables add to cart button when out of stock', () => {
    const outOfStockProduct = {
      ...mockProduct,
      inventory: 0,
    };

    render(<ProductCard product={outOfStockProduct} />);

    const addToCartButton = screen.getByRole('button', { name: /add to cart/i });
    expect(addToCartButton).toBeDisabled();
  });

  it('calls addToCart when button is clicked', () => {
    const mockAddToCart = vi.fn();
    vi.mocked(require('@/hooks/useCart').useCart).mockReturnValue({
      addToCart: mockAddToCart,
    });

    render(<ProductCard product={mockProduct} />);

    const addToCartButton = screen.getByRole('button', { name: /add to cart/i });
    fireEvent.click(addToCartButton);

    expect(mockAddToCart).toHaveBeenCalledWith('1', 1);
  });
});