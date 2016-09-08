//http://datamaps.github.io/
//https://github.com/markmarkoh/datamaps/blob/master/README.md#getting-started

// Setup all our data

var allEvent = null;
var timelineStart = 1789;
var timelineEnd = 1914;

var results = Papa.parse("eventData.csv", {
	download: true,
	header: true,
	skipEmptyLines: true,
	complete: function(results) {
		
		populateTimeline(results.data);
		
	}
});

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
	
	allEvent = data;
	
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
			}
		}
		
		timelineEvent["start_date"] = parseDate(row.StartDate);
		
		var endDate = parseDate(row.EndDate);
		if (endDate) {
			timelineEvent["end_date"] = endDate;
		}
	
		return timelineEvent;
	});
	
	console.log(timelineEvents);
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
		start_at_slide:     10,                            //OPTIONAL START AT SPECIFIC SLIDE
		start_zoom_adjust:  4                            //OPTIONAL TWEAK THE DEFAULT ZOOM LEVEL
		
		//start_at_end: true,
		//default_bg_color: {r:0, g:0, b:0},
		//timenav_height: 250
	  }
	
	var timeline = new TL.Timeline('timeline-embed', timeline_json, additionalOptions);
	
	timeline.on("change", function(data) {
		console.log(data);
	});

}


// Draw stuff on the Screen

var colors = d3.scale.category10();

var map = new Datamap({
	element: document.getElementById('container'),
	responsive: true,
	fills: {
		defaultFill: "#ABDDA4",
		gt50: colors(Math.random() * 20),
		eq50: colors(Math.random() * 20),
		lt25: colors(Math.random() * 10),
		gt75: colors(Math.random() * 200),
		lt50: colors(Math.random() * 20),
		eq0: colors(Math.random() * 1),
		pink: '#0fa0fa',
		gt500: colors(Math.random() * 1)
	}
});

d3.select(window).on('resize', function() {
	map.resize();
});


/*
		(function(eventInfo) { 
			eventDiv.click(function(){
				
				var locations = eventInfo.locations;
				if (locations.length == 1) {
				
					var location = locations[0];
				
					map.bubbles([{
						name: eventInfo.name,
						latitude: location.latitude,
						longitude: location.longitude,
						radius: eventInfo.radius,
						fillKey: 'pink'}]);
				} else if (locations.length == 2) {
				
					map.arc([{
						origin: locations[0],
						destination: locations[1]
					}]);
				} else if (locations.length > 2) {
				
					var applyColors = {};
					for (var i = 0; i < locations.length; i++) {
						var countryCode = locations[i];
						
						applyColors[countryCode] = 'pink';
					}

					map.updateChoropleth(applyColors);
				}
			});
		})(eventInfo);
*/
