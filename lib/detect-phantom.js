var page = require('webpage').create()
,   fs = require('fs')
,   system = require('system')
,   urllib = require('url')
,   url = system.args[1]
,   whitelist_source = system.args[2]
,   checkProtocol = system.args[3]
,   appendHeadersFile = system.args[4]
;

checkProtocol = checkProtocol === true || checkProtocol === 'true'
        || checkProtocol === 1 || checkProtocol === '1';

console.error = function () {
    require("system").stderr.write(Array.prototype.join.call(arguments, ' ') + '\n');
};

if (url === undefined) {
    console.error('Missing URL as argument');
    phantom.exit(1);
}

var whitelisted_urls = []
,   whitelisted_domains = ["www.w3.org"];

if (whitelist_source) {
    if (fs.exists(whitelist_source)) {
        var whitelist = require(fs.absolute(whitelist_source));
        whitelisted_domains.push.apply(whitelisted_domains, whitelist.domains);
        whitelisted_urls = whitelist.urls;
    } else {
        console.error("The whitelist file doesn't exist");
    }
}

if (appendHeadersFile) {
    if (fs.exists(appendHeadersFile)) {
        page.customHeaders = require(fs.absolute(appendHeadersFile));
    } else {
        console.error("The append-headers file doesn't exist");
    }
}

var scheme = urllib.parse(url).protocol;
if (scheme !== 'http:' && scheme !== 'https:') {
    console.error('not allowed to load ' + url);
    phantom.exit(1);
}

var original_domain = urllib.parse(url).hostname;
var found = false;

// This function is loaded each time a resource is requested
page.onResourceRequested = function (requestData, networkRequest) {
    if (whitelisted_urls.indexOf(requestData.url) !== -1) {
        networkRequest.abort();
        return;
    }
    var domain = urllib.parse(requestData.url).hostname;
    if (checkProtocol) {
        var protocol = requestData.url.substr(0,5);
        if (protocol != 'https' && protocol != 'data:') {
            console.error(requestData.url);
        }
        if (whitelisted_domains.indexOf(domain) === -1) {
            found = true;
            // Let's save ourselves unnecessary efforts when testing
            if (domain === "example.org" || domain === "example.com") {
                networkRequest.abort();
            }
        } else {
            // We assume resources on whitelisted domains have already been vetted
            // and don't need to be checked for third-party resources
            networkRequest.abort();
        }
    } else if (domain !== original_domain) {
        if (whitelisted_domains.indexOf(domain) === -1) {
            found = true;
            console.log(requestData.url);
            // Let's save ourselves unnecessary efforts when testing
            if (domain === "example.org" || domain === "example.com") {
                networkRequest.abort();
            }
        } else {
            // We assume resources on whitelisted domains have already been vetted
            // and don't need to be checked for third-party resources
            networkRequest.abort();
        }
    }
};

page.open(url, function (status) {
    if (status !== 'success') {
        console.error('fail to load ' + url);
        phantom.exit(1);
    } else {
        if (!found) {
            phantom.exit(0);
        } else {
            phantom.exit(64);
        }
    }
});

phantom.onError = console.error;
page.onError = console.error;
