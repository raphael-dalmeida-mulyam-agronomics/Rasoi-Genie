import { CONFIG } from '../../constants/config';

describe('App Configuration', () => {
  it('should have valid API base URL and default settings', () => {
    expect(CONFIG.apiBaseUrl).toBeDefined();
    expect(CONFIG.env).toBeDefined();
    expect(typeof CONFIG.enableMockApi).toBe('boolean');
    expect(typeof CONFIG.analyticsEnabled).toBe('boolean');
  });
});
