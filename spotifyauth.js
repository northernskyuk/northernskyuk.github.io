	window.addEventListener(
  "message",
  (event) => {
  if (event.origin !== "https://northernskyuk.github.io") return;
   if (!event.data || event.data.type !== 'spotify-auth') return;
  console.log(event);
  const accessCode = event.data.code;
      localStorage.setItem('spotify_access_code', accessCode);
	 getCodeToken();	  
  },
  false,
);

const clientId = 'b8aa6c40699b4bfa9ea2436a2dd92657';
const redirectUri = 'https://northernskyuk.github.io/index.html';
const scopes = 'streaming user-read-email user-read-private user-read-currently-playing user-read-playback-state app-remote-control';

// PKCE: Generate Code Verifier and Challenge
const generateRandomString = (length) => {
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    const values = crypto.getRandomValues(new Uint8Array(length));
    return values.reduce((acc, x) => acc + possible[x % possible.length], "");
};

const generateCodeVerifier = () => generateRandomString(64);

const sha256 = async (plain) => {
    const encoder = new TextEncoder();
    const data = encoder.encode(plain);
    return window.crypto.subtle.digest('SHA-256', data);
};

const base64encode = (input) => {
    return btoa(String.fromCharCode(...new Uint8Array(input)))
        .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};

const generateCodeChallenge = async (codeVerifier) => {
    const hashed = await sha256(codeVerifier);
    return base64encode(hashed);
};

// get access code
const redirectToSpotifyAuthorize = async () => {
    const codeVerifier = generateCodeVerifier();
    localStorage.setItem('code_verifier', codeVerifier);
    const codeChallenge = await generateCodeChallenge(codeVerifier);

    const authUrl = `https://accounts.spotify.com/authorize?` + new URLSearchParams({
        client_id: clientId,
        response_type: 'code',
        redirect_uri: redirectUri,
        code_challenge_method: 'S256',
        code_challenge: codeChallenge,
        scope: scopes
    });

    // Use redirect instead of pop-up
    window.location.href = authUrl;
};

const getCodeToken = async (code) => {
    try {
        const response = await fetch('https://accounts.spotify.com/api/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                code: code,
                redirect_uri: redirectUri,
                grant_type: 'authorization_code',
                code_verifier: localStorage.getItem('code_verifier'),
                client_id: clientId
            }).toString()
        });

        const data = await response.json();
        localStorage.setItem('spotify_access_token', data.access_token);
        localStorage.setItem('spotify_refresh_token', data.refresh_token);
        // Clean up URL (remove code param)
        window.history.replaceState({}, document.title, redirectUri);
        window.location.reload();
    } catch (error) {
        console.error('Error fetching access token:', error);
    }
};

const refreshAccessToken = async () => {
    const refreshToken = localStorage.getItem('spotify_refresh_token');
    if (!refreshToken) return;

    const response = await fetch('https://accounts.spotify.com/api/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
            client_id: clientId,
            grant_type: 'refresh_token',
            refresh_token: refreshToken
        })
    });

    const data = await response.json();
    if (data.access_token) {
        localStorage.setItem('spotify_access_token', data.access_token);
        if (data.refresh_token) {
            localStorage.setItem('spotify_refresh_token', data.refresh_token);
        }
    } else {
        console.error('Failed to refresh token:', data);
    }
};

const retrieveAccessToken = () => localStorage.getItem('spotify_access_token');

// On page load, check for ?code= in the URL and exchange it for tokens
(function handleSpotifyAuthCode() {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    if (code) {
        getCodeToken(code);
    }
})();