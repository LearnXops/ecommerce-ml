declare class DatabaseConnection {
    private static instance;
    private isConnected;
    private connectionString;
    private options;
    private constructor();
    static getInstance(): DatabaseConnection;
    connect(): Promise<void>;
    disconnect(): Promise<void>;
    getConnectionStatus(): boolean;
    healthCheck(): Promise<{
        status: string;
        message: string;
    }>;
    private delay;
}
export declare const dbConnection: DatabaseConnection;
export default dbConnection;
//# sourceMappingURL=connection.d.ts.map