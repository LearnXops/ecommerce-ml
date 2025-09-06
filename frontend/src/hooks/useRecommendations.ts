import { useState, useEffect, useCallback } from 'react';
import { recommendationApi } from '@/utils/api';
import { Recommendation, UserInteraction } from '@/types';
import { useAuth } from '@/contexts/AuthContext';

export const useRecommendations = (limit: number = 10) => {
  const { user } = useAuth();
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchRecommendations = useCallback(async () => {
    if (!user?._id) return;

    setLoading(true);
    setError(null);

    try {
      const response = await recommendationApi.getRecommendations(user._id, limit);
      if (response.success) {
        setRecommendations(response.data || []);
      } else {
        setError('Failed to load recommendations');
        setRecommendations([]);
      }
    } catch (err) {
      setError('Failed to load recommendations');
      setRecommendations([]);
    } finally {
      setLoading(false);
    }
  }, [user?._id, limit]);

  const trackInteraction = useCallback(async (
    productId: string, 
    interactionType: UserInteraction['interactionType']
  ) => {
    if (!user?._id) return;

    const sessionId = sessionStorage.getItem('sessionId') || 
      Math.random().toString(36).substring(2, 15);
    
    if (!sessionStorage.getItem('sessionId')) {
      sessionStorage.setItem('sessionId', sessionId);
    }

    await recommendationApi.trackInteraction({
      userId: user._id,
      productId,
      interactionType,
      sessionId
    });

    // Refresh recommendations after purchase interactions
    if (interactionType === 'purchase') {
      setTimeout(fetchRecommendations, 1000);
    }
  }, [user?._id, fetchRecommendations]);

  useEffect(() => {
    fetchRecommendations();
  }, [fetchRecommendations]);

  return {
    recommendations,
    loading,
    error,
    refetch: fetchRecommendations,
    trackInteraction
  };
};