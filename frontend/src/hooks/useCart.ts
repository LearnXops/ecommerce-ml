import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Cart, CartItem } from '@/types';
import { api } from '@/utils/api';
import { useAuth } from '@/contexts/AuthContext';

export const useCart = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: cart, isLoading } = useQuery({
    queryKey: ['cart', user?._id],
    queryFn: async () => {
      if (!user) return null;
      const response = await api.get(`/cart/${user._id}`);
      return response.data.data as Cart;
    },
    enabled: !!user,
  });

  const addToCartMutation = useMutation({
    mutationFn: async ({ productId, quantity }: { productId: string; quantity: number }) => {
      if (!user) throw new Error('User not authenticated');
      const response = await api.post(`/cart/${user._id}/items`, {
        productId,
        quantity,
      });
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cart', user?._id] });
    },
  });

  const updateCartItemMutation = useMutation({
    mutationFn: async ({ itemId, quantity }: { itemId: string; quantity: number }) => {
      if (!user) throw new Error('User not authenticated');
      const response = await api.put(`/cart/${user._id}/items/${itemId}`, {
        quantity,
      });
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cart', user?._id] });
    },
  });

  const removeFromCartMutation = useMutation({
    mutationFn: async (itemId: string) => {
      if (!user) throw new Error('User not authenticated');
      const response = await api.delete(`/cart/${user._id}/items/${itemId}`);
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cart', user?._id] });
    },
  });

  const clearCartMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('User not authenticated');
      const response = await api.delete(`/cart/${user._id}`);
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cart', user?._id] });
    },
  });

  const addToCart = (productId: string, quantity: number) => {
    addToCartMutation.mutate({ productId, quantity });
  };

  const updateCartItem = (itemId: string, quantity: number) => {
    updateCartItemMutation.mutate({ itemId, quantity });
  };

  const removeFromCart = (itemId: string) => {
    removeFromCartMutation.mutate(itemId);
  };

  const clearCart = async () => {
    return clearCartMutation.mutateAsync();
  };

  return {
    cart,
    isLoading,
    addToCart,
    updateCartItem,
    removeFromCart,
    clearCart,
    isUpdating: addToCartMutation.isPending || 
                updateCartItemMutation.isPending || 
                removeFromCartMutation.isPending ||
                clearCartMutation.isPending,
  };
};