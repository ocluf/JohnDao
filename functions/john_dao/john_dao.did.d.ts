import type { Principal } from '@dfinity/principal';
import type { ActorMethod } from '@dfinity/agent';

export type Badge = { 'OG' : null } |
  { 'Donated' : null } |
  { 'Other' : string };
export interface CreateProposalArg { 'tweet' : Tweet }
export interface CreateUserArg { 'principal' : Principal }
export type Error = { 'AlreadyVoted' : null } |
  { 'RoundResultDoesNotExist' : null } |
  { 'AlreadyProposed' : null } |
  { 'UserExistsAlready' : null } |
  { 'UserProposalLimitReached' : null } |
  { 'NoDepositAddress' : null } |
  { 'UsernameTooLong' : null } |
  { 'ProposalLimitReached' : null } |
  { 'TweetTooLong' : null } |
  { 'PaymentInProgress' : null } |
  { 'UserDoesNotExist' : null } |
  { 'ProposalDoesNotExist' : null } |
  { 'NoPermission' : null } |
  { 'PaymentError' : string } |
  { 'NoWithdrawableE8s' : null };
export type LoginMethod = { 'II' : null } |
  { 'Other' : string } |
  { 'Twitter' : null };
export interface Proposal {
  'created_by_id' : number,
  'tweet' : Tweet,
  'created_at' : bigint,
  'reports' : Array<Principal>,
  'points' : number,
}
export interface ProposalInfo {
  'id' : number,
  'upvote_status' : UpvoteStatus,
  'tweet' : Tweet,
  'nr_of_reports' : number,
  'created_at' : bigint,
  'created_by' : number,
  'reported' : boolean,
  'points' : number,
}
export type Result = { 'Ok' : bigint } |
  { 'Err' : Error };
export type Result_1 = { 'Ok' : number } |
  { 'Err' : Error };
export type Result_2 = { 'Ok' : null } |
  { 'Err' : Error };
export type Result_3 = { 'Ok' : User } |
  { 'Err' : Error };
export interface Settings {
  'max_state_size_bytes' : number,
  'max_tweet_length' : number,
  'max_proposals_per_user' : number,
  'reward_per_round_e8s' : bigint,
  'max_proposals_per_round' : number,
  'round_duration_seconds' : bigint,
}
export type Tweet = {
    'ImageTweet' : { 'tweet' : string, 'image_path' : string }
  } |
  { 'Tweet' : string };
export type UpvoteStatus = { 'Downvoted' : null } |
  { 'NotVoted' : null } |
  { 'Upvoted' : null };
export interface User {
  'id' : number,
  'upvotes' : Uint32Array | number[],
  'user_name' : [] | [string],
  'deposit_address' : [] | [Uint8Array | number[]],
  'badges' : Array<Badge>,
  'created_proposal' : [] | [number],
  'last_updated' : bigint,
  'withdrawable_e8s' : bigint,
  'verification_status' : VerificationStatus,
  'new_auth' : [] | [[Principal, LoginMethod]],
  'login_method' : LoginMethod,
  'payment_in_progress' : boolean,
  'downvotes' : Uint32Array | number[],
  'karma' : number,
  'nr_posts_this_round' : number,
}
export type VerificationStatus = { 'Bot' : null } |
  { 'Unverified' : null } |
  { 'Verified' : null };
export type Vote = { 'Downvote' : null } |
  { 'Upvote' : null };
export interface _SERVICE {
  'claim_reward' : ActorMethod<[], Result>,
  'create_proposal' : ActorMethod<[CreateProposalArg], Result_1>,
  'create_user' : ActorMethod<[CreateUserArg], Result_1>,
  'delete_post' : ActorMethod<[string], Result_2>,
  'delete_proposal' : ActorMethod<[number], Result_2>,
  'get_canister_account' : ActorMethod<[], string>,
  'get_changed_users' : ActorMethod<
    [[] | [bigint]],
    [Array<[Principal, User]>, bigint]
  >,
  'get_proposals' : ActorMethod<[], Array<Proposal>>,
  'get_proposals_info' : ActorMethod<[], Array<ProposalInfo>>,
  'get_round_end_time_nano' : ActorMethod<[], bigint>,
  'get_user' : ActorMethod<[], Result_3>,
  'get_user_range' : ActorMethod<[number, number], Array<User>>,
  'get_users' : ActorMethod<[], Array<User>>,
  'get_users_by_karma' : ActorMethod<[number], Array<User>>,
  'poll_untweeted' : ActorMethod<[], [] | [[bigint, Tweet]]>,
  'post_tweet' : ActorMethod<[bigint], Result_2>,
  'report_proposal' : ActorMethod<[number], Result_2>,
  'stage_new_principal' : ActorMethod<[Principal, LoginMethod], Result_2>,
  'update_account_identifier' : ActorMethod<[Uint8Array | number[]], Result_2>,
  'update_last_backup_time' : ActorMethod<[bigint], Result_2>,
  'update_settings' : ActorMethod<[Settings], Result_2>,
  'update_user_principal' : ActorMethod<[Principal], Result_2>,
  'verify_user' : ActorMethod<[number], Result_2>,
  'vote_for_proposal' : ActorMethod<[number, Vote], Result_2>,
}
