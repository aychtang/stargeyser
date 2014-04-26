// Client code that handles users GitHub "search" requests, and reactively
// displays data that is returned from github module.

var Rx = require('rx');
var github = require('./lib/github');
var partial = require('partial');
var _ = require('lodash');

var input = document.querySelector('.js-input');
var list = document.querySelector('.js-repo-list');

var render = function(repo) {
	var node = document.createElement('div');
	node.innerHTML += '<h2>' + repo.name + '</h2>';
	list.appendChild(node);
};

// Partially apply callback to GitHub getRepos function, reducing required
// arguments to just the GitHub username.
var renderUserRepos = partial(github.getReposFromUser, function(repos) {
	list.innerHTML = '';
	_.each(repos, render);
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
lookups.subscribe(renderUserRepos);
