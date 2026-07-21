#![no_std]

use soroban_sdk::{contract, contractimpl, contracttype, token::Client as TokenClient, Address, Env};

#[contract]
pub struct ConstantProductAMM;

#[contracttype]
#[derive(Clone)]
pub enum DataKey {
    TokenA,
    TokenB,
    ReserveA,
    ReserveB,
    TotalShares,
    Shares(Address),
}

#[contractimpl]
impl ConstantProductAMM {
    pub fn initialize(env: Env, token_a: Address, token_b: Address) {
        if env.storage().instance().has(&DataKey::TokenA) {
            panic!("already initialized");
        }
        env.storage().instance().set(&DataKey::TokenA, &token_a);
        env.storage().instance().set(&DataKey::TokenB, &token_b);
        env.storage().instance().set(&DataKey::ReserveA, &0_i128);
        env.storage().instance().set(&DataKey::ReserveB, &0_i128);
        env.storage().instance().set(&DataKey::TotalShares, &0_i128);
    }

    pub fn deposit(env: Env, to: Address, amount_a: i128, amount_b: i128, min_shares: i128) -> i128 {
        to.require_auth();

        let token_a = Self::get_token_a(&env);
        let token_b = Self::get_token_b(&env);
        let mut reserve_a = Self::get_reserve_a(&env);
        let mut reserve_b = Self::get_reserve_b(&env);
        let total_shares = Self::get_total_shares(&env);

        let shares = if total_shares == 0 {
            // Initial deposit
            (amount_a * amount_b).isqrt()
        } else {
            let shares_a = (amount_a * total_shares) / reserve_a;
            let shares_b = (amount_b * total_shares) / reserve_b;
            shares_a.min(shares_b)
        };

        if shares < min_shares {
            panic!("insufficient shares minted");
        }

        TokenClient::new(&env, &token_a).transfer(&to, &env.current_contract_address(), &amount_a);
        TokenClient::new(&env, &token_b).transfer(&to, &env.current_contract_address(), &amount_b);

        reserve_a += amount_a;
        reserve_b += amount_b;

        env.storage().instance().set(&DataKey::ReserveA, &reserve_a);
        env.storage().instance().set(&DataKey::ReserveB, &reserve_b);

        Self::mint_shares(&env, to, shares);
        shares
    }

    pub fn withdraw(env: Env, to: Address, shares: i128, min_a: i128, min_b: i128) {
        to.require_auth();

        let total_shares = Self::get_total_shares(&env);
        let mut reserve_a = Self::get_reserve_a(&env);
        let mut reserve_b = Self::get_reserve_b(&env);

        let amount_a = (shares * reserve_a) / total_shares;
        let amount_b = (shares * reserve_b) / total_shares;

        if amount_a < min_a || amount_b < min_b {
            panic!("insufficient amounts withdrawn");
        }

        Self::burn_shares(&env, to.clone(), shares);

        reserve_a -= amount_a;
        reserve_b -= amount_b;

        env.storage().instance().set(&DataKey::ReserveA, &reserve_a);
        env.storage().instance().set(&DataKey::ReserveB, &reserve_b);

        let token_a = Self::get_token_a(&env);
        let token_b = Self::get_token_b(&env);

        TokenClient::new(&env, &token_a).transfer(&env.current_contract_address(), &to, &amount_a);
        TokenClient::new(&env, &token_b).transfer(&env.current_contract_address(), &to, &amount_b);
    }

    pub fn swap(env: Env, to: Address, token_in: Address, amount_in: i128, min_out: i128) -> i128 {
        to.require_auth();

        let token_a = Self::get_token_a(&env);
        let token_b = Self::get_token_b(&env);
        
        let (is_a_in, mut reserve_in, mut reserve_out, token_out) = if token_in == token_a {
            (true, Self::get_reserve_a(&env), Self::get_reserve_b(&env), token_b)
        } else if token_in == token_b {
            (false, Self::get_reserve_b(&env), Self::get_reserve_a(&env), token_a)
        } else {
            panic!("invalid token");
        };

        // 0.3% fee
        let amount_in_with_fee = amount_in * 997;
        let amount_out = (amount_in_with_fee * reserve_out) / (reserve_in * 1000 + amount_in_with_fee);

        if amount_out < min_out {
            panic!("insufficient output amount");
        }

        TokenClient::new(&env, &token_in).transfer(&to, &env.current_contract_address(), &amount_in);

        reserve_in += amount_in;
        reserve_out -= amount_out;

        if is_a_in {
            env.storage().instance().set(&DataKey::ReserveA, &reserve_in);
            env.storage().instance().set(&DataKey::ReserveB, &reserve_out);
        } else {
            env.storage().instance().set(&DataKey::ReserveA, &reserve_out);
            env.storage().instance().set(&DataKey::ReserveB, &reserve_in);
        }

        TokenClient::new(&env, &token_out).transfer(&env.current_contract_address(), &to, &amount_out);
        amount_out
    }

    // Helper functions
    fn get_token_a(env: &Env) -> Address {
        env.storage().instance().get(&DataKey::TokenA).unwrap()
    }

    fn get_token_b(env: &Env) -> Address {
        env.storage().instance().get(&DataKey::TokenB).unwrap()
    }

    fn get_reserve_a(env: &Env) -> i128 {
        env.storage().instance().get(&DataKey::ReserveA).unwrap_or(0)
    }

    fn get_reserve_b(env: &Env) -> i128 {
        env.storage().instance().get(&DataKey::ReserveB).unwrap_or(0)
    }

    fn get_total_shares(env: &Env) -> i128 {
        env.storage().instance().get(&DataKey::TotalShares).unwrap_or(0)
    }

    fn mint_shares(env: &Env, to: Address, amount: i128) {
        let total = Self::get_total_shares(env);
        let user_shares: i128 = env.storage().persistent().get(&DataKey::Shares(to.clone())).unwrap_or(0);
        env.storage().instance().set(&DataKey::TotalShares, &(total + amount));
        env.storage().persistent().set(&DataKey::Shares(to), &(user_shares + amount));
    }

    fn burn_shares(env: &Env, from: Address, amount: i128) {
        let total = Self::get_total_shares(env);
        let user_shares: i128 = env.storage().persistent().get(&DataKey::Shares(from.clone())).unwrap_or(0);
        if user_shares < amount {
            panic!("insufficient shares");
        }
        env.storage().instance().set(&DataKey::TotalShares, &(total - amount));
        env.storage().persistent().set(&DataKey::Shares(from), &(user_shares - amount));
    }
}
