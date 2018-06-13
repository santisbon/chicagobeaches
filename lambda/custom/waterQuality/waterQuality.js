'use strict';

/* Beach Water Quality examples
    https://data.cityofchicago.org/resource/46rk-hgnz.json?$where=measurement_timestamp between '2018-01-01' and '2018-12-31'
    https://data.cityofchicago.org/resource/46rk-hgnz.json?beach_name=Calumet Beach&$where=measurement_timestamp between '2018-01-01' and '2018-12-31'
    https://data.cityofchicago.org/resource/46rk-hgnz.json?beach_name=Montrose Beach&$where=measurement_timestamp between '2018-01-01' and '2018-12-31' */

const helper = require('alexa-helper');
const moment = require('moment-timezone');

const title = 'Chicago Beaches';
const errorMessage = 'I am really sorry. I am unable to access the water quality data. Please try again later.';

const api = {
    hostname: 'data.cityofchicago.org',
    resource: '/resource/46rk-hgnz.json'
};

const waterQualityIntent = 'WaterQualityIntent';

const date = moment().tz('America/Chicago').format('YYYY-MM-DD');

/**
 * The Socrata APIs provide rich query functionality through a query language called
 * “Socrata Query Language” or “SoQL”.
 */
const SoQL = `measurement_timestamp>'${date}'`;

const requiredSlots = [
    'sensor'
];

function buildParams(slotValues, SoQL) {
    var params = [];

    if (slotValues.sensor) {
        params.push(['beach_name', `${slotValues.sensor.resolved}` + ' Beach']);
    }

    if (SoQL) {
        params.push(['$where', `${SoQL}`]);
    }

    return params;
}

/**
 * Handles an intent when a required slot is missing.
 * It delegates slot elicitation to Alexa.
 * It also uses entity resolution to ask the user for clarification if
 * a synonym is mapped to two slot values.
 */
const InProgressWaterQualityIntentHandler = {
    canHandle(handlerInput) {
        return handlerInput.requestEnvelope.request.type === 'IntentRequest' &&
        handlerInput.requestEnvelope.request.intent.name === waterQualityIntent &&
        handlerInput.requestEnvelope.request.dialogState !== 'COMPLETED';
    },
    handle(handlerInput) {
        const currentIntent = handlerInput.requestEnvelope.request.intent;
        let prompt = '';

        // for each slot
        for (const slotName of Object.keys(handlerInput.requestEnvelope.request.intent.slots)) {
            const currentSlot = currentIntent.slots[slotName];
            // if the slot is missing it'll have a name but no value or resolutions
            if (currentSlot.confirmationStatus !== 'CONFIRMED' && currentSlot.resolutions && currentSlot.resolutions.resolutionsPerAuthority[0]) {
                // the slot is there
                if (currentSlot.resolutions.resolutionsPerAuthority[0].status.code === 'ER_SUCCESS_MATCH') {
                    // it matched to one or more values
                    if (currentSlot.resolutions.resolutionsPerAuthority[0].values.length > 1) {
                        // the synonym matched to more than one value
                        prompt = 'Which would you like';
                        const size = currentSlot.resolutions.resolutionsPerAuthority[0].values.length;

                        currentSlot.resolutions.resolutionsPerAuthority[0].values
                            .forEach((element, index) => {
                                prompt += ` ${(index === size - 1) ? ' or' : ' '} ${element.value.name}`;
                            });

                        prompt += '?';

                        // we're keeping the session open with reprompt()
                        return handlerInput.responseBuilder
                            .speak(prompt)
                            .reprompt(prompt)
                            .addElicitSlotDirective(currentSlot.name)
                            .getResponse();
                    }
                } else if (currentSlot.resolutions.resolutionsPerAuthority[0].status.code === 'ER_SUCCESS_NO_MATCH') {
                    // the slot there but it didn't match a value
                    if (requiredSlots.indexOf(currentSlot.name) > -1) {
                        // it's in the list of required slots
                        prompt = `What ${currentSlot.name} are you looking for`;

                        // we're keeping the session open with reprompt()
                        return handlerInput.responseBuilder
                            .speak(prompt)
                            .reprompt(prompt)
                            .addElicitSlotDirective(currentSlot.name)
                            .getResponse();
                    }
                }
            }
        }
        // the slot was missing. Let Alexa elicit for it as defined in the interaction model.
        return handlerInput.responseBuilder
            .addDelegateDirective(currentIntent)
            .getResponse();
    }
};

const CompletedWaterQualityIntentHandler = {
    canHandle(handlerInput) {
        return handlerInput.requestEnvelope.request.type === 'IntentRequest' &&
        handlerInput.requestEnvelope.request.intent.name === waterQualityIntent &&
        handlerInput.requestEnvelope.request.dialogState === 'COMPLETED';
    },
    async handle(handlerInput) {
        const filledSlots = handlerInput.requestEnvelope.request.intent.slots;
        const slotValues = helper.ssmlHelper.getSlotValues(filledSlots);
        const params = buildParams(slotValues, SoQL);
        const options = helper.httpsHelper.buildOptions(params, api, process.env.BEACHES_APP_TOKEN);

        let outputSpeech = '';
        let outputDisplay = '';

        try {
            const response = await helper.httpsHelper.httpGet(options);
            const latestMeasurement = response[response.length - 1];

            if (response.length > 0) {
                outputSpeech =
                `The sensor at ${latestMeasurement.beach_name} shows the water temperature is ${latestMeasurement.water_temperature} °C
                with water turbidity of ${latestMeasurement.turbidity} Nephelometric Turbidity Units.
                Wave height is ${latestMeasurement.wave_height} meters.
                Measured on ${latestMeasurement.measurement_timestamp_label}.
                `;
                outputDisplay =
                `${latestMeasurement.beach_name} - ${latestMeasurement.measurement_timestamp_label}
                Water temp = ${latestMeasurement.water_temperature} °C
                Turbidity = ${latestMeasurement.turbidity} NTU
                Wave height = ${latestMeasurement.wave_height} m
                `;
            } else {
                outputSpeech = outputDisplay = `I'm sorry. No data was found for ${slotValues.sensor.synonym}.`;
                // console.log(options);
            }
        } catch (error) {
            outputSpeech = outputDisplay = errorMessage;
            console.log(`Intent: ${handlerInput.requestEnvelope.request.intent.name}: message: ${error.message}`);
        }

        // More options: https://github.com/alexa/alexa-skills-kit-sdk-for-nodejs/wiki/response-building
        // We are closing the session here by not specifying a reprompt()
        return handlerInput.responseBuilder
            .speak(outputSpeech)
            .withSimpleCard(title, outputDisplay)
            .getResponse();
    }
};

exports.InProgressWaterQualityIntentHandler = InProgressWaterQualityIntentHandler;
exports.CompletedWaterQualityIntentHandler = CompletedWaterQualityIntentHandler;
