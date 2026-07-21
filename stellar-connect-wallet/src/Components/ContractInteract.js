import React, { useState, useEffect, useCallback } from 'react';
import * as StellarSdk from '@stellar/stellar-sdk';
import { userSignTransaction } from './Frighter';
import {
    DEFAULT_DIVIDEND_CONTRACT_ID,
    getDividendContractStatus,
    persistDividendContractId,
    resolveDividendContractId,
} from './contractStatus';

const COUNTER_CONTRACT_ID = 'CDNNLMU7MGN7OXZIMOC6FE54XWKMYQSRQKWC4YSMGXTCH2DA4RV5M7QU';
const rpcUrl = 'https://soroban-testnet.stellar.org';
const networkPassphrase = StellarSdk.Networks.TESTNET;
const server = new StellarSdk.rpc.Server(rpcUrl, { allowHttp: true });

const ContractInteract = ({ publicKey }) => {
    const [count, setCount] = useState(null);
    const [pendingDividend, setPendingDividend] = useState(null);
    const [status, setStatus] = useState('Idle');
    const [isIncrementing, setIsIncrementing] = useState(false);
    const [isClaiming, setIsClaiming] = useState(false);
    const [kycStatus, setKycStatus] = useState('Pending');
    const [contractReady, setContractReady] = useState(false);
    const [contractIdInput, setContractIdInput] = useState('');
    const [dividendContractId, setDividendContractId] = useState(() => resolveDividendContractId('', DEFAULT_DIVIDEND_CONTRACT_ID));

    const fetchCount = useCallback(async () => {
        if (!publicKey) return;

        try {
            const contract = new StellarSdk.Contract(COUNTER_CONTRACT_ID);
            const op = contract.call('get_count');
            const source = new StellarSdk.Account(publicKey, '0');
            const tx = new StellarSdk.TransactionBuilder(source, { fee: '100', networkPassphrase })
                .addOperation(op)
                .setTimeout(30)
                .build();
            const { result } = await server.simulateTransaction(tx);
            if (result && result.retval) {
                setCount(StellarSdk.scValToNative(result.retval));
            }
        } catch (e) {
            console.error('Error reading count:', e);
        }
    }, [publicKey]);

    const fetchPendingDividend = useCallback(async (resolvedContractId = dividendContractId) => {
        if (!publicKey || resolvedContractId === DEFAULT_DIVIDEND_CONTRACT_ID) return;

        try {
            const contract = new StellarSdk.Contract(resolvedContractId);
            const op = contract.call('get_pending_dividend', StellarSdk.nativeToScVal(publicKey, { type: 'address' }));
            const source = new StellarSdk.Account(publicKey, '0');
            const tx = new StellarSdk.TransactionBuilder(source, { fee: '100', networkPassphrase })
                .addOperation(op)
                .setTimeout(30)
                .build();
            const { result } = await server.simulateTransaction(tx);
            if (result && result.retval) {
                setPendingDividend(StellarSdk.scValToNative(result.retval));
            }
        } catch (e) {
            console.error('Error reading dividend:', e);
        }
    }, [publicKey, dividendContractId]);

    useEffect(() => {
        if (!publicKey) {
            setContractReady(false);
            return;
        }

        const nextContractId = resolveDividendContractId(contractIdInput, dividendContractId);
        const nextReady = getDividendContractStatus(nextContractId).configured;
        setDividendContractId(nextContractId);
        setContractReady(nextReady);
        fetchCount();
        fetchPendingDividend(nextContractId);
    }, [publicKey, contractIdInput, dividendContractId, fetchCount, fetchPendingDividend]);

    const submitTx = async (txXdr) => {
        const sendResponse = await server.sendTransaction(StellarSdk.TransactionBuilder.fromXDR(txXdr, networkPassphrase));
        if (sendResponse.errorResult) {
            throw new Error('Transaction submission failed: ' + JSON.stringify(sendResponse.errorResult));
        }

        let txResult;
        let attempt = 0;
        while (attempt < 15) {
            txResult = await server.getTransaction(sendResponse.hash);
            if (txResult.status !== 'NOT_FOUND') {
                break;
            }
            await new Promise((resolve) => setTimeout(resolve, 2000));
            attempt += 1;
        }

        if (txResult && txResult.status === 'SUCCESS') {
            return true;
        }

        throw new Error('Transaction failed or timed out on ledger');
    };

    const handleIncrement = async () => {
        if (!publicKey) {
            setStatus('Connect your wallet first');
            return;
        }

        setStatus('Pending...');
        setIsIncrementing(true);
        try {
            const horizon = new StellarSdk.Horizon.Server('https://horizon-testnet.stellar.org');
            const account = await horizon.loadAccount(publicKey);
            const contract = new StellarSdk.Contract(COUNTER_CONTRACT_ID);
            const op = contract.call('increment');
            let tx = new StellarSdk.TransactionBuilder(account, { fee: '1000', networkPassphrase })
                .addOperation(op)
                .setTimeout(30)
                .build();

            const sim = await server.simulateTransaction(tx);
            if (!StellarSdk.rpc.Api.isSimulationSuccess(sim)) {
                throw new Error('Simulation failed');
            }

            tx = StellarSdk.rpc.assembleTransaction(tx, sim).build();
            const signedTxXdr = await userSignTransaction(tx.toXDR(), 'TESTNET', publicKey);
            await submitTx(signedTxXdr);
            setStatus('Success!');
            fetchCount();
        } catch (e) {
            console.error(e);
            setStatus('Failed: ' + e.message);
        } finally {
            setIsIncrementing(false);
        }
    };

    const handleClaimDividend = async () => {
        if (!publicKey) {
            setStatus('Connect your wallet first');
            return;
        }

        if (!contractReady) {
            setStatus('Deploy the dividend contract first');
            return;
        }

        setStatus('Pending Claim...');
        setIsClaiming(true);
        try {
            const horizon = new StellarSdk.Horizon.Server('https://horizon-testnet.stellar.org');
            const account = await horizon.loadAccount(publicKey);
            const contract = new StellarSdk.Contract(dividendContractId);
            const op = contract.call('claim_dividend', StellarSdk.nativeToScVal(publicKey, { type: 'address' }));
            let tx = new StellarSdk.TransactionBuilder(account, { fee: '1000', networkPassphrase })
                .addOperation(op)
                .setTimeout(30)
                .build();

            const sim = await server.simulateTransaction(tx);
            if (!StellarSdk.rpc.Api.isSimulationSuccess(sim)) {
                throw new Error('Simulation failed. Ensure you have unclaimed dividends and the contract is initialized.');
            }

            tx = StellarSdk.rpc.assembleTransaction(tx, sim).build();
            const signedTxXdr = await userSignTransaction(tx.toXDR(), 'TESTNET', publicKey);
            await submitTx(signedTxXdr);
            setStatus('Dividend Claimed Successfully!');
            fetchPendingDividend();
        } catch (e) {
            console.error(e);
            setStatus('Failed: ' + e.message);
        } finally {
            setIsClaiming(false);
        }
    };

    const handleContractSave = () => {
        const resolved = persistDividendContractId(contractIdInput || dividendContractId);
        const nextReady = getDividendContractStatus(resolved).configured;
        setDividendContractId(resolved);
        setContractReady(nextReady);
        setStatus(`Using contract ${resolved}`);
        fetchPendingDividend(resolved);
    };

    return (
        <div className="glass-card" style={{ padding: '30px' }}>
            <h2 className="text-gradient" style={{ marginBottom: '30px' }}>Investor Dashboard</h2>

            {publicKey ? (
                <div>
                    <div style={{ marginBottom: '30px', padding: '20px', background: 'rgba(255,255,255,0.6)', borderRadius: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ textAlign: 'left' }}>
                            <h4 style={{ margin: '0 0 5px 0' }}>Identity Verification (KYC)</h4>
                            <p style={{ margin: 0, fontSize: '14px', color: '#555' }}>Required to hold RWA tokens</p>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                            <span style={{
                                padding: '6px 12px',
                                borderRadius: '20px',
                                fontSize: '14px',
                                fontWeight: 'bold',
                                backgroundColor: kycStatus === 'Approved' ? '#d4edda' : '#fff3cd',
                                color: kycStatus === 'Approved' ? '#155724' : '#856404'
                            }}>
                                {kycStatus}
                            </span>
                            {kycStatus === 'Pending' && (
                                <button onClick={() => setKycStatus('Approved')} className="btn-futuristic" style={{ padding: '8px 16px', fontSize: '14px' }}>
                                    Simulate Approval
                                </button>
                            )}
                        </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px', textAlign: 'left' }}>
                        <div style={{ padding: '20px', background: 'linear-gradient(145deg, rgba(255,255,255,0.8) 0%, rgba(240,245,255,0.8) 100%)', borderRadius: '16px', border: '1px solid #e0eafc' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px' }}>
                                <span style={{ background: '#3a7bd5', color: 'white', padding: '4px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold' }}>COMMERCIAL REAL ESTATE</span>
                                <span style={{ color: '#555', fontSize: '14px' }}>APY: 8.5%</span>
                            </div>
                            <h3 style={{ margin: '0 0 10px 0' }}>Downtown Office Complex</h3>
                            <p style={{ fontSize: '14px', color: '#666', marginBottom: '20px' }}>
                                A tokenized fractional share of a premium commercial building. Yield is paid out monthly in USDC.
                            </p>

                            <div style={{ background: 'rgba(255,255,255,0.5)', padding: '15px', borderRadius: '12px', marginBottom: '20px' }}>
                                <p style={{ margin: '0 0 5px 0', fontSize: '14px' }}>Contract Status: {getDividendContractStatus(dividendContractId).label}</p>
                                <p style={{ margin: '0', fontSize: '24px', fontWeight: 'bold', color: '#11998e' }}>
                                    {pendingDividend !== null ? `$${pendingDividend} USDC` : '$0.00 USDC'}
                                    <span style={{ fontSize: '12px', color: '#888', marginLeft: '8px' }}>Unclaimed Yield</span>
                                </p>
                            </div>

                            <div style={{ marginBottom: '15px' }}>
                                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '6px', color: '#444' }}>Dividend Contract ID</label>
                                <input
                                    value={contractIdInput || dividendContractId}
                                    onChange={(event) => setContractIdInput(event.target.value)}
                                    placeholder="Enter a deployed contract ID"
                                    style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: '1px solid #cbd5e1' }}
                                />
                                <button
                                    onClick={handleContractSave}
                                    className="btn-futuristic btn-secondary"
                                    style={{ width: '100%', marginTop: '10px', padding: '10px 14px' }}
                                >
                                    Save Contract
                                </button>
                            </div>

                            <button
                                onClick={handleClaimDividend}
                                disabled={isClaiming || !contractReady || kycStatus !== 'Approved'}
                                className="btn-futuristic btn-secondary"
                                style={{ width: '100%' }}
                            >
                                {kycStatus !== 'Approved' ? 'KYC Required' : (isClaiming ? 'Processing...' : 'Claim Dividends')}
                            </button>
                        </div>

                        <div style={{ padding: '20px', background: 'rgba(255,255,255,0.4)', borderRadius: '16px', opacity: 0.8 }}>
                            <span style={{ background: '#888', color: 'white', padding: '4px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold', display: 'inline-block', marginBottom: '15px' }}>DEV TOOL</span>
                            <h3 style={{ margin: '0 0 10px 0' }}>Testnet Counter</h3>
                            <p style={{ fontSize: '24px', fontWeight: 'bold', margin: '15px 0' }}>{count !== null ? count : 'Loading...'}</p>
                            <button
                                onClick={handleIncrement}
                                disabled={isIncrementing}
                                className="btn-futuristic"
                                style={{ width: '100%' }}
                            >
                                {isIncrementing ? 'Incrementing...' : 'Increment Network'}
                            </button>
                        </div>
                    </div>

                    <div style={{ marginTop: '30px', padding: '10px', background: 'rgba(0,0,0,0.05)', borderRadius: '8px', fontSize: '14px' }}>
                        Transaction Status: <strong>{status}</strong>
                    </div>
                </div>
            ) : (
                <div style={{ padding: '40px', background: 'rgba(255,255,255,0.5)', borderRadius: '16px' }}>
                    <h3>Welcome to the Future of Real Estate</h3>
                    <p>Connect your Freighter wallet to verify your identity and start earning fractional yields.</p>
                </div>
            )}
        </div>
    );
};

export default ContractInteract;
