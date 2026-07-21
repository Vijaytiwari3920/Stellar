#![no_std]

use soroban_sdk::{contract, contractimpl, vec, Address, Env, IntoVal, Symbol, Vec};

#[contract]
pub struct Router;

#[contractimpl]
impl Router {
    pub fn swap_exact_tokens_for_tokens(
        env: Env,
        to: Address,
        amount_in: i128,
        amount_out_min: i128,
        path: Vec<Address>,
        pools: Vec<Address>,
    ) -> i128 {
        to.require_auth();
        
        if path.len() < 2 {
            panic!("invalid path");
        }
        if pools.len() != path.len() - 1 {
            panic!("invalid pools length");
        }

        let mut current_amount_in = amount_in;

        for i in 0..pools.len() {
            let pool_id = pools.get(i).unwrap();
            let token_in = path.get(i).unwrap();
            
            // Invoke the AMM's swap function:
            // swap(to: Address, token_in: Address, amount_in: i128, min_out: i128) -> i128
            let args = vec![
                &env,
                to.into_val(&env),
                token_in.into_val(&env),
                current_amount_in.into_val(&env),
                0_i128.into_val(&env), // We check min_out at the end
            ];

            let amount_out: i128 = env.invoke_contract(&pool_id, &Symbol::new(&env, "swap"), args);
            current_amount_in = amount_out;
        }

        if current_amount_in < amount_out_min {
            panic!("insufficient output amount");
        }

        current_amount_in
    }
}
