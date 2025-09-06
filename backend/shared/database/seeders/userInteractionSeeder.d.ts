export declare function seedUserInteractions(users?: any[], products?: any[]): Promise<any[]>;
export declare function createTestInteraction(userId: string, productId: string, interactionType: 'view' | 'cart_add' | 'purchase' | 'wishlist_add', overrides?: Partial<any>): Promise<any>;
export declare function generateRecommendationTrainingData(): Promise<any[]>;
//# sourceMappingURL=userInteractionSeeder.d.ts.map