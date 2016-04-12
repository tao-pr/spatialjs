var assert = require('assert');
var chai = require('chai');
var expect = chai.expect;
chai.should();
chai.use(require('chai-things'));
chai.config.includeStack = true;

"use strict";

// Module dependency
var _ = require('underscore');
var below = require('../below.js');
var Grid = require('../modules/grid.js').Grid;

describe('@below test kit',function(){

	describe('Creation tests', function(){

		it('should create a settings object', function(){
			var settings = below.settings.create();

			expect(settings).to.have.property('size');
			expect(settings).to.have.property('entrances');
			expect(settings).to.have.property('exits');
			expect(settings).to.have.property('items');
			expect(settings).to.have.property('obstacles');
			expect(settings).to.have.property('walls');
			expect(settings).to.have.property('costFunction');
		})

		it('should create a grid which satisfies the settings', function(){
			var settings = below.settings.create();
			settings.size = {width: 80, height: 80};
			settings.entrances = [{i:0,j:0},{i:0,j:52}];
			settings.exits = [{i:79,j:79}];
			settings.items = [{i:32,j:32,item:'apple'},{i:50,j:64,item:'pencil'}];
			settings.obstacles = [{i:50,j:0,obstacle:25}];
			settings.walls = [{i:6,j:5},{i:7,j:5},{i:8,j:5}];
			settings.costFunction = function(value,coord){ return 1*Math.pow(2,coord.j)};

			var grid = below.generate(settings);

			expect(Grid.has(grid,0,0)).to.be.true;
			expect(Grid.has(grid,79,79)).to.be.true;
			expect(Grid.has(grid,80,80)).to.be.false;

			for (var j in grid[0]){
				expect(grid[0][j]).to.have.property('cost');
				expect(grid[0][j]).to.have.property('items');
			}


			//  {ENTRANCE} Positive test
			settings.entrances.forEach(function (en){
				expect(Grid.cell(en.i,en.j).of(grid)['isEntrance']).to.be.true;
			});
			// {ENTRANCE} Negative test
			expect(Grid.cell(2,23).of(grid)['isEntrance']).not.to.be.true;			
			expect(Grid.cell(2,37).of(grid)['isEntrance']).not.to.be.true;			

			// {EXIT} Positive test
			settings.exits.forEach(function (ex){
				expect(Grid.cell(ex.i,ex.j).of(grid)['isExit']).to.be.true;
			})

			// {EXIT} Negative test 
			expect(Grid.cell(35,15).of(grid)['isExit']).not.to.be.true;
			expect(Grid.cell(75,0).of(grid)['isExit']).not.to.be.true;
			expect(Grid.cell(45,25).of(grid)['isExit']).not.to.be.true;

			// {ITEMS} Positive test
			settings.items.forEach(function (it){
				expect(Grid.cell(it.i,it.j).of(grid)['items']).to.contain.an.item.equal(it.item);
			})

			// {OBSTACLES} Positve test
			settings.obstacles.forEach(function(ob){
				expect(Grid.cell(ob.i,ob.j).of(grid)['obstacles']).to.contain.an.item.equal(ob.obstacle);
			})

			// {WALLS} Positive test
			settings.walls.forEach(function (wall){
				expect(Grid.cell(wall.i,wall.j).of(grid)['cost']).to.equal(0xFFFF);
			})

			// {COST} tests
			expect(Grid.cell(5,5).of(grid)['cost']).to.equal(32);
			expect(Grid.cell(0,5).of(grid)['cost']).to.equal(32);
			expect(Grid.cell(5,10).of(grid)['cost']).to.equal(1024);
		})

		it('should query entrances / exits correctly', function(){
			var settings = below.settings.create();
			settings.size = {width: 80, height: 80};
			settings.entrances = [{i:0,j:0},{i:0,j:52}];
			settings.exits = [{i:79,j:79}];
			settings.items = [{i:32,j:32,item:'apple'},{i:50,j:64,item:'pencil'}];
			settings.obstacles = [{i:50,j:0,obstacle:25}];
			settings.walls = [{i:6,j:5},{i:7,j:5},{i:8,j:5}];
			settings.costFunction = function(value,coord){ return 1*Math.pow(2,coord.j)};

			var grid = below.generate(settings);

			below.entrances(grid).should.deep.equal(settings.entrances);
			below.exits(grid).should.deep.equal(settings.exits);
		})

	})

	describe('Array 2d utility tests', function(){

		var grid = [];

		before(function(done){
			var settings = below.settings.create();
			settings.size = {width: 12, height: 12};
			settings.entrances = [{i:5,j:0},{i:3,j:0}];
			settings.exits = [];
			settings.items = [{i:3,j:3,item:'apple'},{i:3,j:3,item:'mango'},{i:5,j:4,item:'pencil'}];
			settings.obstacles = [];
			settings.walls = [{i:6,j:5},{i:7,j:5},{i:8,j:5}];
			settings.costFunction = function(v,coord){return parseInt(coord.i)+2*parseInt(coord.j)};

			grid = below.generate(settings);
			done();
		})

		it('should map 2d cost matrix', function(){
			var cost = below.array2d.map(grid,function(cell){ return cell['cost'] });
			console.log(cost);

			cost.should.have.length(12);
			cost[0].should.have.length(12);
			expect(cost[6][5]).to.equal(0xFFFF);
			expect(cost[0][0]).to.equal(0);
			expect(cost[2][2]).to.equal(6);
		})

		it('should map 2d item matrix', function(){
			var item = below.array2d.map(grid,function(cell){ return cell['items'].join(',')});
			console.log(item);

			item.should.have.length(12);
			item[0].should.have.length(12);
			expect(item[3][3]).to.equal('apple,mango');
			expect(item[5][4]).to.equal('pencil');
			expect(item[0][0]).to.equal('');

		})

		it('should pluck 2d matrix', function(){
			var costFromMap = below.array2d.map(grid,function(cell){ return cell['cost'] });
			var costFromPluck = below.array2d.pluck(grid,'cost');

			for (var i in costFromMap){
				costFromMap[i].should.deep.equal(costFromPluck[i]);
			}
		})

		it('should shift a grid with positive direction', function(){
			var grid = Grid.create(25,25,{'content':42});
			var grid_after = below.array2d.offset(grid,25,25);

			for (var i=0; i<25; i++)
				for (var j=0; j<25; j++){
					expect(Grid.has(grid_after,i,j)).to.be.false;
					expect(Grid.has(grid_after,i+25,j+25)).to.be.true;
				}
		})

		it('should shift a grid with negative direction', function(done){
			var grid = Grid.create(512,512,{'content':42});
			var grid_after = below.array2d.offset(grid,512,512);
			var grid_after2 = below.array2d.offset(grid_after,-24,-24);

			expect(Grid.has(grid_after2,999,999)).to.be.true;
			expect(Grid.has(grid_after2,1000,1000)).to.be.false;
			expect(Grid.has(grid_after2,512,512)).to.be.true;
			expect(Grid.has(grid_after2,480,480)).to.be.false;
			done();
		})

		it('should merge two grids', function(){
			var grid1 = Grid.create(80,80,'A');
			var grid2 = Grid.create(75,75,'B');
			grid3 = below.array2d.offset(grid2, 80, 80);
			grid4 = below.array2d.merge(grid1, grid3);

			expect(Grid.has(grid4,0,0)).to.be.true;
			expect(Grid.has(grid4,154,154)).to.be.true;
			expect(Grid.has(grid4,200,200)).to.be.false;
			expect(Grid.cell(0,0).of(grid4)).to.equal('A');
			expect(Grid.cell(79,79).of(grid4)).to.equal('A');
			expect(Grid.cell(80,80).of(grid4)).to.equal('B');
			expect(Grid.cell(120,150).of(grid4)).to.equal('B');
		})

		it('should merge two grids which absolutely overlap each other', function(){
			var grid1 = Grid.create(50,50,0);
			var grid2 = Grid.create(35,35,{});
			Grid.eachOf(grid2).setTo({foo:'bar'});

			var grid3 = below.array2d.merge(grid1, grid2);

			expect(Grid.has(grid3,49,49)).to.be.true;
			expect(Grid.cell(0,0).of(grid3)).to.deep.equal({foo:'bar'});
			expect(Grid.cell(24,0).of(grid3)).to.deep.equal({foo:'bar'});
			expect(Grid.cell(34,34).of(grid3)).to.deep.equal({foo:'bar'});
			expect(Grid.cell(35,35).of(grid3)).to.deep.equal(0);
			expect(Grid.cell(49,25).of(grid3)).to.equal(0);
		})
	})

	describe('routing tests', function(){
		var grid = []
		var settings = below.settings.create();
		settings.size = {width: 42, height: 42};
		settings.entrances = [{i:31,j:0}];
		settings.exits = [{i:12,j:41}];
		settings.walls = [];
		for (i=0; i<18; i++){
			settings.walls.push({i:i, j:13});
		}
		for (i=11; i<42; i++){
			settings.walls.push({i:i, j:15});
		}
		for (i=0; i<23; i++){
			settings.walls.push({i:i, j:18});
		}
		for (i=5; i<42; i++){
			settings.walls.push({i:i, j:23});
		}
		for (i=16; i<42; i++){
			settings.walls.push({i:i, j:35});
		}
		for (i=0; i<40; i++){
			settings.walls.push({i:i, j:37});
		}
		settings.costFunction = function(value,coord){ return 1 };

		before(function(done){
			grid = below.generate(settings);
			done();
		})

		it('should generate a short path between two points (no cost fn)', function(){
			var verbose = false;
			var route = below.generateSimpleRoute(
				grid,
				{i:7,j:10},
				{i:15,j:20},
				verbose
			); // This will utilize Lee's route finder
			below.illustrate(grid,route);
			route.should.have.length.above(2);
			expect(_.first(route)).to.deep.equal({i:7,j:10});
			expect(_.last(route)).to.deep.equal({i:15,j:20});
		})

		it('should generate a short path between two points (with cost fn)', function(){
			var verbose = false;
			var route = below.generateBestRoute(
				grid,
				{i:7,j:10},
				{i:15,j:20},
				verbose
			); // This will utilize Lee's route finder
			below.illustrate(grid,route);
			route.should.have.length.above(2);
			expect(_.first(route)).to.deep.equal({i:7,j:10});
			expect(_.last(route)).to.deep.equal({i:15,j:20});
		})

		it('should generate a simple route from @entrance --> @exit (no cost function)', function(){
			var verbose = false;
			var route = below.generateSimpleRoute(
				grid,
				settings.entrances[0],
				settings.exits[0],
				verbose
			); // This will utilize Lee's route finder
			below.illustrate(grid,route);
			route.should.have.length.above(2);
			expect(_.first(route)).to.deep.equal(settings.entrances[0]);
			expect(_.last(route)).to.deep.equal(settings.exits[0]);
		})


		it ('should find a route from @entrance --> @exit',function(done){
			// A*
			var verbose = false;
			var route = below.generateBestRoute(grid, settings.entrances[0], settings.exits[0], verbose);
			below.illustrate(grid,route);
			route.should.have.length.above(2);
			expect(_.first(route)).to.deep.equal(settings.entrances[0]);
			expect(_.last(route)).to.deep.equal(settings.exits[0]);
			done();
		})

	})

	describe('intermediate grid operation tests', function(){

		it('should check if exit is accessible', function(){
			var g = [];
			var settings = below.settings.create();
			settings.size = {width: 10, height: 10};
			settings.entrances = [{i:5,j:0}];
			settings.exits = [{i:3,j:9},{i:8,j:9}];
			settings.walls = [];

			g = below.generate(settings);
			expect(below.isExitAccessible(g,{i:5,j:0})).to.be.true;

			for (var a=0; a<10; a++){
				settings.walls.push({i:a, j:5});
			}

			g = below.generate(settings);
			expect(below.isExitAccessible(g,{i:5,j:0})).to.be.false;
		})

		it('should check if a certain cell is accessible', function(){
			var g = [];
			var settings = below.settings.create();
			settings.size = {width: 10, height: 10};
			settings.entrances = [{i:5,j:0}];
			settings.exits = [{i:3,j:9},{i:8,j:9}];
			settings.walls = [];
			settings.costFunction = function(c,coord){
				if (coord.i==0) return 1;
				else return (coord.j+1)
			}

			g = below.generate(settings);

			below.illustrateCost(g);

			expect(below.isAccessible(g,{i:0,j:0},{i:0,j:9})).to.be.true;
			expect(below.isAccessible(g,{i:0,j:0},{i:1,j:9})).to.be.false;
			expect(below.isAccessible(g,{i:0,j:9},{i:5,j:9})).to.be.false;
		})

	})

	describe('mongodb interface tests', function(){

		var grid = [];
		it('should save the grid to the database', function(done){
			var settings = below.settings.create();
			settings.size = {width: 16, height: 16};
			settings.entrances = [{i:0,j:0},{i:15,j:15}];
			settings.exits = [{i:0,j:15}];
			settings.items = [{i:12,j:12,item:'apple'},{i:10,j:14,item:'pencil'}];
			settings.obstacles = [{i:1,j:0,obstacle:255}];
			settings.costFunction = Math.abs;
			settings.walls = Array.apply(null, new Array(15)).map(function(a,i){
				return {i:parseInt(i),j:10}
			});
			
			grid = below.generate(settings);
			var saveAll = function(){return true};

			below.mongo.init(null,'gridsample','grid').then(below.mongo.save(grid,saveAll)).done(function(n){
				console.log(n.toString().yellow + ' records saved!'.yellow);
				done();
			});
		})

		it('should load the grid from the database', function(done){
			var constraint = {i0:0, j0:0, iN:16, jN:16};
			below.mongo.init(null,'gridsample','grid').then(below.mongo.load(constraint)).done(function(grid2){
				// Validate
				for (var u of Object.keys(grid))
					for (var v of Object.keys(grid[u])){
						console.log(u+','+v+' > ' +JSON.stringify(grid[u][v]));
						expect(grid2[u][v]).to.deep.equal(grid[u][v]);
					}
				done();
			});
		})

		// NOTE: This test cannot be run after the previous mongo tests for some reason
		// If you want to test this, skip the mongo tests above and run.
		it.skip('should partially save the database and partially load the portion back', function(done){
			var isInSavingRegion = function(v,coord){
				return parseInt(coord.i)<5
			}
			var g = Grid.create(20,20,{});
			Grid.eachOf(g).where(isInSavingRegion).setTo({'foo':'baz'});

			below.mongo.init(null,'gridsample','grid').then(below.mongo.save(g,isInSavingRegion)).done(function(n){
				expect(n).to.equal(100);
				done();
			})

		})

	})
})