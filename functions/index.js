import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import { Secp256k1KeyIdentity } from "@dfinity/identity-secp256k1";
import { HttpAgent } from "@dfinity/agent";
import { createActor } from "./john_dao/index.js";
import fetch from "isomorphic-fetch";
import { TwitterApi } from "twitter-api-v2";
import { Storage } from "@google-cloud/storage";
import { defineString } from "firebase-functions/params";

const seed = defineString("SEED_STRING");
const appKey = defineString("APP_KEY");
const appSecret = defineString("APP_SECRET");
const accessToken = defineString("ACCESS_TOKEN");
const accessSecret = defineString("ACCESS_SECRET");
const johndaoAccessToken = defineString("JOHN_DAO_ACCESS_TOKEN");
const johndaoAccessSecret = defineString("JOHN_DAO_ACCESS_SECRET");

// Resolves to "rwbxt-jvr66-qvpbz-2kbh3-u226q-w6djk-b45cp-66ewo-tpvng-thbkh-wae"
//const seed = "test test test test test test test test test test test test";

const identity = await Secp256k1KeyIdentity.fromSeedPhrase(seed.value());
let canisterId;
let agent;

if (process.env.FUNCTIONS_EMULATOR === "true") {
  canisterId = "bkyz2-fmaaa-aaaaa-qaaaq-cai";
  agent = new HttpAgent({
    identity,
    host: "http://127.0.0.1:8080",
    fetch,
  });
} else {
  canisterId = "migeh-kqaaa-aaaai-aatrq-cai";
  agent = new HttpAgent({
    identity,
    host: "https://icp0.io",
    fetch,
  });
}

const actor = createActor(canisterId, { agent });

export const createUser = functions.firestore
  .document("users/{userId}")
  .onCreate(async (snap, context) => {
    const createArgs = {
      principal: Secp256k1KeyIdentity.fromParsedJson(
        snap.data().privateKeyFirebase
      ).getPrincipal(),
    };
    try {
      const result = await actor.create_user(createArgs);
      if ("Ok" in result) {
        await snap.ref.update({
          canister_user_id: result.Ok,
        });
      } else if ("Err" in result) {
        await snap.ref.update({
          user_creation_error: "Failed user creation",
        });
        console.error("User creation failed");
      }
    } catch (error) {
      console.error(error);
    } finally {
      await snap.ref.update({ creating_user: false });
    }
  });

export const backupUsers = functions.pubsub
  .schedule("every 24 hours")
  .onRun(async (context) => {
    try {
      const result = await actor.get_changed_users();
      const usersCollection = admin.firestore().collection("users");
      let backupTime = result[1];
      let users = result[0];
      for (let user of users) {
        let principal = user[0];
        let userData = user[1];
        const query = usersCollection.where(
          "twitter_uid",
          "==",
          userData.twitter_uid
        );
        const querySnapshot = await query.get();
        if (!querySnapshot.empty) {
          const userRef = querySnapshot.docs[0].ref;
          await userRef.update({
            // Specify the fields you want to update
            userBackup: userData,
            principal: principal.toText(),
          });
          console.log("User document updated successfully.");
        }
      }
    } catch (error) {
      console.error(error);
    }
  });

export const scheduleTweet = functions.pubsub
  .schedule("every 5 mins")
  .onRun(async (context) => {
    try {
      const result = await actor.poll_untweeted();

      if (result.length > 0) {
        const index = result[0][0];
        const tweet = result[0][1];
        await postTweet(tweet);
        await actor.post_tweet(index);
      }
    } catch (error) {
      console.error(error);
    }
  });

function getPath(url) {
  // First, decode the URL so the '%2F' becomes '/'
  let decodedUrl = decodeURIComponent(url);

  // Split the decoded URL on 'o/' and take the second part
  let parts = decodedUrl.split("o/")[1];

  // Then, split the result on '?' and take the first part
  let result = parts.split("?")[0];

  return result;
}

/**
 *
 * @param {import("./john_dao/john_dao.did.js").Tweet} tweet
 */
async function postTweet(tweet) {
  try {
    const userClient = new TwitterApi({
      appKey: appKey.value(),
      appSecret: appSecret.value(),
      accessToken:
        process.env.FUNCTIONS_EMULATOR === "true"
          ? accessToken.value()
          : johndaoAccessToken.value(),
      accessSecret:
        process.env.FUNCTIONS_EMULATOR === "true"
          ? accessSecret.value()
          : johndaoAccessSecret.value(),
    });

    if (tweet.ImageTweet) {
      const storage = new Storage();
      const bucketName = "johndao-4b1d5.appspot.com";
      const fileName = tweet.ImageTweet.image_path;
      const file = storage.bucket(bucketName).file(getPath(fileName));
      const metadata = await file.getMetadata();
      const contentType = metadata[0].contentType;

      const [contents] = await file.download();

      const mediaId = await userClient.v1.uploadMedia(contents, {
        mimeType: contentType,
      });

      await new Promise((resolve) => setTimeout(resolve, 1)); // wait for 1

      await userClient.v2.tweetThread([
        {
          text: tweet.ImageTweet.tweet,
          media: { media_ids: [mediaId] },
        },
      ]);
    }

    if (tweet.Tweet) {
      await userClient.v2.tweet(tweet.Tweet);
    }
  } catch (error) {
    console.error("Error while creating the tweet:", error);
  }
}
