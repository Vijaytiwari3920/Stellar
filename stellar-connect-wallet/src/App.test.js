import { render, screen } from '@testing-library/react';

jest.mock('./Components/Frighter', () => ({
  checkConnection: jest.fn(),
  retrievePublicKey: jest.fn(),
  getBalance: jest.fn(),
  userSignTransaction: jest.fn(),
}));

jest.mock('./Components/Header', () => ({
  __esModule: true,
  default: ({ publicKey }) => <div>{publicKey ? 'Connected' : 'Disconnected'}</div>,
}));

jest.mock('./Components/ContractInteract', () => ({
  __esModule: true,
  default: () => <div data-testid="contract-interact" />,
}));

jest.mock('./Components/PaymentForm', () => ({
  __esModule: true,
  default: () => <div data-testid="payment-form" />,
}));

jest.mock('./Components/TransactionHistory', () => ({
  __esModule: true,
  default: () => <div data-testid="transaction-history" />,
}));

import App from './App';

test('renders the main platform headline', () => {
  render(<App />);
  expect(screen.getByRole('heading', { name: /nexus rwa platform/i })).toBeInTheDocument();
});

test('shows the core value proposition for investors', () => {
  render(<App />);
  expect(screen.getByText(/institutional-grade rwa access for investors/i)).toBeInTheDocument();
});
