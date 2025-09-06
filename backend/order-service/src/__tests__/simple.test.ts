describe('Order Service Setup', () => {
  it('should be properly configured', () => {
    expect(true).toBe(true);
  });

  it('should have environment variables set', () => {
    expect(process.env['NODE_ENV']).toBe('test');
    expect(process.env['JWT_SECRET']).toBe('test-jwt-secret-key');
  });
});