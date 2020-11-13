var height = window.innerHeight-20,
    width = window.innerWidth-20;

// invisible map of polygons
var polyCanvas = d3.select("body")
	.append("canvas")
	.attr("width",width)
    .attr("height",height)
    .style("display","none");
    

// using this div to crop the map; it has messy edges
var container = d3.select("body")
    .append("div");
    
var dotCanvas = container.append("canvas")
    .attr("width",width)
    .attr("height",height); 
	

/*container.style({
	"position": "relative",
	"width": (width) + "px",
	"height": (height) + "px",
    "overflow": "hidden"
});*/

var pi = Math.PI,
tau = 2 * pi;
    
var projection = d3.geoMercator()
    .scale((1 << 18) / tau)
    .translate([width/6, height/2])
    .center([-123.17, 49.26]);

var path = d3.geoPath()
    .projection(projection);

var polyContext = polyCanvas.node().getContext("2d");
dotContext = dotCanvas.node().getContext("2d");

/*dotCanvas.style({
    "position": "absolute",
});*/

var features;

d3.json( "data/geos.json")
    .then(function(data){
        this.parsePoligonShape(data);
        
    });

function parsePoligonShape(blocks){
    features = topojson.feature(blocks, blocks.objects.geos).features;
    console.log(features);
    
    
	// draw the polygons with a unique color for each
	var i=features.length;
	while(i--){
		var r = parseInt(i / 256),
			g = i % 256;
		drawPolygon( i, features[i], polyContext, "rgb(" + r + "," + g + ",0)" );
    };
    
    // pixel data for the whole polygon map. we'll use color for point-in-polygon tests.
    var imageData = polyContext.getImageData(0,0,width,height);
    //console.log(imageData);
	// now draw dots
	i=features.length;
	while(i--){

        var pop = features[i].properties.pop / 2;	// one dot = 2 people
        
		if ( !pop ) continue;

		var bounds = path.bounds(features[i]),
			x0 = bounds[0][0],
			y0 = bounds[0][1],
			w = bounds[1][0] - x0,
			h = bounds[1][1] - y0,
			hits = 0,
			count = 0,
			limit = pop*10,	// limit tests just in case of infinite loops
			x,
			y,
			r = parseInt(i / 256),
            g = i % 256;
            
        //console.log(bounds[0][0]);

		// test random points within feature bounding box
		while( hits < pop-1 && count < limit ){	// we're done when we either have enough dots or have tried too many times
			x = parseInt(x0 + Math.random()*w);
			y = parseInt(y0 + Math.random()*h);

			// use pixel color to determine if point is within polygon. draw the dot if so.
			if ( testPixelColor(imageData,x,y,width,r,g) ){
				drawPixel(x,y,0,153,204,255);	// #09c, vintage @indiemaps
				hits++;
			}
			count ++;
		}
	}
}

function testPixelColor(imageData,x,y,w,r,g){
	var index = (x + y * w) * 4;
	return imageData.data[index + 0] == r && imageData.data[index + 1] == g;
}

function drawPolygon(i, feature, context, fill ){
    //console.log(feature);
    var coordinates = feature.geometry.coordinates;
    //console.log(coordinates);
	context.fillStyle = fill || "#000";
	context.beginPath();
	coordinates.forEach( function(ring){
		ring.forEach( function(coord, i){
            var projected = projection( coord );
            //console.log(projected);
			if (i == 0) {
                context.moveTo(projected[0], projected[1]);
            } else {
                context.lineTo(projected[0], projected[1]);
            }
		});
	});
    context.closePath();
	context.fill();
}

// there are faster (or prettier) ways to draw lots of dots, but this works
function drawPixel (x, y, r, g, b, a) {
	dotContext.fillStyle = "rgba("+r+","+g+","+b+","+(a/255)+")";
	dotContext.fillRect( x, y, 1, 1 );
}
