# Could be made faster by building with --ofline and deploying with canister command
dfx identity use candao
cargo test
dfx deploy john_dao --network ic --no-wallet 
dfx identity use ident-1
