import { Client, auth } from "twitter-api-sdk";
import express from "express";
import dotenv from "dotenv";
import axios from 'axios';


dotenv.config();

const app = express();

const STAKE_STONE_ID = "1657625619474284546";
const SERVER_URL = "https://api.stakestone.io:8064/stone/integral/save"
const CALLBACK_URL = "https://api.stakestone.io/oauth/callback";
const CLIENT_ID = process.env.CLIENT_ID as string;
const CLIENT_SECRET = process.env.CLIENT_SECRET as string;
const DEST_TWEET_ID = "1761788204745904498";


const authClient = new auth.OAuth2User({
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
    callback: CALLBACK_URL,
    scopes: ["tweet.read", "users.read", "follows.read", "follows.write", "offline.access"],
});


app.get("/oauth/callback", async function (req, res) {
    try {
        const { code, state } = req.query;

        await authClient.requestAccessToken(code as string);

        const token = authClient.token;

        const client = new Client(authClient);

        const user = (await client.users.findMyUser()).data;

        // Follow @stakestone
        await client.users.usersIdFollow(user!.id as string, { target_user_id: STAKE_STONE_ID as string });

        await axios.post(SERVER_URL, {
            uid: state,
            id: user!.id,
            name: user!.name,
            username: user!.username,
            refresh_token: token!.refresh_token,
            access_token: token!.access_token,
        });

        res.json({
            status: "success",
            data: "success",
        });
    } catch (error) {
        console.log(error);
        res.json({
            status: "error",
            data: error,
        });
    }
});

app.get("/oauth/auth", async function (req, res) {
    const { uid } = req.query;

    if (uid === undefined) {
        res.json({
            result: "uid is null"
        });
        return;
    }

    const authUrl = authClient.generateAuthURL({
        state: uid as string,
        code_challenge_method: "s256",
    });

    const decoded = decodeURIComponent(authUrl);

    res.json({
        decoded,
        uid
    });
});

app.get("/oauth/checkRetweets", async function (req, res) {
    try {
        const { access_token, refresh_token, userId } = req.query;

        if (access_token === undefined || refresh_token === undefined || userId === undefined) {
            res.json({
                status: "error",
                data: "invalid params",
            });
        }

        const tempAuth = new auth.OAuth2User({
            client_id: CLIENT_ID,
            client_secret: CLIENT_SECRET,
            callback: CALLBACK_URL,
            scopes: ["tweet.read", "users.read", "follows.read", "follows.write", "offline.access"],
            token: {
                refresh_token: refresh_token as string,
                access_token: access_token as string
            }
        });

        const ret = {
            isRetweeted: false,
            access_token: "",
            refresh_token: ""
        }

        const tempClient = new Client(tempAuth);

        const tweets = (await tempClient.tweets.usersIdTweets(userId as string, {
            expansions: [
                "author_id",
                "referenced_tweets.id"
            ],
            max_results: 1
        })).data;

        const latestToken = await tempAuth.refreshAccessToken();
        ret.access_token = latestToken.token.access_token as string;
        ret.refresh_token = latestToken.token.refresh_token as string;

        for (var i = 0; i < tweets!.length; i++) {
            if (tweets![i].referenced_tweets![0] === undefined) {
                continue;
            }
            const referenced_tweets = tweets![i].referenced_tweets![0];
            if (referenced_tweets.type === 'retweeted' && referenced_tweets.id === DEST_TWEET_ID) {
                ret.isRetweeted = true;
                break;
            }
        }

        res.json({
            status: "success",
            data: ret,
        });

    } catch (error) {
        console.log(error);
        res.json({
            status: "error",
            data: error,
        });
    }
});


app.get("/oauth/getTwitterName", async function (req, res) {
    try {
        const { access_token, refresh_token } = req.query;

        if (access_token === undefined || refresh_token === undefined) {
            res.json({
                status: "error",
                data: "invalid params",
            });
        }

        const tempAuth = new auth.OAuth2User({
            client_id: CLIENT_ID,
            client_secret: CLIENT_SECRET,
            callback: CALLBACK_URL,
            scopes: ["tweet.read", "users.read", "follows.read", "follows.write", "offline.access"],
            token: {
                refresh_token: refresh_token as string,
                access_token: access_token as string
            }
        });


        const tempClient = new Client(tempAuth);

        const user = (await tempClient.users.findMyUser()).data;

        const ret = {
            id: user?.id,
            name: user?.name,
            username: user?.username,
            access_token: "",
            refresh_token: "",
        }

        const latestToken = await tempAuth.refreshAccessToken();
        ret.access_token = latestToken.token.access_token as string;
        ret.refresh_token = latestToken.token.refresh_token as string;

        res.json({
            status: "success",
            data: ret,
        });

    } catch (error) {
        console.log(error);
        res.json({
            status: "error",
            data: error,
        });
    }
});


app.listen(3000, () => {
    console.log(`Server is running on: http://localhost:3000/`);
});
