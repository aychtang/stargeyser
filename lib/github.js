// Provides interface for getting required data from github API.

var _ = require('lodash');
var request = require('./request');

var parseRepos = function(repos) {
	return _.chain(JSON.parse(repos))
		.map(function(repo) {
			return _.pick(repo, ['forks','open_issues', 'stargazers_count', 'name'])
		})
		.sortBy('forks')
		.sortBy('stargazers_count')
		.reverse()
		.value()
		.slice(0, 20);
};

var getReposFromUser = function(cb, user) {
	request('https://api.github.com/users/' + user + '/repos?per_page=100', function(data) {
		cb(parseRepos(data), user);
	});
};

var getRepoDescription = function(cb, user, repo) {
	request('https://api.github.com/repos/' + user + '/' + repo, function(data) {
		cb(JSON.parse(data), user);
	});
};

exports.getReposFromUser = getReposFromUser;
exports.getRepoDescription = getRepoDescription;
