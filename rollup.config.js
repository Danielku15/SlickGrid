const resolve = require('./rollup.resolve');
const terser = require('rollup-plugin-terser').terser;

const bundleNames = [
    'slick.core',
    'slick.dataview',
    'slick.editors',
    'slick.grid',
    'slick.groupitemmetadataprovider',
    'slick.remotemodel-yahoo',
    'slick.remotemodel'
]

const isWatch = process.env.ROLLUP_WATCH;

const bundles = [];

for (const bundle of bundleNames) {
    // Bundle itself
    bundles.push({
        input: `dist/lib/${bundle}.js`,
        output: [
            {
                file: `dist/${bundle}.js`,
                name: bundle,
                format: 'umd'
            },
            {
                file: `dist/${bundle}.min.js`,
                name: bundle,
                plugins: [terser()],
                format: 'umd'
            }
        ],
        external: [],
        watch: {
            include: 'dist/lib/**',
            exclude: 'node_modules/**'
        },
        plugins: [
            resolve({
                mappings: {
                    '@src': 'dist/lib'
                }
            }),

            isWatch && serve({
                open: true,
                openPage: '/website/examples/index.html',
                contentBase: '',
                port: 8080
            })
        ]
    })

    // Typescript definition bundle
    bundles.push({
        input: `dist/types/${bundle}.d.ts`,
        output: [
            {
                file: `dist/${bundle}.d.ts`,
                format: 'es'
            }
        ],
        plugins: [
            resolve({
                mappings: {
                    '@src': 'dist/types'
                },
                types: true
            }),
            dts()
        ]
    });
}

module.exports = bundles;