var test = require('tape');
var sanitise = require('../lib/sanitise');
var _ = require('lodash');

// Describing sanitise.
// Expects a JSON array and should return JS Object Array where each object
// has only "forks","open_issues", "stargazers_count" and "name" properties.
test('Should return empty JS array if passed an empty JSON array', function(t) {
	t.deepEqual(sanitise(JSON.stringify([])), []);
	t.end();
});

// Expected: "forks", "open_issues", "stargazers_count" and "name".
test('Members of JS array return should not contain unexpected properties', function(t) {
	var expected = ['forks', 'open_issues', 'stargazers_count', 'name'];
	var data = [{'forks': 42, 'open_issues': 23, 'stargazers_count': 9001, 'name': 'alan', 'unexpected': true}];
	var sanitised = sanitise(JSON.stringify(data))[0];
	var keys = _.keys(sanitised);
	t.equal(keys.length, 4);
	t.deepEqual(keys, expected);
	t.end();
});

test('Should return a JS array of same length if JSON array.length <= 20', function(t) {
	var data = [];
	for (var i = 0; i < 20; i++) {
		data.push({});
	}
	t.equal(sanitise(JSON.stringify(data)).length, 20);
	t.end();
});

test('Should return a JS array of length 20 if JSON array.length > 20', function(t) {
	var data = [];
	for (var i = 0; i < 21; i++) {
		data.push({});
	}
	t.equal(sanitise(JSON.stringify(data)).length, 20);
	t.end();
});

test('Initial sort should be descending ordered by stargazers_count', function(t) {
	var data = [{stargazers_count: 1, name:'a'}, {stargazers_count:2, name:'b'}];
	t.equal(sanitise(JSON.stringify(data))[0].name, 'b');
	t.end();
});
