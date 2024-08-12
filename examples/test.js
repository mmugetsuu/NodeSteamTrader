const SteamTradeBot = require('../main/trade');
const bot = new SteamTradeBot('login', 'password', 'twoFactorCode');
// or const bot = new SteamTradeBot('login', 'password');

// Inventory

bot.getInventory('steamId', 570)
    .then(inventory => {
        console.log('Inventory:', inventory);
    })
    .catch(error => {
        console.error('Failed to fetch inventory:', error);
    });

// Trade

const itemsToSend = [
    {
        appid: 570, // dota2
        contextid: '2',
        assetid: 'assetId'
    },
];
bot.sendTradeOffer("steamId", itemsToSend, 'Description')
    .then(response => {
        console.log('Trade offer response:', response);
    })
    .catch(error => {
        console.error('Failed to send trade offer:', error);
    });