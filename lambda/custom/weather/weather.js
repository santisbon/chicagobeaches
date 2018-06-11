'use strict';

/*
    Beach Weather Stations (latest is 2018)
    https://data.cityofchicago.org/resource/77jv-5zb8.json?station_name=Oak Street Weather Station&$where=measurement_timestamp>'2018-05-15'

    Beach Swim Advisories (latest is 2016)
    https://data.cityofchicago.org/resource/49xd-abuh.json?$where=date between '2018-01-01' and '2018-12-31'

    Beach Lab data (latest is 2016)
    https://data.cityofchicago.org/resource/awhh-mb2r.json?$where=culture_sample_1_timestamp between '2018-01-01' and '2018-12-31'
*/

const helper = require('alexa-helper');
const moment = require('moment-timezone');

const title = 'Chicago Beaches';
const errorMessage = 'I am really sorry. I am unable to access weather station data. Please try again later.';

const api = {
    hostname: 'data.cityofchicago.org',
    resource: '/resource/77jv-5zb8.json'
};

const WeatherIntent = 'WeatherIntent';

const startDate = moment().tz('America/Chicago').format('YYYY-MM-DD');

/**
 * The Socrata APIs provide rich query functionality through a query language called
 * “Socrata Query Language” or “SoQL”.
 */
const SoQL = `measurement_timestamp>'${startDate}'`;

const requiredSlots = [
    'station'
];

function buildParams(slotValues, SoQL) {
    var params = [];

    if (slotValues.station) {
        params.push(['station_name', `${slotValues.station.resolved}` + ' Weather Station']);
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
const InProgressWeatherIntentHandler = {
    canHandle(handlerInput) {
        return handlerInput.requestEnvelope.request.type === 'IntentRequest' &&
        handlerInput.requestEnvelope.request.intent.name === WeatherIntent &&
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

const CompletedWeatherIntentHandler = {
    canHandle(handlerInput) {
        return handlerInput.requestEnvelope.request.type === 'IntentRequest' &&
        handlerInput.requestEnvelope.request.intent.name === WeatherIntent &&
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
                // ${slotValues.station.resolved}
                outputSpeech =
                `For the ${slotValues.station.synonym} region the ${latestMeasurement.station_name} shows
                the air temperature is ${latestMeasurement.air_temperature} °C and the
                wet bulb temperature is ${latestMeasurement.wet_bulb_temperature} °C with
                winds speed of ${latestMeasurement.wind_speed} m/s.
                There is ${latestMeasurement.humidity}% relative humidity and the
                solar radiation is ${latestMeasurement.solar_radiation} watts/m^2.
                Measured on ${latestMeasurement.measurement_timestamp_label}.
                `;
                outputDisplay =
                `For ${slotValues.station.synonym}: ${latestMeasurement.station_name}
                Air temp = ${latestMeasurement.air_temperature} °C
                Wet bulb temp = ${latestMeasurement.wet_bulb_temperature} °C
                Wind speed = ${latestMeasurement.wind_speed} m/s
                Relative humidity = ${latestMeasurement.humidity}%
                Solar radiation = ${latestMeasurement.solar_radiation} watts/m^2
                `;
            } else {
                outputSpeech = outputDisplay = `I am sorry. I could not find a match for ${slotValues.station.synonym}`;
                console.log(options);
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

exports.InProgressWeatherIntentHandler = InProgressWeatherIntentHandler;
exports.CompletedWeatherIntentHandler = CompletedWeatherIntentHandler;
