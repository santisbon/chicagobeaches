// use 'ask-sdk' if standard SDK module is installed or 'ask-sdk-core'
const Alexa = require('ask-sdk');

const weatherHandlers = require('./weather/weather');
const waterQualityHandlers = require('./waterQuality/waterQuality');
const builtinHandlers = require('./builtinIntents/handlers');

let skill;

exports.handler = async function(event, context) {
    // console.log(`REQUEST++++${JSON.stringify(event)}`);

    if (!skill) {
        skill = Alexa.SkillBuilders.custom()
            .addRequestHandlers(
                builtinHandlers.LaunchRequestHandler,
                weatherHandlers.InProgressWeatherIntentHandler,
                weatherHandlers.CompletedWeatherIntentHandler,
                waterQualityHandlers.InProgressWaterQualityIntentHandler,
                waterQualityHandlers.CompletedWaterQualityIntentHandler,
                builtinHandlers.HelpIntentHandler,
                builtinHandlers.CancelAndStopIntentHandler,
                builtinHandlers.SessionEndedRequestHandler
            )
            .addErrorHandlers(builtinHandlers.ErrorHandler)
            .withSkillId(process.env.APP_ID)
            .create();
    }

    return skill.invoke(event, context);
};
