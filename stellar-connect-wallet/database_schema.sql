-- 1. Users Table (Core Identity)
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    stellar_wallet_address VARCHAR(56) UNIQUE NOT NULL, -- e.g. G...
    email VARCHAR(255) UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. KYC / Compliance States
-- This table tracks the verification status for regulatory compliance.
CREATE TABLE kyc_status (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    provider VARCHAR(50), -- e.g., 'Sumsub', 'Persona'
    verification_status VARCHAR(20) NOT NULL DEFAULT 'PENDING', -- PENDING, APPROVED, REJECTED
    country_of_residence VARCHAR(2), -- ISO 3166-1 alpha-2 code
    is_accredited_investor BOOLEAN DEFAULT FALSE,
    verified_at TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE, -- For annual re-verification requirements
    rejection_reason TEXT
);

-- 3. Assets (The Real Estate or High-Yield Vehicles)
CREATE TABLE assets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    stellar_asset_code VARCHAR(12) NOT NULL, -- e.g., 'BLDG1'
    stellar_issuer_address VARCHAR(56) NOT NULL, -- The master wallet that issued the token
    asset_name VARCHAR(100) NOT NULL, -- e.g., 'Downtown Office Complex'
    asset_type VARCHAR(50) NOT NULL, -- 'Commercial Real Estate', 'Solar Farm', etc.
    total_supply DECIMAL(20, 7) NOT NULL,
    expected_annual_yield DECIMAL(5, 2), -- e.g., 8.50 for 8.5%
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(stellar_asset_code, stellar_issuer_address)
);

-- 4. Dividend Distributions (Audit Trail)
-- Logs when the asset manager deposits USDC yield for distribution.
CREATE TABLE dividend_distributions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    asset_id UUID REFERENCES assets(id) ON DELETE RESTRICT,
    distribution_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    total_amount_usdc DECIMAL(20, 7) NOT NULL,
    tx_hash VARCHAR(64) UNIQUE NOT NULL, -- The Stellar TX hash of the manager's deposit to the contract
    notes TEXT
);

-- 5. User Transactions & Cap Table Snapshotting (Optional/Off-chain helper)
-- While the Soroban contract tracks balances, maintaining an off-chain ledger 
-- helps with fast UI rendering and traditional compliance reporting.
CREATE TABLE investor_balances (
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    asset_id UUID REFERENCES assets(id) ON DELETE CASCADE,
    balance DECIMAL(20, 7) NOT NULL DEFAULT 0,
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, asset_id)
);

-- 6. Webhook Audit Logs
-- Extremely important for compliance officers to prove *when* and *why* 
-- a user's KYC state was updated by the third-party provider.
CREATE TABLE webhook_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider VARCHAR(50) NOT NULL,
    payload JSONB NOT NULL,
    processed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create some indexes for fast querying
CREATE INDEX idx_users_wallet ON users(stellar_wallet_address);
CREATE INDEX idx_kyc_status ON kyc_status(verification_status);
CREATE INDEX idx_asset_code ON assets(stellar_asset_code);
