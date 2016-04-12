# SpatialJS

>Resurrected from : http://github.com/starcolon/spatial.git

A bite-sized tool for 2D spatial grid processing.

## Include SpatialJS to your project

```javascript
var spatial = require('./spatial.js');
```

Or access from NPM registry:
```bash
npm install spatial
```

```javascript
var spatial = require('spatial'); // awesome
```

## Generating a Grid from settings
As mentioned on the top of this document, spatial library does extend functionalities of `Grid` for spatial routing app. You can eaither create a grid data structure using conventional Grid library or create it on the fly with a help of spatial library.

To create your first grid from the settings, try this:
```javascript
var settings = spatial.settings.create(); // create the setting package
settings.size = {width: 50, height:50};
settings.entrances.push({i:25,j:0});
settings.exits.push({i:49,j:49});

var grid = spatial.generate(settings); // generate a grid according to the settings
```

## Craft your settings
spatial allows you to freely customize how your grid is gonna look and behave. Settings consist of these elements:

### Grid size
Grid size can be specified in a JSON object format:
```javascript
settings.size = {width: 1024, height: 768};
```

### Entrances and exits
In order to create a maze grid, you may need to specify entrances and exits. Both are stored in array like this:
```javascript
settings.entrances = [ {i:5,j:25}, {i:0,j:0} ];
settings.exits = [ {i:44, j:44} ];
```

### Walls
In SpatialJS, walls are cells which are marked as **restricted access**. 
Basically, cells marked as wall are given a highest cost 
which are unlikely chosen as a route.

```javascript
settings.walls = [ {i:0,j:0}, {i:1,j:0}, {i:2,j:0} ];
```

### Cost function
Cost function is essential to routing problem. spatial utilizes cost function to evaluate effort it needs to put when walking through a certain cell. The function needs to receive two arguments, `the cell value` and `the coordinate`, then returns a numeric value. Higher return value yields higher price it needs to pay for accessing the cell.

```javascript
settings.costFunction = function(value,coord){
	return value * (coord.i + coord.j)
}
```

## Display the grid graphically
The entire grid content with a route (optional) can be displayed in the console with:

```javascript
spatial.illustrate(grid); 
spatial.illustrate(grid,route); // Optional route
```

spatial will display each block of the grid on screen, `walls` maked in red, `entrances` and `exits` marked as arrows. If you specify a `route` along, spatial will mark each block of the route in green.

## Route lookup
Grid library has implementations of very good routing algorithms like `lee's algorithm` and `A* search`. Thus, spatial library inherits this feature and make it easier.

### Find a route without having cost function considered
If you want to find a route from a cell to another without awaring of the cost function - just be aware of walls. You just simply call:

```javascript
var from = {i:5,j:0};
var to = {i:50,j:30};
var route = spatial.generateSimpleRoute( grid, from, to );
```

### Find a route with awareness of cost function
When you want to generate the cheapest route to the goal, call this:

```javascript
var from = {i:5,j:0};
var to = {i:50,j:30};
var route = spatial.generateBestRoute( grid, from, to );
```

## Two-dimensional array operators
### Translate the entire grid by specific displacement
For example, if you want to translate your 50x50 grid by 20 cells to the right and 35 cells downwards, do this:

```javascript
var grid = Grid.create(50,50,'foo');
var displaced = spatial.array2d.offset(grid,20,35);
```

Another synonym you may use:

```javascript
var displaced = spatial.array2d.shift(grid,10,25);
```

### Merge grids together
This is a piece of cake. You can just merge any grids together with this expression spatial:

```javascript
var grid1 = Grid.create(20,20,'A');
var grid2 = spatial.array2d.offset(Grid.create(100,100,'B'),21,0);
var mergedGrid = spatial.array2d.merge(grid1, grid2); 
```








