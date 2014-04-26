var _ = require('lodash');

var parseRepos = function(repos) {
  return _.chain(JSON.parse(repos))
    .map(function(repo) {
      return _.pick(repo, ['forks','open_issues', 'stargazers_count', 'name'])
    })
    .sortBy('stargazers_count')
    .reverse()
    .value()
    .slice(0, 20);
};

module.exports = parseRepos;
