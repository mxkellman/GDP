/*

Bugs
• Sizing

Small Enhancements
• Resizing

Medium Enhancements


Large Enhancements

*/

/* global d3 */

/* jshint devel:true */

// dv is the namespace used to avoid collisions with other code or libraries
var dv = {
	calc: {},
	clear: {},
	create: {},
	data: {},
	dim: {},
	draw: {},
	format: {},
	get: {},
	html: {},
	setup: {},
	scale: {},
	state: {},
	svg: {},
	update: {},
	util: {},
};


/* SETUP: gets stuff set up */

// calculates and adjusts variables and options
dv.setup.variables = function() {

	// dv.opt stores all options that can be changed 'on the fly'
	dv.opt = {
		colors: ['#08519c','#4292c6','#6baed6','#74c476','#238b45','#00441b'],
		data: {
			years: {
				first: 2001,
				last: 2011,
				continuous: true,
			},
			countries: {
				count: 20,
				sortCol: 'Debt',
				default: [],
			},
			col: 'General government gross debt - Percent of GDP',
			power: 2,
			calc: function(country) {
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
			},
		},
		margin: {
			left: 40,
			right: 40,
			top: 20,
			bottom: 20,
			label: {
				left: 100,
				right: 100,
				top: 0,
				bottom: 0,
			},
		},
		chart: {
			line: {
				minHeight: 3,
				pad: 10,
			},
			opacity: {
				norm: 0.8,
				high: 1,
				low: 0.5
			},
			curve: {
				straight: 0,
				rank: 1,
				change: 5,
				rankCP: 0.5,
				changeCP: 0,
			}
		},
		path: {
			data: 'data/WEO-All.csv',
			region: 'data/regions.csv'
		},
		text: {
			pad: 3
		}
	};
	
	dv.data = {
		countries: {
			all: [],
			selected: [],
		},
		full: {
			arr: [],
			obj: {},
		},
		max: {},
		min: {},
		sum: {},
		years: {
			first: 1980,
			last: 2018,
			all: [],
			selected: [],
		},
	};
	dv.setup.dims();

	// sets up max, min, and sum for use in scales
	var optYears = dv.opt.data.years,
		dataYears = dv.data.years,
		i, year;
	if (optYears.continuous) { dv.data.years.selected = dv.calc.years(optYears.first, optYears.last); }
	dv.data.years.all = dv.calc.years(dataYears.first, dataYears.last);
	for (i = dataYears.selected.length - 1; i >= 0; i--) {
		year = dataYears.selected[i];
		dv.data.sum[year] = 0;
		dv.data.max[year] = 0;
		dv.data.min[year] = 0;
	}

	dv.draw.svg();

	dv.scale.pow = function(d) { return Math.pow(d, dv.opt.data.power); };
	dv.scale.color = d3.scale.ordinal().range(dv.opt.colors);
};

// any setup that can be done before/while the data is being processed
dv.setup.withoutData = function() {
	dv.setup.variables();
	dv.get.data();
};

// setup that has to be done after the data is loaded
dv.setup.withData = function() {
	dv.create.cleanData();
	dv.create.countryList();
	dv.create.subset();
	dv.create.scales();
	dv.draw.flowChart();
};

// figure out how big everything needs to be
dv.setup.dims = function() {
	var margin = dv.opt.margin;

	dv.dim.win = {
		w: window.innerWidth || document.documentElement.clientWidth || document.getElementsByTagName('body')[0].clientWidth,
		h: window.innerHeight || document.documentElement.clientHeight || document.getElementsByTagName('body')[0].clientHeight
	};

	dv.dim.svg = {
		h: dv.dim.win.h - margin.top - margin.bottom,
		w: dv.dim.win.w - margin.left - margin.right,
	};

	dv.dim.chart = {
		h: dv.dim.svg.h - margin.label.top - margin.label.bottom,
		w: dv.dim.svg.w - margin.label.left - margin.label.right,
	};
};


/* GET: Retrive data from external files */

// retrieves the data from files and does a minimal amount of processing
// dv.state.load tracks asynchronous data calls and allows  
dv.get.data = function() {
	dv.update.load(2);
	
	d3.csv(dv.opt.path.data, function(error, data) {
		dv.data.full.obj = data;
		dv.update.load(-1);
	});

	d3.csv(dv.opt.path.region, function(error, data) {
		dv.data.region = {};
		for (var i = data.length - 1; i >= 0; i--) {
			dv.data.region[data[i].Country] = data[i].Region;
		}
		dv.update.load(-1);
	});
};


/* CREATE: Create/manipulate data stuctures */

// groups the data by country, data, year
dv.create.cleanData = function() {
  var clean = {},
	allYears = dv.data.years.all,
	i, i2, row, countries, country, subject, year, value;

  // make country its own object, append summary info, append data
	for (i = dv.data.full.obj.length - 1; i >= 0; i--) {
		row = dv.data.full.obj[i];
		country = row.Country;
		subject = row['Subject Descriptor'] + ' - ' + row.Units;
		if (!clean[country]) {
			clean[country] = {};
			clean[country].data = {};
			clean[country].code = row.ISO;
			clean[country].region = dv.data.region[country];
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

	// move temporary object into permanent clean array
	// calculate additional values as dictated by dv.opt.data.calc()
	countries = d3.keys(clean);
	dv.data.countries.all = countries;
	dv.data.full.obj = {};
	dv.data.full.arr = [];
	for (i = countries.length - 1; i >= 0; i--) {
		country = countries[i];
		clean[country].name = country;
		clean[country] = dv.opt.data.calc(clean[country]);
		dv.data.full.obj[country] = clean[country];
		dv.data.full.arr.push(clean[country]);
	}
};

dv.create.countryList = function() {
	var years = dv.data.years.selected,
		start = years[0],
		end = years[years.length - 1],
		col = dv.opt.data.countries.sortCol,
		quantity = dv.opt.data.countries.count,
		length = dv.data.countries.all.length - 1,
		countries = dv.opt.data.countries.default,
		i, countryList, startCountries, endCountries;

	function getCountries(year) {
		countryList = [];
		dv.data.full.arr = dv.util.sortByData({array: dv.data.full.arr, col: col, year: year});
		for (i = length; i > length - quantity; i--) {
			countryList.push(dv.data.full.arr[i].name);
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
		years = dv.data.years.selected,
		countries = dv.data.countries.selected,
		col = dv.opt.data.col,
		full = dv.data.full.obj,
		i, name, country, fullCountry, i2, year, value, scaleValue;

	for (i = countries.length - 1; i >= 0; i--) {
		name = countries[i];
		fullCountry = full[name];
		country = {};
		country.name = fullCountry.name;
		country.code = fullCountry.code;
		country.region = fullCountry.region;
		country.data = {};
		country.offset = {};
		country.order = {};

		for (i2 = years.length - 1; i2 >= 0; i2--) {
			year = years[i2];
			value = fullCountry.data[col][year];
			country.data[year] = value;

			// calculates max, min, and sums per year for use in scales
			scaleValue = dv.scale.pow(value);
			dv.data.sum[year] += scaleValue;
			dv.data.max[year] = d3.max([scaleValue, dv.data.max[year]]);
			dv.data.min[year] = d3.min([scaleValue, dv.data.min[year]]);
		}
		subset.push(country);
	}
	dv.data.subset = subset;
};

dv.create.scales = function() {

	// go through the years actually in use and find the min
	// calculate offset and order for each year
	var height = dv.dim.chart.h,
		width = dv.dim.chart.w,
		lineopt = dv.opt.chart.line,
		pad = lineopt.pad,
		minHeight = dv.opt.chart.line.minHeight,
		max = 0,
		min = 0,
		years = dv.data.years.selected,
		countries = dv.data.countries.selected.length,
		subset = dv.data.subset,
		i, year, length, i2, offset, country;

	for (i = years.length - 1; i >= 0; i--) {
		year = years[i];
		max = d3.max([dv.data.sum[year], max]);
		min = d3.min([dv.data.min[year], min]);

		offset = 0;
		subset = dv.util.sortByData({ array: subset, year: year });
		length = subset.length;
		for (i2 = 0; i2 < length; i2++) {
			country = subset[i2];
			country.offset[year] = offset;
			country.order[year] = i2;
			offset += dv.scale.pow(country.data[year]);
			dv.data.subset[i2] = country;
		}
	}

	dv.dim.yscale = height - countries * pad;

	dv.scale.x = d3.scale.linear()
		.domain([years[0], years[years.length - 1]])
		.rangeRound([0, width])
	;

	dv.scale.y = d3.scale.linear()
		.domain([min, max])
		.rangeRound([minHeight, dv.dim.yscale])
	;

	dv.scale.ypow = function(y) {
		y = dv.scale.pow(y);
		return dv.scale.y(y);
	};
};


/* DRAW: Draw SVG elements */

dv.draw.svg = function() {
	var	margin = dv.opt.margin;

	dv.svg.svg = d3.select('body').append('svg');
	dv.svg.main = dv.svg.svg
		.attr('width', dv.dim.win.w)
		.attr('height', dv.dim.win.h)
		.append('svg:g')
			.attr('transform', 'translate(' + margin.left + ',' + margin.top + ')')
	;
};

dv.draw.flowChart = function() {
	var margin = dv.opt.margin,
		opacity = dv.opt.chart.opacity,
		subset = dv.data.subset,
		minHeight = dv.opt.chart.line.minHeight,
		pad = dv.opt.chart.line.pad,
		years = dv.data.years.selected,
		startYear = years[0],
		endYear = years[years.length - 1],
		main = dv.svg.main,
		textPadding = dv.opt.text.pad,
		labelWidth, eventHeight, translate, i, year, anchor, html;

	function addLabel(side) {
		labelWidth = margin.label[side] - textPadding;
		translate = margin.label.left;
		if(side === 'left') {
			translate -= textPadding;
			anchor = 'end';
			year = startYear;
		} else {
			translate += dv.dim.chart.w + textPadding;
			anchor = 'begin';
			year = endYear;
		}

		dv.svg.label = dv.svg.label || {};
		dv.svg.label[side] = {};

		dv.svg.label[side].g = dv.svg.chart.append('g')
			.attr('transform', 'translate(' + translate + ',0)');
		dv.svg.label[side].text = dv.svg.label[side].g.selectAll('text')
			.data(subset)
			.enter().append('svg:text')
				.attr('width', labelWidth)
				.attr('text-anchor', anchor)
				.attr('dy', function(d) {
					var offset = dv.dim.chart.h;
					var h = dv.scale.ypow(d.data[year]) / 3;
					h = h < minHeight ? 1 : h;
					offset -= dv.scale.y(d.offset[year]);
					offset -= d.order[year] * pad;
					offset -= h;
					return offset;
				})
				.text(function(d) { return d.name; })
		;
	}

	function mouseon(event, d, index) {
		dv.svg.paths
			.style('fill-opacity', function(d, i) { if (i === index) { return opacity.high; } else { return opacity.low; } })
		;

		html = '<h5>' + d.name + '</h5><ul>';
		eventHeight = event.pageY;
		for (i = years.length - 1; i >= 0; i--) {
			year = years[i];
			html += '<li><strong>' + year + ': </strong>';
			html += Math.round(d.data[year]*100) / 100 + '</li>';
		}
		html += '</ul>';

		dv.hover.show(event, html);
	}

	function mouseoff() {
		dv.svg.paths
			.style('fill-opacity', opacity.norm)
		;
		dv.hover.hide();
	}

	dv.svg.chart = main.append('svg:g');

	dv.svg.paths = dv.svg.chart.append('svg:g')
		.attr('transform', 'translate(' + margin.label.left + ',' + margin.label.top + ')')
		.selectAll('path')
		.data(subset)
		.enter().append('svg:path')
			.attr('d', function(d) { return dv.draw.flowLine(d); })
			.style('fill', function(d) { return dv.scale.color(d.region); })
			.style('fill-opacity', opacity.norm)
			.on('mouseover', function(d, i) { mouseon(event, d, i); })
			.on('mouseout', mouseoff)
	;

	addLabel('left');
	addLabel('right');

/*	dv.svg.paths.selectAll('line')
		.data(dv.data.years.selected)
		.enter().append('svg:line')
			.style('class', 'vertical-axis')
			.style('stroke-width', '1px')
			.style('stroke-fill', '#000')
			.attr('x1', function(d) { return dv.scale.x(d); })
			.attr('x2', function(d) { return dv.scale.x(d); })
			.attr('y1', dv.dim.chart.h)
			.attr('y2', dv.opt.margin.top)
	;
*/};

dv.draw.flowLine = function(country) {
	var years = dv.data.years.selected,
		length = years.length,
		data = country.data,
		height = dv.dim.chart.h,
		offset = country.offset,
		order = country.order,
		path = 'M',
		year = years[0],
		pad = dv.opt.chart.line.pad,
		rangeBand = dv.scale.x(years[1]) - dv.scale.x(years[0]),
		curve = dv.opt.chart.curve,
		total = curve.straight + curve.rank + curve.change,
		straight = rangeBand * (curve.straight / total),
		rank = rangeBand * (curve.rank / total),
		change = rangeBand * (curve.change / total),
		rankCP = rank * curve.rankCP,
		changeCP = change * curve.changeCP,
		x, y, x1, y1, x2, y2, i;

	function drawP(array) {
		var i,
			string = array[0],
			length = array.length;
		for (i = 1; i < length; i++) {
			string += ',' + array[i];
		}
		return string;
	}

	function drawV(y) {
		return ' V' + y;
	}

	function drawH(y) {
		return ' H' + y;
	}

	function drawC(x1,y1,x2,y2,x,y) {
		return ' C' + drawP([x1,y1,x2,y2,x,y]);
	}

	function getYLow(year) {
		return height - dv.scale.y(offset[year]) - (order[year] * pad);
	}

	function getYHigh(year) {
		return height - dv.scale.y(offset[year]) - (order[year] * pad) - dv.scale.ypow(data[year]);
	}

	function getX(year) {
		return dv.scale.x(year);
	}

	year = years[0];
	x = getX(year);
	y = getYLow(year);
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
		y = getYLow(year);
		x2 = x - rankCP;
		y2 = y;
		path += drawC(x1,y1,x2,y2,x,y);
	}

	// draw a line to the axis
	x = getX(year);
	path += drawH(x);

	y = getYHigh(year);
	path += drawV(y);

	for (i = length - 1; i > 0; i--) {
		year = years[i];

		// draw the change curve
		x1 = x - changeCP;
		y1 = y;
		year = years[i-1];
		x -= change;
		y = getYLow(year + 1) + (getYHigh(year) - getYLow(year));
		x2 = x + changeCP;
		y2 = y;
		path += drawC(x1,y1,x2,y2,x,y);
		
		// draw the rank curve
		x1 = x - rankCP;
		y1 = y;
		x -= rank;
		y = getYHigh(year);
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

/* UPDATE: Update data and/or SVG */
dv.update.dims = function() {
	dv.setup.variables();

	dv.svg.svg
		.attr('width', dv.dim.win.w)
		.attr('height', dv.dim.win.h)
	;

	dv.scale.x.rangeRound([0, dv.dim.chart.w]);
	dv.scale.y.rangeRound([dv.opt.chart.line.minHeight, dv.dim.yscale]);
	dv.svg.paths.transition().attr('d', function(d) { return dv.draw.flowLine(d); });

// Label Updates aren't working yet.
/*
	var margin = dv.opt.margin.label.left,
		pad = dv.opt.text.pad,
		years = dv.data.years.selected,
		startYear = years[0],
		endYear = years[years.length - 1];
	dv.svg.label.left.g.transition().attr('transform', 'translate(' + margin - pad + ',0)');
	dv.svg.label.left.text.transition()
		.attr('dy', function(d) {
			var offset = dv.dim.chart.h;
			var h = dv.scale.ypow(d.data[startYear]) / 3;
			h = h < dv.opt.chart.line.minheight ? 1 : h;
			offset -= dv.scale.y(d.offset[startYear]);
			offset -= d.order[startYear] * pad;
			offset -= h;
			return offset;
		})
	;
	dv.svg.label.right.g.transition().attr('transform', 'translate(' + dv.dim.chart.w + pad + ',0)');
	dv.svg.label.right.text.transition()
		.attr('dy', function(d) {
			var offset = dv.dim.chart.h;
			var h = dv.scale.ypow(d.data[endYear]) / 3;
			h = h < dv.opt.chart.line.minheight ? 1 : h;
			offset -= dv.scale.y(d.offset[endYear]);
			offset -= d.order[endYear] * pad;
			offset -= h;
			return offset;
		})
	;
*/
};

/* CALC: Calculate something and return a value */

// take a start year and an end year and return both of those all all years in between
dv.calc.years = function(start, end) {
	var years = [];
	for (var i = start; i < end + 1; i++) {
		years.push(i);
	}
	return years;
};

/* Utility function */

// expects { array: , year: , col: (optional) }
dv.util.sortByData = function(o) {
	o.array.sort(function(a, b) {
		if (o.col) {
			return a.data[o.col][o.year] - b.data[o.col][o.year];
		} else {
			return a.data[o.year] - b.data[o.year];
		}
	});
	return o.array;
};

/* Reusable functions */

// used to allow asynchronous loading of multiple data files, executes dv.setup.withData() when it's done
dv.update.load = function(change) {
	dv.state.load = dv.state.load || 0;
	dv.state.load += change;
	if (dv.state.load === 0) { dv.setup.withData(); }
};

// creates a hover that can be called by dv.util.hover(event, html), if no event or html is provided, hover is hidden
dv.hover = dv.hover || {};
dv.hover.show = function(event, html) {
	if (!dv.html.hover) { dv.hover.create(); }
	var x, y, hover, height, width,
		win = dv.dim.win,
		margin = 20,
		offset = 10;

	if (event && html) {
		x = event.pageX + offset;
		y = event.pageY - offset;
		hover = document.getElementById('hover');
		dv.html.hover.html(html);
		height = hover.offsetHeight;
		width = hover.offsetWidth;
		if (x + width + margin >= win.w) { x = x - offset - width - margin; }
		if (y + height + margin >= win.h) { y = win.h - margin - height; }
		dv.html.hover.style('top', y + 'px').style('left', x + 'px').style('visibility','visible');
	}
};
dv.hover.create = function() {
	dv.html.hover = d3.select('body').append('div').attr('id', 'hover');
};
dv.hover.hide = function() {
	if (dv.html.hover) { dv.html.hover.style('visibility','hidden'); }
};



dv.setup.withoutData();