//http://datamaps.github.io/
//https://github.com/markmarkoh/datamaps/blob/master/README.md#getting-started

// Setup all our data

var rawEvents = null;
var alpha2toLatLong = null;
var codeMap = null;

var allEvents = null;
var idLookup = null;
var timelineStart = 1789;
var timelineEnd = 1914;
var _timeline = null;
var _map = null;
var _svg = null;
var _empireData =null;

var selections = {};

var altFile = location.search != null && location.search != "";
var eventFile = altFile ? "eventDataNap.csv" : "eventData.csv";

if (!String.prototype.format) {
  String.prototype.format = function() {
    var args = arguments;
    return this.replace(/{(\d+)}/g, function(match, number) { 
      return typeof args[number] != 'undefined'
        ? args[number]
        : match
      ;
    });
  };
}

var results = Papa.parse(eventFile, {
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
		var result = validateData(rawEvents);
		if (result.isValid) {
			populateTimeline(rawEvents);
		} else {
			displayErrors(result);			
		}
	}
}

function validateData(rawEvents)
{
	var result = {
		messages: [],
		isValid: false
	};

	function addError(error)
	{
		if (error) {
			result.messages.push(error);
		}
	}

	if (rawEvents.length == 0) {
		result.messages.push('You need at least one event!');
		return result;
	}

	// Needed Columns 

	var csvColumns = [];
	var firstRecord = rawEvents[0]
	for (var propName in firstRecord) {
		if (firstRecord.hasOwnProperty(propName)) {
			csvColumns.push(propName);
		}
	}

	var neededColumns = ['StartDate', 'EndDate', 'Title', 'RelatedEvents', 'Description', 'Footnotes', 'Image', 'ForMoreSee', 'Ref', 'Location', 'Influences', 'Empire', 'Tags'];
	
	for (var i=0; i<neededColumns.length; i++){
		var foundIt = false;
		var neededColumnName = neededColumns[i];
		for(var j=0; j<csvColumns.length; j++){
			if (neededColumnName == csvColumns[j]){
				foundIt = true;
				break;
			}
		}
		if (!foundIt){
			result.messages.push('You are missing the column {0}'.format(neededColumnName));
		}
	}

	if (result.messages.length > 0) {
		return result;
	}

	// Dates

	for (var i = 1; i < rawEvents.length; i++) {
		var record = rawEvents[i];
		var lineNumber = i + 2;
		addError(validateDate(record.StartDate, "Line {0}: Start Date: ".format(lineNumber)));
		addError(validateDate(record.EndDate, "Line {0}: End Date: ".format(lineNumber), true));
	}

	// Codes


	if (result.messages.length > 0) {
		return result;
	}

	return {
		isValid: true
	}
}

function validateDate(date, context, isOptional)
{
	if (date == null || date == "")
	{
		if (isOptional != true) {
			return context + "Date is missing"; 
		} else {
			return null;
		}
	}

	var dateParts = date.split("/");
	
	function checkIt(index, length)
	{
		var part = dateParts[index];
		var isNum = /^\d+$/.test(part);
		return (length === part.length && isNum);
	}

	var dateValMessage = "Date must be in the format YYYY/MM/DD but was {0}".format(date);

	if (dateParts.length > 3)
	{
		return context + "Date has too many parts, it was {0}".format(date);
	}

	function formatOnlyYear(parts)
	{
		if (dateParts.length != 1) return false;
		return checkIt(0, 4);
	}

	function formatYearAndMonth(parts)
	{
		if (dateParts.length != 2) return false;
		return checkIt(0, 4)
			&& (checkIt(1, 1) || checkIt(1, 2));
	}

	function formatYearMonthDay(parts)
	{
		if (dateParts.length != 3) return false;
		return checkIt(0, 4)
			&& (checkIt(1, 1) || checkIt(1, 2))
			&& (checkIt(2, 1) || checkIt(2, 2));
	}

	function formatDayMonthYear(parts)
	{
		if (dateParts.length != 3) return false;
		return checkIt(2, 4)
			&& (checkIt(1, 1) || checkIt(1, 2))
			&& (checkIt(0, 1) || checkIt(0, 2));
	}

	if (
		formatOnlyYear(dateParts)
		|| formatYearAndMonth(dateParts)
		|| formatYearMonthDay(dateParts)
		|| formatDayMonthYear(dateParts))
	{
		return null;
	}

	return context + dateValMessage;
}

function displayErrors(result)
{
	var body = $("body")
		.empty();

	for (var i = 0; i < result.messages.length; i++){
		body.append($("<div class='error'/>").text(result.messages[i]));
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
	
	if (dateString == null 
	|| dateString == "" 
	|| dateString.trim() == "") {
		return null;
	}

	var dateParts = dateString.trim().split("/");
	var dateDto = {};
	
	if (dateParts.length >= 3 && dateParts[2].length == 4) {
		dateParts = dateParts.reverse();
	}

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
	idLookup = {};
	allEvents = data.filter(function (row){
		return row.StartDate.indexOf("//") == -1;
	});
	
	var rowId = 0;
	var britishIndex = 0;
	var timelineEvents = allEvents.map(function (row) {
		
		//mark
		row.id = rowId++;
		idLookup[row.Title.toLowerCase()] = row.id;

		var timelineEvent = {
			"text": {
				"headline": row.Title + "",
				"text": "Not Included"
			},
			"unique_id": row.id.toString()
		}

		/*var group = null;

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

		timelineEvent.group = group;*/

		var value = parseDate(row.StartDate, true);
		row.StartDate = value;
		row.startDate = value;

		if (!value) {
			$("#errors")
				.append($("<div/>")
				.text("The row " + row.id + " has no start date"));		
		}
		timelineEvent["start_date"] = value;
		
		var endDate = parseDate(row.EndDate);
		row.EndDate = endDate;
		if (endDate) {
			timelineEvent["end_date"] = endDate;
		}
	
		return timelineEvent;
	});

	updateTimeline(timelineEvents);
}

function updateTimeline(timelineEvents) {

	var timeline_json = {

		"events": timelineEvents
	};

	var additionalOptions = {
		initial_zoom: 6,
		dragging: true,
		start_at_slide: 2
	};

	var timeline = new TL.Timeline('timeline-embed', timeline_json, additionalOptions);

	timeline.on("change", function(data) {
		//mark
		console.log(data.unique_id);

		var id = parseInt(data.unique_id);

		if (!id && id !== 0) {
			console.log("There is no event with this id: " + data.unique_id); 
			return;
		}

		var eventData = allEvents[id];
		
		resetEventCountryColour();
		setEmpireColours(parseInt(eventData.startDate.year));
		displayEventOnMap(eventData);
	});

	_timeline = timeline;
	setEmpireColours();


	$("#info").css("bottom", $("#timeline").height());
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

			var colour = empireAndColour.split(" ").filter(function (x) {
				return x != "";
			})[1];

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

	var infoTitleDates = $("#infotitles")
		.empty()
		.append($('<h4 class="inline"></h4>').text(eventData.Title))
		.append(" ");
		
		if (eventData.ForMoreSee != "" && eventData.ForMoreSee != null) {
		infoTitleDates
				.append($('<a class="nap" href="/?nap"></a>')
					.attr("title", eventData.ForMoreSee)
					.append('<i class="fa fa-map-o"</i>'));				
	}

	function formatDate(dateObject)
	{
		if (dateObject.day) {
			return dateObject.day + "/" + dateObject.month + "/" + dateObject.year;

		} else if (dateObject.month) {
			return dateObject.month + "/" + dateObject.year;
		} 

		return dateObject.year;
	}


	infoTitleDates
		.append("<br/>")
		.append($("<b></b> ").text(formatDate(eventData.StartDate)));

	if (eventData.EndDate != null && eventData.EndDate != "") {
		infoTitleDates
			.append(" - ")
			.append($("<b></b>").text(formatDate(eventData.EndDate)));
	}
		
	var relatedEvents = eventData.RelatedEvents;
	var relatedLinks = relatedEvents.split(";")
		.map(function(x) { return x.trim() })
		.filter(function(x) {
			return x != "" && x != null;
		})
		.map(function(x) {
			return $("<li/>")
				.append($('<a class="link"/>')
					.text(x)
					.on('click', function() {
						var id = idLookup[x.toLowerCase()];
						console.log("Looked up id: " + id);
						_timeline.goToId(id.toString());
					}));

			//mark
		});

	var eventElement = $("<ul></ul>");
	for (var i = 0; i < relatedLinks.length; i++) {
		eventElement.append(relatedLinks[i]);
	}

 	$("#info .content")
		.empty()
		.append($("<h5></h5>").text(eventData.Tags))
		.append($("<p></p>").text(eventData.Description))
		.append(eventElement);
	
	$("#footnotes")
		.empty()
		.append($("<p class='divider'</p>").text(eventData.Footnotes));

	

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
			fillKey: 'bubble'
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
			
			//Remember
			applyColors[countryCode] = '#4C668C';
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

			$("#play-button i").toggleClass ("hidden");


			if (timerId) {
				clearTimeout(timerId);
			} else {
				//_timeline.goToStart();
				playSlideShow();
			}
	});


	$("#tag-button").click(function () {

			$("#tag-button i").toggleClass ("hidden");
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

	function updatePan(zoom, panX, panY, scale) {

		if (!scale) {
			scale = 1;
		}

		var portWidth = container.width()
		var portHeight = container.height();

		var widthDiff = mapWidth * scale - portWidth;
		var translationOffsetX = widthDiff / 2;

		var heightDiff = mapHeight * scale - portHeight;
		var translationOffsetY = heightDiff / 2;

		_svg.selectAll("g")
			.attr("transform", [
				"translate(" + [panX, panY] + ")",
					"scale(" + scale + ")"
				].join(" "));
	}

	var map = new Datamap({
		element: document.getElementById('container'),
		//projection: 'equirectangular',
		setProjection: function(element, options) {

            var projection, path;
            projection = d3.geo.equirectangular()
				.scale(250)
				.center([0, 10])
				.rotate([-4.4, 0])
                .translate([element.offsetWidth / 2, element.offsetHeight / 2]);

            path = d3.geo.path()
                .projection( projection );

            return {path: path, projection: projection};
        },

		//responsive: true,
		width: mapWidth,
		height: mapHeight,
		fills: {
			defaultFill: "#C0C0C0",
			bubble: "#2C4870"
			//colour
		},
		//colour
		geographyConfig: {
			hideAntarctica: false,
			highlightOnHover: true,
       		highlightFillColor: '#A36956',
        	highlightBorderColor: '#FFF'	
		},

		bubblesConfig: {
       		borderWidth: 2,
        	borderOpacity: 1,
        	borderColor: '#142E54',
        	popupOnHover: true, // True to show the popup while hovering
        	radius: null,
        	fillOpacity: 0.75,
       		animate: true,
        	highlightOnHover: true,
        	highlightFillColor: '#472E74',
        	highlightBorderColor: '#2D1657',
        	highlightBorderWidth: 2,
        	highlightBorderOpacity: 1,
        	highlightFillOpacity: 0.85,
		},

		arcConfig: {
			strokeColor: '#142E54',
			strokeWidth: 2,
			arcSharpness: 1.2,
			animationSpeed: 600, // Milliseconds
			popupOnHover: false, // True to show the popup while hovering
  },

		done: function(datamap) {

			_svg = datamap.svg;

			updatePan(0, 0, 1);

			var margin = 1000;

			var zoom = d3.behavior.zoom()
			// only scale up, e.g. between 1x and 2x
			.scaleExtent([1, 6])
			//.translateExtent([[-margin, -margin], [mapWidth + margin, mapHeight + margin]])
			.on("zoom", function() {
				
				var e = d3.event;
				var s = e.scale;
				var x = e.translate[0];
				var y = e.translate[1];

				updatePan(zoom, x, y, s);
				
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
