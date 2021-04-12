/* eslint-env node, es6 */
var _ = require( 'underscore' ),
	hbs = require( '../../hbs-helpers.global.js' ),
	fs = require( 'fs' ),
	glob = require( 'glob' ),
	stats = require( '../../data/stats' ),
	otherProjects = require( './other-projects.json' ),
	rtlLanguages = require( './rtl-languages.json' ),
	crypto = require( 'crypto' ),
	exec = require( 'child_process' ).execSync,
	top100000List,
	top100000Dropdown,
	Controller,
	cachebuster,
	siteStats,
	range,
	translationPath = __dirname + '/assets/l10n/';

// Format the dropdown for ./templates/search.mustache
top100000List = stats.getRange( 'wikiquote', 'numPages', 100000 );
top100000Dropdown = stats.format( 'wikiquote', top100000List, {
	stripTags: true
} );

/**
 *  SiteStats returns and object for each language wikipedia by language code.
 *  ex:
 *  "en":{"url":"en.wikipedia.org",
 *        "numPages":"5 077 000",
 *        "views":1723574042,
 *        "siteName":"Wikipedia",
 *        "articles":"articles",
 *        "slogan":"The Free Encyclopedia",
 *        "name":"English",
 *        "lang":"en"
 *        }
 */
siteStats = {};
range = stats.getRangeFormatted( 'wikiquote', 'views', 10 );

_.each( range, function ( wikiquote ) {
	if ( wikiquote.closed || wikiquote.sublinks ) {
		return;
	}
	wikiquote.numPages = hbs.formatNumber( wikiquote.numPages, {
		hash: {
			thousandSeparator: true,
			rounded: true,
			nbsp: false
		}
	} ).toString();

	siteStats[ wikiquote.code ] = _.omit( wikiquote, 'closed', 'code', 'index' );
} );

function getPreloadLinks() {
	var preloadLinks = [];
	[
		{
			pattern: 'portal/wikiquote.org/assets/img/sprite*.svg',
			as: 'image'
		}
	].forEach( function ( source ) {
		glob.sync( source.pattern, { cwd: __dirname } )
			.forEach( function ( href ) {
				preloadLinks.push( { href: href, as: source.as } );
			} );
	} );

	return preloadLinks;
}

/**
 * Writing stats to translation files
 *
 * @return {string}
 */
function createTranslationsChecksum() {
	var data = JSON.stringify( siteStats ),
		hash = crypto.createHash( 'md5' ).update( data ).digest( 'hex' );

	// Truncating hash for legibility
	hash = hash.substring( 0, 8 );
	return hash;
}

function createTranslationFiles() {
	var fileName, lang;

	function writeFile( el, langCode ) {
		var fileContent;

		if ( el.code ) {
			langCode = el.code;
		}

		fileName = translationPath + langCode + '-' + cachebuster + '.json';
		fileContent = JSON.stringify( el );

		fs.writeFileSync( fileName, fileContent );
	}

	for ( lang in siteStats ) {
		if ( siteStats[ lang ].sublinks ) {
			siteStats[ lang ].sublinks.forEach( writeFile );
		} else {
			writeFile( siteStats[ lang ], lang );
		}
	}
}

cachebuster = createTranslationsChecksum();

if ( fs.existsSync( translationPath ) ) {
	exec( 'find ' + translationPath + ' -mindepth 1 -delete' );
} else {
	fs.mkdirSync( translationPath );
}
createTranslationFiles();

Controller = {
	top10views: stats.getTopFormatted( 'wikiquote', 'views', 10 ),
	// Ttop1000000Articles: stats.getRangeFormatted( 'wikiquote', 'numPages', 1000000 ),
	// Ttop100000Articles: stats.getRangeFormatted( 'wikiquote', 'numPages', 100000, 1000000 ),
	top10000Articles: stats.getRangeFormatted( 'wikiquote', 'numPages', 10000, 100000 ),
	top1000Articles: stats.getRangeFormatted( 'wikiquote', 'numPages', 1000, 10000 ),
	top100Articles: stats.getRangeFormatted( 'wikiquote', 'numPages', 100, 1000 ),
	top100000Dropdown: top100000Dropdown,
	preloadLinks: getPreloadLinks(),
	otherProjects: otherProjects,
	rtlLanguages: rtlLanguages,
	// The only "advantage" to do this instead of JSON.stringify is to get single quotes.
	rtlLanguagesStringified: '[\'' + rtlLanguages.join( '\',\'' ) + '\']',
	translationChecksum: cachebuster
};

module.exports = Controller;
