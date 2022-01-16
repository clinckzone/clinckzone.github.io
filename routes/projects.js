var express = require('express');
var router = express.Router();
var PROJECTS = require('../data/projects');

router.get('/', function (req, res) {
	res.render('projects', {
		title: 'Projects',
		stylesheet: 'projects.css',
		projects: PROJECTS,
	});
});

router.get('/projects-two-shapes', function (req, res) {
	res.render('projects-two-shapes', {
		title: '🕹️ Two Shapes',
		stylesheet: '../page.css',
	});
});

router.get('/projects-coodle', function (req, res) {
	res.render('projects-coodle', {
		title: '🃏 Coodle',
		stylesheet: '../page.css',
	});
});

router.get('/projects-navigation-in-ve', function (req, res) {
	res.render('projects-navigation-in-ve', {
		title: '⛔ Navigation in VE',
		stylesheet: '../page.css',
	});
});

router.get('/projects-smart-ac', function (req, res) {
	res.render('projects-smart-ac', {
		title: '🎛️ Smart AC Controller',
		stylesheet: '../page.css',
	});
});

router.get('/projects-flappy-rockets', function (req, res) {
	res.render('projects-flappy-rockets', {
		title: '🚀 Flappy Rockets',
		stylesheet: '../page.css',
	});
});

router.get('/projects-destech-challenge', function (req, res) {
	res.render('projects-destech-challenge', {
		title: '🥇 Urban Trails',
		stylesheet: '../page.css',
	});
});

router.get('/projects-static-site-generator', function (req, res) {
	res.render('projects-static-site-generator', {
		title: '💻 Static Site Generator',
		stylesheet: '../page.css',
	});
});

module.exports = router;
