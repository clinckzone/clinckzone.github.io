var express = require('express');
var server = express();

var ARTICLES = require('./data/articles');
var PROJECTS = require('./data/projects');

server.set('view engine', 'pug');
server.use(express.static(__dirname + '/css'));
server.use(express.static(__dirname + '/images'));
server.use(express.static(__dirname + '/scripts'));
server.use(express.static(__dirname + '/data'));

server.get('/', function (req, res) {
  res.render('index', {
    title: 'Home',
    stylesheet: 'index.css',
    projects: PROJECTS,
    articles: ARTICLES,
  });
});

server.get('/about', function (req, res) {
  res.render('about', {
    title: 'About',
    stylesheet: 'page.css',
  });
});

server.get('/blog', function (req, res) {
  res.render('blog', {
    title: 'Blog',
    stylesheet: 'projects.css',
    articles: ARTICLES,
  });
});

server.get('/blog/:blogPost', function (req, res) {
  const blogPost = req.params.blogPost;
  const blogTitle = ARTICLES.find((article) => article.link === `/blog/${blogPost}`).title;
  res.render(`${blogPost}`, {
    title: blogTitle,
    stylesheet: '../page.css',
  });
});

server.get('/projects', function (req, res) {
  res.render('projects', {
    title: 'Projects',
    stylesheet: 'projects.css',
    projects: PROJECTS,
  });
});

server.get('/projects/:projectPost', function (req, res) {
  const projectPost = req.params.projectPost;
  const projectTitle = PROJECTS.find(
    (project) => project.link === `/projects/${projectPost}`
  ).title;
  res.render(`${projectPost}`, {
    title: projectTitle,
    stylesheet: '../page.css',
  });
});

let port = process.env.PORT;
if (port == null || port == '') {
  port = 8000;
}

server.listen(port, function () {
  console.log('Server is running on ' + port);
});
