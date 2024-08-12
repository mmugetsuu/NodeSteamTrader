const fs = require('fs');
const SteamUser = require('steam-user');
const axios = require('axios');
const querystring = require('querystring');
const appidToGameName = {
    570: 'Dota 2',
    730: 'Counter-Strike 2',
    252490: 'Rust',
};

class TraderError extends Error {
    constructor(message) {
        super(message);
        this.name = "TraderError";
    }
}

class SteamTradeBot {
    constructor(steamUsername, steamPassword, steamGuardCode = null) {
        if (!steamUsername || !steamPassword) {
            throw new TraderError('Steam username and password must be provided');
        }

        this.steamUsername = steamUsername;
        this.steamPassword = steamPassword;
        this.steamGuardCode = steamGuardCode;
        this.steamGuardFilePath = 'steam_guard_code.txt';
        this.sessionID = null;
        this.cookies = null;
        this.client = new SteamUser();
        this.isLoggedIn = false;

        if (!fs.existsSync(this.steamGuardFilePath)) {
            fs.writeFileSync(this.steamGuardFilePath, this.steamGuardCode || '');
            console.log(`Created file ${this.steamGuardFilePath}. Please enter the Steam Guard code.`);
        }

        if (!this.steamGuardCode) {
            this.steamGuardCode = fs.readFileSync(this.steamGuardFilePath, 'utf8').trim();
        }

        this.logOn();
    }

    logOn() {
        const logOnOptions = {
            accountName: this.steamUsername,
            password: this.steamPassword,
            twoFactorCode: this.steamGuardCode || null,
        };

        this.client.logOn(logOnOptions);

        this.client.on('loggedOn', () => {
            console.log('Successfully logged into Steam');
            if (fs.existsSync(this.steamGuardFilePath)) {
                fs.unlinkSync(this.steamGuardFilePath);
            }
            this.client.setPersona(SteamUser.EPersonaState.Online);
        });

        this.client.on('webSession', (sessionID, cookies) => {
            this.sessionID = sessionID;
            this.cookies = cookies.join('; ');
            this.isLoggedIn = true;

            if (fs.existsSync(this.steamGuardFilePath)) {
                fs.unlinkSync(this.steamGuardFilePath);
            }
        });

        this.client.on('error', (err) => {
            console.error('Login error:', err.message);
            if (this.steamGuardCode) {
                console.error('Invalid Steam Guard code provided. Exiting.');
                if (fs.existsSync(this.steamGuardFilePath)) {
                    fs.unlinkSync(this.steamGuardFilePath);
                }
                process.exit(1);
            } else {
                this.isLoggedIn = false;
            }
        });

        this.client.on('steamGuard', (domain, callback, lastCodeWrong) => {
            if (lastCodeWrong) {
                console.error('Invalid Steam Guard code provided.');
                if (fs.existsSync(this.steamGuardFilePath)) {
                    fs.unlinkSync(this.steamGuardFilePath);
                }
                process.exit(1);
            } else if (this.steamGuardCode) {
                callback(this.steamGuardCode);
            } else {
                this.waitForSteamGuardCode(callback);
            }
        });
    }

    waitForSteamGuardCode(callback) {
        console.log(`Waiting for Steam Guard code in file: ${this.steamGuardFilePath}`);
        const checkInterval = setInterval(() => {
            if (fs.existsSync(this.steamGuardFilePath)) {
                const code = fs.readFileSync(this.steamGuardFilePath, 'utf8').trim();
                if (code) {
                    clearInterval(checkInterval);
                    callback(code);
                } else {
                    console.log('Waiting for Steam Guard code...');
                }
            }
        }, 10000);
    }

    async ensureLoggedIn() {
        if (!this.isLoggedIn) {
            return new Promise((resolve, reject) => {
                this.client.on('webSession', () => resolve());
                this.client.on('error', (err) => reject(err));
            });
        }
    }

    async sendTradeOffer(steamid64, itemsToSend, tradeMessage = '') {
        if (!steamid64) {
            throw new TraderError('Steam ID64 must be provided');
        }
        if (!itemsToSend || itemsToSend.length === 0) {
            throw new TraderError('At least one item must be provided for the trade');
        }

        await this.ensureLoggedIn();

        const itemAsset = itemsToSend.map(item => ({
            "appid": item.appid,
            "contextid": item.contextid,
            "amount": "1",
            "assetid": item.assetid
        }));

        const jsonTradeOffer = {
            "newversion": true,
            "version": 4,
            "me": {
                "assets": itemAsset,
                "currency": [],
                "ready": false
            },
            "them": {
                "assets": [],
                "currency": [],
                "ready": false
            }
        };

        const data = {
            sessionid: this.sessionID,
            serverid: '1',
            partner: steamid64,
            tradeoffermessage: tradeMessage,
            json_tradeoffer: JSON.stringify(jsonTradeOffer),
            captcha: '',
            trade_offer_create_params: ''
        };

        const config = {
            headers: {
                'referer': `https://steamcommunity.com/tradeoffer/new/?partner=${steamid64}`,
                'Content-Type': 'application/x-www-form-urlencoded',
                'Cookie': this.cookies
            }
        };

        return axios.post('https://steamcommunity.com/tradeoffer/new/send', querystring.stringify(data), config)
            .then(response => {
                return response.data;
            })
            .catch(error => {
                throw new TraderError(error.message);
            });
    }

    async getInventory(steamid64, appid, contextid = '2') {
        if (!steamid64) {
            throw new TraderError('Steam ID64 must be provided');
        }
        if (!appid) {
            throw new TraderError('App ID must be provided');
        }

        await this.ensureLoggedIn();

        const url = `https://steamcommunity.com/inventory/${steamid64}/${appid}/${contextid}?l=english&count=5000`;

        const config = {
            headers: {
                'Cookie': this.cookies
            }
        };

        return axios.get(url, config)
            .then(response => {
                const assets = response.data.assets || [];
                const descriptions = response.data.descriptions || [];

                const tradableItems = descriptions.filter(item => item.tradable === 1)
                    .map(item => {
                        const asset = assets.find(a => a.classid === item.classid && a.instanceid === item.instanceid);
                        return {
                            assetid: asset ? asset.assetid : 'Unknown',
                            appid: item.appid,
                            appname: appidToGameName[item.appid] || 'Unknown',
                            instanceid: item.instanceid,
                            market_name: item.market_name,
                        };
                    });
                return tradableItems;
            })
            .catch(error => {
                throw new TraderError('Failed to fetch inventory', error.message);
            });
    }
}

module.exports = SteamTradeBot;
