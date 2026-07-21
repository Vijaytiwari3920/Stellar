#![no_std]

use soroban_sdk::{contract, contractimpl, contracttype, Address, Env, String};

#[contract]
pub struct Token;

#[contracttype]
#[derive(Clone)]
pub enum DataKey {
    Allowance(AllowanceDataKey),
    Balance(Address),
    Admin,
    Decimals,
    Name,
    Symbol,
}

#[contracttype]
#[derive(Clone)]
pub struct AllowanceDataKey {
    pub from: Address,
    pub spender: Address,
}

#[contractimpl]
impl Token {
    pub fn initialize(env: Env, admin: Address, decimal: u32, name: String, symbol: String) {
        if env.storage().instance().has(&DataKey::Admin) {
            panic!("already initialized");
        }
        env.storage().instance().set(&DataKey::Admin, &admin);
        env.storage().instance().set(&DataKey::Decimals, &decimal);
        env.storage().instance().set(&DataKey::Name, &name);
        env.storage().instance().set(&DataKey::Symbol, &symbol);
    }

    pub fn mint(env: Env, to: Address, amount: i128) {
        let admin: Address = env.storage().instance().get(&DataKey::Admin).unwrap();
        admin.require_auth();
        let balance = Self::get_balance(&env, &to);
        env.storage().persistent().set(&DataKey::Balance(to), &(balance + amount));
    }

    pub fn burn(env: Env, from: Address, amount: i128) {
        from.require_auth();
        let balance = Self::get_balance(&env, &from);
        if balance < amount {
            panic!("insufficient balance");
        }
        env.storage().persistent().set(&DataKey::Balance(from), &(balance - amount));
    }

    pub fn transfer(env: Env, from: Address, to: Address, amount: i128) {
        from.require_auth();
        let from_balance = Self::get_balance(&env, &from);
        if from_balance < amount {
            panic!("insufficient balance");
        }
        let to_balance = Self::get_balance(&env, &to);
        env.storage().persistent().set(&DataKey::Balance(from), &(from_balance - amount));
        env.storage().persistent().set(&DataKey::Balance(to), &(to_balance + amount));
    }

    pub fn approve(env: Env, from: Address, spender: Address, amount: i128, expiration_ledger: u32) {
        from.require_auth();
        let key = DataKey::Allowance(AllowanceDataKey { from, spender });
        env.storage().persistent().set(&key, &amount);
        env.storage().persistent().extend_ttl(&key, expiration_ledger, expiration_ledger);
    }

    pub fn transfer_from(env: Env, spender: Address, from: Address, to: Address, amount: i128) {
        spender.require_auth();
        
        let key = DataKey::Allowance(AllowanceDataKey { from: from.clone(), spender });
        let allowance: i128 = env.storage().persistent().get(&key).unwrap_or(0);
        if allowance < amount {
            panic!("insufficient allowance");
        }
        env.storage().persistent().set(&key, &(allowance - amount));

        let from_balance = Self::get_balance(&env, &from);
        if from_balance < amount {
            panic!("insufficient balance");
        }
        let to_balance = Self::get_balance(&env, &to);
        
        env.storage().persistent().set(&DataKey::Balance(from), &(from_balance - amount));
        env.storage().persistent().set(&DataKey::Balance(to), &(to_balance + amount));
    }

    pub fn balance(env: Env, id: Address) -> i128 {
        Self::get_balance(&env, &id)
    }

    pub fn allowance(env: Env, from: Address, spender: Address) -> i128 {
        env.storage().persistent().get(&DataKey::Allowance(AllowanceDataKey { from, spender })).unwrap_or(0)
    }

    fn get_balance(env: &Env, id: &Address) -> i128 {
        env.storage().persistent().get(&DataKey::Balance(id.clone())).unwrap_or(0)
    }
}
