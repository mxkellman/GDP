/*

Bugs

Small Enhancements


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
		w: window.innerWidth || document.documentElement.clientWidth || document.getElementsByTagName('body')[0].clientWidth,
		h: window.innerHeight || document.documentElement.clientHeight || document.getElementsByTagName('body')[0].clientHeight
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
	colors: ["#00922B","#75B3D6","#444444","#700000","#0078AE"],
	data: {
		years: {
			first: 2001,
			last: 2011,
			continuous: true,
		},
		countries: {
			count: 20,
			sortCol: 'Debt',
			default: ['South Africa']
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
		top: 50,
		right: 50,
		bottom: 50,
		left: 50,
		label: {
			left: 50,
			right: 50,
		},
	},
	chart: {
		h: 1.0,
		w: 1.0,
		line: {
			minHeight: 5,
			pad: 10,
			straight: 0,
		},
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
		i, year;
	if (optYears.continuous) { dv.data.years.selected = dv.calc.years(optYears.first, optYears.last); }
	dv.data.years.all = dv.calc.years(dataYears.first, dataYears.last);
	for (i = dataYears.selected.length - 1; i >= 0; i--) {
		year = dataYears.selected[i];
		dv.data.sum[year] = 0;
		dv.data.max[year] = 0;
		dv.data.min[year] = 0;
	}

	dv.dim.w -= dv.opt.margin.left + dv.opt.margin.right;
	dv.dim.h -= dv.opt.margin.top + dv.opt.margin.bottom;
	dv.dim.min = dv.dim.w < dv.dim.h ? dv.dim.w : dv.dim.h;
	dv.svg.main = d3.select('body').append('svg')
		.attr('width', dv.dim.w)
		.attr('height', dv.dim.h)
		.append('svg:g')
			.attr('transform', 'translate(' + dv.opt.margin.left + ',' + dv.opt.margin.top + ')')
	;

	dv.dim.chart = {
		h: dv.dim.h * dv.opt.chart.h - dv.opt.margin.top,
		w: dv.dim.w * dv.opt.chart.w - dv.opt.margin.left,
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
	dv.draw.flowChart();
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
		pad = dv.opt.chart.line.pad,
		minHeight = dv.opt.chart.line.minHeight,
		width = dv.dim.chart.w,
		label = dv.opt.margin.label,
		max = 0,
		min = 0,
		years = dv.data.years.selected,
		countries = dv.data.countries.selected.length,
		subset = dv.data.subset,
		i, year, length, i2, offset, country;

	dv.scale.x = d3.scale.ordinal()
		.domain(years)
		.rangeRoundBands([label.left, width - label.left - label.right]);

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
	height -= (countries / 5) * minHeight;

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
	dv.svg.chart = dv.svg.main.append('svg:g')
		.style('class', 'chart')
		.attr('height', dv.dim.chart.h)
		.attr('width', dv.dim.chart.w)
		.attr('transform', 'translate (' + dv.opt.margin.label.left + ',0)')
	;

	dv.svg.chart.selectAll('path')
		.data(dv.data.subset)
		.enter().append('svg:path')
			.attr('d', function(d) { return dv.draw.flowLine(d); })
			.style('opacity', 0.5)
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
		straight = straight > 0 ? dv.scale.x.rangeBand() * dv.opt.chart.line.straight : false,
		path = "M",
		year = years[0],
		prevYear, x, y, i;
	function pair(x, y, type) {
		type = type ? ' ' + type : '';
		return type + x + ',' + y;
	}

	x = dv.scale.x(year);
	y = height - dv.scale.y(offset[year]) - dv.scale.ypow(data[year]);
	path += pair(x,y);
	
	for (i = 0; i < length; i++) {
		year = years[i];
		x = dv.scale.x(year);
		y = height - dv.scale.y(offset[year]) - (order[year] * pad);
		path += pair(x, y, 'L');
		if (i < length -1 && straight) {
			x += straight;
			path += pair(x, y, 'L');
			year = years[i+1];
			x = dv.scale.x(year) - straight;
			y = height - dv.scale.y(offset[year]) - (order[year] * pad);
			path += pair(x, y, 'L');
		}
	}

	y = height - dv.scale.y(offset[year]);
	path += pair(x, y, 'L');

	for (i = length - 1; i >= 0; i--) {
		year = years[i];
		x = dv.scale.x(year);
		y = height - dv.scale.y(offset[year]) - (order[year] * pad) - dv.scale.ypow(data[year]);
		path += pair(x, y, 'L');
		if (i > 0 && straight) {
			prevYear = years[i-1];
			x -= straight;
			y = height - dv.scale.y(offset[year]) - (order[year] * pad) - dv.scale.ypow(data[prevYear]);
			path += pair(x, y, 'L');
			year = prevYear;
			x = dv.scale.x(year) + straight;
			y = height - dv.scale.y(offset[year]) - (order[year] * pad) - dv.scale.ypow(data[year]);
			path += pair(x, y, 'L');
		}
	}
	path += ' Z';
	return path;

/*
	function curve(i) {
		var string = " C" + (points[i-1][0] + (points[i][0] - points[i-1][0]) * param.tangent) + "," + points[i-1][1];
		string += " " + (points[i][0] - (points[i][0] - points[i-1][0]) * param.tangent) + "," + points[i][1];
		string += " " + points[i][0] + "," + points[i][1];
		return string;  
	}

	return path;
*/
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