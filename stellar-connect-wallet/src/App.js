import React, { useState } from 'react';
import './App.css';
import Header from './Components/Header';
import ContractInteract from './Components/ContractInteract';
import PaymentForm from './Components/PaymentForm';
import TransactionHistory from './Components/TransactionHistory';

const highlights = [
  {
    title: 'Institutional-grade onboarding',
    copy: 'Wallet-native connect flows, identity checkpoints, and secure transaction signing built for trust.',
  },
  {
    title: 'Real-time asset visibility',
    copy: 'Follow yield, claim rights, and transfer activity from one polished investor workspace.',
  },
  {
    title: 'Built for scalable growth',
    copy: 'The architecture is structured to expand from testnet demos into full multi-asset capital markets.',
  },
];

const roadmap = [
  'Connect a Freighter wallet in seconds.',
  'Verify KYC status and unlock product features.',
  'Manage payments and monitor transaction history in real time.',
];

function App() {
  const [publicKey, setPublicKey] = useState('');

  return (
    <div className="App">
      <Header publicKey={publicKey} setPublicKey={setPublicKey} />

      <main className="app-shell">
        <section className="hero-section glass-card">
          <div className="hero-copy">
            <span className="pill">On Stellar • Testnet Demo</span>
            <h1 className="text-gradient">Nexus RWA Platform</h1>
            <p>
              Institutional-grade RWA access for investors, combining wallet-native onboarding, secure transfers, and real-world yield workflows.
            </p>
            <div className="hero-actions">
              <a href="#dashboard" className="btn-futuristic">Open Investor Dashboard</a>
              <a href="#wallet-tools" className="btn-futuristic btn-secondary">Try Wallet Tools</a>
            </div>
          </div>

          <div className="hero-metrics">
            <div className="metric-card">
              <strong>$4.8M</strong>
              <span>Projected TVL</span>
            </div>
            <div className="metric-card">
              <strong>8.5% APY</strong>
              <span>Target yield on premium assets</span>
            </div>
            <div className="metric-card">
              <strong>24/7</strong>
              <span>On-chain monitoring and payouts</span>
            </div>
          </div>
        </section>

        <section className="highlights-grid">
          {highlights.map((item) => (
            <article key={item.title} className="highlight-card glass-card">
              <h3>{item.title}</h3>
              <p>{item.copy}</p>
            </article>
          ))}
        </section>

        <section id="dashboard" className="dashboard-section">
          <ContractInteract publicKey={publicKey} />
        </section>

        {publicKey ? (
          <section id="wallet-tools" className="content-grid">
            <PaymentForm publicKey={publicKey} />
            <TransactionHistory publicKey={publicKey} />
          </section>
        ) : (
          <section className="glass-card empty-state">
            <h3>Ready for real-world onboarding</h3>
            <p>
              Connect your wallet to unlock identity verification, instant transfers, and yield tracking in a production-style experience.
            </p>
            <ul>
              {roadmap.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ul>
          </section>
        )}
      </main>
    </div>
  );
}

export default App;

