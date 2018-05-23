'use strict';

/*
    Beach Weather Stations (latest is 2018)
    https://data.cityofchicago.org/resource/77jv-5zb8.json?station_name=Oak Street Weather Station&$where=measurement_timestamp>'2018-05-15'

    Beach Water Quality examples (only 1 in 2018)
    https://data.cityofchicago.org/resource/46rk-hgnz.json?$where=measurement_timestamp between '2018-01-01' and '2018-12-31'
    https://data.cityofchicago.org/resource/46rk-hgnz.json?beach_name=Calumet Beach&$where=measurement_timestamp between '2018-01-01' and '2018-12-31'
    https://data.cityofchicago.org/resource/46rk-hgnz.json?beach_name=Montrose Beach&$where=measurement_timestamp between '2018-01-01' and '2018-12-31'

    Beach Swim Advisories (latest is 2016)
    https://data.cityofchicago.org/resource/49xd-abuh.json?$where=date between '2018-01-01' and '2018-12-31'

    Beach Lab data (latest is 2016)
    https://data.cityofchicago.org/resource/awhh-mb2r.json?$where=culture_sample_1_timestamp between '2018-01-01' and '2018-12-31'
*/

// use 'ask-sdk' if standard SDK module is installed or 'ask-sdk-core'
const Alexa = require('ask-sdk');
const https = require('https');
const moment = require('moment');

const title = 'Chicago Beaches';
const welcomeMessage = `Welcome to ${title}, you can ask things like: 
How's the weather, or what's it like at north side beaches. You can also ask for help.`;
const welcomeMessageDisplay = `"How's the weather"
"What's it like at north side beaches"`;
const weatherErrorMessage = 'I am really sorry. I am unable to access weather station data. Please try again later.';
const genericErrorMessage = 'Sorry, I didn\'t get that. Please say which beaches you\'d like. North side, downtown, or south side?';
const helpMessage = `You can ask me about the weather in Chicago beaches in the north side,
downtown, or south side. The weather stations are at the Foster, Oak Street, and 63rd Street beaches respectively.
Which region would you like? Downtown, north, or south side?`;

const cancelAndStopMessage = 'Goodbye!';

const beachWeatherApi = {
    host: 'data.cityofchicago.org',
    resource: '/resource/77jv-5zb8.json'
};

// Will be displayed in local time
const startDate = moment().subtract(1, 'days').format('YYYY-MM-DD');

/**
 * The Socrata APIs provide rich query functionality through a query language called
 * “Socrata Query Language” or “SoQL”.
 */
const SoQL = `measurement_timestamp>'${startDate}'`;

const requiredSlots = [
    'station'
];

function getSlotValues(filledSlots) {
    const slotValues = {};

    // console.log(`The filled slots: ${JSON.stringify(filledSlots)}`);
    Object.keys(filledSlots).forEach((item) => {
        const name = filledSlots[item].name;

        if (filledSlots[item] &&
        filledSlots[item].resolutions &&
        filledSlots[item].resolutions.resolutionsPerAuthority[0] &&
        filledSlots[item].resolutions.resolutionsPerAuthority[0].status &&
        filledSlots[item].resolutions.resolutionsPerAuthority[0].status.code) {
            switch (filledSlots[item].resolutions.resolutionsPerAuthority[0].status.code) {
            case 'ER_SUCCESS_MATCH':
                slotValues[name] = {
                    synonym: filledSlots[item].value,
                    resolved: filledSlots[item].resolutions.resolutionsPerAuthority[0].values[0].value.name,
                    isValidated: true
                };
                break;
            case 'ER_SUCCESS_NO_MATCH':
                slotValues[name] = {
                    synonym: filledSlots[item].value,
                    resolved: filledSlots[item].value,
                    isValidated: false
                };
                break;
            default:
                break;
            }
        } else {
            slotValues[name] = {
                synonym: filledSlots[item].value,
                resolved: filledSlots[item].value,
                isValidated: false
            };
        }
    }, this);

    return slotValues;
}

function buildQueryString(params) {
    let paramList = '';
    params.forEach((paramGroup, index) => {
        paramList += `${index === 0 ? '?' : '&'}${encodeURIComponent(paramGroup[0])}=${encodeURIComponent(paramGroup[1])}`;
    });
    return paramList;
}

function buildHttpGetOptions(host, path, port, params) {
    return {
        host: host,
        path: path + buildQueryString(params),
        port,
        method: 'GET',
        headers: {'X-App-Token': process.env.BEACHES_APP_TOKEN}
    };
}

function buildBeachWeatherParams(slotValues) {
    return [
        ['station_name',
            `${slotValues.station.resolved}` + ' Weather Station'],
        ['$where',
            `${SoQL}`]
    ];
}

function buildBeachWeatherOptions(slotValues) {
    const params = buildBeachWeatherParams(slotValues);
    const port = 443;
    return buildHttpGetOptions(beachWeatherApi.host, beachWeatherApi.resource, port, params);
}

function httpGet(options) {
    return new Promise((resolve, reject) => {
        const request = https.request(options, (response) => {
            response.setEncoding('utf8');
            let returnData = '';

            if (response.statusCode < 200 || response.statusCode >= 300) {
                return reject(new Error(`${response.statusCode}: ${response.req.getHeader('host')} ${response.req.path}`));
            }

            response.on('data', (chunk) => {
                returnData += chunk;
            });

            response.on('end', () => {
                resolve(JSON.parse(returnData));
            });

            response.on('error', (error) => {
                reject(error);
            });
        });
        request.end();
    });
}

// #region Handlers

/**
 * The LaunchRequest event occurs when the skill is invoked without a specific intent.
 * The canHandle function returns true if the incoming request is a LaunchRequest.
 * The handle function generates and returns a basic greeting response.
 */
const LaunchRequestHandler = {
    canHandle(handlerInput) {
        return handlerInput.requestEnvelope.request.type === 'LaunchRequest';
    },
    handle(handlerInput) {
        // we're keeping the session open with reprompt()
        return handlerInput.responseBuilder
            .speak(welcomeMessage)
            .reprompt(welcomeMessage)
            .withSimpleCard(title, welcomeMessageDisplay)
            .getResponse();
    }
};

/**
 * Handles a WeatherIntent when a required slot is missing.
 * It delegates slot elicitation to Alexa.
 * It also uses entity resolution to ask the user for clarification if
 * a synonym is mapped to two slot values.
 */
const InProgressWeatherIntentHandler = {
    canHandle(handlerInput) {
        return handlerInput.requestEnvelope.request.type === 'IntentRequest' &&
        handlerInput.requestEnvelope.request.intent.name === 'WeatherIntent' &&
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
        handlerInput.requestEnvelope.request.intent.name === 'WeatherIntent' &&
        handlerInput.requestEnvelope.request.dialogState === 'COMPLETED';
    },
    async handle(handlerInput) {
        const filledSlots = handlerInput.requestEnvelope.request.intent.slots;
        const slotValues = getSlotValues(filledSlots);
        const beachWeatherOptions = buildBeachWeatherOptions(slotValues);

        let outputSpeech = '';
        let outputDisplay = '';

        try {
            const response = await httpGet(beachWeatherOptions);
            const latestMeasurement = response[response.length - 1];

            if (response.length > 0) {
                outputSpeech =
                `For the ${slotValues.station.synonym} region the station at ${slotValues.station.resolved} beach 
                shows the air temperature is ${latestMeasurement.air_temperature} °C and the
                wet bulb temperature is ${latestMeasurement.wet_bulb_temperature} °C with
                winds speed of ${latestMeasurement.wind_speed} m/s.
                There is ${latestMeasurement.humidity}% relative humidity and the
                solar radiation is ${latestMeasurement.solar_radiation} watts/m^2.
                Measured on ${latestMeasurement.measurement_timestamp_label}.
                `;
                outputDisplay =
                `For ${slotValues.station.synonym}: ${slotValues.station.resolved} beach station
                Air temp = ${latestMeasurement.air_temperature} °C
                Wet bulb temp = ${latestMeasurement.wet_bulb_temperature} °C
                Wind speed = ${latestMeasurement.wind_speed} m/s
                Relative humidity = ${latestMeasurement.humidity}%
                Solar radiation = ${latestMeasurement.solar_radiation} watts/m^2
                `;
            } else {
                outputSpeech = outputDisplay = `I am sorry. I could not find a match for ${slotValues.station.synonym}`;
                console.log(beachWeatherOptions);
            }
        } catch (error) {
            outputSpeech = outputDisplay = weatherErrorMessage;
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

const HelpIntentHandler = {
    canHandle(handlerInput) {
        return handlerInput.requestEnvelope.request.type === 'IntentRequest' &&
        handlerInput.requestEnvelope.request.intent.name === 'AMAZON.HelpIntent';
    },
    handle(handlerInput) {
        // we're keeping the session open with reprompt()
        return handlerInput.responseBuilder
            .speak(helpMessage)
            .reprompt(helpMessage)
            .withSimpleCard(title, helpMessage)
            .getResponse();
    }
};

const CancelAndStopIntentHandler = {
    canHandle(handlerInput) {
        return handlerInput.requestEnvelope.request.type === 'IntentRequest' &&
        (handlerInput.requestEnvelope.request.intent.name === 'AMAZON.CancelIntent' ||
        handlerInput.requestEnvelope.request.intent.name === 'AMAZON.StopIntent');
    },
    handle(handlerInput) {
        return handlerInput.responseBuilder
            .speak(cancelAndStopMessage)
            .withSimpleCard(title, cancelAndStopMessage)
            .getResponse();
    }
};

/**
 * Although you can not return a response with any speech, card or directives after receiving
 * a SessionEndedRequest, the SessionEndedRequestHandler is a good place to put your cleanup logic.
 */
const SessionEndedRequestHandler = {
    canHandle(handlerInput) {
        return handlerInput.requestEnvelope.request.type === 'SessionEndedRequest';
    },
    handle(handlerInput) {
        // any cleanup logic goes here
        return handlerInput.responseBuilder.getResponse();
    }
};

const ErrorHandler = {
    canHandle(handlerInput, error) {
        // Return true in all cases to create a catch-all handler.
        return error.name.startsWith('AskSdk');
    },
    // we're keeping the session open with reprompt()
    handle(handlerInput, error) {
        return handlerInput.responseBuilder
            .speak(genericErrorMessage)
            .reprompt(genericErrorMessage)
            .getResponse();
    }
};
// #endregion

let skill;

exports.handler = async function(event, context) {
    console.log(`REQUEST++++${JSON.stringify(event)}`);

    if (!skill) {
        skill = Alexa.SkillBuilders.custom()
            .addRequestHandlers(
                LaunchRequestHandler,
                InProgressWeatherIntentHandler,
                CompletedWeatherIntentHandler,
                HelpIntentHandler,
                CancelAndStopIntentHandler,
                SessionEndedRequestHandler
            )
            .addErrorHandlers(ErrorHandler)
            .withSkillId(process.env.APP_ID)
            .create();
    }

    return skill.invoke(event, context);
};

// #region For testing
exports.getSlotValues = getSlotValues;
exports.buildBeachWeatherOptions = buildBeachWeatherOptions;
exports.httpGet = httpGet;
// #endregion
