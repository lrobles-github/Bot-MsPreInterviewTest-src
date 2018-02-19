/*-----------------------------------------------------------------------------
A simple echo bot for the Microsoft Bot Framework. 
-----------------------------------------------------------------------------*/

var restify = require('restify');
var builder = require('botbuilder');
var botbuilder_azure = require("botbuilder-azure");

// Setup Restify Server
var server = restify.createServer();
server.listen(process.env.port || process.env.PORT || 3978, function () {
   console.log('%s listening to %s', server.name, server.url); 
});
  
// Create chat connector for communicating with the Bot Framework Service
var connector = new builder.ChatConnector({
    appId: process.env.MicrosoftAppId,
    appPassword: process.env.MicrosoftAppPassword,
    openIdMetadata: process.env.BotOpenIdMetadata 
});

// Listen for messages from users 
server.post('/api/messages', connector.listen());

// Storage setup

var tableName = 'botdata';
var azureTableClient = new botbuilder_azure.AzureTableClient(tableName, process.env['AzureWebJobsStorage']);
var tableStorage = new botbuilder_azure.AzureBotStorage({ gzipData: false }, azureTableClient);

// Create bot
var bot = new builder.UniversalBot(connector);
bot.set('storage', tableStorage);

// These would need validation
var luisAppId = process.env.LuisAppId;
var luisAPIKey = process.env.LuisAPIKey;
var luisAPIHostName = process.env.LuisAPIHostName || 'westus.api.cognitive.microsoft.com';

// Set LUIS API URL
const LuisModelUrl = 'https://' + luisAPIHostName + '/luis/v1/application?id=' + luisAppId + '&subscription-key=' + luisAPIKey;


// Simple helper function to make random choice of joke or game choice. Note that it only returns 0, 1, or 2
function getRandomInt() {
    return Math.floor(Math.random() * 3);
}

// Main dialog with LUIS

var recognizer = new builder.LuisRecognizer(LuisModelUrl);
var intents = new builder.IntentDialog({ recognizers: [recognizer] })
.matches('Greeting', (session) => {
    session.send('Oh, hello, again. Would you like to play a game or hear a joke?');
})
.matches('Help', (session) => {
    session.send('Try saying something like "Play game" or "Tell me a joke"');
})
.matches('Cancel', (session) => {
    session.send('Ok, I am shutting up now...');
})
.matches('Play', (session) => {
    session.send("Let's play Rock, Paper, Scissors.");    
    session.beginDialog('play');
})
.matches('Joke', (session) => {
    var jokes = [
        'The first logician says "I don\'t know", the second logician says "I don\'t know", the third logician says "Yes!"', 
        'Entropy isn\'t what it used to be.',
        'Schrödinger\'s cat walks into a bar. And doesn\'t',
    ];

    jokeSelector = getRandomInt();
    session.send(jokes[jokeSelector]);
})
.onDefault((session) => {
    session.send('Sorry, I did not understand \'%s\'.', session.message.text);
});

// bot default dialog
bot.dialog('/', intents);    

// bot play dialog
bot.dialog('play', [
    function(session) {
        builder.Prompts.text(session, "Make your choice:");
    },
    function(session, results) {
        var choices = ['rock', 'paper', 'scissors',]
        botChoice = getRandomInt();
        userChoice = results.response;
        session.send(`I said "${choices[botChoice]}", you said "${userChoice}".`);
        session.endDialog('I win! I was designed to win.');
    }
]);

