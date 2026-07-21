import React, { useState } from 'react';
import * as StellarSdk from '@stellar/stellar-sdk';
import { userSignTransaction } from './Frighter';

const PaymentForm = ({ publicKey }) => {
    const [destination, setDestination] = useState('');
    const [amount, setAmount] = useState('');
    const [status, setStatus] = useState('Ready to send');
    const [isSending, setIsSending] = useState(false);

    const handleSend = async () => {
        const trimmedDestination = destination.trim();
        const trimmedAmount = amount.trim();

        if (!trimmedDestination || !trimmedAmount) {
            setStatus('Please provide a destination and amount.');
            return;
        }

        if (!trimmedDestination.startsWith('G') || trimmedDestination.length < 20) {
            setStatus('Please enter a valid Stellar public key.');
            return;
        }

        if (Number(trimmedAmount) <= 0) {
            setStatus('The amount must be greater than zero.');
            return;
        }

        setIsSending(true);
        setStatus('Preparing transfer on testnet...');

        try {
            const server = new StellarSdk.Horizon.Server('https://horizon-testnet.stellar.org');
            const account = await server.loadAccount(publicKey);
            const transaction = new StellarSdk.TransactionBuilder(account, {
                fee: StellarSdk.BASE_FEE,
                networkPassphrase: StellarSdk.Networks.TESTNET
            })
            .addOperation(StellarSdk.Operation.payment({
                destination: trimmedDestination,
                asset: StellarSdk.Asset.native(),
                amount: trimmedAmount,
            }))
            .setTimeout(30)
            .build();

            const signedTxXdr = await userSignTransaction(transaction.toXDR(), 'TESTNET', publicKey);
            const signedTransaction = StellarSdk.TransactionBuilder.fromXDR(signedTxXdr, StellarSdk.Networks.TESTNET);
            const response = await server.submitTransaction(signedTransaction);

            setStatus('Transfer sent successfully. Hash: ' + response.hash.substring(0, 12) + '...');
            setDestination('');
            setAmount('');
        } catch (e) {
            console.error('Payment failed', e);
            setStatus('Transfer failed: ' + (e.message || 'Check console for details'));
        } finally {
            setIsSending(false);
        }
    };

    if (!publicKey) return null;

    return (
        <div className="glass-card">
            <h3 className="text-gradient">Send XLM Payment</h3>
            <p style={{ color: '#5b6b7c', marginTop: '-6px' }}>Securely transfer funds on Stellar testnet with Freighter wallet signing.</p>
            <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', marginBottom: '6px', fontWeight: '700' }}>Destination</label>
                <input
                    type="text"
                    placeholder="Destination Public Key (G...)"
                    value={destination}
                    onChange={(e) => setDestination(e.target.value)}
                    className="input-futuristic"
                />
            </div>
            <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', marginBottom: '6px', fontWeight: '700' }}>Amount</label>
                <input
                    type="number"
                    placeholder="Amount (XLM)"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="input-futuristic"
                />
            </div>
            <button
                onClick={handleSend}
                disabled={isSending}
                className="btn-futuristic"
                style={{ width: '100%' }}
            >
                {isSending ? 'Sending...' : 'Send Payment'}
            </button>
            <div style={{ marginTop: '15px', textAlign: 'center' }}>
                <p>Status: <strong>{status}</strong></p>
            </div>
        </div>
    );
};

export default PaymentForm;
