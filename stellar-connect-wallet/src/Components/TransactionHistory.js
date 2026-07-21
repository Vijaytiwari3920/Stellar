import React, { useState, useEffect } from 'react';
import * as StellarSdk from '@stellar/stellar-sdk';

const TransactionHistory = ({ publicKey }) => {
    const [transactions, setTransactions] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (publicKey) {
            fetchTransactions();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [publicKey]);

    const fetchTransactions = async () => {
        setLoading(true);
        setError('');
        try {
            const server = new StellarSdk.Horizon.Server('https://horizon-testnet.stellar.org');
            const response = await server.transactions()
                .forAccount(publicKey)
                .limit(5)
                .order('desc')
                .call();

            setTransactions(response.records);
        } catch (e) {
            console.error('Error fetching transactions:', e);
            setError('Failed to fetch transaction history.');
        } finally {
            setLoading(false);
        }
    };

    if (!publicKey) return null;

    return (
        <div className="glass-card" style={{ textAlign: 'left' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                <div>
                    <h3 className="text-gradient" style={{ margin: 0 }}>Recent Transactions</h3>
                    <p style={{ margin: '4px 0 0', color: '#5b6b7c' }}>Latest activity for the connected account.</p>
                </div>
                <button
                    onClick={fetchTransactions}
                    className="btn-futuristic btn-secondary"
                    style={{ padding: '8px 16px', fontSize: '14px' }}
                >
                    Refresh
                </button>
            </div>

            {loading ? (
                <p>Loading transactions...</p>
            ) : error ? (
                <p style={{ color: '#c0392b' }}>{error}</p>
            ) : transactions.length === 0 ? (
                <p>No recent transactions found yet.</p>
            ) : (
                <ul style={{ listStyleType: 'none', padding: 0 }}>
                    {transactions.map((tx) => (
                        <li key={tx.id} style={{ marginBottom: '10px', padding: '15px', background: 'rgba(255,255,255,0.55)', borderRadius: '12px', transition: 'background 0.3s ease' }}>
                            <div style={{ fontSize: '14px', marginBottom: '5px' }}>
                                <strong>Date:</strong> {new Date(tx.created_at).toLocaleString()}
                            </div>
                            <div style={{ fontSize: '14px' }}>
                                <strong>Hash:</strong>{' '}
                                <a
                                    href={`https://stellar.expert/explorer/testnet/tx/${tx.hash}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    style={{ color: '#00d2ff', textDecoration: 'none', fontWeight: 'bold' }}
                                >
                                    {tx.hash.substring(0, 16)}...
                                </a>
                            </div>
                            <div style={{ fontSize: '12px', color: '#555', marginTop: '8px' }}>
                                Status: <strong style={{ color: tx.successful ? '#11998e' : '#e74c3c' }}>{tx.successful ? 'Success' : 'Failed'}</strong> | Fee: {tx.fee_charged} stroops
                            </div>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
};

export default TransactionHistory;
