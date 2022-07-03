var express = require('express');
var router = express.Router();
var ARTICLES = require('../data/articles');

router.get("/", function(req, res) {
	res.render("blog", {
		title: 'Blog',
		stylesheet: 'projects.css',
		articles: ARTICLES
	});
});

router.get("/blog-modelling-epidemics", function(req, res) {
	res.render("blog-modelling-epidemics", {
		title: "😷 Modelling Epidemics",
		stylesheet: "../page.css",
	})
})

router.get("/blog-tshirt-data-viz", function(req, res) {
	res.render("blog-tshirt-data-viz", {
		title: '👕 T-Shirts and Data Viz',
		stylesheet: '../page.css'
	});
});

router.get("/blog-lost-and-found", function(req, res) {
	res.render("blog-lost-and-found", {
		title: '👻 Lost and Found',
		stylesheet: '../page.css'
	});
});

router.get("/blog-razorpay-internship", function(req, res) {
	res.render("blog-razorpay-internship", {
		title: '👨‍💻 Razorpay Internship',
		stylesheet: '../page.css'
	});
});

router.get("/blog-product-designer-and-disruption", function(req, res) {
	res.render("blog-product-designer-and-disruption", {
		title: '🧠 Product Designers can\'t disrupt',
		stylesheet: '../page.css'
	});
});


module.exports = router;