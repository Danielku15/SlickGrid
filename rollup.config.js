const terser = require('rollup-plugin-terser').terser;
const dts = require('rollup-plugin-dts').default;
const serve = require('rollup-plugin-serve');
const copy = require('rollup-plugin-copy');

const bundleNames = [
    'slick.core',
    'slick.compositeeditor',
    'slick.dataview',
    'slick.editors',
    'slick.formatters',
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
                name: 'Slick',
                format: 'umd'
            },
            {
                file: `dist/${bundle}.min.js`,
                name: 'Slick',
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
            copy({
                targets: [
                    { src: 'src/*.css', dest: 'dist/' }
                ]
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
            dts()
        ]
    });
}

module.exports = bundles;