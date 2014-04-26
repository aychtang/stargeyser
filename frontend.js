// Client code that handles users GitHub "search" requests, and reactively
// displays data that is returned from github module.

var Rx = require('rx');
var github = require('./lib/github');
var partial = require('partial');
var _ = require('lodash');
var classlist = require('class-list');

var input = document.querySelector('.js-input');
var list = document.querySelector('.js-repo-list');

// We want to cache user repo info + descriptions locally as we receive them,
// eliminating unneeded repeat calls of the GitHub API.
var storeUserInfo = function(name, data) {
	localStorage.setItem(name, JSON.stringify(data));
};

var getUserInfo = function(name) {
	return JSON.parse(localStorage.getItem(name));
};

// Creates div and appends to list.
var render = function(repo) {
	var node = document.createElement('div');
	node.className = 'js-repo';
	node.innerHTML += '<h2>' + repo.name + '</h2>';
	node.innerHTML += '<div>Stars: ' + repo.stargazers_count + '</div>';
	node.innerHTML += '<div>Forks: ' + repo.forks + '</div>';
	node.innerHTML += '<div>Issues: ' + repo.open_issues + '</div>';
	list.appendChild(node);
};

var renderRepoList = function(repos) {
	list.innerHTML = '';
	_.each(repos, render);
};

// Partially apply callback to GitHub getRepos function, reducing required
// arguments to just the GitHub username.
var getRepos = partial(github.getReposFromUser, function(repos, user) {
	storeUserInfo(user, {repos: repos});
	renderRepoList(repos);
});

// Observable stream of results from input field.
var lookups = Rx.Observable.fromEvent(input, 'keyup')
	.map(function(e) {
    return e.target.value;
	})
	.filter(function(text) {
    return text.length > 2;
	})
	.throttle(400)
	.distinctUntilChanged();

// Pipe valid events to renderUserRepos.
lookups.subscribe(function(user) {
	if (!localStorage[user]) {
		getRepos(user);
	}
	else {
		renderRepoList(getUserInfo(user).repos);
	}
});
