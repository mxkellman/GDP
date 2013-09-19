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
// all static variables and object placeholders
var dv = {
	calc: {},
	clear: {},
	create: {},
	data: {
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
	},
	dim: {
		win: {
			w: window.innerWidth || document.documentElement.clientWidth || document.getElementsByTagName('body')[0].clientWidth,
			h: window.innerHeight || document.documentElement.clientHeight || document.getElementsByTagName('body')[0].clientHeight
		}
	},
	draw: {},
	format: {},
	get: {},
	setup: {},
	scale: {},
	state: { loading: 0	},
	svg: {},
	update: {
		loading: function(change) {
			dv.state.loading += change;
			if (dv.state.loading === 0) { dv.setup.withData(); }
		}
	},
	util: {},
};

// dv.opt stores all options that can be changed "on the fly"
dv.opt = {
	colors: ['#00922B','#75B3D6','#444444','#700000','#0078AE','#e08214','#8073ac','#f768a1'],
	data: {
		years: {
			first: 2001,
			last: 2018,
			continuous: true,
		},
		countries: {
			count: 20,
			sortCol: 'Debt',
			default: ['South Africa'],
			percentMin: 1,
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
		left: 25,
		right: 100,
		top: 50,
		bottom: 75,
		label: {
			left: 25,
			right: 100,
			top: 50,
			bottom: 50,
		},
	},
	chart: {
		line: {
			minHeight: 3,
			pad: 10,
			tangent: 0.4,
		},
		opacity: {
			norm: 0.8,
			high: 1,
			low: 0.5
		}
	},
	path: {
		data: 'data/WEO-All.csv',
		region: 'data/regions.csv'
	},
};

// calculates and adjusts variables and options
dv.setup.variables = function() {

	// sets up max, min, and sum for use in scales
	var optYears = dv.opt.data.years,
		dataYears = dv.data.years,
		margin = dv.opt.margin,
		i, year;
	if (optYears.continuous) { dv.data.years.selected = dv.calc.years(optYears.first, optYears.last); }
	dv.data.years.all = dv.calc.years(dataYears.first, dataYears.last);
	for (i = dataYears.selected.length - 1; i >= 0; i--) {
		year = dataYears.selected[i];
		dv.data.sum[year] = 0;
		dv.data.max[year] = 0;
		dv.data.min[year] = 0;
	}

	// adjusts visualization width to accomodate margins
	dv.dim.win.min = dv.dim.win.w < dv.dim.win.h ? dv.dim.win.w : dv.dim.win.h;
	dv.dim.svg = {
		h: dv.dim.win.h - margin.top,
		w: dv.dim.win.w - margin.left,
	};

/*	dv.svg.main = d3.select('body').append('svg')
		.attr('width', dv.dim.svg.w)
		.attr('height', dv.dim.svg.h)
		.append('svg:g')
			.attr('transform', 'translate(' + margin.left + ',' + margin.top + ')')
	;
*/	dv.dim.chart = {
		h: dv.dim.svg.h - margin.bottom - margin.label.top,
		w: dv.dim.svg.w - margin.right - margin.label.right,
	};

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
	//dv.draw.flowChart();
	dv.draw.boxes();
};

dv.draw.boxes = function() {
	var margin = dv.opt.margin;

	dv.dim.svg = {
		h: dv.dim.win.h - margin.top - margin.bottom,
		w: dv.dim.win.w - margin.left - margin.right,
	};

	dv.dim.chart = {
		h: dv.dim.svg.h - margin.label.bottom,
		w: dv.dim.svg.w - margin.label.right,
	};

	var svg = d3.select('body').append('svg')
		.attr('width', dv.dim.win.w)
		.attr('height', dv.dim.win.h)
		.append('svg:g')
			.attr('transform', 'translate(' + margin.left + ',' + margin.top + ')')
	;

	svg.append('svg:rect')
		.attr('id', 'svg')
		.attr('height', dv.dim.svg.h)
		.attr('width', dv.dim.svg.w)
	;


	svg.append('svg:rect')
		.attr('id', 'left-label')
		.attr('height', dv.dim.chart.h - 1)
		.attr('width', margin.label.left -1)
	;

/*	dv.svg.main.append('svg:g')
		.attr('transform', 'translate(' + margin.label.left + ',' + margin.label.top + ')')
		.append('svg:rect')
			.attr('id', 'flowchart')
			.attr('height', dv.dim.chart.h - margin.label.top)
			.attr('width', dv.dim.chart.w - margin.label.left)
	;
*/
	console.log('MARGIN top: ' + margin.top + ', bot: ' + margin.bottom + ', left: ' + margin.left + ', right: ' + margin.right);
	console.log('LABEL MARGIN top: ' + margin.label.top + ', bot: ' + margin.label.bottom + ', left: ' + margin.label.left + ', right: ' + margin.label.right);
	console.log('WINDOW h: ' + dv.dim.win.h + ', w: ' + dv.dim.win.w);
	console.log('SVG h: ' + dv.dim.svg.h + ', w: ' + dv.dim.svg.w);


};

// retrieves the data from files and does a minimal amount of processing
// dv.state.loading tracks asynchronous data calls and allows  
dv.get.data = function() {
	dv.update.loading(2);
	
	d3.csv(dv.opt.path.data, function(error, data) {
		dv.data.full.obj = data;
		dv.update.loading(-1);
	});

	d3.csv(dv.opt.path.region, function(error, data) {
		dv.data.region = {};
		for (var i = data.length - 1; i >= 0; i--) {
			dv.data.region[data[i].Country] = data[i].Region;
		}
		dv.update.loading(-1);
	});
};

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
		
		// parse data into numbers, convert percentages, place values into temporary "clean" object
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
		pad = dv.opt.chart.line.pad,
		minHeight = dv.opt.chart.line.minHeight,
		percentMin = dv.opt.data.countries.percentMin,
		max = 0,
		min = 0,
		years = dv.data.years.selected,
		countries = dv.data.countries.selected.length,
		subset = dv.data.subset,
		i, year, length, i2, offset, country;

	dv.scale.x = d3.scale.ordinal()
		.domain(years)
		.rangeRoundBands([0, width]);

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

	height -= countries * pad;
	height -= countries * percentMin * minHeight;

	dv.scale.y = d3.scale.linear()
		.domain([min, max])
		.range([minHeight, height])
	;

	dv.scale.ypow = function(y) {
		y = dv.scale.pow(y);
		return dv.scale.y(y);
	};
};


dv.draw.flowChart = function() {
	var margin = dv.opt.margin,
		height = dv.dim.chart.h,
		width = dv.dim.chart.w,
		opacity = dv.opt.chart.opacity,
		subset = dv.data.subset,
		minHeight = dv.opt.chart.line.minHeight,
		pad = dv.opt.chart.line.pad,
		years = dv.data.years.selected,
		startYear = years[0],
		endYear = years[years.length - 1],
		main = dv.svg.main,
		labelWidth, eventHeight, translate, i, year, anchor, html;

	function addLabel(side) {
		labelWidth = margin.label[side];
		if(side === 'left') {
			translate = margin.label.left - 3;
			anchor = 'end';
			year = startYear;
		} else {
			translate = margin.label.left + width + 3;
			anchor = 'begin';
			year = endYear;
		}

		dv.svg.chart.append('g')
			.attr('transform', 'translate(' + translate + ',0)')
			.selectAll('text')
			.data(subset)
			.enter().append('svg:text')
				.style('width', labelWidth)
				.attr('text-anchor', anchor)
				.attr('dy', function(d) {
					var offset = height;
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

	function mouseon(event, path, index) {
		dv.svg.paths
			.style('fill-opacity', function(d, i) { if (i === index) { return opacity.high; } else { return opacity.low; } })
		;
		showHover(event, path, index);
	}

	function mouseoff(path) {
		dv.svg.paths
			.style('fill-opacity', opacity.norm)
		;
		hideHover(path);
	}

	function showHover(event, d) {
		html = '<h5>' + d.name + '</h5><ul>';
		eventHeight = event.pageY;
		for (i = years.length - 1; i >= 0; i--) {
			year = years[i];
			html += '<li><strong>' + year + ': </strong>';
			html += Math.round(d.data[year]*100) / 100 + '</li>';
		}
		html += '</ul>';

		if (eventHeight + 200 > dv.dim.win.h) { eventHeight = dv.dim.win.h - 200; } else { eventHeight -= 20; }
		dv.svg.hover
			.style('top', eventHeight + 'px')
			.style('left', (event.pageX + 20) + 'px')
			.html(html)
			.style('display', 'block')
		;
	}

	function hideHover() {
		dv.svg.hover
			.style('display', 'none')
		;
	}

	dv.svg.chart = main.append('svg:g');

	dv.svg.paths = dv.svg.chart.append('svg:g')
		.attr('transform', 'translate(' + margin.label.left + ',0)')
		.selectAll('path')
		.data(subset)
		.enter().append('svg:path')
			.attr('width', width)
			.attr('d', function(d) { return dv.draw.flowLine(d); })
			.style('fill', function(d) { return dv.scale.color(d.region); })
			.style('fill-opacity', opacity.norm)
			.on('mouseover', function(d, i) { mouseon(event, d, i); })
			.on('mouseout', mouseoff)
	;

	dv.svg.hover = d3.select('body').append('div')
		.attr('class', 'hover')
	;

	addLabel('left');
	addLabel('right');

	dv.svg.paths.selectAll('line')
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

};

dv.draw.flowLine = function(country) {
	var years = dv.data.years.selected,
		length = years.length,
		data = country.data,
		height = dv.dim.chart.h,
		offset = country.offset,
		order = country.order,
		pad = dv.opt.chart.line.pad,
		//tangent = dv.scale.x.rangeBand() * dv.opt.chart.line.tangent,
		path = "M",
		year = years[0],
		x, y, i;

	function pair(x, y, type) {
		type = type ? ' ' + type : '';
		return type + x + ',' + y;
	}

	/*
	function curve(x, y, year) {
		var x1, y1, x2, y2, string;
		x1 = x + tangent;
		y1 = y;
		x2 = dv.scale.x(year) - tangent;
		y2 = height - dv.scale.y(offset[year]) - (order[year] * pad);
		string = pair(x1 , y1, 'C');
		string += pair(x2, y2, ' ');
		string += pair(x, y, ' ');
		return string;
	}

	*/

	x = dv.scale.x(year);
	y = height - dv.scale.y(offset[year]) - dv.scale.ypow(data[year]);
	path += pair(x,y);
	
	for (i = 0; i < length; i++) {
		year = years[i];
		x = dv.scale.x(year);
		y = height - dv.scale.y(offset[year]) - (order[year] * pad);
	/*
		if (i < length - 1) {
			path += curve(x, y, years[i+1]);
		} else {
			path += pair(x, y, 'L');
		}
	*/
		path += pair(x, y, 'L');
	}

	y = height - dv.scale.y(offset[year]);
	path += pair(x, y, 'L');

	for (i = length - 1; i >= 0; i--) {
		year = years[i];
		x = dv.scale.x(year);
		y = height - dv.scale.y(offset[year]) - (order[year] * pad) - dv.scale.ypow(data[year]);
		path += pair(x, y, 'L');
	}
	path += ' Z';
	return path;

};


dv.calc.years = function(start, end) {
	var years = [];
	for (var i = start; i < end + 1; i++) {
		years.push(i);
	}
	return years;
};

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

dv.setup.withoutData();