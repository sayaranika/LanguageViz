var width = 960,
    height = 960;

var loadingText = d3.select("body").append("div")
    .text("Loading...");

var canvas = d3.select("body").append("canvas")
    .attr("width", width)
    .attr("height", height);

var context = canvas.node().getContext("2d");

var pi = Math.PI,
tau = 2 * pi;


var projection = d3.geoMercator()
    .scale((1 << 18) / tau)
    .translate([width/6, height/2])
    .center([-123.17, 49.26]);

var path = d3.geoPath()
    .projection(projection)
    .context(context);

d3.json("data/geos.json").then(function(data) {
        console.log(data);
        features = topojson.feature(data, data.objects.geos).features;
        
        features
          .forEach(function(feature) {
              
            feature.properties.area = path.area(feature);
            feature.properties.bounds = path.bounds(feature);
            
            
            // mobility_total = total population
            feature.properties.pop = +feature.properties.pop;
            
          });

        features
          .forEach(function(feature) {
            context.save();
            context.beginPath();
            path(feature);
            context.clip();  // set clip path to the feature's polygon
            
            var bounds = feature.properties.bounds,
                x = bounds[0][0],
                y = bounds[0][1],
                width = bounds[1][0] - x,
                height = bounds[1][1] - y;
                
            // pct of bounding box's area taken up by feature polygon
            var p = feature.properties.area / (width * height);
            
            // desired number of pixels to draw in polygon (only approximates) 
            var n = feature.properties.pop / 10;
            
            var points = createPoints(width, height, p, n);
            
            // draw a pixel for every 10 people
            points.forEach(function(d) {
              context.beginPath();
              
              // blue for old resident, orange for new resident
              context.fillStyle = Math.random() < true ? 
                  "#91bfdb" : "#fc8d59";
                  
              // draw pixel
              // (doesn't show up on map if it's outside the polygon b/c of clip)            
              context.fillRect(x + d[0], y + d[1], 1, 1); 
            });
            
            context.restore();  // removes the clip path
          });
        
        loadingText.remove();
        
        // Draw legend
        /*context.font = "12px monospace";
        context.fillText("1 pixel = 10 people", 280, 550);
        
        context.fillStyle = "#91bfdb";
        context.fillRect(280, 560, 5, 5);
        
        context.fillStyle = "#000";
        context.fillText("Lived in D.C. over 1 year", 290, 567);
        
        context.fillStyle = "#fc8d59";
        context.fillRect(280, 575, 5, 5);
        
        context.fillStyle = "#000";
        context.fillText("Move to D.C. in last year", 290, 582);*/
      });
      
      // Creates a bound set of points with a specific density
      function createPoints(width, height, p, n) {
        // width and height are the dimensions of the bounding rectangle
        // p is the percentage of this rectangle's area covered by polygon
        // n is the desired number of points within the polygon
      
        var area = width * height * p; // area of the polygon
        
        // radius needed to get roughly the correct dot density in the polygon
        var radius = Math.sqrt(area / (1.62*n));
        // (took some playing around to get this ratio, probably could work out 
        //  the math to get a closer approximation but it wouldn't be noticable
        //  visually)
        
        // repeatedly sample until you fill the bounding box
        var sample = poissonDiscSampler(width, height, radius);
        for (var data = [], d; d = sample();) { data.push(d); }
        
        return data;
      }

      // From https://bl.ocks.org/mbostock/19168c663618b7f07158
      // Based on https://www.jasondavies.com/poisson-disc/
      function poissonDiscSampler(width, height, radius) {
        var k = 30, // maximum number of samples before rejection
            radius2 = radius * radius,
            R = 3 * radius2,
            cellSize = radius * Math.SQRT1_2,
            gridWidth = Math.ceil(width / cellSize),
            gridHeight = Math.ceil(height / cellSize),
            grid = new Array(gridWidth * gridHeight),
            queue = [],
            queueSize = 0,
            sampleSize = 0;

        return function() {
          if (!sampleSize) return sample(Math.random() * width, Math.random() * height);

          // Pick a random existing sample and remove it from the queue.
          while (queueSize) {
            var i = Math.random() * queueSize | 0,
                s = queue[i];

            // Make a new candidate between [radius, 2 * radius] from the existing sample.
            for (var j = 0; j < k; ++j) {
              var a = 2 * Math.PI * Math.random(),
                  r = Math.sqrt(Math.random() * R + radius2),
                  x = s[0] + r * Math.cos(a),
                  y = s[1] + r * Math.sin(a);

              // Reject candidates that are outside the allowed extent,
              // or closer than 2 * radius to any existing sample.
              if (0 <= x && x < width && 0 <= y && y < height && far(x, y)) return sample(x, y);
            }

            queue[i] = queue[--queueSize];
            queue.length = queueSize;
          }
        };

        function far(x, y) {
          var i = x / cellSize | 0,
              j = y / cellSize | 0,
              i0 = Math.max(i - 2, 0),
              j0 = Math.max(j - 2, 0),
              i1 = Math.min(i + 3, gridWidth),
              j1 = Math.min(j + 3, gridHeight);

          for (j = j0; j < j1; ++j) {
            var o = j * gridWidth;
            for (i = i0; i < i1; ++i) {
              if (s = grid[o + i]) {
                var s,
                    dx = s[0] - x,
                    dy = s[1] - y;
                if (dx * dx + dy * dy < radius2) return false;
              }
            }
          }

          return true;
        }

        function sample(x, y) {
          var s = [x, y];
          queue.push(s);
          grid[gridWidth * (y / cellSize | 0) + (x / cellSize | 0)] = s;
          ++sampleSize;
          ++queueSize;
          return s;
        }
      }