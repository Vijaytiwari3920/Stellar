require('dotenv').config();
const { Pool } = require('pg');
const StellarSdk = require('@stellar/stellar-sdk');

// Initialize PostgreSQL Connection Pool
const pool = new Pool({
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'stellar_compliance',
    password: process.env.DB_PASSWORD || 'password',
    port: process.env.DB_PORT || 5432,
});

// Admin Keys for the Stellar Asset Issuer (Use Testnet for now)
// WARNING: Never hardcode private keys in production.
const ISSUER_SECRET = process.env.ISSUER_SECRET || "S_YOUR_ISSUER_SECRET_KEY"; 
const server = new StellarSdk.rpc.Server("https://soroban-testnet.stellar.org");
const networkPassphrase = StellarSdk.Networks.TESTNET;

/**
 * 1. Webhook Listener (Mock)
 * This function simulates receiving an HTTP POST request from a KYC provider (e.g., Sumsub/Persona).
 * When a user passes KYC, the provider sends a webhook to this endpoint.
 */
async function handleKycWebhook(payload) {
    console.log(`[Webhook Received] KYC Status Update for user: ${payload.email}`);
    
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // Step 1: Log the immutable webhook payload for auditors
        await client.query(
            `INSERT INTO webhook_logs (provider, payload) VALUES ($1, $2)`,
            ['Sumsub', payload]
        );

        // Step 2: Ensure User exists in our DB
        let userRes = await client.query(
            `SELECT id, stellar_wallet_address FROM users WHERE email = $1`,
            [payload.email]
        );

        let userId, walletAddress;

        if (userRes.rows.length === 0) {
            // Create user if they don't exist yet
            const insertUser = await client.query(
                `INSERT INTO users (stellar_wallet_address, email) VALUES ($1, $2) RETURNING id`,
                [payload.stellarWallet, payload.email]
            );
            userId = insertUser.rows[0].id;
            walletAddress = payload.stellarWallet;
            
            // Create pending KYC record
            await client.query(
                `INSERT INTO kyc_status (user_id, provider, verification_status) VALUES ($1, $2, $3)`,
                [userId, 'Sumsub', 'PENDING']
            );
        } else {
            userId = userRes.rows[0].id;
            walletAddress = userRes.rows[0].stellar_wallet_address;
        }

        // Step 3: Update their KYC status based on payload
        if (payload.reviewResult === 'GREEN_CODE') {
            await client.query(
                `UPDATE kyc_status SET verification_status = 'APPROVED', verified_at = CURRENT_TIMESTAMP WHERE user_id = $1`,
                [userId]
            );
            
            console.log(`[KYC Approved] User ${payload.email} passed KYC.`);
            
            // Step 4: Authorize the user's trustline on the Stellar ledger!
            await authorizeUserOnStellar(walletAddress);
        } else {
            await client.query(
                `UPDATE kyc_status SET verification_status = 'REJECTED', rejection_reason = $2 WHERE user_id = $1`,
                [userId, payload.rejectReason || 'Failed manual review']
            );
            console.log(`[KYC Rejected] User ${payload.email} failed KYC.`);
        }

        await client.query('COMMIT');
    } catch (e) {
        await client.query('ROLLBACK');
        console.error("Database transaction failed:", e);
    } finally {
        client.release();
    }
}

/**
 * 2. On-Chain Ledger Execution
 * When a user passes KYC, we must use our Issuer Master Key to flip their 'auth_required' flag 
 * for our specific Asset, allowing them to hold the property token and receive dividends.
 */
async function authorizeUserOnStellar(userWalletAddress) {
    if (ISSUER_SECRET === "S_YOUR_ISSUER_SECRET_KEY") {
        console.log(`[Stellar] Skipping on-chain authorization. Please provide a real ISSUER_SECRET.`);
        return;
    }

    console.log(`[Stellar] Authorizing trustline for wallet: ${userWalletAddress}`);
    try {
        const issuerKeyPair = StellarSdk.Keypair.fromSecret(ISSUER_SECRET);
        
        // Use Horizon to easily build the classic transaction for trustline authorization
        const horizon = new StellarSdk.Horizon.Server("https://horizon-testnet.stellar.org");
        const issuerAccount = await horizon.loadAccount(issuerKeyPair.publicKey());

        // In a real app, you'd pull the Asset Code from the database.
        const ASSET_CODE = "BLDG1"; 

        // SetTrustLineFlagsOperation requires the asset code, the user, and the specific flags
        const op = StellarSdk.Operation.setTrustLineFlags({
            trustor: userWalletAddress,
            asset: new StellarSdk.Asset(ASSET_CODE, issuerKeyPair.publicKey()),
            setFlags: StellarSdk.TrustLineFlags.AUTHORIZED_FLAG,
        });

        const tx = new StellarSdk.TransactionBuilder(issuerAccount, { fee: "1000", networkPassphrase })
            .addOperation(op)
            .setTimeout(30)
            .build();

        tx.sign(issuerKeyPair);

        console.log(`[Stellar] Submitting transaction to network...`);
        const response = await horizon.submitTransaction(tx);
        console.log(`[Stellar] Success! User is now authorized on-chain. TX Hash: ${response.hash}`);

    } catch (error) {
        console.error(`[Stellar] Failed to authorize user:`, error.response ? error.response.data : error);
    }
}

// ----------------------------------------------------
// Mock Execution to demonstrate how it works
// ----------------------------------------------------
async function runMock() {
    console.log("--- Starting Compliance Flow Test ---");
    
    // Simulate a successful KYC webhook hitting your server
    const mockWebhookPayload = {
        email: "investor@example.com",
        stellarWallet: "GBTC6BFR2B4BXYT3Q6VZXG66FZKZQKQZ2G4GQKZQKZQKZQKZQKZQKZQK", // Random valid G-address format
        reviewResult: "GREEN_CODE",
        docsMatched: true
    };

    await handleKycWebhook(mockWebhookPayload);
    console.log("--- Test Complete ---");
    pool.end();
}

// Uncomment to run the mock when executing this file directly
// runMock();

module.exports = {
    handleKycWebhook,
    authorizeUserOnStellar
};
