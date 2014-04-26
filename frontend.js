// Client code that handles users GitHub "search" requests, and reactively
// displays data that is returned from github module.
var currentUser;

var Rx = require('rx');
var github = require('./lib/github');
var partial = require('partial');
var _ = require('lodash');
var moment = require('moment');

var input = document.querySelector('.js-input');
var list = document.querySelector('.js-repo-list');
var descriptionEl = document.querySelector('.js-description');

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
  node.innerHTML += '<span>Stars: ' + repo.stargazers_count + '</span>';
  node.innerHTML += '<span>Forks: ' + repo.forks + '</span>';
  node.innerHTML += '<span>Issues: ' + repo.open_issues + '</span>';
  list.appendChild(node);
};

var renderRepoList = function(repos) {
  list.innerHTML = '';
  _.each(repos, render);
};

var showDescription = function(el, info) {
  el.innerHTML = '';
  el.innerHTML += info.full_name + '<br>';
  el.innerHTML += info.description + '<br>';
  el.innerHTML += '<a href=' + info.html_url + '>' + info.html_url + '</a><br>';
  if (info.language) {
    el.innerHTML += info.language + '<br>';
  }
  el.innerHTML += '<br>Last updated ' + moment(info.updated_at).fromNow();
};

// Partially apply callback to GitHub getRepos function, reducing required
// arguments to just the GitHub username.
var getRepos = partial(github.getReposFromUser, function(repos, user) {
  storeUserInfo(user, {repos: repos});
  renderRepoList(repos);
});

var getRepo = partial(github.getRepoDescription, function(description, user, repo) {
  if (description['message'] !== 'Not Found') {
    var userInfo = getUserInfo(user);
    userInfo.descriptions[repo] = description;
    storeUserInfo(user, userInfo);
    showDescription(descriptionEl, description);
  }
});

// Observable stream of results from input field.
var lookups = Rx.Observable.fromEvent(input, 'keyup')
  .map(function(e) {
    return e.target.value;
  })
  .filter(function(text) {
    return text.length > 0;
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
  currentUser = user;
});

var clicks = Rx.Observable.fromEvent(list, 'click')
  .filter(function(e) {
    return e.target.tagName === 'H2';
  })
  .subscribe(function(e) {
    var repoName = e.target.textContent;
    var userInfo = getUserInfo(currentUser);
    if (!userInfo.descriptions) {
      userInfo.descriptions = {};
      storeUserInfo(currentUser, userInfo);
    }
    if (!userInfo.descriptions[repoName]) {
      getRepo(currentUser, e.target.textContent);
    }
    else {
      showDescription(descriptionEl, userInfo.descriptions[repoName]);
    }
  });
