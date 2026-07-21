import {
  StellarWalletsKit,
} from '@creit.tech/stellar-wallets-kit';
import { FreighterModule } from '@creit.tech/stellar-wallets-kit/modules/freighter';
import * as StellarSdk from "@stellar/stellar-sdk";

StellarWalletsKit.init({
  modules: [new FreighterModule()],
});

const checkConnection = async () => {
    return true; 
};

const retrievePublicKey = async () => {
    try {
        StellarWalletsKit.setWallet("freighter");
        const { address } = await StellarWalletsKit.fetchAddress();
        return address;
    } catch (e) {
        console.error("SWK Error:", e);
        throw new Error("Wallet connection rejected or not found. " + (e.message || ""));
    }
};

const getBalance = async (publicKey) => {
    if (!publicKey) return "0";
    const server = new StellarSdk.Horizon.Server(
        "https://horizon-testnet.stellar.org"
    );

    try {
        const account = await server.loadAccount(publicKey);
        const xlm = account.balances.find((b) => b.asset_type === "native");
        return xlm?.balance || "0";
    } catch (e) {
        console.error("Error fetching balance, account might not be funded:", e);
        return "0"; // Account not found/funded on testnet
    }
};

const userSignTransaction = async (xdr, network, signWith) => {
    try {
        const { signedTxXdr } = await StellarWalletsKit.signTransaction(xdr, {
            networkPassphrase: StellarSdk.Networks.TESTNET,
            address: signWith,
        });
        return signedTxXdr;
    } catch (e) {
        console.error("Sign TX Error:", e);
        throw new Error("Transaction signing rejected or failed.");
    }
};

export {
    checkConnection,
    retrievePublicKey,
    getBalance,
    userSignTransaction,
};