var path = require('path');
var webpack = require('webpack');
var lodash = require('lodash');

// makeConfig creates a new configuration file based on the passed options.
module.exports = function makeConfig(grunt) {
    var appConfigPath = path.join(process.cwd(), 'superdesk.config.js');

    if (process.env.SUPERDESK_CONFIG) {
        appConfigPath = path.join(process.cwd(), process.env.SUPERDESK_CONFIG);
    }
    if (grunt.option('config')) {
        appConfigPath = path.join(process.cwd(), grunt.option('config'));
    }

    const sdConfig = lodash.defaultsDeep(require(appConfigPath)(grunt), getDefaults(grunt));

    // shouldExclude returns true if the path p should be excluded from loaders
    // such as 'babel' or 'eslint'. This is to avoid including node_modules into
    // these loaders, but not node modules that are superdesk apps.
    const shouldExclude = function(p) {
        // don't exclude anything outside node_modules
        if (p.indexOf('node_modules') === -1) {
            return false;
        }
        // include only 'superdesk-core' and valid modules inside node_modules
        let validModules = ['superdesk-core'].concat(sdConfig.apps);
        return !validModules.some(app => p.indexOf(app) > -1);
    };

    // isEmbedded will be true when the app is embedded into the main repo as a
    // node module.
    const isEmbedded = require('fs').existsSync('./node_modules/superdesk-core');

    return {
        cache: true,

        entry: {
            app: ['scripts/index.js']
        },

        output: {
            path: path.join(process.cwd(), 'dist'),
            filename: '[name].bundle.js',
            chunkFilename: '[id].bundle.js'
        },

        plugins: [
            new webpack.ProvidePlugin({
                '$': 'jquery',
                'window.$': 'jquery',
                'jQuery': 'jquery',
                'window.jQuery': 'jquery',
                'moment': 'moment',
                // MediumEditor needs to be globally available, because
                // its plugins will not be able to find it otherwise.
                'MediumEditor': 'medium-editor'
            }),
            new webpack.DefinePlugin({
                __SUPERDESK_CONFIG__: JSON.stringify(sdConfig)
            })
        ],

        resolve: {
            root: [
                __dirname,
                path.join(__dirname, '/scripts'),
                path.join(__dirname, '/styles/sass')
            ],
            alias: {
                'moment-timezone': 'moment-timezone/builds/moment-timezone-with-data-2010-2020',
                'rangy-saverestore': 'rangy/lib/rangy-selectionsaverestore',
                'angular-embedly': 'angular-embedly/em-minified/angular-embedly.min',
                'jquery-gridster': 'gridster/dist/jquery.gridster.min',
                'external-apps': path.join(process.cwd(), 'dist', 'app-importer.generated.js'),
                // ensure that react is loaded only once (3rd party apps can load more...)
                'react': path.resolve('./node_modules/react')
            },
            extensions: ['', '.js', '.jsx']
        },

        eslint: {
            configFile: isEmbedded ? './node_modules/superdesk-core/.eslintrc.json' : null,
            ignorePath: isEmbedded ? './node_modules/superdesk-core/.eslintignore' : null
        },

        module: {
            preLoaders: [
                {
                    test: /\.jsx?$/,
                    loader: 'eslint-loader',
                    // superdesk apps handle their own linter
                    exclude: (p) => p.indexOf('node_modules') !== -1 || (sdConfig.apps && sdConfig.apps.some(app => p.indexOf(app) > -1)),
                }
            ],

            loaders: [
                {
                    test: /\.jsx?$/,
                    exclude: shouldExclude,
                    loader: 'babel',
                    query: {
                        cacheDirectory: true,
                        presets: ['es2015', 'react'],
                        plugins: ['transform-object-rest-spread']
                    }
                },
                {
                    test: /\.html$/,
                    loader: 'html'
                },
                {
                    test: /\.json$/,
                    loader: 'json-loader'
                },
                {
                    test: /\.css/,
                    loader: 'style!css'
                },
                {
                    test: /\.less$/,
                    loader: 'style!css!less'
                },
                {
                    test: /\.scss$/,
                    loader: 'style!css!sass'
                },
                {
                    test: /\.(png|gif|jpeg|jpg|woff|woff2|eot|ttf|svg)(\?.*$|$)/,
                    loader: 'file-loader'
                }
            ]
        }
    };
};

// getDefaults returns the default configuration for the app
function getDefaults(grunt) {
    var version;

    try {
        version = require('git-rev-sync').short('..');
    } catch (err) {
        // pass
    }

    return {
        // application version
        version: version || grunt.file.readJSON(path.join(__dirname, 'package.json')).version,

        // raven settings
        raven: {
            dsn: process.env.SUPERDESK_RAVEN_DSN || ''
        },

        // backend server URLs configuration
        server: {
            url: grunt.option('server') || process.env.SUPERDESK_URL || 'http://localhost:5000/api',
            ws: grunt.option('ws') || process.env.SUPERDESK_WS_URL || 'ws://0.0.0.0:5100'
        },

        // iframely settings
        iframely: {
            key: process.env.IFRAMELY_KEY || ''
        },

        // google settings
        google: {
            key: process.env.GOOGLE_KEY || ''
        },

        // settings for various analytics
        analytics: {
            piwik: {
                url: process.env.PIWIK_URL || '',
                id: process.env.PIWIK_SITE_ID || ''
            },
            ga: {
                id: process.env.TRACKING_ID || ''
            }
        },

        // editor configuration
        editor: {
            // if true, the editor will not have a toolbar
            disableEditorToolbar: grunt.option('disableEditorToolbar')
        },

        // default timezone for the app
        defaultTimezone: grunt.option('defaultTimezone') || 'Europe/London',

        // model date and time formats
        model: {
            dateformat: 'DD/MM/YYYY',
            timeformat: 'HH:mm:ss'
        },

        // view formats for datepickers/timepickers
        view: {
            dateformat: process.env.VIEW_DATE_FORMAT || 'DD/MM/YYYY',
            timeformat: process.env.VIEW_TIME_FORMAT || 'HH:mm'
        },

        // if environment name is not set
        isTestEnvironment: !!grunt.option('environmentName'),

        // environment name
        environmentName: grunt.option('environmentName'),

        // route to be redirected to from '/'
        defaultRoute: '/workspace',

        // override language translations
        langOverride: {},

        // app features
        features: {
            // tansa spellchecker
            useTansaProofing: false
        },

        // workspace defaults
        workspace: {
            ingest: false,
            content: false,
            tasks: false,
            analytics: false
        },

        // ingest defaults
        ingest: {
            PROVIDER_DASHBOARD_DEFAULTS: {
                show_log_messages: true,
                show_ingest_count: true,
                show_time: true,
                log_messages: 'error',
                show_status: true
            },
            DEFAULT_SCHEDULE: {minutes: 5, seconds: 0},
            DEFAULT_IDLE_TIME: {hours: 0, minutes: 0},
        }
    };
}
