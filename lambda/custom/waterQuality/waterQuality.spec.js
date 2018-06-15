/* eslint-env mocha */

const chai = require('chai');
const assert = chai.assert;
const waterQualityHandlers = require('./waterQuality');

const SoQL = 'measurement_timestamp>\'2018-06-15\'';

describe('Water quality tests', function() {
    it('builds params correctly for Ohio', async function() {
        const slotValues = {
            sensor: {
                synonym: 'Ohio',
                resolved: 'Ohio',
                isValidated: false
            }
        };

        let params = waterQualityHandlers.buildParams(slotValues, SoQL);
        assert.equal(params[0][1], 'Ohio Street Beach');
    });

    it('builds params correctly for Rainbow', async function() {
        const slotValues = {
            sensor: {
                synonym: 'Rainbow',
                resolved: 'Rainbow',
                isValidated: false
            }
        };

        let params = waterQualityHandlers.buildParams(slotValues, SoQL);
        assert.equal(params[0][1], 'Rainbow Beach');
    });

    it('builds params correctly for 63rd', async function() {
        const slotValues = {
            sensor: {
                synonym: '63rd',
                resolved: '63rd',
                isValidated: false
            }
        };

        let params = waterQualityHandlers.buildParams(slotValues, SoQL);
        assert.equal(params[0][1], '63rd Street Beach');
    });
});
