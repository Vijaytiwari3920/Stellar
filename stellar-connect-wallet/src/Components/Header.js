import React, { useState, useEffect } from "react";
import { retrievePublicKey, getBalance } from "./Frighter";

const Header = ({ publicKey, setPublicKey }) => {
    const [balance, setBalance] = useState("0");
    const [connected, setConnected] = useState(false);
    const [error, setError] = useState("");
    const [isConnecting, setIsConnecting] = useState(false);

    useEffect(() => {
        const storedAddress = typeof window !== "undefined" ? window.localStorage.getItem("stellar-wallet-address") : null;
        if (!storedAddress) return;

        const restoreSession = async () => {
            try {
                setPublicKey(storedAddress);
                const userBalance = await getBalance(storedAddress);
                setBalance(userBalance);
                setConnected(true);
            } catch (e) {
                console.error(e);
            }
        };

        restoreSession();
    }, [setPublicKey]);

    const connectWallet = async () => {
        try {
            setError("");
            setIsConnecting(true);
            const key = await retrievePublicKey();
            setPublicKey(key);
            const userBalance = await getBalance(key);
            setBalance(userBalance);
            setConnected(true);

            if (typeof window !== "undefined") {
                window.localStorage.setItem("stellar-wallet-address", key);
            }
        } catch (e) {
            console.error(e);
            setError(e.message || "Failed to connect wallet");
        } finally {
            setIsConnecting(false);
        }
    };

    const disconnectWallet = () => {
        setPublicKey("");
        setBalance("0");
        setConnected(false);
        setError("");

        if (typeof window !== "undefined") {
            window.localStorage.removeItem("stellar-wallet-address");
        }
    };

    return (
        <header className="glass-card topbar" style={{ margin: '20px' }}>
            <div>
                <p style={{ margin: '0 0 6px', color: '#4f6f8f', textTransform: 'uppercase', letterSpacing: '0.16em', fontSize: '0.75rem' }}>Wallet-powered capital markets</p>
                <h2 className="text-gradient" style={{ margin: 0 }}>Stellar Connect</h2>
            </div>
            <div className="topbar-actions">
                {!connected ? (
                    <button onClick={connectWallet} className="btn-futuristic" disabled={isConnecting}>
                        {isConnecting ? "Connecting..." : "Connect Freighter"}
                    </button>
                ) : (
                    <div className="wallet-badge">
                        <div className="status-pill">Connected</div>
                        <p style={{ margin: '6px 0 0' }}><strong>Public Key:</strong> {publicKey.substring(0, 6)}...{publicKey.substring(publicKey.length - 4)}</p>
                        <p style={{ margin: '4px 0 0' }}><strong>Balance:</strong> {balance} XLM</p>
                        <button onClick={disconnectWallet} className="btn-futuristic btn-secondary" style={{ marginTop: '10px' }}>
                            Disconnect
                        </button>
                    </div>
                )}
                {error && <p style={{ color: '#c0392b', marginTop: '10px', margin: '10px 0 0 0' }}>{error}</p>}
            </div>
        </header>
    );
};

export default Header;