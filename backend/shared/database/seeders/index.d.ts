export interface SeedOptions {
    users?: boolean;
    products?: boolean;
    orders?: boolean;
    interactions?: boolean;
    clearExisting?: boolean;
}
export declare class DatabaseSeeder {
    private static instance;
    private constructor();
    static getInstance(): DatabaseSeeder;
    seedAll(options?: SeedOptions): Promise<void>;
    clearDatabase(): Promise<void>;
    seedUsers(): Promise<any[]>;
    seedProducts(): Promise<any[]>;
    seedOrders(users?: any[], products?: any[]): Promise<any[]>;
    seedUserInteractions(users?: any[], products?: any[]): Promise<any[]>;
}
export declare const databaseSeeder: DatabaseSeeder;
//# sourceMappingURL=index.d.ts.map