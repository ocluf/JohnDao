export const idlFactory = ({ IDL }) => {
  const Error = IDL.Variant({
    'AlreadyVoted' : IDL.Null,
    'RoundResultDoesNotExist' : IDL.Null,
    'AlreadyProposed' : IDL.Null,
    'UserExistsAlready' : IDL.Null,
    'UserProposalLimitReached' : IDL.Null,
    'NoDepositAddress' : IDL.Null,
    'UsernameTooLong' : IDL.Null,
    'ProposalLimitReached' : IDL.Null,
    'TweetTooLong' : IDL.Null,
    'PaymentInProgress' : IDL.Null,
    'UserDoesNotExist' : IDL.Null,
    'ProposalDoesNotExist' : IDL.Null,
    'NoPermission' : IDL.Null,
    'PaymentError' : IDL.Text,
    'NoWithdrawableE8s' : IDL.Null,
  });
  const Result = IDL.Variant({ 'Ok' : IDL.Nat64, 'Err' : Error });
  const Tweet = IDL.Variant({
    'ImageTweet' : IDL.Record({ 'tweet' : IDL.Text, 'image_path' : IDL.Text }),
    'Tweet' : IDL.Text,
  });
  const CreateProposalArg = IDL.Record({ 'tweet' : Tweet });
  const Result_1 = IDL.Variant({ 'Ok' : IDL.Nat32, 'Err' : Error });
  const CreateUserArg = IDL.Record({ 'principal' : IDL.Principal });
  const Result_2 = IDL.Variant({ 'Ok' : IDL.Null, 'Err' : Error });
  const Badge = IDL.Variant({
    'OG' : IDL.Null,
    'Donated' : IDL.Null,
    'Other' : IDL.Text,
  });
  const VerificationStatus = IDL.Variant({
    'Bot' : IDL.Null,
    'Unverified' : IDL.Null,
    'Verified' : IDL.Null,
  });
  const LoginMethod = IDL.Variant({
    'II' : IDL.Null,
    'Other' : IDL.Text,
    'Twitter' : IDL.Null,
  });
  const User = IDL.Record({
    'id' : IDL.Nat32,
    'upvotes' : IDL.Vec(IDL.Nat32),
    'user_name' : IDL.Opt(IDL.Text),
    'deposit_address' : IDL.Opt(IDL.Vec(IDL.Nat8)),
    'badges' : IDL.Vec(Badge),
    'created_proposal' : IDL.Opt(IDL.Nat32),
    'last_updated' : IDL.Nat64,
    'withdrawable_e8s' : IDL.Nat64,
    'verification_status' : VerificationStatus,
    'new_auth' : IDL.Opt(IDL.Tuple(IDL.Principal, LoginMethod)),
    'login_method' : LoginMethod,
    'payment_in_progress' : IDL.Bool,
    'downvotes' : IDL.Vec(IDL.Nat32),
    'karma' : IDL.Int32,
    'nr_posts_this_round' : IDL.Nat32,
  });
  const Proposal = IDL.Record({
    'created_by_id' : IDL.Nat32,
    'tweet' : Tweet,
    'created_at' : IDL.Nat64,
    'reports' : IDL.Vec(IDL.Principal),
    'points' : IDL.Int32,
  });
  const UpvoteStatus = IDL.Variant({
    'Downvoted' : IDL.Null,
    'NotVoted' : IDL.Null,
    'Upvoted' : IDL.Null,
  });
  const ProposalInfo = IDL.Record({
    'id' : IDL.Nat32,
    'upvote_status' : UpvoteStatus,
    'tweet' : Tweet,
    'nr_of_reports' : IDL.Nat32,
    'created_at' : IDL.Nat64,
    'created_by' : IDL.Nat32,
    'reported' : IDL.Bool,
    'points' : IDL.Int32,
  });
  const Result_3 = IDL.Variant({ 'Ok' : User, 'Err' : Error });
  const Settings = IDL.Record({
    'max_state_size_bytes' : IDL.Nat32,
    'max_tweet_length' : IDL.Nat32,
    'max_proposals_per_user' : IDL.Nat32,
    'reward_per_round_e8s' : IDL.Nat64,
    'max_proposals_per_round' : IDL.Nat32,
    'round_duration_seconds' : IDL.Nat64,
  });
  const Vote = IDL.Variant({ 'Downvote' : IDL.Null, 'Upvote' : IDL.Null });
  return IDL.Service({
    'claim_reward' : IDL.Func([], [Result], []),
    'create_proposal' : IDL.Func([CreateProposalArg], [Result_1], []),
    'create_user' : IDL.Func([CreateUserArg], [Result_1], []),
    'delete_proposal' : IDL.Func([IDL.Nat32], [Result_2], []),
    'get_canister_account' : IDL.Func([], [IDL.Text], ['query']),
    'get_changed_users' : IDL.Func(
        [IDL.Opt(IDL.Nat64)],
        [IDL.Vec(IDL.Tuple(IDL.Principal, User)), IDL.Nat64],
        ['query'],
      ),
    'get_proposals' : IDL.Func([], [IDL.Vec(Proposal)], ['query']),
    'get_proposals_info' : IDL.Func([], [IDL.Vec(ProposalInfo)], ['query']),
    'get_round_end_time_nano' : IDL.Func([], [IDL.Nat64], ['query']),
    'get_user' : IDL.Func([], [Result_3], ['query']),
    'get_user_range' : IDL.Func(
        [IDL.Nat32, IDL.Nat32],
        [IDL.Vec(User)],
        ['query'],
      ),
    'get_users' : IDL.Func([], [IDL.Vec(User)], ['query']),
    'get_users_by_karma' : IDL.Func([IDL.Nat32], [IDL.Vec(User)], ['query']),
    'poll_untweeted' : IDL.Func(
        [],
        [IDL.Opt(IDL.Tuple(IDL.Nat64, Tweet))],
        ['query'],
      ),
    'post_tweet' : IDL.Func([IDL.Nat64], [Result_2], []),
    'report_proposal' : IDL.Func([IDL.Nat32], [Result_2], []),
    'stage_new_principal' : IDL.Func(
        [IDL.Principal, LoginMethod],
        [Result_2],
        [],
      ),
    'update_account_identifier' : IDL.Func([IDL.Vec(IDL.Nat8)], [Result_2], []),
    'update_last_backup_time' : IDL.Func([IDL.Nat64], [Result_2], []),
    'update_settings' : IDL.Func([Settings], [Result_2], []),
    'update_user_principal' : IDL.Func([IDL.Principal], [Result_2], []),
    'update_username' : IDL.Func([IDL.Text], [Result_2], []),
    'verify_user' : IDL.Func([IDL.Nat32], [Result_2], []),
    'vote_for_proposal' : IDL.Func([IDL.Nat32, Vote], [Result_2], []),
  });
};
export const init = ({ IDL }) => { return []; };
