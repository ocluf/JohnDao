use std::collections::{HashMap, HashSet};

use candid::{CandidType, Principal};
use ic_cdk::api::time;
use ic_ledger_types::AccountIdentifier;
use serde::{Deserialize, Serialize};

use crate::Error;

#[derive(CandidType, Serialize, Deserialize, Clone)]
pub enum LoginMethod {
    Twitter,
    II,
    Other(String),
}

#[derive(CandidType, Serialize, Deserialize, Clone)]
pub enum VerificationStatus {
    Unverified,
    Verified,
    Bot,
}

#[derive(CandidType, Serialize, Deserialize, Clone)]
pub enum Badge {
    OG,
    Donated,
    Other(String),
}

#[derive(CandidType, Serialize, Deserialize, Clone)]
pub struct User {
    pub id: u32,
    pub user_name: Option<String>,
    pub login_method: LoginMethod,
    pub badges: Vec<Badge>,
    pub new_auth: Option<(Principal, LoginMethod)>,
    pub karma: i32,
    pub withdrawable_e8s: u64,
    pub deposit_address: Option<AccountIdentifier>,
    pub payment_in_progress: bool,
    pub created_proposal: Option<u32>, //this one seems to be useless oops
    pub upvotes: HashSet<u32>,
    pub downvotes: HashSet<u32>,
    pub verification_status: VerificationStatus,
    pub last_updated: u64,
    pub nr_posts_this_round: u32,
}

#[derive(CandidType, Serialize, Deserialize, Clone)]
pub struct Users {
    pub users: HashMap<Principal, User>,
    pub user_principals: HashMap<u32, Principal>,
}

impl Users {
    pub fn new() -> Self {
        Self {
            users: HashMap::new(),
            user_principals: HashMap::new(),
        }
    }

    pub fn get(&self, principal: &Principal) -> Option<&User> {
        self.users.get(principal)
    }

    pub fn get_mut(&mut self, principal: &Principal) -> Option<&mut User> {
        self.users.get_mut(principal).map(|user| {
            user.last_updated = time();
            user
        })
    }

    pub fn get_by_id(&mut self, id: u32) -> Option<&mut User> {
        let principal = *self.user_principals.get(&id)?;
        self.users.get_mut(&principal)
    }

    pub fn get_users(&self) -> Vec<User> {
        self.users.values().cloned().collect()
    }

    pub fn get_user_range(&self, start: u32, end: u32) -> Vec<User> {
        self.users
            .values()
            .cloned()
            .filter(|user| user.id >= start && user.id <= end)
            .collect()
    }

    pub fn get_users_by_karma(&self, nr_of_users: u32) -> Vec<User> {
        let mut users = self.users.values().cloned().collect::<Vec<User>>();
        users.sort_by(|a, b| b.karma.cmp(&a.karma));
        users.truncate(nr_of_users as usize);
        users
    }

    pub fn insert(&mut self, principal: Principal, user: User) {
        self.users.insert(principal, user.clone());
        self.user_principals.insert(user.id, principal);
    }

    pub fn principal_in_use(&self, principal: &Principal) -> bool {
        self.users.contains_key(principal)
    }

    pub fn remove(&mut self, principal: &Principal) -> Option<User> {
        let user = self.users.remove(principal);
        if let Some(user) = &user {
            self.user_principals.remove(&user.id);
        }
        user
    }

    pub fn get_changed_users(&self, time: u64) -> Vec<(Principal, User)> {
        let mut changed_users = Vec::new();
        for (principal, user) in self.users.iter() {
            if user.last_updated > time {
                changed_users.push((*principal, user.clone()));
            }
        }
        changed_users
    }

    pub fn get_upvote_delta(
        &mut self,
        upvoter: &Principal,
        proposal_id: &u32,
    ) -> Result<i32, Error> {
        let upvoting_user = self.get_mut(upvoter).ok_or(Error::UserDoesNotExist)?;
        if upvoting_user.upvotes.contains(proposal_id) {
            // cancel earlier vote if already upvoted
            upvoting_user.upvotes.remove(proposal_id);
            return Ok(-1);
        }
        if upvoting_user.downvotes.contains(proposal_id) {
            upvoting_user.downvotes.remove(proposal_id);
            upvoting_user.upvotes.insert(*proposal_id);
            Ok(2)
        } else {
            upvoting_user.upvotes.insert(*proposal_id);
            Ok(1)
        }
    }

    pub fn reset_round(&mut self) {
        for user in self.users.values_mut() {
            user.upvotes.clear();
            user.downvotes.clear();
        }
    }

    pub fn get_downvote_delta(
        &mut self,
        caller: &Principal,
        proposal_id: &u32,
    ) -> Result<i32, Error> {
        let downvoting_user = self.get_mut(caller).ok_or(Error::UserDoesNotExist)?;
        if downvoting_user.downvotes.contains(proposal_id) {
            // cancel earlier vote if already downvoted
            downvoting_user.downvotes.remove(proposal_id);
            return Ok(1);
        }
        if downvoting_user.upvotes.contains(proposal_id) {
            downvoting_user.upvotes.remove(proposal_id);
            downvoting_user.downvotes.insert(*proposal_id);
            Ok(-2)
        } else {
            downvoting_user.downvotes.insert(*proposal_id);
            Ok(-1)
        }
    }

    pub fn get_all_users_that_voted(&self) -> Vec<u32> {
        let mut users_that_voted = Vec::new();
        for user in self.users.values() {
            if !user.upvotes.is_empty() || !user.downvotes.is_empty() {
                users_that_voted.push(user.id);
            }
        }
        users_that_voted
    }
}
