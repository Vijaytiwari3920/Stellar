export const DEFAULT_DIVIDEND_CONTRACT_ID = 'CBUQHQJ2CAXLEB4MOPZNTDBSGH6SDVNSVDOTQVJJ2RTPZIYXUVDJT2ND';
const STORAGE_KEY = 'risein.dividendContractId';

export const getDividendContractStatus = (contractId) => {
  const configured = Boolean(contractId && contractId !== DEFAULT_DIVIDEND_CONTRACT_ID);

  return {
    configured,
    label: configured ? '✅ Active' : '⚠️ Not Deployed',
  };
};

export const resolveDividendContractId = (explicitContractId, fallbackContractId) => {
  const normalizedExplicit = explicitContractId?.trim();
  const normalizedFallback = fallbackContractId?.trim();

  if (normalizedExplicit && normalizedExplicit !== DEFAULT_DIVIDEND_CONTRACT_ID) {
    return normalizedExplicit;
  }

  if (typeof window !== 'undefined') {
    const storedContractId = window.localStorage.getItem(STORAGE_KEY)?.trim();
    if (storedContractId && storedContractId !== DEFAULT_DIVIDEND_CONTRACT_ID) {
      return storedContractId;
    }
  }

  if (typeof process !== 'undefined' && process.env?.REACT_APP_DIVIDEND_CONTRACT_ID) {
    const envContractId = process.env.REACT_APP_DIVIDEND_CONTRACT_ID.trim();
    if (envContractId && envContractId !== DEFAULT_DIVIDEND_CONTRACT_ID) {
      return envContractId;
    }
  }

  return normalizedFallback || DEFAULT_DIVIDEND_CONTRACT_ID;
};

export const persistDividendContractId = (contractId) => {
  const normalizedContractId = contractId?.trim();

  if (typeof window !== 'undefined' && normalizedContractId) {
    window.localStorage.setItem(STORAGE_KEY, normalizedContractId);
  }

  return normalizedContractId || DEFAULT_DIVIDEND_CONTRACT_ID;
};
