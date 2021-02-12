const commonjs = require('@rollup/plugin-commonjs');

module.exports = function (config) {
    config.set({
        frameworks: ['jasmine'],
        files: [
            { pattern: 'dist/lib.test/test/index.js', watched: false },
            {
                pattern: 'test-data/**/*',
                type: 'html',
                watched: false,
                included: false,
                served: true,
                nocache: true
            }
        ],
        preprocessors: {
            'dist/lib.test/test/index.js': ['rollup']
        },

        client: {
            clearContext: false,
            jasmine: {
                random: false,
                stopSpecOnExpectationFailure: false
            }
        },

        rollupPreprocessor: {
            plugins: [
                commonjs()
            ],
            output: {
                format: 'iife',
                name: 'SlickGrid',
                sourcemap: false
            }
        }
    });
};
