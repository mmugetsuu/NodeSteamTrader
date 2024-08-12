# NodeSteamTrader

NodeSteamTrader is a tool designed to automate the sending of trade offers on Steam using the Steam Web API. This tool is intended for use with [Node.js](http://nodejs.org).

[![npm version](https://img.shields.io/npm/v/nodesteamtrader.svg?style=flat-square)](https://www.npmjs.org/package/nodesteamtrader)
[![npm downloads](https://img.shields.io/npm/dm/nodesteamtrader.svg?style=flat-square)](https://npm-stat.com/charts.html?package=nodesteamtrader)

## Installation

To install NodeSteamTrader, use npm or yarn:

```bash
$ npm install nodesteamtrader
$ yarn add nodesteamtrader
```

# Steam Guard
NodeSteamTrader manages Steam Guard protection. You can pass your Steam Guard code directly when initializing the bot.
If you don't use a mobile authenticator, a file will be created in the root folder where the code will be checked every 10 seconds.

```js
this.steamGuardFilePath = 'steam_guard_code.txt';
```

In both cases, if the code is incorrect, the application will stop working.
# Usage
# Get inventory
```js
const SteamTradeBot = require('nodesteamtrader');

const bot = new SteamTradeBot('your_steam_username', 'your_steam_password');
// or
const bot = new SteamTradeBot('your_steam_username', 'your_steam_password' "twoFactorCode");


bot.getInventory('steamid64_of_user', 570)  // Dota 2 Example
    .then(inventory => {
        console.log('Inventory:', inventory);
    })
    .catch(error => {
        console.error('Failed to fetch inventory:', error);
    });
```
# Send trade
```js
const SteamTradeBot = require('nodesteamtrader');

const bot = new SteamTradeBot('your_steam_username', 'your_steam_password');
// or
const bot = new SteamTradeBot('your_steam_username', 'your_steam_password' "twoFactorCode");

const itemsToSend = [
    {
        appid: 570, 
        contextid: '2',
        assetid: 'asset_id_of_item'  // ID of the item in your inventory
    },
];
bot.sendTradeOffer('steamid64_of_recipient', itemsToSend, 'Your custom trade message')
    .then(response => {
        console.log('Trade offer response:', response);
    })
    .catch(error => {
        console.error('Failed to send trade offer:', error);
    });
```

## Links

  * [Author](http://mugetsu.app/) | [GitHub](https://github.com/mmugetsuu/nodesteamtrader)
