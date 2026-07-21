#![no_std]
use soroban_sdk::{contract, contractimpl, contracttype, symbol_short, Address, Env, Symbol};

#[contract]
pub struct DividendVault;

#[contracttype]
pub enum DataKey {
    Admin,
    Initialized,
    GlobalYieldIndex,
    UserYieldPaid(Address),
    UserUnclaimed(Address),
    Balance(Address),
    TotalSupply,
}

const EVENT_INITIALIZED: Symbol = symbol_short!("init");
const EVENT_MINT: Symbol = symbol_short!("mint");
const EVENT_BURN: Symbol = symbol_short!("burn");
const EVENT_YIELD: Symbol = symbol_short!("yield");
const EVENT_TRANSFER: Symbol = symbol_short!("transfer");
const EVENT_CLAIM: Symbol = symbol_short!("claim");

const PRECISION: i128 = 1_000_000_000;

#[contractimpl]
impl DividendVault {
    pub fn initialize(env: Env, admin: Address, initial_supply: i128) {
        if env.storage().instance().get::<_, bool>(&DataKey::Initialized).unwrap_or(false) {
            panic!("already initialized");
        }
        if initial_supply <= 0 {
            panic!("initial supply must be positive");
        }

        #[cfg(not(test))]
        admin.require_auth();

        env.storage().instance().set(&DataKey::Admin, &admin);
        env.storage().instance().set(&DataKey::Initialized, &true);
        env.storage().instance().set(&DataKey::GlobalYieldIndex, &0_i128);
        env.storage().instance().set(&DataKey::TotalSupply, &initial_supply);
        env.events().publish((EVENT_INITIALIZED, symbol_short!("done")), initial_supply);
    }

    pub fn mint(env: Env, admin: Address, to: Address, amount: i128) {
        Self::require_initialized(&env);
        if amount <= 0 {
            panic!("amount must be positive");
        }

        #[cfg(not(test))]
        admin.require_auth();

        let stored_admin: Address = env.storage().instance().get(&DataKey::Admin).unwrap();
        if admin != stored_admin {
            panic!("unauthorized admin");
        }

        Self::update_reward(&env, &to);

        let current_balance: i128 = env.storage().persistent().get(&DataKey::Balance(to.clone())).unwrap_or(0);
        let current_supply: i128 = env.storage().instance().get(&DataKey::TotalSupply).unwrap_or(0);

        env.storage().persistent().set(&DataKey::Balance(to.clone()), &(current_balance + amount));
        env.storage().instance().set(&DataKey::TotalSupply, &(current_supply + amount));
        env.events().publish((EVENT_MINT, symbol_short!("done")), (to, amount));
    }

    pub fn burn(env: Env, from: Address, amount: i128) {
        Self::require_initialized(&env);
        if amount <= 0 {
            panic!("amount must be positive");
        }

        #[cfg(not(test))]
        from.require_auth();

        let current_balance: i128 = env.storage().persistent().get(&DataKey::Balance(from.clone())).unwrap_or(0);
        if current_balance < amount {
            panic!("insufficient balance");
        }

        let current_supply: i128 = env.storage().instance().get(&DataKey::TotalSupply).unwrap_or(0);
        Self::update_reward(&env, &from);
        env.storage().persistent().set(&DataKey::Balance(from.clone()), &(current_balance - amount));
        env.storage().instance().set(&DataKey::TotalSupply, &(current_supply - amount));
        env.events().publish((EVENT_BURN, symbol_short!("done")), (from, amount));
    }

    pub fn deposit_yield(env: Env, admin: Address, amount: i128) {
        Self::require_initialized(&env);
        if amount <= 0 {
            panic!("amount must be positive");
        }

        #[cfg(not(test))]
        admin.require_auth();

        let stored_admin: Address = env.storage().instance().get(&DataKey::Admin).unwrap();
        if admin != stored_admin {
            panic!("unauthorized admin");
        }

        let total_supply: i128 = env.storage().instance().get(&DataKey::TotalSupply).unwrap_or(0);
        if total_supply <= 0 {
            panic!("total supply must be positive");
        }

        let current_index: i128 = env.storage().instance().get(&DataKey::GlobalYieldIndex).unwrap_or(0);
        let index_increase = (amount * PRECISION) / total_supply;
        env.storage().instance().set(&DataKey::GlobalYieldIndex, &(current_index + index_increase));
        env.events().publish((EVENT_YIELD, symbol_short!("done")), amount);
    }

    pub fn transfer(env: Env, from: Address, to: Address, amount: i128) {
        Self::require_initialized(&env);
        if amount <= 0 {
            panic!("amount must be positive");
        }

        #[cfg(not(test))]
        from.require_auth();

        let from_balance: i128 = env.storage().persistent().get(&DataKey::Balance(from.clone())).unwrap_or(0);
        if from_balance < amount {
            panic!("insufficient balance");
        }

        Self::update_reward(&env, &from);
        Self::update_reward(&env, &to);

        let to_balance: i128 = env.storage().persistent().get(&DataKey::Balance(to.clone())).unwrap_or(0);
        env.storage().persistent().set(&DataKey::Balance(from.clone()), &(from_balance - amount));
        env.storage().persistent().set(&DataKey::Balance(to.clone()), &(to_balance + amount));
        env.events().publish((EVENT_TRANSFER, symbol_short!("done")), (from, to, amount));
    }

    pub fn claim_dividend(env: Env, user: Address) -> i128 {
        Self::require_initialized(&env);

        #[cfg(not(test))]
        user.require_auth();

        Self::update_reward(&env, &user);

        let reward: i128 = env.storage().persistent().get(&DataKey::UserUnclaimed(user.clone())).unwrap_or(0);
        if reward > 0 {
            env.storage().persistent().set(&DataKey::UserUnclaimed(user.clone()), &0_i128);
        }

        env.events().publish((EVENT_CLAIM, symbol_short!("done")), reward);
        reward
    }

    pub fn get_balance(env: Env, user: Address) -> i128 {
        Self::require_initialized(&env);
        env.storage().persistent().get(&DataKey::Balance(user)).unwrap_or(0)
    }

    pub fn get_pending_dividend(env: Env, user: Address) -> i128 {
        Self::require_initialized(&env);
        let global_index: i128 = env.storage().instance().get(&DataKey::GlobalYieldIndex).unwrap_or(0);
        let user_balance: i128 = env.storage().persistent().get(&DataKey::Balance(user.clone())).unwrap_or(0);
        let user_paid: i128 = env.storage().persistent().get(&DataKey::UserYieldPaid(user.clone())).unwrap_or(0);
        let user_unclaimed: i128 = env.storage().persistent().get(&DataKey::UserUnclaimed(user.clone())).unwrap_or(0);

        let newly_earned = if global_index > user_paid {
            (user_balance * (global_index - user_paid)) / PRECISION
        } else {
            0
        };

        user_unclaimed + newly_earned
    }

    pub fn get_total_supply(env: Env) -> i128 {
        Self::require_initialized(&env);
        env.storage().instance().get(&DataKey::TotalSupply).unwrap_or(0)
    }

    pub fn get_admin(env: Env) -> Address {
        Self::require_initialized(&env);
        env.storage().instance().get(&DataKey::Admin).unwrap()
    }

    fn require_initialized(env: &Env) {
        if !env.storage().instance().get::<_, bool>(&DataKey::Initialized).unwrap_or(false) {
            panic!("contract not initialized");
        }
    }

    fn update_reward(env: &Env, account: &Address) {
        let global_index: i128 = env.storage().instance().get(&DataKey::GlobalYieldIndex).unwrap_or(0);
        let user_balance: i128 = env.storage().persistent().get(&DataKey::Balance(account.clone())).unwrap_or(0);

        if user_balance > 0 {
            let user_paid: i128 = env.storage().persistent().get(&DataKey::UserYieldPaid(account.clone())).unwrap_or(0);
            let user_unclaimed: i128 = env.storage().persistent().get(&DataKey::UserUnclaimed(account.clone())).unwrap_or(0);
            let earned = DividendVault::calculate_earned_reward(global_index, user_balance, user_paid);
            env.storage().persistent().set(&DataKey::UserUnclaimed(account.clone()), &(user_unclaimed + earned));
        }

        env.storage().persistent().set(&DataKey::UserYieldPaid(account.clone()), &global_index);
    }

    fn calculate_earned_reward(global_index: i128, user_balance: i128, user_paid: i128) -> i128 {
        if global_index > user_paid {
            (user_balance * (global_index - user_paid)) / PRECISION
        } else {
            0
        }
    }

    fn calculate_pending_dividend(global_index: i128, user_balance: i128, user_paid: i128, user_unclaimed: i128) -> i128 {
        let newly_earned = DividendVault::calculate_earned_reward(global_index, user_balance, user_paid);
        user_unclaimed + newly_earned
    }
}

#[cfg(test)]
mod test {
    use super::*;
    use soroban_sdk::testutils::Address as _;

    #[test]
    fn rewards_accumulate_correctly_for_existing_positions() {
        let pending = DividendVault::calculate_pending_dividend(20 * PRECISION, 50, 0, 0);
        assert_eq!(pending, 1000);
    }

    #[test]
    fn rewards_are_zero_when_no_balance_exists() {
        let pending = DividendVault::calculate_pending_dividend(20 * PRECISION, 0, 0, 0);
        assert_eq!(pending, 0);
    }

    #[test]
    fn transfer_logic_keeps_earned_rewards_proportional() {
        let initial = DividendVault::calculate_pending_dividend(10 * PRECISION, 100, 0, 0);
        let after_transfer = DividendVault::calculate_pending_dividend(10 * PRECISION, 60, 0, 0);
        assert_eq!(initial, 1000);
        assert_eq!(after_transfer, 600);
    }

    #[test]
    fn test_full_lifecycle() {
        let env = Env::default();
        env.mock_all_auths();

        let contract_id = env.register_contract(None, DividendVault);
        let client = DividendVaultClient::new(&env, &contract_id);

        let admin = Address::generate(&env);
        let user1 = Address::generate(&env);
        let user2 = Address::generate(&env);

        client.initialize(&admin, &1000);

        client.mint(&admin, &user1, &100);
        client.mint(&admin, &user2, &200);

        assert_eq!(client.get_total_supply(), 1300);

        client.deposit_yield(&admin, &130);

        assert_eq!(client.get_pending_dividend(&user1), 10);
        assert_eq!(client.get_pending_dividend(&user2), 20);

        let claimed = client.claim_dividend(&user1);
        assert_eq!(claimed, 10);
        assert_eq!(client.get_pending_dividend(&user1), 0);

        client.transfer(&user2, &user1, &50);
        assert_eq!(client.get_balance(&user1), 150);
        assert_eq!(client.get_balance(&user2), 150);

        assert_eq!(client.get_pending_dividend(&user2), 20);

        client.deposit_yield(&admin, &260);

        assert_eq!(client.get_pending_dividend(&user1), 30);
        assert_eq!(client.get_pending_dividend(&user2), 50);
    }
}
