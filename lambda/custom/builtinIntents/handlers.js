const title = 'Chicago Beaches';

const welcomeMessage = `Welcome to ${title}, you can ask me things like how's the weather, what's it like at north side beaches, or how's the water quality at Ohio Street Beach. You can also ask for help.`;
const welcomeMessageDisplay = `"How's the weather?"\n"What's it like at north side beaches?"\n"How's the water quality at Ohio Street Beach?"`;
const helpMessage = `You can ask me about the weather in Chicago beaches in the north side, downtown, or south side.
You can also ask how's the water quality in select beaches like Ohio Street Beach.
How can I help you?`;
const cancelAndStopMessage = 'Goodbye!';
const genericErrorMessage = "Sorry, I didn't get that. You can ask me for beach weather info, water quality, or ask for help.";

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
            .reprompt(helpMessage)
            .withSimpleCard(title, welcomeMessageDisplay)
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

exports.LaunchRequestHandler = LaunchRequestHandler;
exports.HelpIntentHandler = HelpIntentHandler;
exports.CancelAndStopIntentHandler = CancelAndStopIntentHandler;
exports.SessionEndedRequestHandler = SessionEndedRequestHandler;
exports.ErrorHandler = ErrorHandler;
