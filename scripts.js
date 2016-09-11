//http://datamaps.github.io/
//https://github.com/markmarkoh/datamaps/blob/master/README.md#getting-started

// Setup all our data

var rawEvents = null;
var alpha2toLatLong = null;
var codeMap = null;

var allEvents = null;
var timelineStart = 1789;
var timelineEnd = 1914;

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

function TryLoad()
{
	if (alpha2toLatLong && codeMap && rawEvents) {
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

function parseDate(dateString) {
	
	if (dateString == null || dateString == "") {
		return null
	}
	
	var dateParts = dateString.split("/");
	
	if (dateParts.length == 0) {
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

function populateTimeline(data) {
	
	for (var i = 0; i < data.length; i++) {
		data[i].id = i;
	}
	
	allEvents = data;
	
	var timelineEvents = data.map(function (row) {
		
		var timelineEvent = {
			"media": {
				"url": row.Image,
				 "caption": "Ahahahahh",
				"credit": "Credit"
			},
			"text": {
				"headline": row.Title,
				"text": "gfhjfghdfg"
			},
			"unique_id": row.id.toString()
		}
		
		timelineEvent["start_date"] = parseDate(row.StartDate);
		
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
		"title": {
			"text": {
			  "headline": "Whitney Houston<br/> 1963 - 2012",
			  "text": "<p>Houston's voice caught the imagination of the world propelling her to superstardom at an early age becoming one of the most awarded performers of our time. This is a look into the amazing heights she achieved and her personal struggles with substance abuse and a tumultuous marriage.</p>"
			}
		},
		"events": timelineEvents
	};

	//console.log(JSON.stringify(timeline_json, null, ' '));

	var additionalOptions = {
		start_at_slide:     10,  //OPTIONAL START AT SPECIFIC SLIDE
		//start_zoom_adjust:  4    //OPTIONAL TWEAK THE DEFAULT ZOOM LEVEL

		//start_at_end: true,
		//default_bg_color: {r:0, g:0, b:0},
		//timenav_height: 250
	  }
	
	var timeline = new TL.Timeline('timeline-embed', timeline_json, additionalOptions);
	
	timeline.on("change", function(data) {

		var id = parseInt(data.unique_id);
		var eventData = allEvents[id];
		
		displayEventOnMap(eventData);
	});

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

function displayEventOnMap(eventData)
{
	if (!eventData) return;
	
	var location = eventData.Location;
	
	var parts = location.split(";");
	
	for (var i = 0; i < parts.length; i++) {
		parts[i] = parts[i].trim();
	}

	var prevColors = selections.choropleth;
	for (var name in prevColors) {
		if (prevColors.hasOwnProperty(name)) {
			prevColors[name] = '#ABDDA4';
		}
	}
	map.updateChoropleth(prevColors);

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
			name: eventData.title,
			latitude: loc.latitude,
			longitude: loc.longitude,
			radius: radius,
			fillKey: 'daniel'
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
	
	map.bubbles(selections.bubbles);
	map.arc(selections.arcs);
	map.updateChoropleth(selections.choropleth);
}

// Draw stuff on the Screen

var colors = d3.scale.category10();

var map = new Datamap({
	element: document.getElementById('container'),
	responsive: true,
	fills: {
		defaultFill: "#ABDDA4",
		daniel: "#5392c1"
	}
});

d3.select(window).on('resize', function() {
	map.resize();
});
