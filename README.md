Prototype Spotify Client for Jubeat controllers/cabs

Initial version has a fair bit of jank to be fixed:

* If you are playing from a queue the next tracks will show on the buttons. If you select a button it will play that track but replaces the queue. I think this is a limitation of the Spotify Web SDK but will look at workarounds as it's annoying. 

* Authorisation needs keyboard for initial version - makes it awkward to use on a real cab first time. Will look at a backend to allow users to authenticate from another device via QR code.  

* Hardware input - currently it uses the typical jubeat keyboard mapping (1234/qwer/asdf/zxcv) so things like a DAO will work. I have made a version of DragonMindeds JubeatMenu which sends keyboard presses from the panel, allowing a real cab/p4io to send commands to a browser window.
