/* eslint-env mocha */

const chai = require('chai');
const expect = chai.expect;
const assert = chai.assert;

const beaches = require('./beaches');
const moment = require('moment');

/**
 * Your City of Chicago data portal app token. You can leave it blank
 * and it won't throttle your requests as long as traffic is low.
 */
process.env.BEACHES_APP_TOKEN = '';

// What Alexa sends to the lambda function in its weather request
const completedRequestWithSynonym =
{
    'request': {
        'type': 'IntentRequest',
        'requestId': 'amzn1.echo-api.request.xxx',
        'timestamp': '2018-05-18T14:39:24Z',
        'locale': 'en-US',
        'intent': {
            'name': 'WeatherIntent',
            'confirmationStatus': 'NONE',
            'slots': {
                'station': {
                    'name': 'station',
                    'value': 'north',
                    'resolutions': {
                        'resolutionsPerAuthority': [
                            {
                                'authority': 'amzn1.er-authority.echo-sdk.amzn1.ask.skill.xxx.WEATHER_STATIONS',
                                'status': {
                                    'code': 'ER_SUCCESS_MATCH'
                                },
                                'values': [
                                    {
                                        'value': {
                                            'name': 'Foster',
                                            'id': 'FOSTER'
                                        }
                                    }
                                ]
                            }
                        ]
                    },
                    'confirmationStatus': 'NONE'
                }
            }
        },
        'dialogState': 'STARTED'
    }
};

// Request where the slot value is missing
const incompleteRequest =
{
    'request': {
        'type': 'IntentRequest',
        'requestId': 'amzn1.echo-api.request.xxx',
        'timestamp': '2018-05-18T14:55:53Z',
        'locale': 'en-US',
        'intent': {
            'name': 'WeatherIntent',
            'confirmationStatus': 'NONE',
            'slots': {
                'station': {
                    'name': 'station',
                    'confirmationStatus': 'NONE'
                }
            }
        },
        'dialogState': 'STARTED'
    }
};

describe('Get slot values from complete request using a synonym', function() {
    it('Should get the resolved slot values', function() {
        var slots = beaches.getSlotValues(completedRequestWithSynonym.request.intent.slots);

        // console.log('Slot values:');
        // console.log(slots);

        expect(slots).to.have.property('station');
        expect(slots.station.synonym).to.be.equal('north');
        expect(slots.station.resolved).to.be.equal('Foster');
        expect(slots.station.isValidated).to.be.equal(true);
    });
});

describe('Get slot values from incomplete request', function() {
    it('Should not get the resolved slot values', function() {
        var slots = beaches.getSlotValues(incompleteRequest.request.intent.slots);

        // console.log('Slot values:');
        // console.log(slots);

        expect(slots).to.have.property('station');
        expect(slots.station.synonym).to.be.equal(undefined);
        expect(slots.station.resolved).to.be.equal(undefined);
        expect(slots.station.isValidated).to.be.equal(false);
    });
});

describe('Build beach weather options', function() {
    it('Should build weather options for the API call', function() {
        var values = beaches.getSlotValues(completedRequestWithSynonym.request.intent.slots);
        var options = beaches.buildBeachWeatherOptions(values);
        const today = moment().subtract(1, 'days').format('YYYY-MM-DD');

        // console.log('Beach weather options:');
        // console.log(options);

        expect(options.host).to.be.equal('data.cityofchicago.org');
        /**
         * %20 = space
         * %24 = $
         * %3E = >
         */
        expect(options.path).to.be.equal(`/resource/77jv-5zb8.json?station_name=Foster%20Weather%20Station&%24where=measurement_timestamp%3E'${today}'`);
        expect(options.port).to.be.equal(443);
        expect(options.method).to.be.equal('GET');
    });
});

describe('Call beach API - async', function() {
    it('Should get the results of the API call with async', async function() {
        this.timeout(3000); // To disable timeout: this.timeout(0);
        var values = beaches.getSlotValues(completedRequestWithSynonym.request.intent.slots);
        var options = beaches.buildBeachWeatherOptions(values);

        // console.log(options);

        try {
            const response = await beaches.httpGet(options);

            if (response.length > 0) {
                // console.log('First element in async response:')
                // console.log(response[0]);

                expect(response[0]).to.have.property('air_temperature');
            } else {
                console.log('Response had no elements.');
            }
        } catch (error) {
            assert.fail(0, 1, error);
        }
    });
});
