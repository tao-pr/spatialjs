var spatial = require('./spatial');

var setting = spatial.settings.create();
setting.size = {width:24, height:24};
setting.costFunction = function(v,c){
	var i = c.i-11;
	var j = 11-c.j;
	return i*j % Math.abs(i+j)
}

setting.walls = []

// Generate wall
var wi=10, wj = 0;
while (wi<23 && wj<23){
	setting.walls.push({i:wi,j:wj})
	setting.walls.push({i:wi+1,j:wj});
	wi += 1;
	wj += 2;
}

var grid = spatial.generate(setting);


var route = spatial.generateBestRoute(grid,{i:12,j:0},{i:23,j:23});
spatial.illustrate(grid, route);
console.log('Total cost spent for this route: ' + spatial.sumCostOfRoute(grid,route).toFixed(0).toString() );

//function showSummary(n){ console.log( (n + ' records saved to the database').toString().cyan ) }
//spatial.mongo.init(null,'test','grid').then(spatial.mongo.save(grid)).done(showSummary);


