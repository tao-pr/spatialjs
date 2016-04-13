/*
 * The MIT License
 * 
 *  Copyright (c) 2015 Tao P.R. (StarColon Projects)
 * 
 *  Permission is hereby granted, free of charge, to any person obtaining a copy
 *  of this software and associated documentation files (the "Software"), to deal
 *  in the Software without restriction, including without limitation the rights
 *  to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 *  copies of the Software, and to permit persons to whom the Software is
 *  furnished to do so, subject to the following conditions:
 * 
 *  The above copyright notice and this permission notice shall be included in
 *  all copies or substantial portions of the Software.
 * 
 *  THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 *  IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 *  FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 *  AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 *  LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 *  OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 *  THE SOFTWARE.
 */

 /**
  * [grid.js] 
  * A simple utility to simulate a bounded grid for virtualization purpose.
  * Grid is implemented in a functional way rather than an OOP discipline.
  *
  * Key data structures are:
  * [grid] - A fully-linked cells
  * [cell] - Each cell floats with a loose link to its 4 neighbors
  * @author Tao PR
  */

"use strict";

if (typeof(_)=='undefined') var _ = require('underscore');
try{
	var colors = require('colors'); 	
}
catch(e){
	// Fall back
}


/**
 * Grid namespace, not to be used as a class
 */
var Grid = {}

/**
 * Create a grid object 
 * @param {Integer} numRow
 * @param {Integer} numCol
 * @param {Any} defaultValue
 * @returns {grid}
 */
Grid.create = function(numRow,numCol,defaultValue){
	if (numRow * numCol <= 0) 
		throw "Number of columns and rows must be positive integer." 

	let grid = Array.apply(null, new Array(numCol)).map(function(){
		return Array.apply(null, new Array(numRow)).map(function(){
			switch (typeof(defaultValue)){
				case 'string': return String.prototype.valueOf.apply(defaultValue);
				case 'number': return Number.prototype.valueOf.apply(defaultValue);
				case 'object': return {};
				default: return undefined;	
			}
		});
	});

	return grid;
}

/**
 * Duplicate a grid object (deep copy)
 * @param {grid}
 * @returns {grid}
 */
Grid.duplicate = function(grid){
	let g = [];
	Grid.eachCellOf(grid).do(function (value, coord){
		if (!(coord.i in g))
			g[coord.i] = [];

		g[coord.i][coord.j] = value;
		return value;
	});

	return g;
}


/** 
 * Duplicate only the structure of the grid but replace the values with the specied value
 * @param {grid} grid - source grid to get duplicated
 * @param {Object} value 
 * @returns {grid}
 */
Grid.duplicateStructure = function(grid,newvalue){
	var g = [];
	Grid.eachCellOf(grid).do(function (value, coord){
		if (!(coord.i in g))
			g[coord.i] = [];

		g[coord.i][coord.j] = newvalue;
		return value;
	});

	return g;
}

/**
 * Remove a row from a grid
 * @param {grid}
 * @returns {Closure}
 */
Grid.removeRow = function(grid){
	return function(n){
		// Iterate through each column, remove the n-th row
		grid.forEach(function(col,i){
			if (grid[i].hasOwnProperty(n))
				grid[i].splice(n,1);
		});
	}
}

/**
 * Remove a column from a grid
 * @param {grid}
 * @returns {Closure}
 */
Grid.removeCol = function(grid){
	return function(n){
		grid.splice(n,1);
	}
}


/**
 * Add a row to a grid. This won't insert if already exist.
 * @param {grid}
 * @returns {Closure}
 */
Grid.addRow = function(grid){
	return function(n,len){
		// Iterate through each column, add the n-th row
		grid.forEach(function(col,i){
			if (!grid[i].hasOwnProperty(n))
				grid[i][n] = new Array(len);
		});
	}
}

/**
 * Add a column to a grid. This won't insert if already exist.
 * @param {grid}
 * @returns {Closure}
 */
Grid.addCol = function(grid){
	return function(n,len){
		if (!grid.hasOwnProperty(n))
			grid[n] = new Array(len);
	}
}

/**
 * List sibling coordinates of a specified coordinate
 * @param {grid}
 * @returns {Array} array of a coordinates
 */
Grid.siblings = function(grid){
	return function (i,j){
		var sib = [
			[i-1, j],
			[i+1, j],
			[i, j-1],
			[i, j+1]
		];

		sib = _.filter(sib, function(ij){ return Grid.has(grid,ij[0],ij[1]) });
		return sib;
	}
}


/**
 * Determine if a coordinate (i,j) is in the grid
 * @param {Grid}
 * @param {Integer} i - column coordinate
 * @param {Integer} j - row coordinate
 */
Grid.has = Grid.contains = function(grid,i,j){
	return (i in grid && j in grid[i]);
}

/**
 * Iterate through each cell in the grid and commit an action
 */
Grid.eachCell = function(grid){
	return function(F){
		grid.forEach(function (col,i){
			col.forEach(function(cell,j){
				F(cell,i,j);
			})
		})
	}
}

/**
 * Iterate through each sibling and commit an action on it
 * Usage: Grid.eachSibling(grid)(5,3)(doSomething)
 * @param {grid}
 */
Grid.eachSibling = function(grid){
	return function(i,j){
		return function(F){
			var siblings = Grid.siblings(grid)(i,j);
			siblings.forEach(function(coord){
				var i = coord[0], j = coord[j];
				var value = Grid.cell(i,j).of(grid);
				F(value, i, j);
			});
		}
	}
}


/**
 * Calculate the block distance of a route between two coordinates
 */
Grid.distance = function(coord1, coord2){
	return Math.abs(coord1.i-coord2.i) + Math.abs(coord1.j-coord2.j)
}



/**
 * Flood fill of the grid
 * @param {grid}
 */
Grid.floodfill = function(grid){

	/** 
	 * Define the starting point of the algorithm
	 * @param {Integer} i - Column coordinate
	 * @param {Integer} j - Row coordinate
	 */
	this.from = function(i,j){
		var startAt = [i,j];
		this.isInArea = function(value,coord){return true} // By default, all cells are taken into account

		var self = this;

		/**
		 * Grid.floodfill(grid).from(i,j).where(isInArea)
		 * Assign a condition to the flood fill algorithm
		 * @param {Function} F - A function which tests if a cell is included in an area
		 */
		this.where = function(F){
			self.isInArea = F;
			return self;
		}

		/**
		 * Commit a floodfill and returns an array of the coordinates which 
		 * are filled
		 * @returns {Array} coordinate array
		 */
		this.commit = function(){
			var filled = [];
			var testedGrid = Grid.duplicateStructure(grid,false);

			function fillMe(coord){
				var value = Grid.cell(coord[0],coord[1]).of(grid);
				if (self.isInArea(value,{i:coord[0],j:coord[1]}) && 
					Grid.cell(coord[0],coord[1]).of(testedGrid)==false){
					
					// Add self to the output filled list
					filled.push({i:coord[0],j:coord[1]});
					Grid.cell(coord[0],coord[1]).set(testedGrid)(true);

					// List siblings
					var siblings = Grid.siblings(grid)(coord[0],coord[1]);

					// Recursively fill start from each of the siblings
					siblings.forEach(function(sib){
						// Skip if tested
						if (Grid.cell(sib[0],sib[1]).of(testedGrid)==false){
							fillMe(sib);
							Grid.cell(sib[0],sib[1]).set(testedGrid)(true);
						}
					});
				}
			}

			fillMe(startAt);
			return filled;
		}

		return this;
	}


	return this;
}


/**
 * Grid route finder
 * @param {grid}
 */
Grid.routeOf = Grid.route = Grid.routing = function(grid){

	/** 
	 * Grid.route(grid).from(i,j)
	 * Define the starting point of the algorithm
	 * @param {Integer} i - Column coordinate
	 * @param {Integer} j - Row coordinate
	 */
	this.from = function(i,j){
		var startAt = [i,j];
		var endAt = null;

		/**
		 * Grid.routeOf(grid).from(i,j).to(m,n)
		 * Define the ending point of the route
		 * @param {Integer} i - Column coordinate
		 * @param {Integer} j - Column coordinate
		 */
		this.to = function (i,j){
			endAt = [i,j];
			this.walkable = function(value,coord){ return true } // By default, all paths are walkable
			this.notWalkable = function(value,coord){ return false }
			var self = this;

			/**
			 * Grid.routeOf(grid).from(i,j).to(m,n).where(condition)
			 * Define a walkable constraint
			 * @param {Function} F - A function that takes the value and coordinate and returns TRUE if the cell is walkable
			 * @returns {None}
			 */
			this.where = function(F){
				self.walkable = F;
				self.notWalkable = function(value,coord){return !self.walkable(value,coord)};
				return self;
			}

			/**
			 * Grid.routeOf(grid).from(i,j).to(m,n).where(condition).walkableCellsCount()
			 * Count the number of the cells in the grid
			 * which are walkable 
			 * @returns {Integer} Number of cells which satisfy the 'walkable' condition
			 */
			this.walkableCellsCount = function(){
				return Grid.eachOf(grid).where(self.walkable).count();
			}



			/**
			 * Route.routeOf(grid).from(i,j).to(u,v).lee()
			 * Route from the beginning point to the ending point
			 * using Lee's algorithm 
			 * <a href="http://en.wikipedia.org/wiki/Lee_algorithm">http://en.wikipedia.org/wiki/Lee_algorithm</a>
			 * @param {bool} verbose
			 * @returns {Array} of route coordinates
			 */
			this.lee = function(verbose){

				verbose = verbose || false;

				if (verbose==true){
					console.log('Expanding neighbors ...');
				}

				// Step#2 - Wave expansion
				var wave = {};
				var waveCoords = {};
				var Q = [];
				function expandNeighbor(cell,magnitude){
					var siblings = Grid.siblings(grid)(cell[0],cell[1]);
					siblings = _.filter(siblings, function(sib){
						var i=sib[0], j=sib[1];
						return self.walkable(Grid.cell(i,j).of(grid), {i:i, j:j}) &&
							(!(i in waveCoords && j in waveCoords[i]))
					});

					if (siblings.length==0){
						return;
					}
					
					var parents = [];
					siblings.forEach(function(sib){
						var m=sib[0], n=sib[1];

						// Skip if the cell has already been assigned the wave magnitude
						if (!(m in waveCoords && n in waveCoords[m])){
							if (!(m in waveCoords)){
								waveCoords[m] = {};
							};

							waveCoords[m][n] = true;

							if (!(magnitude in wave)){
								wave[magnitude] = [];
							}

							wave[magnitude].push({i:m, j:n});
							parents.push([m,n]);
						}
					});
					// Expand each of children
					magnitude ++;
					if (parents.length>0){
						parents.forEach(function(tuple){
							//expandNeighbor(tuple,magnitude);
							Q.push({c:tuple, mag:magnitude});
						})
					}
				}
				// Expand the wave from the beginning point
				// where its value is initially set to 1
				wave[1] = [{i:startAt[0], j:startAt[1]}];
				Q.push({c:startAt, mag:2});

				// Worker loop for wave expansion
				while (Q.length){
					var next = Q.splice(0,1)[0];
					expandNeighbor(next.c, next.mag);
				}

				if (verbose==true)
					console.log(wave);

				// Step#3 - Backtrace
				// Start at the ending point, step downwards along
				// the descent of the wave magnitude
				// until it finds the starting point.
				// (Breadth-first search)
				if (verbose){
					console.log('Backtracing ...')
				}
				function moveTowardsStart(pos,prev,route){
					route.push({i:pos.i,j:pos.j});

					// Stop finding if starting point has been found
					if (pos.i==startAt[0] && pos.j==startAt[1])
						return route;

					// Identify the current magnitude
					var magnitude = 0;
					for (var mag in wave){
						for (var c in wave[mag]){
							if (wave[mag][c].i==pos.i && wave[mag][c].j==pos.j){
								magnitude = mag; break;
							}
						}
					}

				 	// Go downwards the magnitude
				 	var routeOptions = wave[magnitude-1];
				 	for (var next_i in routeOptions){
				 		var next = routeOptions[next_i];
				 		// Must be sibling to the current cell
				 		var distance = Math.abs(next.i-pos.i) + Math.abs(next.j-pos.j);
				 		if (distance==1){
				 			// Next candidate found!
				 			if (verbose==true){
				 				console.log('next {'+(magnitude-1)+'} --> ' + next.i + ',' + next.j);
				 				if (route.length<8)
				 					console.log('route: ' + JSON.stringify(route));
				 				else 
				 					console.log('route .... ' + JSON.stringify(route[route.length-1]));
				 			}
				 			return moveTowardsStart(next, pos, route);
				 		}
				 	}

				 	if (verbose==true)
				 		console.log(('no next candidates found for {'+magnitude+'}').yellow);

				 	// Encountering a dead end :(
				 	// Recess to the previous block and add penalty to the current position
				 	wave[magnitude] = _.filter(wave[magnitude], function(c){
				 		return c.i!=pos.i && c.j!=pos.j
				 	});
				 	if (!(0xFFFF in wave))
				 		wave[0xFFFF] = [];
				 	wave[0xFFFF].push({i:pos.i,j:pos.j});

				 	// Recess by one block
				 	route = route.slice(0,route.length-1);
				 	var lastblock = route[route.length-1];
		 			if (verbose==true)
		 				console.log('recess to '.red + JSON.stringify(lastblock));
		 			return moveTowardsStart(prev, lastblock, route);
				}

				var route = moveTowardsStart({i:endAt[0], j:endAt[1]},null,[]);

				// Reverse the route so it starts from the beginning and 
				// ends at the ending
				route.reverse();
				return route;
			}

			/**
			 * Route.routeOf(grid).from(i,j).to(u,v).astar(costFunction)
			 * @param {Function} cost - Cost function which takes (value, coord) and returns positive number cost value
			 * @returns {Array} Route constructed with the algorithm
			 **/
			this.astar = function(cost,verbose){

				verbose = verbose || false;

				if (verbose==true)
					console.log(JSON.stringify(startAt) + ' --> ' + JSON.stringify(endAt));

				// If cost function is not defined,
				// all coordinates make no cost difference
				cost = cost || function(value,coord){
					return 1
				};

				var closedSet = [];
				var openSet = [{cost: 0, coord:{i:startAt[0], j:startAt[1]}}]; // Initially contains only the beginning point
				var cameFrom = [];
				var gScore = [{cost: 0, coord:{i:startAt[0], j:startAt[1]}}]; // Collection of the g scores of each point
				var fScore = 0;

				function sortByCost(a,b){ return a.cost<b.cost }
				function isPermitted(c){
					return self.walkable(Grid.cell(c[0],c[1]).of(grid), {i:c[0],j:c[1]})
				}
				function isInSet(set,coord){
					return _.any(set, function(s){
						return s.coord.i==coord.i && s.coord.j==coord.j
					})
				}
				function getGScore(coord){
					var coords = _.filter(gScore, function(c){ return c.coord.i==coord.i && c.coord.j==coord.j });
					if (coords.length==0)
						return cost(Grid.cell(coord.i,coord.j).of(grid), coord);
					else
						return coords[0].cost;
				}
				function setGScore(coord,g){
					for (var k in gScore){
						if (gScore[k].coord.i==coord.i && gScore[k].coord.j==coord.j){
							// Update the existing score record
							gScore[k].cost = g;
							return ;
						}
					}

					gScore.push({cost: g, coord:{i:coord.i, j:coord.j}});
				}
				function getCameFrom(dest){
					for (var c in cameFrom){
						if (cameFrom[c].to.i==dest.i && cameFrom[c].to.j==dest.j){
							return cameFrom[c].from
						}
					}
					throw 'Route breaks at' + JSON.stringify(dest);
				}
				function setCameFrom(src,dest){
					for (var c in cameFrom){
						if (cameFrom[c].to.i==dest.i && cameFrom[c].to.j==dest.j){
							// Update the existing record
							cameFrom[c].from = { i:src.i, j:src.j };
							return ;
						}
					}

					cameFrom.push({
						to:{ i:dest.i, j:dest.j }, 
						from:{ i:src.i, j:src.j }
					});
				}

				while (openSet.length>0){
					// Take an element from {openset} which has the smallest cost
					var current = openSet.pop().coord;
					if (current.i==endAt[0] && current.j==endAt[1]){
						if (verbose==true)
							console.log('Path fully reconstructed'.green);
						break;
					}

					// Add {current} to {closedset}
					closedSet.push({cost:0, coord:{i:current.i, j:current.j}});

					var siblings = Grid.siblings(grid)(current.i, current.j);
					siblings = _.filter(siblings, isPermitted);
					if (verbose==true){
						console.log('cells registered: ' + cameFrom.length);
					}

					siblings.forEach(function (s){
						var sib = {i:s[0], j:s[1]};
						if (!isInSet(closedSet, sib)){
							var f_sib = cost(Grid.cell(sib.i,sib.j).of(grid), {i:sib.i, j:sib.j});
							var g = getGScore(current) + f_sib;
							if (!isInSet(openSet, sib) || g<getGScore(sib)){
								setCameFrom(current, sib);
								setGScore(sib, g);
								// Add this sibling to the {openset}
								openSet.push({cost:g, coord:{i:sib.i, j:sib.j}});
								openSet.sort(sortByCost);
							}
						}
					})
				}

				// Reconstruct the route
				var pos = {i: endAt[0], j: endAt[1]};
				var route = [];
				if (verbose==true) 
					console.log('constructing route ...'.green);

				do {
					route.push({i:pos.i, j:pos.j});
					if (pos.i==startAt[0] && pos.j==startAt[1]){
						// Complete route reconstructed
						break;
					}
					
					var from = getCameFrom(pos);
					if (from==null){
						console.log('Route breaks at '.red + JSON.stringify(from));
						console.log(route);
						break;
					}
					pos = from;
				}
				while (pos != null);

				route.reverse();
				return route;
			}			


			/**
			 * Route.routeOf(grid).from(i,j).to(u,v).astar(costFunction)
			 * @param {Function} cost - Cost function which takes (value, coord) and returns positive number cost value
			 * @returns {Array} Route constructed with the algorithm
			 **/
			this.astar_old = function(cost,verbose){

				verbose = verbose || false;

				// If cost function is not defined,
				// all coordinates make no cost difference
				cost = cost || function(value,coord){
					return 1
				};

				var routes = [
					{G:0, R:[startAt]} // Initial point
				];

				var evaluated = {}; // Set containing the evaluated coordinates

				function isEndPoint(coord){ return coord[0]==endAt[0] && coord[1]==endAt[1]}

				function _G(route){return route.G}
				function _F(route){return route.F}

				function expand(current){
					var lastNode = _.last(current.R);
					var siblings = Grid.siblings(grid)(lastNode[0],lastNode[1]);

					// Filter out if not walkable
					// also filter out if the sibling already repeats the 
					// previous path
					function isRepeatInCurrent(sib){
						return _.any(current.R, function(r){
							return r[0]==sib[0] && r[1]==sib[1]
						})
					}
					function isNotWalkable(sib){
						var sib_value = Grid.cell(sib[0],sib[1]).of(grid);
						var sib_coord = {i: sib[0], j: sib[1]};
						return !self.walkable(sib_value, sib_coord )
					}
					function isEvaluated(sib){
						return (!(sib[0] in evaluated && sib[1] in evaluated[sib[0]]))
					}

					siblings = _.reject(siblings, isRepeatInCurrent);
					siblings = _.reject(siblings, isNotWalkable);
					siblings = _.reject(siblings, isEvaluated);

					// If the siblings include the ending point,
					// just choose it as a sole outcome
					if (_.any(siblings, isEndPoint)){
						siblings = [endAt];
					}

					// Map each siblings with cost function
					siblings = _.map(siblings, function(sib){
						var sib_value = Grid.cell(sib[0],sib[1]).of(grid);
						var sib_coord = {i: sib[0], j: sib[1]};
						var newroute = current.R.concat([sib]);
						return {F: cost(sib_value, sib_coord), R: newroute}
					});

					return siblings;
				}

				// Keep constructing the route until it reaches the final goal
				while (!isEndPoint(_.last(_.first(routes).R))){
					// Expand the first (least aggegrated cost G)
					var current = _.first(_.sortBy(routes,_F));
					var expanded = expand(current);

					if (expanded.length==0){
						// If expanded but nothing returned,
						// Multiply the aggegrated cost of it and repeat the process
						routes[0].G *= 10;
						routes = _.sortBy(routes, _G);
						if (verbose==true) 
							console.log((JSON.stringify(routes[0].G) + ' got a penalty').yellow);
					}
					else{
						// Remove the first candidate (current) off the list
						routes.splice(0,1);

						// Register all newly expanded routes
						expanded.forEach(function(ex){
							var newroute = {
								G: current.G + ex.F, 
								R: ex.R
							};
							routes.push(newroute);
						});

						// Keep the route list sorted, the best goes first
						routes = _.sortBy(routes, _G);

						if (verbose==true){
							console.log('Best route expanded so far:'.cyan);
							console.log(_.first(routes));
						}
					}
				}

				// Take and wrap the constructed route
				var route = _.first(routes).R;
				route = route.map(function(r){
					return {i: r[0], j: r[1]}
				});

				return route;
			}


			return this;
		}


		return this;
	}


	return this;
}


/**
 * Traverse through the grid, boundary constraint is taken into account
 * @param {grid}
 */
Grid.traverse = function(grid){


	/** 
	 * Grid.traverse(grid).from(i,j)
	 * Define where to start traversal
	 */
	this.from = function(i,j){

		let startAt = [i,j];
		let route = [{i:i, j:j}];
		
		/**
		 * Grid.traverse(grid).from(i,j).to(m,n)
		 * Walk straight to the coordinate
		 */
		this.to = function(m,n){
			let stopAt = [m,n];
			
			// Construct a route from the beginning point to the target point
			nextStep(startAt, stopAt, 1);

			/**
			 * Get the route array
			 * @returns {Array} Array of coordinates in the route
			 */
			this.route = function(){
				return route;
			}


			/**
			 * Measure how far from begin to end 
			 * @returns {Integer} block distance of the route
			 */
			this.distance = this.len = function(){
				return route.length;
			}


			/**
			 * Translate route into directions
			 * @returns {Array}
			 */
			this.directions = function(){
				let directions = [];
				_.reduce(route, function(previous,next){
					directions.push(direction(previous,next));
					previous = next;
					return previous;
				})
				return directions;
			}

			return this;
		}


		/**
		 * Grid.traverse(grid).from(i,j).go(['RIGHT','LEFT','LEFT'])
		 * Move the coordinate towards a series of directions
		 * If the position go beyond the boundary of the grid,
		 * it throws an exception.
		 * @param {Array} directions e.g. ['UP','UP','LEFT']
		 * @returns {Array} Route
		 */
		this.go = function(directions){
			let pos = {i: i, j: j};
			route = [{i: i, j: j}];
			while (directions.length>0){
				let next = directions.splice(0,1);
				pos = move(pos, next);

				if (!Grid.has(grid,pos.i,pos.j))
					throw 'Move exceeds the boundary of the grid';

				route.push({i: pos.i, j: pos.j});
			}
			return route;
		}


		function deepPosEqual(pos1,pos2){
			return pos1[0]===pos2[0] && pos1[1]===pos2[1]
		}


		/**
		 * Step to the next pos until it reaches the end
		 * Also construct the route as it goes
		 * @param {Array} pos - starting point 
		 * @param {Array} end - ending point
		 * @param {Integer} i - coordinate index (1=row, 0=col)
		 * @returns {Array} the last position
		 */
		function nextStep(pos,end,i){
			if (deepPosEqual(pos,end)){
				return pos;
			}
			else if (pos[i]!==end[i]){
				pos[i] = pos[i]<end[i] ? pos[i]+1 : pos[i]-1;
				addRoute(pos);
				pos = nextStep(pos,end,i);
			}
			else if (i>0)
				pos = nextStep(pos,end,i-1);
			else{
				return pos;
			}
		}

		function addRoute(pos){
			route.push({i:pos[0], j:pos[1]});
		}


		return this;
	}



	return this;
}








/** 
 * Cell metaclass
 * @param {Integer} i
 * @param {Integer} j
 */
Grid.cell = function(i,j){ 
	if ((typeof(i) != 'number') || (typeof(j) != 'number'))
		throw 'Coordinate i, j must be defined as integer';

	// Assign the coordinate reference
	let self = this;
	let coord = {i:i, j:j};

	/**
	 * Grid.cell(i,j).of(grid) - Returns a cell value
	 * If the cell does not belong to the grid, it throws an error
	 * @param {grid}
	 * @returns {Object} any value stored in the cell
	 */
	this.of = function(grid){
		if (this.isNotIn(grid))
			return undefined;
		return grid[coord.i][coord.j];
	}

	/**
	 * Grid.cell(i,j).set(grid)(0xFF) - Set a value of a cell
	 * @param {grid}
	 * @returns {Closure}
	 */
	this.set = function(grid){
		return function(value){
			if (!(i in grid)) 
				grid[i] = [];
			grid[i][j] = value;
		}
	}

	/**
	 * Grid.cell(i,j).applyProperty(grid)('items',pushItem)
	 * Apply function F on the cell property
	 * @param {grid}
	 * @returns {Closure} 
	 */
	this.applyProperty = function(grid){
		/*
		 * @param {String} prob - property name
		 * @param {Function} F - mapper function which takes property value and coordinate as arguments and
		 *                     returns a new value
		 */
		return function (prop,F){
			if (self.isNotIn(grid))
				throw 'Cell '+ i + ', ' + j +  ' is out of bound';
			let value = grid[coord.i][coord.j];
			if (!value.hasOwnProperty(prop)){
				value[prop] = null;
			}
			// Map F now
			value[prop] = F(value[prop],coord);
			grid[coord.i][coord.j] = value;
			return grid;
		}
	}

	/**
	 * Grid.cell(i,j).coord() - Returns a coordinate JSON object
	 * @returns {JSON}
	 */
	this.coord = function(){
		return {i: coord.i, j: coord.j}
	}


	/** 
	 * Grid.cell(i,j).isIn(grid) - Check if a cell is in the grid
	 * @param {grid}
	 * @returns {True/False}
	 */
	this.isIn = function(grid){
		return Grid.has(grid,coord.i,coord.j)
	}

	/**
	 * Grid.cell(i,j).isNotIn(grid) - Check if a cell is not in the grid
	 * @param {grid}
	 * @returns {True/False}
	 */
	this.isNotIn = function(grid){
		return !this.isIn(grid)
	}

	/**
	 * Grid.cell(i,j).addTo(grid) - Add a cell to a grid at the specified coordinate
	 * @param {grid}
	 * @returns {True/False} false if the cell is not added
	 */
	this.addTo = function(grid){
		// Grid already contains the cell at the certain coordinate?
		if (this.isIn(grid))
			return false;

		// Register a cell
		if (!grid.hasOwnProperty(coord.i))
			grid[coord.i] = [];
		if (!grid[i].hasOwnProperty(coord.j))
			grid[coord.i][coord.j] = [];

		return true;
	}

	return this; 
}


/**
 * Iterate through each cell of a grid and do something with it
 * @param {grid}
 */
Grid.eachCellOf = Grid.eachOf = function(grid){

	if (typeof(grid)=='undefined')
		throw 'Grid has not been defined';
	let self = this;

	// Default filter does not filter out any cells (always returns true)
	self.cellFilter = function(value,coord){return true};


	/**
	 * Grid.eachOf(grid).where(a,coord => a.i>0)
	 * Filter the cells by condition
	 * @param {Function} condition - A function which takes (cellvalue, coord) and returns true if the cell matches the criteria
	 */
	this.where = function(condition){
		if (typeof(condition)!='function')
			throw 'Requires a function clause';
		self.cellFilter = condition;
		return self;
	}


	/**
	 * Grid.eachOf(grid).where(a,coord => ).count()
	 * Count the number of cells which satisfy the 'where' condition
	 * @returns {Integer} the number of cells which satisfy the where clause
	 */
	this.count = function(){
		let count = 0;
		for (var i in grid)
			for (var j in grid[i])
				if (self.cellFilter(grid[i][j],{i:i,j:j}))
					++count;
		return count;
	}


	/**
	 * Grid.eachOf(grid).setTo(value)
	 * Set each grid which satisfy the filter condition with the specified value
	 * @param {Object} value
	 * @returns {Integer} Number of cells affected by the function
	 */
	this.setTo = this.setValue = function(value){
		let count=0;
		for (var i in grid)
			for (var j in grid[i])
				if (self.cellFilter(grid[i][j],{i:i,j:j})){
					grid[i][j] = value;
					++count;
				}
		return count;
	}

	/**
	 * Grid.eachOf(grid).applyProperty(prop,F)
	 * Apply function F on the specific property of each cells which 
	 * satisfy the filter condition
	 * @param {String} prop - Property name
	 * @param {Function} F - Mapper function which takes the old property value along with coordinate
	 *                       and returns the new value
	 * @returns {Integer} Number of the affected cells 
	 */
	this.applyProperty = function(prop,F){
		let count=0;
		for (var i in grid)
			for (var j in grid[i])
				if (self.cellFilter(grid[i][j],{i:i,j:j})){
					if (!grid[i][j].hasOwnProperty(prop))
						grid[i][j][prop] = null;
					grid[i][j][prop] = F(grid[i][j][prop],{i:i,j:j});
					++count;
				}
		return count;
	}

	/**
	 * Grid.eachOf(grid).do(a,coord => a*3)
	 * Trigger a function on each cell which matches the filter condition
	 * everything returned by F(value) will takes place the certain cell rightaway
	 * @param {Function} F - Function that takes (cellvalue, coord) as arguments and returns a new value of the cell
	 * @returns {Integer} Number of cells affected by the function
	 */
	this.do = this.map = function(F){
		let count=0;
		for (var i in grid)
			for (var j in grid[i])
				if (self.cellFilter(grid[i][j],{i:i,j:j})){
					var ret_val = F(grid[i][j],{i:parseInt(i),j:parseInt(j)});
					if (typeof(ret_val)!='undefined')
						grid[i][j] = ret_val;
					++count;
				}
		return count;
	}


	return this;
}


/** 
 * Find the direction notation when moving from {from} to {to}
 * @param {coordinate} from
 * @param {coordinate} to
 * @returns {String} One of the 4 directions 'RIGHT','LEFT','UP','DOWN'
 */
function direction(from, to){
	if (from.i<to.i)
		return 'RIGHT';
	else if (from.i>to.i)
		return 'LEFT';
	else if (from.j<to.j)
		return 'DOWN';
	else if (from.j>to.j)
		return 'UP';
	else
		return null;
}

/**
 * Move a point to a sibling block according to the direction
 * @param {Coordinate} from
 * @param {String} direction 
 * returns {Coordinate} the point after movement
 */
function move(from,direction){
	let target = {i: from.i, j: from.j};
	if (direction=='UP') target.j--;
	else if (direction=='DOWN') target.j++;
	else if (direction=='LEFT') target.i--;
	else if (direction=='RIGHT') target.i++;
	return target;
}



// Export the module for node.js app
if (typeof(exports)!='undefined') 
	exports.Grid = Grid;
