use std::{
    cell::RefCell,
    collections::{HashMap, HashSet},
    ops::Deref,
    time::Duration,
};

use candid::{candid_method, CandidType, Deserialize, Principal};
use ic_cdk::{
    api::{
        call::RejectionCode,
        stable::{StableReader, StableWriter},
        time,
    },
    caller, id, init, query, update,
};
use ic_cdk_macros::{post_upgrade, pre_upgrade};
use ic_ledger_types::{
    AccountIdentifier, BlockIndex, Memo, Tokens, TransferArgs, TransferError, DEFAULT_FEE,
    DEFAULT_SUBACCOUNT, MAINNET_LEDGER_CANISTER_ID,
};
use serde::Serialize;
use users::{LoginMethod, User, Users, VerificationStatus};

use crate::users::Badge;

mod users;

thread_local! {
    static STATE: RefCell<Option<State>> = RefCell::new(None);
}

#[derive(CandidType, Deserialize)]
struct CreateUserArg {
    pub principal: Principal,
}

struct Access;
impl Access {
    fn with_state<R>(f: impl FnOnce(&State) -> R) -> R {
        STATE.with(|cell| f(cell.borrow().as_ref().expect("State not initialized")))
    }

    fn with_state_mut<R>(f: impl FnOnce(&mut State) -> R) -> R {
        STATE.with(|cell| f(cell.borrow_mut().as_mut().expect("State not initialized")))
    }
}

#[derive(CandidType, Serialize, Deserialize, Clone)]
struct CreateProposalArg {
    pub tweet: Tweet,
}

#[derive(CandidType, Serialize, Deserialize, Clone)]
enum Tweet {
    Tweet(String),
    ImageTweet { tweet: String, image_path: String },
}

impl Tweet {
    fn to_string(&self) -> String {
        match self {
            Tweet::Tweet(tweet) => tweet.clone(),
            Tweet::ImageTweet { tweet, image_path } => format!("{} {}", tweet, image_path),
        }
    }

    fn get_tweet(&self) -> &String {
        match self {
            Tweet::Tweet(tweet) => tweet,
            Tweet::ImageTweet { tweet, .. } => tweet,
        }
    }
}

#[derive(CandidType, Serialize, Deserialize, Clone)]
struct Proposal {
    pub tweet: Tweet,
    pub points: i32,
    pub created_by_id: u32,
    pub created_at: u64,
    pub reports: HashSet<Principal>,
}

#[derive(CandidType, Serialize, Deserialize, Clone)]
struct ProposalInfo {
    pub id: u32,
    pub tweet: Tweet,
    pub points: i32,
    pub created_by: u32,
    pub created_at: u64,
    pub upvote_status: UpvoteStatus,
    pub nr_of_reports: u32,
    pub reported: bool,
}

impl ProposalInfo {
    fn from_proposal(
        proposal: &Proposal,
        id: u32,
        upvote_status: UpvoteStatus,
        caller: Principal,
    ) -> Self {
        ProposalInfo {
            id,
            tweet: proposal.tweet.clone(),
            points: proposal.points,
            created_by: proposal.created_by_id,
            created_at: proposal.created_at,
            nr_of_reports: proposal.reports.len() as u32,
            reported: proposal.reports.contains(&caller),
            upvote_status,
        }
    }
}

#[derive(CandidType, Serialize, Deserialize, Clone)]
enum UpvoteStatus {
    Upvoted,
    Downvoted,
    NotVoted,
}

#[derive(CandidType, Serialize, Deserialize, Clone)]
struct Settings {
    pub round_duration_seconds: u64,
    pub max_state_size_bytes: u32,
    pub reward_per_round_e8s: u64,
    pub max_proposals_per_round: u32,
    pub max_proposals_per_user: u32,
    pub max_tweet_length: u32,
}

#[derive(CandidType, Serialize, Deserialize, Clone)]
struct Payment {
    pub block_index: BlockIndex,
    pub user_id: u32,
    pub time: u64,
}

#[derive(CandidType, Serialize, Deserialize)]
struct State {
    pub next_user_id: u32,
    pub users: Users,
    pub next_proposal_id: u32,
    pub proposals: HashMap<u32, Proposal>,
    pub round_results: Vec<RoundResult>,
    pub payment_history: Vec<Payment>,
    pub settings: Settings,
    pub round_end_time: u64,
    pub last_user_backup: u64,
    pub test: Option<String>,
}

#[derive(Clone, CandidType, Serialize, Deserialize)]
struct RoundResult {
    pub round_id: u32,
    pub winning_proposal: Proposal,
    pub proposal_tweeted: bool,
}

#[derive(CandidType, Serialize, Clone)]
pub enum Error {
    TweetTooLong,
    NoPermission,
    UserExistsAlready,
    AlreadyProposed,
    UserDoesNotExist,
    AlreadyVoted,
    ProposalDoesNotExist,
    ProposalLimitReached,
    NoWithdrawableE8s,
    PaymentInProgress,
    NoDepositAddress,
    PaymentError(String),
    RoundResultDoesNotExist,
    UserProposalLimitReached,
    UsernameTooLong,
}

#[derive(CandidType, Serialize, Deserialize)]
enum Vote {
    Upvote,
    Downvote,
}

struct WithdrawalInfo {
    pub amount: u64,
    pub deposit_address: AccountIdentifier,
    pub id: u32,
}

impl State {
    fn delete_proposal(&mut self, proposal_id: u32) -> Result<(), Error> {
        let proposal = self
            .proposals
            .get(&proposal_id)
            .ok_or(Error::ProposalDoesNotExist)?;

        let user = self
            .users
            .get_by_id(proposal.created_by_id)
            .ok_or(Error::UserDoesNotExist)?;

        //check if caller is creator of proposal
        if proposal.created_by_id != user.id {
            return Err(Error::NoPermission);
        }
        self.proposals.remove(&proposal_id);
        Ok(())
    }

    fn tweet_round_result(&mut self, index: usize) -> Result<(), Error> {
        check_if_admin()?;
        let round_result = self
            .round_results
            .get_mut(index)
            .ok_or(Error::RoundResultDoesNotExist)?;
        round_result.proposal_tweeted = true;
        Ok(())
    }

    pub fn poll_untweeted(&self) -> Option<(usize, Tweet)> {
        self.round_results
            .iter()
            .enumerate()
            .find(|(_index, round_result)| !round_result.proposal_tweeted)
            .map(|(index, round_result)| (index, round_result.winning_proposal.tweet.clone()))
    }

    fn report_proposal(&mut self, proposal_id: u32, caller: &Principal) -> Result<(), Error> {
        self.users.get(caller).ok_or(Error::UserDoesNotExist)?;
        let proposal = self
            .proposals
            .get_mut(&proposal_id)
            .ok_or(Error::ProposalDoesNotExist)?;
        proposal.reports.insert(*caller);
        Ok(())
    }

    fn update_account_identifier(
        &mut self,
        account_identifier: AccountIdentifier,
    ) -> Result<(), Error> {
        let caller = caller();
        let user = self.users.get_mut(&caller).ok_or(Error::UserDoesNotExist)?;
        user.deposit_address = Some(account_identifier);
        Ok(())
    }

    fn update_settings(&mut self, settings: Settings) {
        self.settings = settings;
    }

    fn handle_payment_result(
        &mut self,
        withdrawal_info: WithdrawalInfo,
        call_result: Result<Result<u64, TransferError>, (RejectionCode, String)>,
    ) -> Result<BlockIndex, Error> {
        let user = self
            .users
            .get_by_id(withdrawal_info.id)
            .ok_or(Error::UserDoesNotExist)?;
        match call_result {
            Ok(Ok(block_index)) => {
                self.payment_history.push(Payment {
                    block_index,
                    user_id: withdrawal_info.id,
                    time: time(),
                });
                user.payment_in_progress = false;
                return Ok(block_index);
            }
            Ok(Err(e)) => {
                user.withdrawable_e8s += withdrawal_info.amount;
                user.payment_in_progress = false;
                return Err(Error::PaymentError(e.to_string()));
            }
            Err((_, e)) => {
                user.withdrawable_e8s += withdrawal_info.amount;
                user.payment_in_progress = false;
                return Err(Error::PaymentError(e));
            }
        }
    }

    fn stage_payment(&mut self, caller: &Principal) -> Result<WithdrawalInfo, Error> {
        let user = self.users.get_mut(caller).ok_or(Error::UserDoesNotExist)?;

        if user.withdrawable_e8s == 0 {
            return Err(Error::NoWithdrawableE8s);
        }

        let deposit_address = user
            .deposit_address
            .as_ref()
            .ok_or(Error::NoDepositAddress)?;

        if user.deposit_address.is_none() {
            return Err(Error::NoDepositAddress);
        }

        if user.payment_in_progress {
            return Err(Error::PaymentInProgress);
        } else {
            user.payment_in_progress = true;
        }

        let withdrawable_e8s = user.withdrawable_e8s;
        user.withdrawable_e8s = 0;

        Ok(WithdrawalInfo {
            amount: withdrawable_e8s,
            deposit_address: *deposit_address,
            id: user.id,
        })
    }

    fn conclude_round(&mut self) {
        // let winning_proposal = self
        //     .proposals
        //     .iter()
        //     .max_by_key(|(_, proposal)| proposal.points);

        let winning_proposal_id = self
            .proposals
            .iter()
            .max_by_key(|(_, proposal)| proposal.points)
            .map(|(id, _)| *id);

        if let Some(proposal_id) = winning_proposal_id {
            let proposal = self.proposals.remove(&proposal_id).unwrap();
            self.round_results.push(RoundResult {
                round_id: self.round_results.len() as u32,
                winning_proposal: proposal.clone(),
                proposal_tweeted: false,
            });

            let created_by = self.users.get_by_id(proposal.created_by_id);
            if let Some(user) = created_by {
                user.withdrawable_e8s += self.settings.reward_per_round_e8s;
                user.karma += 10;
            }
            self.users.reset_round();
            //self.proposals.clear();
            // clear all the proposals that have 1 or less points keep the rest but reset points

            self.remove_and_reset_proposals()
        }
    }

    fn remove_and_reset_proposals(&mut self) {
        self.proposals.retain(|_, proposal| {
            if proposal.points < 1 {
                false
            } else {
                proposal.points = 1;
                true
            }
        });
        self.proposals.iter().for_each(|(id, proposal)| {
            let user = self.users.get_by_id(proposal.created_by_id);
            if let Some(user) = user {
                user.upvotes.insert(*id);
            }
        });
    }

    fn create_proposal(&mut self, create_args: CreateProposalArg) -> Result<u32, Error> {
        if self.proposals.len() as u32 >= self.settings.max_proposals_per_round {
            return Err(Error::ProposalLimitReached);
        }
        let user = self.users.get(&caller()).ok_or(Error::UserDoesNotExist)?;

        if user.nr_posts_this_round >= self.settings.max_proposals_per_user {
            return Err(Error::UserProposalLimitReached);
        }

        if create_args
            .tweet
            .get_tweet()
            .chars()
            .take((self.settings.max_tweet_length + 1) as usize)
            .count()
            > 280
        {
            return Err(Error::TweetTooLong);
        }

        let proposal_id = self.next_proposal_id;
        self.proposals.insert(
            proposal_id,
            Proposal {
                points: 0,
                created_by_id: user.id,
                created_at: time(),
                tweet: create_args.tweet,
                reports: HashSet::new(),
            },
        );
        self.next_proposal_id += 1;
        self.vote_for_proposal(proposal_id, Vote::Upvote)?;
        Ok(proposal_id)
    }

    fn verify_user(&mut self, id: u32) -> Result<(), Error> {
        let user = self.users.get_by_id(id).ok_or(Error::UserDoesNotExist)?;

        user.verification_status = VerificationStatus::Verified;
        Ok(())
    }

    fn create_user(&mut self, create_args: CreateUserArg) -> Result<u32, Error> {
        //create new user only if the key does not yet exist
        if self.users.principal_in_use(&create_args.principal) {
            return Err(Error::UserExistsAlready);
        }

        let badges = if self.next_user_id < 1000 {
            vec![Badge::OG]
        } else {
            Vec::new()
        };

        self.users.insert(
            create_args.principal,
            User {
                id: self.next_user_id,
                user_name: None,
                login_method: LoginMethod::Twitter,
                new_auth: None,
                karma: 10,
                withdrawable_e8s: 0,
                deposit_address: None,
                payment_in_progress: false,
                created_proposal: None,
                upvotes: HashSet::new(),
                downvotes: HashSet::new(),
                verification_status: VerificationStatus::Unverified,
                last_updated: time(),
                badges,
                nr_posts_this_round: 0,
            },
        );
        self.next_user_id += 1;
        Ok(self.next_user_id - 1)
    }

    fn stage_new_principal(
        &mut self,
        new_principal: Principal,
        login_method: LoginMethod,
    ) -> Result<(), Error> {
        if let Some(user) = self.users.get_mut(&caller()) {
            user.new_auth = Some((new_principal, login_method));
            Ok(())
        } else {
            Err(Error::UserDoesNotExist)
        }
    }

    fn update_username(&mut self, new_username: String) -> Result<(), Error> {
        let user = self
            .users
            .get_mut(&caller())
            .ok_or(Error::UserDoesNotExist)?;
        if new_username.len() > 15 {
            return Err(Error::UsernameTooLong);
        }
        user.user_name = Some(new_username);
        Ok(())
    }

    fn update_user_principal(&mut self, old_principal: Principal) -> Result<(), Error> {
        // if the new user principal is already in use, return an error
        if self.users.principal_in_use(&caller()) {
            return Err(Error::UserExistsAlready);
        }

        let user = self
            .users
            .get(&old_principal)
            .ok_or(Error::UserDoesNotExist)?;
        if let Some(new_auth) = &user.new_auth {
            if new_auth.0 != caller() {
                return Err(Error::NoPermission);
            }
        } else {
            return Err(Error::NoPermission);
        }

        let mut user = self.users.remove(&old_principal).unwrap();

        user.login_method = user.new_auth.unwrap().1;
        user.new_auth = None;
        self.users.insert(caller(), user);
        Ok(())
    }

    fn vote_for_proposal(&mut self, proposal_id: u32, vote: Vote) -> Result<(), Error> {
        ic_cdk::println!(
            "Voting for proposal {} with caller {}",
            proposal_id,
            &caller().to_text()
        );
        let proposal = self
            .proposals
            .get_mut(&proposal_id)
            .ok_or(Error::ProposalDoesNotExist)?;

        let created_by = proposal.created_by_id;
        let caller_id = caller();

        match vote {
            Vote::Upvote => {
                let upvote_delta = self.users.get_upvote_delta(&caller_id, &proposal_id)?;
                proposal.points += upvote_delta;
                self.users
                    .get_by_id(created_by)
                    .ok_or(Error::UserDoesNotExist)?
                    .karma += upvote_delta;
            }
            Vote::Downvote => {
                let downvotes = self.users.get_downvote_delta(&caller_id, &proposal_id)?;
                proposal.points += downvotes;
                self.users
                    .get_by_id(created_by)
                    .ok_or(Error::UserDoesNotExist)?
                    .karma -= downvotes;
            }
        }
        Ok(())
    }

    fn get_proposals_info(&self, caller: &Principal) -> Vec<ProposalInfo> {
        let user = self.users.get(caller);
        match user {
            Some(user) => self
                .proposals
                .iter()
                .map(|(id, proposal)| {
                    let upvote_status = if user.upvotes.contains(id) {
                        UpvoteStatus::Upvoted
                    } else if user.downvotes.contains(id) {
                        UpvoteStatus::Downvoted
                    } else {
                        UpvoteStatus::NotVoted
                    };
                    ProposalInfo::from_proposal(proposal, *id, upvote_status, *caller)
                })
                .collect(),
            None => {
                return self
                    .proposals
                    .iter()
                    .map(|(id, proposal)| {
                        ProposalInfo::from_proposal(proposal, *id, UpvoteStatus::NotVoted, *caller)
                    })
                    .collect()
            }
        }
    }
}

fn sec_to_nanos(secs: u64) -> u64 {
    secs * 1000000000
}

fn set_timer_recursive(duration: Duration) {
    ic_cdk_timers::set_timer(duration, move || {
        ic_cdk::println!("concluding round");
        Access::with_state_mut(|state| state.conclude_round());
        Access::with_state_mut(|state| {
            state.round_end_time = time() + sec_to_nanos(state.settings.round_duration_seconds);
        });
        set_timer_recursive(duration);
    });
}

#[init]
#[candid_method(init)]
fn init() {
    let round_duration_seconds = 3600 * 12;
    STATE.with(|state| {
        *state.borrow_mut() = Some(State {
            next_user_id: 1,
            users: Users::new(),
            next_proposal_id: 0,
            proposals: HashMap::new(),
            round_results: Vec::new(),
            payment_history: Vec::new(),
            settings: Settings {
                round_duration_seconds: round_duration_seconds,
                max_state_size_bytes: 1_000_000_000,
                reward_per_round_e8s: 100_000_000, //1 icp 100_000_000
                max_proposals_per_round: 1500,
                max_proposals_per_user: 5,
                max_tweet_length: 280,
            },
            round_end_time: time() + sec_to_nanos(round_duration_seconds),
            last_user_backup: 0,
            test: Some("test".to_string()),
        });
    });

    set_timer_recursive(Duration::from_secs(round_duration_seconds));
}

fn check_if_admin() -> Result<(), Error> {
    let caller = caller();
    // test principal = rwbxt-jvr66-qvpbz-2kbh3-u226q-w6djk-b45cp-66ewo-tpvng-thbkh-wae

    if caller
        != Principal::from_text("25xau-y2lix-xnu4a-gfgnv-nsm4l-5vsde-3hsvd-ol3o6-qwihp-5crn7-sqe")
            .unwrap()
    {
        return Err(Error::NoPermission);
    }
    Ok(())
}

#[update]
#[candid_method(update)]
fn create_user(create_args: CreateUserArg) -> Result<u32, Error> {
    check_if_admin()?;
    Access::with_state_mut(|state| state.create_user(create_args))
}

#[update]
#[candid_method(update)]
fn verify_user(user_id: u32) -> Result<(), Error> {
    check_if_admin()?;
    Access::with_state_mut(|state| state.verify_user(user_id))
}

#[update]
#[candid_method(update)]
fn stage_new_principal(principal: Principal, login_method: LoginMethod) -> Result<(), Error> {
    Access::with_state_mut(|state| state.stage_new_principal(principal, login_method))
}

#[update]
#[candid_method(update)]
fn update_user_principal(new_principal: Principal) -> Result<(), Error> {
    Access::with_state_mut(|state| state.update_user_principal(new_principal))
}

#[update]
#[candid_method(update)]
fn vote_for_proposal(proposal_id: u32, vote: Vote) -> Result<(), Error> {
    Access::with_state_mut(|state| state.vote_for_proposal(proposal_id, vote))
}

#[update]
#[candid_method(update)]
fn create_proposal(create_args: CreateProposalArg) -> Result<u32, Error> {
    Access::with_state_mut(|state| state.create_proposal(create_args))
}

#[update]
#[candid_method(update)]
fn update_settings(settings: Settings) -> Result<(), Error> {
    check_if_admin()?;
    Access::with_state_mut(|state| state.update_settings(settings));
    Ok(())
}

#[update]
#[candid_method(update)]
fn update_account_identifier(account_identifier: AccountIdentifier) -> Result<(), Error> {
    Access::with_state_mut(|state| state.update_account_identifier(account_identifier))
}

#[update]
#[candid_method(update)]
fn update_last_backup_time(time: u64) -> Result<(), Error> {
    check_if_admin()?;
    Access::with_state_mut(|state| state.last_user_backup = time);
    Ok(())
}

#[update]
#[candid_method(update)]
fn post_tweet(index: usize) -> Result<(), Error> {
    Access::with_state_mut(|state| state.tweet_round_result(index))
}

#[update]
#[candid_method(update)]
fn report_proposal(proposal_id: u32) -> Result<(), Error> {
    Access::with_state_mut(|state| state.report_proposal(proposal_id, &caller()))
}

#[update]
#[candid_method(update)]
fn update_username(username: String) -> Result<(), Error> {
    Access::with_state_mut(|state| state.update_username(username))
}

#[update]
#[candid_method(update)]
fn delete_proposal(proposal_id: u32) -> Result<(), Error> {
    Access::with_state_mut(|state| state.delete_proposal(proposal_id))
}

#[update]
#[candid_method(update)]
async fn claim_reward() -> Result<BlockIndex, Error> {
    let caller = caller();
    let withdraw_info = Access::with_state_mut(|state| state.stage_payment(&caller))?;

    let call_result = ic_ledger_types::transfer(
        MAINNET_LEDGER_CANISTER_ID,
        TransferArgs {
            to: withdraw_info.deposit_address,
            amount: Tokens::from_e8s(withdraw_info.amount),
            fee: DEFAULT_FEE,
            memo: Memo(0),
            from_subaccount: None,
            created_at_time: None,
        },
    )
    .await;

    Access::with_state_mut(|state| state.handle_payment_result(withdraw_info, call_result))
}

// Queries
#[query]
#[candid_method(query)]
fn get_proposals() -> Vec<Proposal> {
    Access::with_state(|state| state.proposals.values().cloned().collect())
}

#[query]
#[candid_method(query)]
fn get_proposals_info() -> Vec<ProposalInfo> {
    Access::with_state(|state| state.get_proposals_info(&caller()))
}

#[query]
#[candid_method(query)]
fn get_users_by_karma(nr_of_users: u32) -> Vec<User> {
    Access::with_state(|state| state.users.get_users_by_karma(nr_of_users))
}

#[query]
#[candid_method(query)]
fn get_user() -> Result<User, Error> {
    Access::with_state(|state| {
        state
            .users
            .get(&caller())
            .cloned()
            .ok_or(Error::UserDoesNotExist)
    })
}

#[query]
#[candid_method(query)]
fn get_users() -> Vec<User> {
    Access::with_state(|state| state.users.get_users())
}

#[query]
#[candid_method(query)]
fn get_user_range(start: u32, end: u32) -> Vec<User> {
    Access::with_state(|state| state.users.get_user_range(start, end))
}

#[query]
#[candid_method(query)]
fn get_changed_users(time_arg: Option<u64>) -> (Vec<(Principal, User)>, u64) {
    let now = time();
    Access::with_state(|state| {
        let time = time_arg.unwrap_or_else(|| state.last_user_backup);
        (state.users.get_changed_users(time), now)
    })
}

#[query]
#[candid_method(query)]
fn get_round_end_time_nano() -> u64 {
    Access::with_state(|state| state.round_end_time)
}

#[query]
#[candid_method(query)]
fn poll_untweeted() -> Option<(usize, Tweet)> {
    Access::with_state_mut(|state| state.poll_untweeted())
}

#[query]
#[candid_method(query)]
fn get_canister_account() -> String {
    let id = AccountIdentifier::new(&id(), &DEFAULT_SUBACCOUNT);
    id.to_string()
}

#[pre_upgrade]
fn pre_upgrade() {
    STATE.with(|cell| {
        ciborium::ser::into_writer(cell.borrow().deref(), StableWriter::default())
            .expect("failed to encode state")
    })
}

#[post_upgrade]
fn post_upgrade() {
    STATE.with(|cell| {
        let state =
            ciborium::de::from_reader(StableReader::default()).expect("failed to decode state");
        *cell.borrow_mut() = state;
    });

    Access::with_state_mut(|state| {
        let new_duration = Duration::from_secs(3600 * 25);
        state.settings.round_duration_seconds = 3600 * 25;
        state.round_end_time = time() + sec_to_nanos(state.settings.round_duration_seconds);
        set_timer_recursive(new_duration);
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    use candid::export_service;

    #[test]
    fn save_candid() {
        use std::env;
        use std::fs::write;
        use std::path::PathBuf;

        let dir = PathBuf::from(env::current_dir().unwrap());
        export_service!();
        write(dir.join("john_dao.did"), __export_service()).expect("Write failed.");
    }
}
