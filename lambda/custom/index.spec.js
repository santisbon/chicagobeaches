/* eslint-env mocha */

const chai = require('chai');
const assert = chai.assert;

const VirtualAlexa = require('virtual-alexa').VirtualAlexa;

describe('Chicago Beaches skill tests', function() {
    this.timeout(10000); // To disable timeout: this.timeout(0);

    let alexa;
    beforeEach(function() {
        alexa = VirtualAlexa.Builder()
            .handler('index.handler') // Lambda function file and name e.g. 'index.handler'
            .interactionModelFile('../../models/en-US.json') // intent schema and sample utterances
            .create();
    });

    describe('Built-in intent tests', function() {
        it('Launches successfully', async function() {
            let reply = await alexa.launch();
            assert.include(reply.response.outputSpeech.ssml, 'Welcome to Chicago Beaches');
        });

        it('Offers help', async function() {
            let reply = await alexa.launch();
            reply = await alexa.utter('help');
            assert.include(reply.response.outputSpeech.ssml, 'You can ask me');
        });
    });

    describe('Custom intent tests', function() {
        it('Gets beach weather conditions with dialog', async function() {
            let station = 'Foster';
            // An intent that has delegated dialogs.
            // alexa.intend() is what the user would do and it returns a promise.
            let dialogReply = await alexa.intend('WeatherIntent');

            assert.equal(dialogReply.skillResponse.directive('Dialog.Delegate').type, 'Dialog.Delegate');
            assert.equal(dialogReply.prompt, 'Please tell me which beaches are you interested in. North side, downtown, or south side?');

            // let skillReply = await alexa.intend('WeatherIntent', {station: station});
            let skillReply = await alexa.utter(station);
            assert.include(skillReply.response.outputSpeech.ssml, `For the ${station} region the ${station} Weather Station shows`);
        });

        it('Gets beach water quality conditions (Ohio Street) with dialog', async function() {
            let sensor = 'Ohio';
            // An intent that has delegated dialogs.
            // alexa.intend() is what the user would do and it returns a promise.
            let dialogReply = await alexa.intend('WaterQualityIntent');

            assert.equal(dialogReply.skillResponse.directive('Dialog.Delegate').type, 'Dialog.Delegate');
            assert.equal(dialogReply.prompt, 'Which beach would you like. Sixty third Street, Calumet, Montrose, Ohio Street, Osterman, or Rainbow Beach?');
            let skillReply = await alexa.intend('WaterQualityIntent', {sensor: sensor});
            // let skillReply = await alexa.utter(sensor);
            assert.include(skillReply.response.outputSpeech.ssml, `${sensor} Street Beach shows the water temperature is`);
        });

        it('Does not gets beach water quality conditions for Rainbow (no current data) with dialog', async function() {
            let sensor = 'Rainbow';
            // An intent that has delegated dialogs.
            // alexa.intend() is what the user would do and it returns a promise.
            let dialogReply = await alexa.intend('WaterQualityIntent');

            assert.equal(dialogReply.skillResponse.directive('Dialog.Delegate').type, 'Dialog.Delegate');
            assert.equal(dialogReply.prompt, 'Which beach would you like. Sixty third Street, Calumet, Montrose, Ohio Street, Osterman, or Rainbow Beach?');
            // let skillReply = await alexa.intend('WaterQualityIntent', {sensor: sensor});
            let skillReply = await alexa.utter(sensor);
            assert.include(skillReply.response.outputSpeech.ssml, `No data was found for ${sensor}.`);
        });

        it('Does not get beach water quality conditions for non-existent beach with dialog', async function() {
            let sensor = 'Fake';
            // An intent that has delegated dialogs.
            // alexa.intend() is what the user would do and it returns a promise.
            let dialogReply = await alexa.intend('WaterQualityIntent');

            assert.equal(dialogReply.skillResponse.directive('Dialog.Delegate').type, 'Dialog.Delegate');
            assert.equal(dialogReply.prompt, 'Which beach would you like. Sixty third Street, Calumet, Montrose, Ohio Street, Osterman, or Rainbow Beach?');
            let skillReply = await alexa.intend('WaterQualityIntent', {sensor: sensor});
            // let skillReply = await alexa.utter(sensor);
            assert.include(skillReply.response.outputSpeech.ssml, `No data was found for ${sensor}.`);
        });
    });
});
