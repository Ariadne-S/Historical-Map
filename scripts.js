//http://datamaps.github.io/
//https://github.com/markmarkoh/datamaps/blob/master/README.md#getting-started

// Setup all our data

var rawEvents = null;
var alpha2toLatLong = null;
var codeMap = null;

var allEvents = null;
var timelineStart = 1789;
var timelineEnd = 1914;
var _timeline = null;
var _map = null;
var _svg = null;
var _empireData =null;

var selections = {};

var results = Papa.parse("eventData.csv", {
	download: true,
	header: true,
	skipEmptyLines: true,

	complete: function(results) {
		rawEvents = results.data;
		TryLoad();
	}
});

Papa.parse("code-map.csv", {
				download: true,
				header: true,
				skipEmptyLines: true,

				complete: function(mappingData) {
					mappingData = mappingData.data;
					
					codeMap = {};
					for (var i = 0; i < mappingData.length; i++) {
						codeMap[mappingData[i].alpha3] = mappingData[i].alpha2;
					}
					TryLoad();
				}
			});

$.getJSON("countrycode-latlong-array.json", function(data) {
			alpha2toLatLong = data;
			TryLoad();
		});

Papa.parse("Empires.csv", {
	download: true,
	header: true,
	skipEmptyLines: true,

	complete: function(empireData) {
		_empireData = empireData.data;
		TryLoad();
	}
});

function TryLoad()
{
	if (alpha2toLatLong && codeMap && rawEvents && _empireData) {
		populateTimeline(rawEvents);
	}
}
		
		
function GetLocForCode(alpha3)
{
	var alpha2 = codeMap[alpha3];
	var location = alpha2toLatLong[alpha2.toLowerCase()];
	return {
		latitude: parseFloat(location[0]),
		longitude: parseFloat(location[1])
	};
}

function parseDate(dateString, needed) {
	
	if (dateString == null || dateString == "") {
		if (needed) {
			console.log("NoDate");
		}
		return null
	}
	
	var dateParts = dateString.split("/");
	
	if (dateParts.length == 0) {
		console.log("BadNoDate");
		return null;
	}
	
	var dateDto = {};
	
	if (dateParts.length >= 1) {
		dateDto.year = dateParts[0];
	}
	
	if (dateParts.length >= 2) {
		dateDto.month = dateParts[1];
	}
	
	if (dateParts.length >= 3) {
		dateDto.day = dateParts[2];
	}

	return dateDto;
}


function isOdd(num) { return (num % 2) == 1;}

function populateTimeline(data) {
	
	for (var i = 0; i < data.length; i++) {
		data[i].id = i;
	}
	
	allEvents = data;
	
	var britishIndex = 0;
	var timelineEvents = data.filter(function (row){
		return row.StartDate.indexOf("//") == -1;

	}).map(function (row) {
		
		var timelineEvent = {
			"text": {
				"headline": row.Title + "",
				"text": "Not Included"
			},
			"unique_id": row.id.toString()
		}

		var group = null;

		if (row.Empire != null && row.Empire != "") {
			var empires = row.Empire.split (";");
			group = empires[0]; 
		}
		
		if (group === "British") {

			group = group + (isOdd(britishIndex) ? ". " : "  ");

			britishIndex += 1;


		} else if (!(group === "British" 
			|| group === "French" 
			|| group ===  "American")) {
			group = "Other";
		}

		timelineEvent.group = group;

		var value = parseDate(row.StartDate, true);
		row.startDate = value;

		if (!value) {
			$("#errors")
				.append($("<div/>")
				.text("The row " + row.id + " has no start date"));		
		}

		timelineEvent["start_date"] = value;
		
		var endDate = parseDate(row.EndDate);
		if (endDate) {
			timelineEvent["end_date"] = endDate;
		}
	
		return timelineEvent;
	});
	
	//console.log(timelineEvents);
	updateTimeline(timelineEvents);
}

function updateTimeline(timelineEvents) {

	var timeline_json = {

		"events": timelineEvents
	};

	//console.log(JSON.stringify(timeline_json, null, ' '));

	var additionalOptions = {
		initial_zoom: 6,
		dragging: true,
		start_at_slide: 2
		//timenav_height: 250
	};

	var timeline = new TL.Timeline('timeline-embed', timeline_json, additionalOptions);

	timeline.on("change", function(data) {

		var id = parseInt(data.unique_id);
		var eventData = allEvents[id];
		
		resetEventCountryColour();
		setEmpireColours(parseInt(eventData.startDate.year));
		displayEventOnMap(eventData);
	});

	_timeline = timeline;
	setEmpireColours();
}

var _currentEmpireColours = null;

function setEmpireColours(year) {

	var potentialPeriod = null;
	var length = _empireData.length;
	for (var i = 0; i < length; i++) {
		potentialPeriod = _empireData[i];
		if (year == undefined || year <= potentialPeriod.Year) {
			break;
		}
	}
	var empirePeriod = potentialPeriod;
	

	// Reset colours back to silver
	if (_currentEmpireColours != null) {

		for (var countryColour in _currentEmpireColours) {
			if (_currentEmpireColours.hasOwnProperty(countryColour)) {
				_currentEmpireColours[countryColour] = "silver";
			}
		}
		_map.updateChoropleth(_currentEmpireColours);
	}

	// Update colors to what the empires for the period are
	var colourUpdatesForThisPeriod = {};

	for (var empireAndColour in empirePeriod) {
		if (empirePeriod.hasOwnProperty(empireAndColour)) {

			if (empireAndColour == "Year" || empireAndColour == "")
			{
				continue;
			}

			var colour = empireAndColour.split(" ")[1];

			var codesListString = empirePeriod[empireAndColour];
			var codes = codesListString.split(";").map(function(x) {
				return x.trim();
			});

			codes.forEach(function(code) {
				
				colourUpdatesForThisPeriod[code] = colour
			});
		}
	}

	_map.updateChoropleth(colourUpdatesForThisPeriod);
	_currentEmpireColours = colourUpdatesForThisPeriod;
}

function ensureLatLong(location) {
	var loc = null;
	
	location = location.trim();
	
	if (location.length == 3) {
		loc = GetLocForCode(location);
	} else {
		var locParts = location.split(",");
		loc = {
			latitude: parseFloat(locParts[0]),
			longitude: parseFloat(locParts[1])
		};
	}
	return loc;
}

function resetEventCountryColour()
{
	var prevColors = selections.choropleth;
	for (var name in prevColors) {
		if (prevColors.hasOwnProperty(name)) {
			prevColors[name] = 'silver';
		}
	}
	_map.updateChoropleth(prevColors);
}

function displayEventOnMap(eventData)
{
	if (!eventData) return;

	$("#infotitles")
		.empty()
		.append($("<h4></h4>").text(eventData.Title));

	$("#info .content")
		.empty()
		.append($("<h5></h5>").text(eventData.Tags))
		.append($("<p></p>").text(eventData.Description))
		.append($("<p></p>").text(eventData.ForMoreSee))
		.append($("<h4></h4>").text(eventData.RelatedEvents));
	
	$("#footnotes")
		.empty()
		.append($("<p></p>").text(eventData.Footnotes));

	var location = eventData.Location;
	
	var parts = location.split(";");
	
	for (var i = 0; i < parts.length; i++) {
		parts[i] = parts[i].trim();
	}

	selections.bubbles = [];
	selections.arcs = [];
	selections.choropleth = {};

	var type = null;
	if (parts.length == 1) {
		type = "bubble";
		
		var first = parts[0];
		var loc = ensureLatLong(first);
		
		var radius = 10;
		if (eventData.radius) {
			radius = parseInt(eventData.radius);
		}

		selections.bubbles = [{
			name: eventData.Title,
			latitude: loc.latitude,
			longitude: loc.longitude,
			radius: radius,
			fillKey: 'blue'
		}];

	} else if (parts.length == 2) {
		type = "arc";
		
		var origin = parts[0];
		var origin = ensureLatLong(origin);
		
		var destination = parts[1];
		var destination = ensureLatLong(destination);
		
		selections.arcs = [{
			origin: origin,
			destination: destination
		}];

	} else if (parts.length > 2) {
		type = "fill";
		
		var applyColors = {};
		for (var i = 0; i < parts.length; i++) {
			var countryCode = parts[i];
			
			applyColors[countryCode] = '#5392c1';
		}

		selections.choropleth = applyColors;
	}
	
	_map.bubbles(selections.bubbles);
	_map.arc(selections.arcs);
	_map.updateChoropleth(selections.choropleth);

	var transform = _svg.selectAll("g.datamaps-subunits").attr("transform");
	_svg.selectAll("g").attr("transform", transform);
}

var timerId = null;

function playSlideShow() {

	_timeline.goToNext();

	timerId = setTimeout(playSlideShow, 1000);
}

$(function() {

	$("#play-button").click(function () {

		if (timerId) {
			clearTimeout(timerId);
		} else {
			//_timeline.goToStart();
			playSlideShow();
		}
	});

	$("#info").resizable({
		handles: "w",
		minWidth: 80
	});
		
	// Draw stuff on the Screen

	var container = $("#container");

	var colors = d3.scale.category10();

	var mapWidth = 2000;
	var mapHeight = 2000 * (2/3);

	var gElem = null;

	function updatePan(panX, panY, scale, remember) {

		scale = scale * .83;

		var portWidth = container.width()
		var portHeight = container.height();

		var widthDiff = mapWidth * scale - portWidth;
		var translationOffsetX = widthDiff / 2;

		var heightDiff = mapHeight * scale - portHeight;
		var translationOffsetY = heightDiff / 2;

		// TODO: Bounds Checking!

		//var boundX = Math.max(0, Math.min(panX, mapWidth - portWidth));
		//console.log(boundX + ", " + panX + ", " + (mapWidth - portWidth));

		if (remember) {
			remember(panX, panY);
		}

		var tx = panX - translationOffsetX;
		var ty = panY - translationOffsetY;

		_svg.selectAll("g")
			.attr("transform", [
				"translate(" + [tx, ty] + ")",
					"scale(" + scale + ")"
				].join(" "));
	}

	var map = new Datamap({
		element: document.getElementById('container'),
		//responsive: true,x
		width: mapWidth,
		height: mapHeight,
		fills: {
			defaultFill: "#C0C0C0"
		},

		geographyConfig: {
			hideAntarctica: false
		},

		done: function(datamap) {

			_svg = datamap.svg;

			updatePan(0, 0, 1);

			var zoom = d3.behavior.zoom()
			// only scale up, e.g. between 1x and 2x
			.scaleExtent([1, 2])
			.on("zoom", function() {

				var e = d3.event;
				var panX = e.translate[0];
				var panY = e.translate[1];

				updatePan(panX, panY, e.scale, function(x, y) {
					zoom.translate([x, y]);
				});
				
			});

		datamap.svg.call(zoom);
		}
	});

	_map = map;

	d3.select(window).on('resize', function() {
		//map.resize();

		updatePan(0, 0, 1);
	});

});
