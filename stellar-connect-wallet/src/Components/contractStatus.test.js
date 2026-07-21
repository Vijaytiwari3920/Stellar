import { DEFAULT_DIVIDEND_CONTRACT_ID, getDividendContractStatus, resolveDividendContractId } from './contractStatus';

describe('dividend contract status helper', () => {
  it('flags the placeholder contract as not deployed', () => {
    const status = getDividendContractStatus(DEFAULT_DIVIDEND_CONTRACT_ID);

    expect(status.configured).toBe(false);
    expect(status.label).toContain('Not Deployed');
  });

  it('flags a real contract id as active', () => {
    const status = getDividendContractStatus('CC1234567890ABCDEF');

    expect(status.configured).toBe(true);
    expect(status.label).toContain('Active');
  });

  it('prefers an explicit contract override over the placeholder fallback', () => {
    const resolved = resolveDividendContractId('CC1234567890ABCDEF', DEFAULT_DIVIDEND_CONTRACT_ID);

    expect(resolved).toBe('CC1234567890ABCDEF');
  });
});
