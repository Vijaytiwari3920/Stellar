# Stellar Connect Wallet

Welcome to the **Stellar Connect Wallet**, a production-oriented React dApp for real-world asset investing on Stellar. The platform now combines wallet-native onboarding, transaction workflows, and a stronger Soroban contract foundation designed around RWA-style yield distribution and investor participation.

---

## 🚀 Features & Implementation Details

### 🎨 Futuristic Light Theme & Glassmorphism UI
The entire application features a custom, modern design utilizing a soft gradient background, translucent "glass" cards (`backdrop-filter`), and vibrant electric blue accents. It is styled around the **Nexus RWA Platform** concept, providing a premium, institutional-grade user experience for testnet demonstrations.

### 1. Wallet Setup & Configuration
- Configured to interact exclusively with the **Stellar Testnet**.
- Secure integration with the **Freighter Wallet** browser extension.
- **Session Persistence**: The application utilizes Local Storage to persist the connected wallet address, allowing users to remain logged in across page reloads without having to reconnect Freighter manually.
- No private keys are ever exposed to the application.

---

### 2. Wallet Connection Management
- Connect to the Freighter wallet with a single click.
- Retrieve and display the user's Stellar public address alongside a distinct "Connected" badge.
- Secure wallet disconnect functionality which properly clears session data.
- React state management for robust session handling.

---

### 3. Real-time Balance Handling
Once the wallet is connected, the application asynchronously communicates with the Stellar Horizon server to fetch live account data. The user's **native XLM balance** is automatically parsed and displayed clearly within the application's futuristic topbar, providing immediate visibility into their testnet funds.

---

### 4. Sending XLM Payments
The application features a dedicated **Payment Form** that allows users to send native XLM to any Stellar Testnet address. It handles sequence number resolution via the Horizon API, builds the `payment` operation, requests a signature from Freighter, and seamlessly submits the transaction with full success/failure status tracking.

---

### 5. Transaction History
A newly integrated **Transaction History** component automatically queries the Horizon API to fetch the last 5 transactions for the connected wallet. It displays the date, status, fee, and provides a direct, clickable link to the Stellar Expert explorer for each transaction hash.

---

### 6. Soroban Smart Contract Integration & RWA Features

The application features a dedicated **Contract Interaction UI** split into two primary areas:

#### 🏢 Commercial Real Estate (RWA Dividend Vault)
This section simulates an institutional-grade investment into a tokenized commercial building (Downtown Office Complex):
- **KYC Integration**: Simulates an Identity Verification checkpoint. Users cannot claim dividends unless their KYC status is marked as 'Approved' (which can be simulated via the UI).
- **Dynamic Contract Input**: Users can dynamically input, save, and persist a customized Dividend Contract ID via the UI (backed by Local Storage and environment variables).
- **Yield Tracking**: Displays unclaimed yield (simulated as USDC) and supports interaction with the dividend claim endpoint once a valid contract is deployed and linked.

#### ⚙️ Dev Tool (Counter Contract)
- Preserved as a lightweight testnet interaction example.
- Demonstrates basic contract state updates and reads by incrementing a simple on-chain counter.

---

### 7. Development Standards
- Responsive UI with loading states that disable buttons during asynchronous operations to prevent duplicate transactions.
- Clean separation of concerns between UI components (`ContractInteract`, `PaymentForm`, `TransactionHistory`, `contractStatus`) and the underlying wallet logic.
- Robust Error Handling gracefully handling edge cases such as wallet permission denials, empty accounts, or network timeouts.
- Freighter API Integration leveraging `@stellar/stellar-sdk` and `@creit.tech/stellar-wallets-kit`.

---


# 📄 Project Information

### Network
- Stellar Testnet

### Wallet
- Freighter Wallet

### Smart Contracts

This application interacts with Soroban Smart Contracts on the Stellar Testnet. Below is a detailed description of each contract, how it works, and its role in the ecosystem.

#### 1. Dividend Vault Contract (RWA Simulation)
**Contract ID**:
```text
CD7LU2KVEVJSWXOOWX6DIOKKDZJ7K4EP6Z4GMKB6LN3FZXASTVD64E5W
```
- **Source Module**: `contracts/dividend_vault`
- **Purpose**: Acts as the core RWA (Real World Asset) contract, simulating a tokenized commercial real estate investment where token holders earn proportional yields (dividends) based on their balances.
- **Core Mechanics & Functions**: 
  - **Initialization (`initialize`)**: Sets an admin, an initial supply of tokens, and starts the global yield index at 0.
  - **Minting & Burning (`mint`, `burn`)**: Allows the admin to mint new tokens to users, and users to burn tokens. The contract automatically updates a user's pending rewards before changing their balance to ensure fair distribution.
  - **Transferring (`transfer`)**: Users can transfer their token balances to others. This triggers a recalculation of both the sender's and receiver's pending rewards to reflect their changing holdings.
  - **Yield Accrual (`deposit_yield`)**: The admin deposits a yield amount into the vault. This increases a `GlobalYieldIndex` proportionally by the deposit amount divided by the total supply. This constant-time distribution algorithm ensures yield accrues to all holders immediately without needing to iterate over every user.
  - **Dividend Claims (`claim_dividend`)**: Users can claim their accumulated dividend rewards. The contract calculates pending rewards based on the global index, resets their unclaimed balance, and processes the simulated payout.
  - **View Functions**: Provides `get_pending_dividend` for the React UI to read a user's currently accumulated but unclaimed dividends without incurring gas fees, alongside `get_balance` and `get_total_supply`.
- **Role**: Demonstrates institutional-grade asset management, simulating KYC restrictions, yield distribution, and tokenized fractional ownership on the Stellar network.

#### 2. Counter Contract
**Contract ID**:
```text
CDNNLMU7MGN7OXZIMOC6FE54XWKMYQSRQKWC4YSMGXTCH2DA4RV5M7QU
```
- **Purpose**: A lightweight, stateful contract used as a developer tool to verify network connectivity and state mutation.
- **How it Works**:
  - **State Mutation**: Exposes an `increment` method that securely modifies the blockchain state by reading the current counter, adding one, and saving it back to the ledger.
  - **State Reading**: Exposes a `get_count` method to read the current integer value.
- **Role**: Used in the application's "Dev Tool" section to ensure the Freighter wallet can successfully sign, submit, and confirm state-changing transactions.

---

### Live Application
- https://projectsteller.netlify.app/


# 📷 Screenshots

<video src="./Screenshorts/Web.mp4" width="100%" controls></video>
---

## 🛠 Tech Stack
- React.js
- Stellar SDK
- Freighter API
- Soroban Smart Contracts
- Horizon API
- JavaScript
- CSS

---


## ⭐ Future Improvements
- Secure admin controls and multi-signature governance
- Real USDC/SAC integration for on-chain payouts
- Advanced investor analytics and portfolio tracking
- Mainnet deployment and compliance workflow integration
- Expanded asset classes and marketplace features
  