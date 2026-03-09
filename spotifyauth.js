window.addEventListener(
    "message",
    (event) => {
        if (event.origin !== "https://northernskyuk.github.io") return;
        if (!event.data || event.data.type !== "spotify-auth") return;

        const accessCode = event.data.code;
        if (!accessCode) return;
        getCodeToken(accessCode);
    },
    false,
);

const clientId = "b8aa6c40699b4bfa9ea2436a2dd92657";
const redirectUri = "https://northernskyuk.github.io/index.html";
const scopes = "streaming user-read-email user-read-private user-read-currently-playing user-read-playback-state app-remote-control";

const SPOTIFY_ACCESS_TOKEN_KEY = "spotify_access_token";
const SPOTIFY_REFRESH_TOKEN_KEY = "spotify_refresh_token";
const SPOTIFY_TOKEN_EXPIRES_AT_KEY = "spotify_token_expires_at";
const SPOTIFY_CODE_VERIFIER_KEY = "code_verifier";
const SPOTIFY_AUTH_REDIRECT_AT_KEY = "spotify_auth_redirect_at";
const AUTH_REDIRECT_COOLDOWN_MS = 15000;
const TOKEN_EXPIRY_SAFETY_MS = 30000;

let refreshInFlight = null;

const generateRandomString = (length) => {
    const possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    const values = crypto.getRandomValues(new Uint8Array(length));
    return values.reduce((acc, x) => acc + possible[x % possible.length], "");
};

const generateCodeVerifier = () => generateRandomString(64);

const sha256 = async (plain) => {
    const encoder = new TextEncoder();
    const data = encoder.encode(plain);
    return window.crypto.subtle.digest("SHA-256", data);
};

const base64encode = (input) => {
    return btoa(String.fromCharCode(...new Uint8Array(input)))
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=+$/, "");
};

const generateCodeChallenge = async (codeVerifier) => {
    const hashed = await sha256(codeVerifier);
    return base64encode(hashed);
};

const storeTokenData = (data) => {
    if (!data || !data.access_token) return false;

    localStorage.setItem(SPOTIFY_ACCESS_TOKEN_KEY, data.access_token);
    const expiresInSeconds = Number(data.expires_in || 3600);
    const expiresAt = Date.now() + expiresInSeconds * 1000;
    localStorage.setItem(SPOTIFY_TOKEN_EXPIRES_AT_KEY, String(expiresAt));

    if (data.refresh_token) {
        localStorage.setItem(SPOTIFY_REFRESH_TOKEN_KEY, data.refresh_token);
    }

    return true;
};

const clearTokenData = () => {
    localStorage.removeItem(SPOTIFY_ACCESS_TOKEN_KEY);
    localStorage.removeItem(SPOTIFY_REFRESH_TOKEN_KEY);
    localStorage.removeItem(SPOTIFY_TOKEN_EXPIRES_AT_KEY);
};

const isAccessTokenExpired = (safetyWindowMs = TOKEN_EXPIRY_SAFETY_MS) => {
    const expiresAt = Number(localStorage.getItem(SPOTIFY_TOKEN_EXPIRES_AT_KEY) || "0");
    if (!expiresAt) return true;
    return Date.now() + safetyWindowMs >= expiresAt;
};

const retrieveAccessToken = () => {
    const token = localStorage.getItem(SPOTIFY_ACCESS_TOKEN_KEY);
    if (!token) return null;
    if (isAccessTokenExpired()) return null;
    return token;
};

const hasSpotifySession = () => {
    return Boolean(localStorage.getItem(SPOTIFY_ACCESS_TOKEN_KEY) || localStorage.getItem(SPOTIFY_REFRESH_TOKEN_KEY));
};

const redirectToSpotifyAuthorize = async (reason = "") => {
    const lastRedirectAt = Number(localStorage.getItem(SPOTIFY_AUTH_REDIRECT_AT_KEY) || "0");
    const now = Date.now();

    if (now - lastRedirectAt < AUTH_REDIRECT_COOLDOWN_MS) {
        console.warn("Skipping duplicate Spotify auth redirect", reason);
        return;
    }

    localStorage.setItem(SPOTIFY_AUTH_REDIRECT_AT_KEY, String(now));

    const codeVerifier = generateCodeVerifier();
    localStorage.setItem(SPOTIFY_CODE_VERIFIER_KEY, codeVerifier);
    const codeChallenge = await generateCodeChallenge(codeVerifier);

    const authUrl = `https://accounts.spotify.com/authorize?` + new URLSearchParams({
        client_id: clientId,
        response_type: "code",
        redirect_uri: redirectUri,
        code_challenge_method: "S256",
        code_challenge: codeChallenge,
        scope: scopes,
        show_dialog: "false",
    });

    window.location.href = authUrl;
};

const getCodeToken = async (code) => {
    const codeVerifier = localStorage.getItem(SPOTIFY_CODE_VERIFIER_KEY);
    if (!code || !codeVerifier) {
        console.error("Missing Spotify auth code or code_verifier");
        await redirectToSpotifyAuthorize("missing_auth_code_or_verifier");
        return false;
    }

    try {
        const response = await fetch("https://accounts.spotify.com/api/token", {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({
                code,
                redirect_uri: redirectUri,
                grant_type: "authorization_code",
                code_verifier: codeVerifier,
                client_id: clientId,
            }).toString(),
        });

        const data = await response.json();
        if (!response.ok || !storeTokenData(data)) {
            console.error("Error exchanging Spotify authorization code", data);
            return false;
        }

        localStorage.removeItem(SPOTIFY_CODE_VERIFIER_KEY);
        window.history.replaceState({}, document.title, redirectUri);
        window.location.reload();
        return true;
    } catch (error) {
        console.error("Error fetching Spotify access token", error);
        return false;
    }
};

const refreshAccessToken = async (force = false) => {
    if (!force && retrieveAccessToken()) {
        return true;
    }

    if (refreshInFlight) {
        return refreshInFlight;
    }

    const refreshToken = localStorage.getItem(SPOTIFY_REFRESH_TOKEN_KEY);
    if (!refreshToken) {
        return false;
    }

    refreshInFlight = (async () => {
        try {
            const response = await fetch("https://accounts.spotify.com/api/token", {
                method: "POST",
                headers: { "Content-Type": "application/x-www-form-urlencoded" },
                body: new URLSearchParams({
                    client_id: clientId,
                    grant_type: "refresh_token",
                    refresh_token: refreshToken,
                }).toString(),
            });

            const data = await response.json();
            if (!response.ok || !storeTokenData(data)) {
                console.error("Failed to refresh Spotify token", data);
                if (data && data.error === "invalid_grant") {
                    clearTokenData();
                }
                return false;
            }

            return true;
        } catch (error) {
            console.error("Error refreshing Spotify token", error);
            return false;
        } finally {
            refreshInFlight = null;
        }
    })();

    return refreshInFlight;
};

const getValidAccessToken = async () => {
    const existingToken = retrieveAccessToken();
    if (existingToken) {
        return existingToken;
    }

    const refreshed = await refreshAccessToken(true);
    if (!refreshed) {
        return null;
    }

    return retrieveAccessToken();
};

const getAuthHeaders = async (headers = {}) => {
    const token = await getValidAccessToken();
    if (!token) return null;

    return {
        ...headers,
        Authorization: `Bearer ${token}`,
    };
};

(async function handleSpotifyAuthCode() {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");

    if (code) {
        const exchanged = await getCodeToken(code);
        if (!exchanged) {
            await redirectToSpotifyAuthorize("code_exchange_failed");
        }
        return;
    }

    const token = retrieveAccessToken();
    if (token) {
        return;
    }

    const refreshed = await refreshAccessToken(true);
    if (!refreshed) {
        await redirectToSpotifyAuthorize("no_valid_session");
    }
})();
