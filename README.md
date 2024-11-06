Prototype Spotify Client for Jubeat controllers/cabs

Initial version has a fair bit of jank to be fixed:

* Track position is fairly static. Will fix that and maaaaybe add a jubeat-style progress bar.

* If you are playing from a queue the next tracks will show on the buttons. If you select a button it will play that track but replaces the queue and sometimes shows the same track 10 times. I think this is a spotify issue but will look at workarounds as it's annoying.

* Authorization currently auto-opens in a new window, triggering popup blockers. Will move this to be triggered by one of the buttons if no token is present. 

* The Player doesn't handle token expiry very well but it sorts itself out once an API call is made.

* Code needs major refactoring. 

* Authorisation needs keyboard for initial version - makes it difficult to use on a real cab first time. Might look at ways of authenticating from another device. 

* Hardware input - currently it uses the typical jubeat keyboard mapping (1234/qwer/asdf/zxcv) so things like a DAO will work.
