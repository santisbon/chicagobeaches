/* eslint-env mocha */

const chai = require('chai');
const assert = chai.assert;
const moment = require('moment-timezone');

describe('Chicago Beaches skill tests', function() {
    this.timeout(10000); // To disable timeout: this.timeout(0);

    describe('Built-in intent tests', function() {
        it('Launches successfully', async function() {
            const va = require('virtual-alexa');
            const alexa = va.VirtualAlexa.Builder()
                .handler('index.handler') // Lambda function file and name e.g. 'index.handler'
                .interactionModelFile('../../models/en-US.json') // intent schema and sample utterances
                .create();

            let reply = await alexa.launch();
            assert.include(reply.response.outputSpeech.ssml, 'Welcome to Chicago Beaches');
        });

        it('Offers help', async function() {
            const va = require('virtual-alexa');
            const alexa = va.VirtualAlexa.Builder()
                .handler('index.handler') // Lambda function file and name e.g. 'index.handler'
                .interactionModelFile('../../models/en-US.json') // intent schema and sample utterances
                .create();

            let reply = await alexa.launch();
            reply = await alexa.utter('help');
            assert.include(reply.response.outputSpeech.ssml, 'You can ask me');
        });
    });
});
