// Provides interface for getting required data from github API.

var _ = require('lodash');
var request = require('./request');
var sanitise = require('./sanitise');

var getReposFromUser = function(cb, user) {
  request('https://api.github.com/users/' + user + '/repos?per_page=100', function(data) {
    cb(sanitise(data), user);
  });
};

var getRepoDescription = function(cb, user, repo) {
  request('https://api.github.com/repos/' + user + '/' + repo, function(data) {
    cb(JSON.parse(data), user, repo);
  });
};

exports.getReposFromUser = getReposFromUser;
exports.getRepoDescription = getRepoDescription;
