Prototype Spotify Client for Jubeat controllers/cabs

Initial version has a fair bit of jank to be fixed:

Authorization currently auto-opens in a new window, triggering popup blockers. Will move this to be triggered by one of the buttons if no token is present. 
The Player doesn't handle token expiry very well but it sorts itself out once an API call is made.
Code needs major refactoring. 
Authorisation needs keyboard for initial version - makes it difficult to use on a real cab first time.
Hardware input - currently it uses the typical jubeat keyboard mapping (1234/qwer/asdf/zxcv) so things like a DAO will work.
