/*
Bugs

Small Enhancements
• Update the informational text

Medium Enhancements
Create three separate data sets
• Just 2001 and 2011 by debt, with a gradation for debt to gdp
• Expand to all years (more stops on the gradient)
• Show all years

Large Enhancements

*/

/* global d3 */

/* jshint devel:true */

// dv is the namespace used to avoid collisions with other code or libraries
var dv = {
	data: {},
	dato: {},

	load: {},
	postload: {},
	state: {},

	dim: {},
	scale: {},

	html: {},
	svg: {},

	create: {},
	update: {},

	draw: {},
	redraw: {},

	write: {},
	rewrite: {},

	calc: {},
	format: {},

	util: {},
};

// dv.opt stores all options that can be changed 'on the fly'
dv.opt = {
	colors: ['#6baed6','#567','#74c476','#00441b','#4292c6','#08519c','#238b45'],
	countries: {
		count: 20,
		default: ['Greece','Argentina'],
	},
	data: {
		select: 'Gross domestic product, current prices - U.S. dollars',
		height: 'Gross domestic product, current prices - U.S. dollars',
		rank: 'Gross domestic product, current prices - U.S. dollars',
		gradient: false,
		label: 'Gross domestic product, current prices - U.S. dollars',
		power: 1,
	},
	duration: 1000,
	format: {
		label: 'bigDollar',
	},
	path: {
		data: 'data/WEO-All.csv',
		region: 'data/regions.csv'
	},
	margin: {
		left: 0,
		right: 0,
		top: 0,
		bottom: 0,
	},
	label: {
		left: 120,
		right: 120,
		top: 0,
		bottom: 20,
		pad: 5
	},
	line: {
		minHeight: 4,
		pad: 12,
	},
	opacity: {
		norm: 0.85,
		high: 1,
		low: 0.25
	},
	curve: {
		straight: 0,
		rank: 1,
		change: 5,
		rankCP: 0.5,
		changeCP: 0,
	},
	mindim: {
		h: 350,
		w: 500
	},
	text: '',
	views: [
		{	rank: 'Gross domestic product, current prices - U.S. dollars',
			height: 'Gross domestic product, current prices - U.S. dollars',
			label: 'Gross domestic product, current prices - U.S. dollars',
			format: 'bigDollar',
			gradient: false,
			title: 'Gross Domestic Product (GDP)',
			descr: "GDP for the top 20 countries, plus Greece and Argentina, are shown below. The height of each bar shows the relative size of the country's GDP, and the bars are ordered from largest GDP to smallest.",
			bigLoss: 'Smallest total GDP growth',
			bigGain: 'Largest total GDP growth',
			bigLossYear: 'Largest 1yr GDP loss',
			bigGainYear: 'Largest 1yr GDP growth',
			linkTo: 'GDP',
		},{	rank: 'Debt',
			height: 'Debt',
			label: 'Debt',
			format: 'bigDollar',
			gradient: false,
			title: 'Debt',
			descr: "The height and order of the bars now shows the gross debt in US Dollars for each country. The height of all of the bars together shows the total debt carried by these countries.",
			bigLoss: 'Largest total drop in debt',
			bigGain: 'Largest total growth in debt',
			bigLossYear: 'Largest 1yr drop in debt',
			bigGainYear: 'Largest 1yr growth in debt',
			linkTo: 'Debt',
		},{	rank: 'General government gross debt - Percent of GDP',
			height: 'Debt',
			label: 'General government gross debt - Percent of GDP',
			format: 'percent',
			gradient: 'General government gross debt - Percent of GDP',
			title: 'Debt to GDP Ratio',
			descr: "The ratio of a country's gross debt to its GDP is an important overall indicator of economic health.  A country that consistently carries more than 60% of its GDP as debt is considered unhealthy and is colored red.",
			bigLoss: 'Largest total drop in Debt/GDP',
			bigGain: 'Largest total rise in Debt/GDP',
			bigLossYear: 'Largest 1yr drop in Debt/GDP',
			bigGainYear: 'Largest 1yr rise in Debt/GDP',
			linkTo: 'Debt to GDP ratio',
		},
	],

	years: {
		first: 2002,
		last: 2013,
		continuous: true,
	},
};

window.onresize = function() {
	dv.update.resize();
};


// retrieves the data from files and does a minimal amount of processing
// dv.state.data tracks asynchronous data calls and allows  
dv.load.data = function() {
	dv.update.loadState(2);
	
	d3.csv(dv.opt.path.data, function(error, data) {
		dv.dato.full = data;
		dv.update.loadState(-1);
	});

	d3.csv(dv.opt.path.region, function(error, data) {
		dv.dato.region = {};
		for (var i = data.length - 1; i >= 0; i--) {
			dv.dato.region[data[i].Country] = data[i].Region;
		}
		dv.update.loadState(-1);
	});
};

// setup that has to be done after the data is loaded
dv.postload.data = function() {
	dv.create.cleanData();
	dv.create.countryList();
	dv.create.prescales();
	dv.create.subset();

	dv.update.view();
	dv.rewrite.stats();

	dv.create.dims();
	dv.create.scales();

	dv.draw.gradients();
	dv.draw.flowChart();
	dv.draw.lineLabels();

	dv.update.resize();
};


/* CREATE: Create/manipulate data stuctures */

dv.create.start = function() {
	dv.create.variables();
	dv.create.years();
	dv.write.header();
	
	dv.load.data();
};

// calculates and adjusts variables and options
dv.create.variables = function() {
	dv.data = {
		countries: {
			all: [],
			selected: [],
		},
		resize: [],
		years: {
			first: 1980,
			last: 2018,
			all: [],
			selected: [],
		},
	};

	dv.dato = {
		full: {},
		max: {},
		min: {},
		sum: {},
		maxHeight: {},
		minHeight: {},
		maxGradient: {},
		minGradient: {},
	};

	dv.state.view = -1;
	dv.html.body = d3.select('body');
};

dv.create.defaultText = function() {
	var html = "", separator = " | ";
	
	html += "<a href='javascript:dv.update.option1();'>GDP</a>";
	html += separator;
	html += "<a href='javascript:dv.update.option2();'>Debt</a>";
	html += separator;
	html += "<a href='javascript:dv.update.option3();'>Debt to GDP Ratio</a>";
	dv.opt.text = html;
};

dv.create.years = function() {
	// sets up max, min, and sum for use in scales
	var opt = dv.opt.years,
		years = dv.data.years;

	if (opt.continuous) {
		years.selected = dv.calc.years(opt.first, opt.last);
	} else {
		years.selected = [opt.first, opt.last];
	}
	years.all = dv.calc.years(years.first, years.last);
};

// figure out how big everything needs to be
dv.create.dims = function() {
	var margin = dv.opt.margin,
		mindim = dv.opt.mindim;

	dv.html.win = window || document.documentElement || document.getElementsByTagName('body')[0];
	dv.dim.win = {
		h: dv.html.win.innerHeight || dv.html.win.clientHeight,
		w: dv.html.win.innerWidth || dv.html.win.clientWidth
	};

	dv.dim.body = {
		top: parseInt(dv.html.body.style('margin-top'), 10),
		right: parseInt(dv.html.body.style('margin-right'), 10),
		bottom: parseInt(dv.html.body.style('margin-bottom'), 10),
		left: parseInt(dv.html.body.style('margin-left'), 10)
	};

	dv.html.svg = dv.html.svg || dv.draw.svg();
	dv.dim.svg = {
		h: dv.dim.win.h - margin.top - margin.bottom - dv.dim.body.bottom - 100, // - dv.html.svg.offsetTop // SVG doesn't get an offset.  Needs to be wrapped in a div to make it work.  Subbing in "-100" for now.
		w: dv.dim.win.w - margin.left - margin.right - dv.dim.body.right - 100, // - dv.html.svg.offsetLeft 
	};

    dv.dim.svg.h = dv.dim.svg.h < mindim.h ? mindim.h : dv.dim.svg.h;
	dv.dim.svg.w = dv.dim.svg.w < mindim.w ? mindim.w : dv.dim.svg.w;

	dv.dim.chart = {
		h: dv.dim.svg.h - dv.opt.label.top - dv.opt.label.bottom,
		w: dv.dim.svg.w - dv.opt.label.left - dv.opt.label.right,
	};

	dv.redraw.svg();
};

// groups the data by country, data, year
dv.create.cleanData = function() {
  var clean = {},
	allYears = dv.data.years.all,
	i, i2, row, countries, country, subject, year, value;

  // make country its own object, append summary info, append data
	for (i = dv.dato.full.length - 1; i >= 0; i--) {
		row = dv.dato.full[i];
		country = row.Country;
		subject = row['Subject Descriptor'] + ' - ' + row.Units;
		if (!clean[country]) {
			clean[country] = {};
			clean[country].data = {};
			clean[country].code = row.ISO;
			clean[country].region = dv.dato.region[country];
		}
		clean[country].data[subject] = {};
		
		// parse data into numbers, convert percentages, place values into temporary 'clean' object
		for (i2 = allYears.length - 1; i2 >= 0; i2--) {
			year = allYears[i2];
			value = row[year] === '' ? false : parseFloat(row[year].replace(',',''));
			if (row.Units.indexOf('Percent') !== -1) { value *= 0.01; }
			// if (row.Scale === 'Millions') { value *= 1000000; }
			// else if (row.Scale === 'Billions') { value *= 1000000000; }
			clean[country].data[subject][year] = value;
		}
	}

	// move temporary object into permanent clean array, calculate additional values
	countries = d3.keys(clean);
	dv.data.countries.all = countries;
	dv.dato.full = {};
	dv.data.full = [];
	for (i = countries.length - 1; i >= 0; i--) {
		country = countries[i];
		clean[country].name = country;
		clean[country] = dv.calc.debt(clean[country]);
		dv.dato.full[country] = clean[country];
		dv.data.full.push(clean[country]);
	}
};

dv.create.countryList = function() {
	var years = dv.data.years.selected,
		start = years[0],
		end = years[years.length - 1],
		select = dv.opt.data.select,
		quantity = dv.opt.countries.count,
		length = dv.data.countries.all.length - 1,
		countries = dv.opt.countries.default,
		i, countryList, startCountries, endCountries;

	function getCountries(year) {
		countryList = [];
		dv.data.full = dv.util.aooSort({array: dv.data.full, key: ['data', select, year]});
		for (i = length; i > length - quantity; i--) {
			countryList.push(dv.data.full[i].name);
		}
		return countryList;
	}

	function checkAndAdd(item) {
		if(countries.length < quantity && countries.indexOf(item) === -1) { countries.push(item); }
		return countries;
	}

	startCountries = getCountries(start);
	endCountries = getCountries(end);

	for (i = 0; i < quantity; i++) {
		countries = checkAndAdd(startCountries[i]);
		countries = checkAndAdd(endCountries[i]);
		if (countries.length >= quantity) { i = quantity; }
	}
	dv.data.countries.selected = countries;
};

dv.create.subset = function() {
	var subset = [],
		countries = dv.data.countries.selected,
		full = dv.dato.full,
		first = false,
		i, name, country, fullCountry;

	dv.create.stats();
	for (i = countries.length - 1; i >= 0; i--) {
		name = countries[i];
		fullCountry = full[name];
		country = {};
		country.name = fullCountry.name;
		country.code = fullCountry.code;
		country.region = fullCountry.region;
		country.height = {};
		country.rank = {};
		country.offset = {};
		country.order = {};
		country.gradient = {};
		country.label = {};


		if (i === countries.length - 1) { first = true; } else { first = false; }
		country = dv.update.country(country, first);
		subset.push(country);
	}
	dv.data.subset = subset;
	dv.data.sorted = subset;
};

dv.create.yscale = function() {
	dv.dim.yscale = dv.dim.chart.h - dv.data.countries.selected.length * dv.opt.line.pad;
};

dv.create.prescales = function() {
	dv.scale.pow = function(d) { return Math.pow(d, dv.opt.data.power); };
};

dv.create.scales = function() {

	// go through the years actually in use and find the min
	// calculate offset and order for each year
	var width = dv.dim.chart.w,
		lineopt = dv.opt.line,
		sum = 0,
		max = 0,
		min = 0,
		maxHeight = 0,
		minHeight = 0,
		maxGradient = 0,
		minGradient = 0,
		years = dv.data.years.selected,
		subset = dv.data.subset,
		sorted = dv.data.sorted,
		i, year, length, i2, offset, country, j;

	for (i = years.length - 1; i >= 0; i--) {
		year = years[i];
		sum = d3.max([dv.dato.sum[year], sum]);
		max = d3.max([dv.dato.max[year], max]);
		min = d3.min([dv.dato.min[year], min]);
		maxHeight = d3.max([dv.dato.maxHeight[year], maxHeight]);
		minHeight = d3.min([dv.dato.minHeight[year], minHeight]);
		maxGradient = d3.max([dv.dato.maxGradient[year], maxGradient]);
		minGradient = d3.min([dv.dato.minGradient[year], minGradient]);

		offset = 0;
		dv.util.aooSort({ array: sorted, key: ['rank', year] });
		length = subset.length;
		for (i2 = 0; i2 < length; i2++) {
			country = sorted[i2];
			country.offset[year] = offset;
			country.order[year] = i2;
			offset += dv.scale.pow(country.height[year]);
			j = 0;
			while (j < subset.length && subset[j].code !== country.code) {
				j++;
			}
			dv.data.subset[j] = country;
		}
	}

	dv.create.yscale();

	dv.scale.x = d3.scale.linear()
		.domain([years[0], years[years.length - 1]])
		.rangeRound([0, width])
	;

	dv.scale.y = d3.scale.linear()
		.domain([min, sum])
		.rangeRound([lineopt.minHeight, dv.dim.yscale])
	;

	dv.scale.ypow = function(y) {
		y = dv.scale.pow(y);
		return dv.scale.y(y);
	};

	dv.scale.ylabel = d3.scale.linear()
		.domain([0,1200])
		.rangeRound([12,16])
	;

	dv.scale.xlabel = d3.scale.linear()
		.domain([0,1200])
		.rangeRound([10,13])
	;

	dv.scale.lineLabel = d3.scale.linear()
		.domain([0,1200])
		.rangeRound([12,15])
	;

	dv.scale.header = d3.scale.linear()
		.domain([0,1200])
		.rangeRound([18,40])
	;

	dv.scale.yHigh = function(country, year) {
		return dv.dim.chart.h - dv.scale.y(country.offset[year]) - (country.order[year] * dv.opt.line.pad) - dv.scale.ypow(country.height[year]) - dv.opt.label.pad;
	};

	dv.scale.yLow = function(country, year) {
		return dv.dim.chart.h - dv.scale.y(country.offset[year]) - (country.order[year] * dv.opt.line.pad);
	};

	dv.scale.color = d3.scale.ordinal().range(dv.opt.colors);

	dv.scale.gradient = d3.scale.sqrt()
		.range(['#050','#800'])
		.domain([minGradient, maxGradient])
		.clamp(true)
	;

	if (dv.opt.data.gradient === 'General government gross debt - Percent of GDP') {
		dv.scale.gradient
			.range(['#050','#555','#500','#900'])
			.domain([0, 0.6, 1, maxGradient]);
	}
};

dv.create.stats = function() {
	dv.data.sorted = [];
	dv.data.stats = {};
	dv.data.stats.bigGain = {name:'', val:0};
	dv.data.stats.bigLoss = {name:'', val:0};
	dv.data.stats.bigGainYear = {name:'', val:0, year: 0};
	dv.data.stats.bigLossYear = {name:'', val:0, year: 0};
};

/* WRITE: Write out html elements */

// helper function expects {name: aName, type: elementType, target: d3.selected.div, css: optionalClassName, html: optionalHTML }
dv.write.html = function(o) {
	if (!o.target) {o.target = dv.html.body;}
	if (o.name && o.type) {
		dv.html[o.name] = o.target.append(o.type);
		if (!o.css) {o.css = o.name;}
		dv.html[o.name].attr('class', o.css);
		if (o.html) {dv.html[o.name].html(o.html);}
	}
};

dv.write.header = function() {
	dv.write.html({name: 'header', type: 'div'});
	dv.write.html({name: 'title', type: 'h1', html: 'GDP & Debt', target: dv.html.header});
	dv.write.html({name: 'subTitle', type: 'h5', target: dv.html.header});
	dv.write.html({name: 'linkTo', type: 'a', target: dv.html.header});
	dv.html.linkTo.on('click', function() { return dv.update.view(dv.opt.duration); });
	dv.write.html({name: 'descr', type: 'div', target: dv.html.header});
	dv.write.html({name: 'stats', type: 'div', target: dv.html.header});
	dv.write.html({name: 'bigLoss', type: 'div', css: 'stat', target: dv.html.stats});
	dv.write.html({name: 'bigGain', type: 'div', css: 'stat', target: dv.html.stats});
	dv.write.html({name: 'bigLossYear', type: 'div', css: 'stat', target: dv.html.stats});
	dv.write.html({name: 'bigGainYear', type: 'div', css: 'stat', target: dv.html.stats});

	dv.html.stats.selectAll('.stat').append('div').attr('class','number');
	dv.html.stats.selectAll('.stat').append('div').attr('class','country');
	dv.html.stats.selectAll('.stat').append('div').attr('class','descr');
};


/* DRAW: Draw SVG elements for the first time */

dv.draw.svg = function() {
	var	margin = dv.opt.margin;

	dv.svg.svg = dv.html.body.append('svg:svg');
	dv.svg.main = dv.svg.svg
		.append('svg:g')
			.attr('transform', 'translate(' + margin.left + ',' + margin.top + ')')
	;
	return dv.svg.svg[0][0];
};

dv.draw.flowChart = function() {
	dv.svg.chart = dv.svg.main.append('svg:g');

	dv.draw.axis();
	dv.draw.flowLines();
	dv.draw.yLabels('left');
	dv.draw.yLabels('right');
	dv.draw.xLabels();
};

dv.draw.axis = function() {
	dv.svg.axis = dv.svg.chart.append('svg:g')
		.attr('transform', 'translate(' + dv.opt.label.left + ',' + dv.opt.label.top + ')')
		.attr('class', 'vertical-axis')
		.selectAll('rect')
		.data(dv.data.years.selected)
		.enter().append('svg:rect')
			.attr('class', function(d, i) { if (i%2 === 0) { return 'even'; } else { return 'odd'; } })
			.attr('y', dv.opt.margin.top)
			.style('display', function(d, i) { if (i === dv.data.years.selected.length - 1) { return 'none'; } else { return false; } })
	;
};

dv.draw.flowLines = function() {
	function mouseon(event, d, index) {
		dv.svg.flowLines.transition().duration(10)
			.style('fill-opacity', function(d, i) { if (i === index) { return dv.opt.opacity.high; } else { return dv.opt.opacity.low; } })
		;
		d3.selectAll('.' + d.code).style('font-weight', '400').style('fill', '#222');
		dv.redraw.lineLabels(d);
	}

	function mouseoff() {
		dv.svg.flowLines.transition().duration(250)
			.style('fill-opacity', dv.opt.opacity.norm)
		;
		dv.svg.lineLabels.transition().duration(250)
			.style('opacity', 0)
		;
		dv.svg.label.left.text.style('font-weight','300').style('fill', '#555');
		dv.svg.label.right.text.style('font-weight','300').style('fill', '#555');
	}

	dv.svg.flowLines = dv.svg.chart.append('svg:g')
		.attr('transform', 'translate(' + dv.opt.label.left + ',' + dv.opt.label.top + ')')
		.selectAll('path')
		.data(dv.data.subset)
		.enter().append('svg:path')
			.style('fill-opacity', dv.opt.opacity.norm)
			.on('mouseover', function(d, i) { mouseon(event, d, i); })
			.on('mouseout', mouseoff)
	;
};

dv.draw.yLabels = function(side) {
	var anchor,
		labelWidth = dv.opt.label[side] - dv.opt.label.pad;
	
	if (side === 'left') {
		anchor = 'end';
	} else {
		anchor = 'begin';
	}

	dv.svg.label = dv.svg.label || {};
	dv.svg.label[side] = {};

	dv.svg.label[side].g = dv.svg.chart.append('g');
	dv.svg.label[side].text = dv.svg.label[side].g.selectAll('text')
		.data(dv.data.subset)
		.enter().append('svg:text')
			.attr('class', function(d) { return d.code; })
			.attr('width', labelWidth)
			.attr('text-anchor', anchor)
			.text(function(d) { return d.name; })
	;
};

dv.draw.xLabels = function() {
	dv.svg.label = dv.svg.label || {};
	dv.svg.label.x = {};
	dv.svg.label.x.g = dv.svg.chart.append('g');
	dv.svg.label.x.text = dv.svg.label.x.g.selectAll('text')
		.data(dv.data.years.selected)
		.enter().append('svg:text')
			.attr('class', 'xLabel')
			.attr('text-anchor', 'middle')
			.text(function(d) { return d; })
	;
};

dv.draw.flowLine = function(country) {
	var years = dv.data.years.selected,
		length = years.length,
		path = 'M',
		year = years[0],
		rangeBand = dv.scale.x(years[1]) - dv.scale.x(years[0]),
		curve = dv.opt.curve,
		total = curve.straight + curve.rank + curve.change,
		straight = rangeBand * (curve.straight / total),
		rank = rangeBand * (curve.rank / total),
		change = rangeBand * (curve.change / total),
		rankCP = rank * curve.rankCP,
		changeCP = change * curve.changeCP,
		x, y, x1, y1, x2, y2, i;

	function drawP(array) {
		var i,
			string = Math.round(array[0]),
			length = array.length;
		for (i = 1; i < length; i++) {
			string += ',' + Math.round(array[i]);
		}
		return string;
	}

	function drawV(y) {
		return ' V' + Math.round(y);
	}

	function drawH(y) {
		return ' H' + Math.round(y);
	}

	function drawC(x1,y1,x2,y2,x,y) {
		return ' C' + drawP([x1,y1,x2,y2,x,y]);
	}

	function getX(year) {
		return dv.scale.x(year);
	}

	year = years[0];
	x = getX(year);
	y = dv.scale.yLow(country, year);
	path += drawP([x,y]);

	for (i = 0; i < length - 1; i++) {
		year = years[i];

		// draw a horizontal line to the point where the curve is supposed to start.
		x = getX(year) + straight;
		path += drawH(x);
		
		// draw the rank curve
		x1 = x + rankCP;
		y1 = y;
		year = years[i+1];
		x += rank;
		y = dv.scale.yLow(country, year);
		x2 = x - rankCP;
		y2 = y;
		path += drawC(x1,y1,x2,y2,x,y);
	}

	// draw a line to the axis
	x = getX(year);
	path += drawH(x);

	y = dv.scale.yHigh(country, year);
	path += drawV(y);

	for (i = length - 1; i > 0; i--) {
		year = years[i];

		// draw the change curve
		x1 = x - changeCP;
		y1 = y;
		year = years[i-1];
		x -= change;
		y = dv.scale.yLow(country, years[i]) + (dv.scale.yHigh(country, year) - dv.scale.yLow(country, year));
		x2 = x + changeCP;
		y2 = y;
		path += drawC(x1,y1,x2,y2,x,y);
		
		// draw the rank curve
		x1 = x - rankCP;
		y1 = y;
		x -= rank;
		y = dv.scale.yHigh(country, year);
		x2 = x + rankCP;
		y2 = y;
		path += drawC(x1,y1,x2,y2,x,y);

		// straight line to the axis
		x = getX(year) - straight;
		path += drawH(x);
	}
	path += ' Z';

	return path;
};

dv.draw.lineLabels = function() {
	dv.svg.lineLabels = dv.svg.main.append('svg:g')
		.attr('transform', 'translate(' + dv.opt.label.left + ',0)')
		.selectAll('text')
		.data(dv.data.years.selected)
		.enter().append('svg:text')
			.attr('text-anchor', 'middle')
	;
};

dv.draw.gradients = function() {
	var gradient, length = dv.data.years.selected.length;
	dv.svg.gradients = dv.svg.main.append('svg:g').selectAll('linearGradient')
		.data(dv.data.subset)
		.enter().append('svg:linearGradient')
			.attr('x1', '0%')
			.attr('y1', '0%')
			.attr('x2', '100%')
			.attr('y2', '0%')
			.attr('id', function(d) {
				gradient = d3.select(this);
				gradient.selectAll('stop')
					.data(dv.data.years.selected)
					.enter().append('svg:stop')
						.attr('offset', function(d2, i2) { return Math.round(i2 / length * 100) + '%'; })
						.style('stop-opacity', 1)
				;
				return 'grad-' + d.code;
			})
	;
};


/* UPDATE: Update data, or many different types of things */

dv.update.view = function(duration) {
	dv.state.view = dv.calc.nextView();
	var view = dv.opt.views[dv.state.view],
		nextView = dv.calc.nextView(),
		nextHTML = dv.opt.views[nextView].linkTo;

	if (nextView === 0) {nextHTML = 'Start Over with ' + nextHTML;} else {nextHTML = 'Show changes in ' + nextHTML;}
	dv.opt.data.rank = view.rank;
	dv.opt.data.height = view.height;
	dv.opt.data.gradient = view.gradient;
	dv.opt.data.label = view.label;
	dv.opt.format.label = view.format;

	if (duration) {
		dv.update.data(duration);
	}

	dv.rewrite.fadeInOut({ele:dv.html.subTitle, duration:duration, html:view.title});
	dv.rewrite.fadeInOut({ele:dv.html.descr, duration:duration, html:view.descr});
	dv.rewrite.fadeInOut({ele:dv.html.linkTo, duration:duration, html:nextHTML});
	dv.rewrite.stats(duration);
};

dv.update.data = function(duration) {
	dv.update.subset();
	dv.create.scales();

	dv.svg.label.left.text.data(dv.data.subset);
	dv.svg.label.right.text.data(dv.data.subset);
	dv.svg.axis.data(dv.data.years.selected);
	dv.svg.flowLines.data(dv.data.subset);
	dv.svg.label.x.text.data(dv.data.years.selected);
	dv.svg.lineLabels.data(dv.data.years.selected);

	dv.update.resize(duration);
};

dv.update.resize = function(duration) {
	if (!duration) {
		duration = 0;
	}
	dv.create.yscale();
	dv.create.dims();
	dv.scale.x.rangeRound([0, dv.dim.chart.w]);
	dv.scale.y.rangeRound([dv.opt.line.minHeight, dv.dim.yscale]);


	dv.redraw.svg();
	dv.redraw.flowLines(duration);
	dv.redraw.gradients(duration);
	dv.redraw.yLabels('right', duration);
	dv.redraw.yLabels('left', duration);
	dv.redraw.xLabels();
	dv.redraw.axis();
};

dv.update.subset = function() {
	var countries = dv.data.subset,
		first = false,
		i, country;

	dv.create.stats();

	for (i = countries.length - 1; i >= 0; i--) {
		country = countries[i];
		if (i === countries.length - 1) { first = true; } else { first = false; }
		country = dv.update.country(country, first);
		dv.data.sorted.push(country);
	}
};

dv.update.country = function(country, first) {
	var years = dv.data.years.selected,
		fullCountry = dv.dato.full[country.name],
		bigLoss = dv.data.stats.bigLoss,
		bigGain = dv.data.stats.bigGain,
		bigLossYear = dv.data.stats.bigLossYear,
		bigGainYear = dv.data.stats.bigGainYear,
		i, year, value, labelValue, scaledValue, gradient, yearChange, totalChange;

	for (i = years.length - 1; i >= 0; i--) {
		year = years[i];
		country.height[year] = fullCountry.data[dv.opt.data.height][year];
		country.rank[year] = fullCountry.data[dv.opt.data.rank][year];
		if (dv.opt.data.gradient) {
			country.gradient[year] = fullCountry.data[dv.opt.data.gradient][year];
		} else {
			country.gradient[year] = 0;
		}
		labelValue = fullCountry.data[dv.opt.data.label][year];
		country.label[year] = dv.format[dv.opt.format.label](labelValue);
		// calculates max, min, and sums per year for use in scales
		value = country.height[year];
		scaledValue = dv.scale.pow(value);
		gradient = country.gradient[year];
		if (first) {
			dv.dato.sum[year] = scaledValue;
			dv.dato.max[year] = scaledValue;
			dv.dato.min[year] = scaledValue;
			dv.dato.maxHeight[year] = value;
			dv.dato.minHeight[year] = value;
			dv.dato.maxGradient[year] = gradient;
			dv.dato.minGradient[year] = gradient;
		} else {
			dv.dato.sum[year] += scaledValue;
			dv.dato.max[year] = d3.max([scaledValue, dv.dato.max[year]]);
			dv.dato.min[year] = d3.min([scaledValue, dv.dato.min[year]]);
			dv.dato.maxHeight[year] = d3.max([value, dv.dato.maxHeight[year]]);
			dv.dato.minHeight[year] = d3.min([value, dv.dato.minHeight[year]]);
			dv.dato.maxGradient[year] = d3.max([gradient, dv.dato.maxGradient[year]]);
			dv.dato.minGradient[year] = d3.min([gradient, dv.dato.minGradient[year]]);
		}
		if (i !== 0) {
			yearChange = labelValue - fullCountry.data[dv.opt.data.label][years[i-1]];
			if (yearChange < bigLossYear.val || bigLossYear.val === 0) {
				bigLossYear.name = country.name;
				bigLossYear.val = yearChange;
				bigLossYear.year = year;
			}
			if (yearChange > bigGainYear.val || bigGainYear.val === 0) {
				bigGainYear.name = country.name;
				bigGainYear.val = yearChange;
				bigGainYear.year = year;
			}
		}
	}
	totalChange = fullCountry.data[dv.opt.data.label][years[years.length - 1]] - fullCountry.data[dv.opt.data.label][years[1]];
	if (totalChange < bigLoss.val || bigLoss.val === 0) {
		bigLoss.name = country.name;
		bigLoss.val = totalChange;
	}
	if (totalChange > bigGain.val || bigGain.val === 0) {
		bigGain.name = country.name;
		bigGain.val = totalChange;
	}
	return country;
};


/* REDRAW: Used for sizing, resizing, or redrawing SVG elements */

dv.redraw.svg = function() {
	dv.svg.svg.attr('width', dv.dim.svg.w).attr('height', dv.dim.svg.h);
};

dv.redraw.yLabels = function(side, duration) {
	var translate = dv.opt.label.left,
		size = dv.scale.ylabel(dv.dim.chart.h);
	if (!duration) { duration = 0; }
	if(side === 'left') {
		translate -= dv.opt.label.pad;
	} else {
		translate += dv.dim.chart.w + dv.opt.label.pad;
	}

	dv.svg.label[side].g.attr('transform', 'translate(' + translate + ',0)');
	dv.svg.label[side].text
		.transition().duration(duration)
		.style('font-size', size)
		.attr('dy', function(d) { return dv.calc.labelOffset(d, side); })
	;
};

dv.redraw.xLabels = function() {
	var width = dv.scale.x(dv.data.years.selected[1]) - dv.scale.x(dv.data.years.selected[0]),
		size = dv.scale.xlabel(dv.dim.chart.w),
		height = dv.dim.chart.h + size * 0.5;

	dv.svg.label.x.g.attr('transform', 'translate(' + dv.opt.label.left + ',' + height + ')');
	dv.svg.label.x.text
		.attr('width', width)
		.style('font-size', size)
		.attr('dy', 0)
		.attr('dx', function(d) { return (dv.scale.x(d-1) + width / 2) | 0; })
		.style('visibility', function(d, i) {
			if (i === 0) {
				return 'hidden';
			} else if ( width < 40 && i%2 === 0) {
				return 'hidden';
			} else { return 'visible'; }
		})
	;
};

dv.redraw.axis = function() {
	var width = dv.scale.x(dv.data.years.selected[1]) - dv.scale.x(dv.data.years.selected[0]);

	dv.svg.axis
		.attr('x', function(d) { return dv.calc.axisLabelX(d); })
		.attr('width', width)
		.attr('height', dv.dim.chart.h - dv.opt.line.minHeight)
	;
};

dv.redraw.flowLines = function(duration) {
	dv.svg.flowLines.style('pointer-events', 'none');
	dv.svg.flowLines.transition().duration(duration)
		.style('fill', function(d) { return 'url(#grad-' + d.code + ')'; })
		.attr('d', function(d) { return dv.draw.flowLine(d); })
		.each('end', function() {dv.svg.flowLines.style('pointer-events', 'auto');})
	;
};

dv.redraw.lineLabels = function(country) {
	var width = dv.scale.x(dv.data.years.selected[1]) - dv.scale.x(dv.data.years.selected[0]),
		size = dv.scale.lineLabel(dv.dim.chart.h);

	dv.svg.lineLabels
		.attr('class','line-label')
		.attr('width', width)
		.style('font-size', size)
		.attr('dx', function(d, i) { return (dv.scale.x(dv.data.years.selected[i-1]) + width / 2) | 0; })
		.attr('dy', function(d) {
			var height = dv.scale.yHigh(country, d) - 5;
			if (height < 15) { height = dv.scale.yLow(country, d) + 15; }
			return height;
		})
		.text(function(d) { return country.label[d]; })
		.style('opacity', 0.25)
		.transition().duration(250)
		.style('opacity', 1)
		.style('visibility', function(d, i) {
			if (i === 0) {
				return 'hidden';
			} else if ( width < 40 && i%2 === 0) {
				return 'hidden';
			} else { return 'visible'; }
		})
	;
};

dv.redraw.gradients = function(duration) {
	var gradient;
	dv.svg.gradients
		.attr('', function(d) {
			gradient = d3.select(this);
			gradient.selectAll('stop')
				.transition().duration(duration)
				.style('stop-color', function(d2) {
					if (dv.opt.data.gradient) {
						return dv.scale.gradient(d.gradient[d2]);
					} else {
						return dv.scale.color(d.region);
					}
				})
			;
		})
	;
};


/* REWRITE: Used for updating the contents of HTML elements */

// expects {name: dv.html.someName, duration: someNumber, html: someHtml}
dv.rewrite.fadeInOut = function(o) {
	if (!o.duration) {
		o.ele.html(o.html).style('opacity', 1);
	} else {
		o.ele.transition().duration(o.duration / 2)
			.style('opacity', 0)
			.transition().duration(0).each('end', function() {
				d3.select(this)
					.html(o.html)
					.transition().duration(o.duration / 2)
						.style('opacity', 1)
				;
			})
		;
	}

};


dv.rewrite.stats = function(duration) {
	var view = dv.opt.views[dv.state.view],
		bigNumber;

	bigNumber = dv.format[view.format](dv.data.stats.bigLoss.val);
	if (view.format !== 'percent') {bigNumber += dv.calc.dif(dv.data.stats.bigLoss);}
	dv.rewrite.fadeInOut({ele:dv.html.bigLoss.select('.number'), duration:duration, html: bigNumber});
	dv.rewrite.fadeInOut({ele:dv.html.bigLoss.select('.country'), duration:duration, html: dv.data.stats.bigLoss.name});
	dv.rewrite.fadeInOut({ele:dv.html.bigLoss.select('.descr'), duration:duration, html: view.bigLoss});

	bigNumber = dv.format[view.format](dv.data.stats.bigGain.val);
	if (view.format !== 'percent') {bigNumber += dv.calc.dif(dv.data.stats.bigGain);}
	dv.rewrite.fadeInOut({ele:dv.html.bigGain.select('.number'), duration:duration, html: bigNumber});
	dv.rewrite.fadeInOut({ele:dv.html.bigGain.select('.country'), duration:duration, html: dv.data.stats.bigGain.name});
	dv.rewrite.fadeInOut({ele:dv.html.bigGain.select('.descr'), duration:duration, html: view.bigGain});

	bigNumber = dv.format[view.format](dv.data.stats.bigLossYear.val);
	if (view.format !== 'percent') {bigNumber += dv.calc.dif(dv.data.stats.bigLossYear);}
	dv.rewrite.fadeInOut({ele:dv.html.bigLossYear.select('.number'), duration:duration, html: bigNumber});
	dv.rewrite.fadeInOut({ele:dv.html.bigLossYear.select('.country'), duration:duration, html: dv.data.stats.bigLossYear.name + ' (' + dv.data.stats.bigLossYear.year + ')'});
	dv.rewrite.fadeInOut({ele:dv.html.bigLossYear.select('.descr'), duration:duration, html: view.bigLossYear});

	bigNumber = dv.format[view.format](dv.data.stats.bigGainYear.val);
	if (view.format !== 'percent') {bigNumber += dv.calc.dif(dv.data.stats.bigGainYear);}
	dv.rewrite.fadeInOut({ele:dv.html.bigGainYear.select('.number'), duration:duration, html: bigNumber});
	dv.rewrite.fadeInOut({ele:dv.html.bigGainYear.select('.country'), duration:duration, html: dv.data.stats.bigGainYear.name + ' (' + dv.data.stats.bigGainYear.year + ')'});
	dv.rewrite.fadeInOut({ele:dv.html.bigGainYear.select('.descr'), duration:duration, html: view.bigGainYear});
};

/* CALC: Calculate something and return a value */

dv.calc.dif = function(stat) {
	var first, last, start, end, percent,
		country = dv.dato.full[stat.name],
		data = dv.opt.data.label;
	if (stat.year) {
		first = dv.data.years.selected[dv.data.years.selected.indexOf(stat.year) - 1];
		last = stat.year;
	} else {
		first = dv.data.years.selected[1];
		last = dv.data.years.selected[dv.data.years.selected.length - 1];
	}
	start = country.data[data][first];
	end = country.data[data][last];

	percent = Math.round((end - start) / start * 100);
	percent = ' <span class="pct">(' + percent + '%)</span>';
	return percent;
};

// take a start year and an end year and return both of those all all years in between
dv.calc.years = function(start, end) {
	var years = [];
	for (var i = start; i < end + 1; i++) {
		years.push(i);
	}
	return years;
};

dv.calc.labelOffset = function(d, side) {
	var year, h,
		offset = dv.dim.chart.h,
		years = dv.data.years.selected;
	if (side === 'left') { year = years[0]; } else { year = years[years.length - 1]; }

	h = dv.scale.ypow(d.height[year]) / 2 - 3;
	offset -= dv.scale.y(d.offset[year]);
	offset -= d.order[year] * dv.opt.line.pad;
	offset -= h;
	return offset;
};

dv.calc.axisLabelX = function(d) {
	return dv.scale.x(d);
};

dv.calc.debt = function(country) {
	var years = dv.data.years.all,
		i, year, GDP, debtToGDP;
	country.data.Debt = {};
	for (i = years.length - 1; i >= 0; i--) {
		year = years[i];
		GDP = country.data['Gross domestic product, current prices - U.S. dollars'][year];
		debtToGDP = country.data['General government gross debt - Percent of GDP'][year];
		if (GDP && debtToGDP) {	country.data.Debt[year] = GDP * debtToGDP; }
		else { country.data.Debt[year] = false; }
	}
	return country;
};

dv.calc.nextView = function() {
	return (dv.state.view + 1) % (dv.opt.views.length);
};


/* FORMAT: Take a value and return a string for display */
dv.format.ratio = function(num) {
	var sign;
	num = Math.round(num * 100)/100;
	return num;
};

dv.format.percent = function(num) {
	num = Math.round(num * 100);
	//num = num > 0 ? '+' + num : num;
	return num + '%';
};

dv.format.bigDollar = function(num) {
	var factor = 1,
		abbvr = "",
		symbol = '$',
		abs = Math.abs(num);

	if (abs < 999) { abbvr = "B"; }
	else { factor = 1000; abbvr =  "T"; }
	abs = abs > 999 ? Math.round(abs/factor*10)/10 : Math.round(abs/factor);
	num = num < 0 ? '-' + symbol + abs : symbol + abs;
	return num + abbvr;
};

dv.format.raw = function(num) {
	return num;
};


/* UTIL: Utility and reusable functions */

// sort an array of objects by a given key
// expects {array: someArray, key: string or array, reverse: boolean} 
dv.util.aooSort = function(o) {
	var i, key,
		keys = dv.util.toArray(o.key),
		length = keys.length;

	o.array.sort(function(a, b) {
		for (i = 0; i < length; i++) {
			key = keys[i];
			a = a[key];
			b = b[key];
		}
		if (o.reverse) {
			a *= -1;
		} else {
			b *= -1;
		}
		return a + b;
	});

	return o.array;
};

dv.util.toArray = function(string) {
	if (Object.prototype.toString.call(string) === 'string') {
		string = [string];
	}
	return string;
};

// handles multiple streams of asynchronous requests for data, kicks off a corresponding dv.postload[streamName]() when the data is all loaded
dv.update.loadState = function(change, name) {
	name = name || 'data';
	change = change || 1;
	dv.state[name] = dv.state[name] || 0;
	dv.state[name] += change;
	if (dv.state[name] === 0) { dv.postload[name](); }
};

/* Kick everything off */
dv.create.start();

/* Data Structure
	Gross domestic product, constant prices - National currency
	Gross domestic product, constant prices - Percent change
	Gross domestic product, current prices - National currency
	Gross domestic product, current prices - U.S. dollars
	Gross domestic product, deflator - Index
	Gross domestic product per capita, constant prices - National currency
	Gross domestic product per capita, current prices - National currency
	Gross domestic product per capita, current prices - U.S. dollars
	Output gap in percent of potential GDP - Percent of potential GDP
	Gross domestic product based on purchasing-power-parity (PPP) valuation of country GDP - Current international dollar
	Gross domestic product based on purchasing-power-parity (PPP) per capita GDP - Current international dollar
	Gross domestic product based on purchasing-power-parity (PPP) share of world total - Percent
	Implied PPP conversion rate - National currency per current international dollar
	Total investment - Percent of GDP
	Gross national savings - Percent of GDP
	Inflation, average consumer prices - Index
	Inflation, average consumer prices - Percent change
	Inflation, end of period consumer prices - Index
	Inflation, end of period consumer prices - Percent change
	Six-month London interbank offered rate (LIBOR) - Percent
	Volume of imports of goods and services - Percent change
	Volume of Imports of goods - Percent change
	Volume of exports of goods and services - Percent change
	Volume of exports of goods - Percent change
	Value of oil imports - U.S. dollars
	Value of oil exports - U.S. dollars
	Unemployment rate - Percent of total labor force
	Employment - Persons
	Population - Persons
	General government revenue - National currency
	General government revenue - Percent of GDP
	General government total expenditure - National currency
	General government total expenditure - Percent of GDP
	General government net lending/borrowing - National currency
	General government net lending/borrowing - Percent of GDP
	General government structural balance - National currency
	General government structural balance - Percent of potential GDP
	General government primary net lending/borrowing - National currency
	General government primary net lending/borrowing - Percent of GDP
	General government net debt - National currency
	General government net debt - Percent of GDP
	General government gross debt - National currency
	General government gross debt - Percent of GDP
	Gross domestic product corresponding to fiscal year, current prices - National currency
	Current account balance - U.S. dollars
	Current account balance - Percent of GDP

*/
