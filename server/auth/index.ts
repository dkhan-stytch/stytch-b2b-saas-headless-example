import type {CookieOptions, Request, RequestHandler, Response} from "express";
import * as stytch from "stytch";

/**
 * Options for setting cookies.
 *
 * TODO: update your cookie options to meet your app’s security requirements!
 *
 * @default { path : '/' }
 * @see https://www.npmjs.com/package/cookies#cookiessetname--values--options
 */
export const cookieOptions: CookieOptions = {path: "/"};

/**
 * The URL for the Stytch API changes based on the environment you’re working
 * with. Using an env var makes it easier to switch environments for e.g. local
 * dev and production.
 *
 * @see https://stytch.com/docs/b2b/guides/dashboard/api-keys
 */
export const stytchEnv =
    process.env.STYTCH_PROJECT_ENV === "live"
        ? stytch.envs.live
        : stytch.envs.test;

/**
 * Make it possible to load the Stytch SDK’s B2B client anywhere in the backend
 * without creating multiple instances of the Stytch SDK.
 *
 * @see https://github.com/stytchauth/stytch-node?tab=readme-ov-file#example-b2b-usage
 */
let client: stytch.B2BClient;
export const loadStytch = () => {
    if (!client) {
        client = new stytch.B2BClient({
            project_id: process.env.STYTCH_PROJECT_ID ?? "",
            secret: process.env.STYTCH_SECRET ?? "",
            env: stytchEnv,
        });
    }

    return client;
};

declare global {
    namespace Express {
        interface Request {
            member: stytch.Member;
        }
    }
}
/**
 * Express middleware for ensuring the user requesting a route has permission to
 * do the thing they’re trying to do. This uses Stytch RBAC authorization checks
 * under the hood.
 *
 * @see https://stytch.com/docs/b2b/guides/rbac/authorization-checks
 * @see https://stytch.com/docs/b2b/api/authenticate-session
 */
export function authenticateStytchSession(): RequestHandler {
    const stytch = loadStytch();

    return async (req, res, next) => {
        try {
            const sessionToken = req.cookies.stytch_session;

            const sessionAuthRes = await stytch.sessions.authenticate({
                session_token: sessionToken,
            });

            const hasPasswordFactor = sessionAuthRes.member_session.authentication_factors
                .find(factor => factor.type === "password");
            const hasEmailOTPFactor = sessionAuthRes.member_session.authentication_factors
                .find(factor => factor.type === "email_otp");
            const hasSMSOTPFactor = sessionAuthRes.member_session.authentication_factors
                .find(factor => factor.type === "sms_otp");
            const hasTOTPFactor = sessionAuthRes.member_session.authentication_factors
                .find(factor => factor.type === "totp");

            const hasSecondFactor = hasEmailOTPFactor || hasSMSOTPFactor || hasTOTPFactor;

            if(!hasPasswordFactor || !hasSecondFactor) {
                console.log('Failed to validate session', {hasPasswordFactor, hasSecondFactor})
                res.status(401).json({message: "Unauthorized"});
                res.end();
                return;
            }

            req.member = sessionAuthRes.member;
            next();
        } catch (err) {
            res.status(401).json({message: "Unauthorized"});
            res.end();
            return;
        }
    };
}
