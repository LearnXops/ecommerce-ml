import { describe, it, expect, vi } from 'vitest';
import { screen } from '@testing-library/react';
import { render } from '@/test/utils';
import Layout from '@/components/Layout';

// Mock the hooks
vi.mock('@/hooks/useCart', () => ({
  useCart: () => ({
    cart: { items: [] },
  }),
}));

describe('Layout', () => {
  it('renders the app title', () => {
    render(
      <Layout>
        <div>Test Content</div>
      </Layout>
    );

    expect(screen.getByText('Ecommerce App')).toBeInTheDocument();
    expect(screen.getByText('Test Content')).toBeInTheDocument();
  });

  it('shows login and register buttons when user is not authenticated', () => {
    render(
      <Layout>
        <div>Test Content</div>
      </Layout>
    );

    expect(screen.getByText('Login')).toBeInTheDocument();
    expect(screen.getByText('Register')).toBeInTheDocument();
  });
});