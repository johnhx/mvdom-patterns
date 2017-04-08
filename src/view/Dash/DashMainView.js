var d = mvdom; // external/global lib
var render = require("../../js-app/render.js").render;
var ajax = require("../../js-app/ajax.js");
var scheduler = require("../../js-app/scheduler.js");
var utils = require("../../js-app/utils.js");

// --------- View Controller --------- //
d.register("DashMainView",{
	create: function(data, config){
		return render("DashMainView");
	}, 

	postDisplay: function(){
		var view = this; // best practice, set the view variable first. 


		// Add the first schedule with the direct scheduler.add 
		// Note 1: Here we add manually a schedule without a namespace, so, 
		//         we need to store the ns automatically created to remove it on .destroy
		// Important: The recommended way for view is to use the view.schedules below which is enabled by scheduler-hook.js.
		view.scheduleNs = scheduler.add({
			performFn: function(){
				return ajax.get("/api/cpuUsage");
			}, 
			receiveFn: function(data){
				var lastMeasure = data[data.length - 1];
				d.push(d.first(view.el, ".cpu-card"), lastMeasure);				
			}
		});		
	},

	destroy: function(){
		var view = this;
		
		// For the manual scheduler, we must remove the schedule manually.
		scheduler.remove(view.scheduleNs);
	},

	// RECOMMENDED: Here we add the other schedule the view.schedules way which is managed by the scheduler-hook.js. 
	//              Those schedules will be added when the view get created and removed when the view is removed.
	schedules: [
		// memUsage 
		{
			performFn: function(){
				return ajax.get("/api/memUsage");
			},

			receiveFn: function(data){
				var view = this; // the performFn and receiveFn are added to the scheduler.js with this view instance as ctx (context)
				var lastMeasure = data[data.length - 1];
				d.push(d.first(view.el, ".mem-card"), lastMeasure);					
			}
		}, 

		// topMem
		{
			performFn: function(){
				return ajax.get("/api/topMemProcs");
			},

			receiveFn: function(data){
				var view = this; // the performFn and receiveFn are added to the scheduler.js with this view instance as ctx (context)
				var items = data;
				var tbodyEl = d.first(view.el, ".mem-card .ui-tbody");


				// mark the items changed if they did
				markChanges(view.prevTopMemProcsDic, items, "pid", "mem");

				// build the topMemrocs dictionary with the latest data and store it in this view for next update
				view.prevTopMemProcsDic = utils.dic(items, "pid");

				// sort by name
				sortBy(items, "command");

				var html = render("DashMainView-mem-trs", {items: data});

				tbodyEl.innerHTML = html;

			}
		}, 

		// cpuUsage 
		// (see postDisplay: for the sake of this code example, it is done the manual way, see postDisplay)


		// topCpu
		{
			performFn: function(){
				return ajax.get("/api/topCpuProcs");
			},

			receiveFn: function(data){
				var view = this; 
				var items = data;
				var tbodyEl = d.first(view.el, ".cpu-card .ui-tbody");


				// mark the items changed if they did
				markChanges(view.prevTopCpuProcsDic, items, "pid", "cpu");

				// build the topCpuProcs dictionary with the latest data and store it in this view for next update
				view.prevTopCpuProcsDic = utils.dic(items, "pid");

				// sort by name
				sortBy(items, "command");				

				// render and update the HTML table
				var html = render("DashMainView-cpu-trs", {items: items});
				tbodyEl.innerHTML = html;

			}
		}		

	]

});
// --------- /View Controller --------- //



// --------- Statics --------- //
// Mark the items if their value changed compared to the previous store
function markChanges(prevDic, items, keyName, valName){

	// if no prevDic, nothing to do. 
	if (prevDic){
		items.forEach(function(item){
			var keyVal = item[keyName];
			var prevItem = prevDic[keyVal];

			// if there is no prevItem, then, it is a new item.
			if (!prevItem){
				item.changed = "changed-new";
			}
			// if we have a previous item, we compare the value to mark if it went up or down
			else{
				var val = asNum(item[valName]);
				var prevVal = asNum(prevItem[valName]);				
				if (val != prevVal){
					item.changed = (val > prevVal)?"changed-up":"changed-down";
				}
			}
		});
	}	

	return items;
}
// --------- /Statics --------- //



// --------- Utils --------- //
// cheap num extractor pattern
var numRgx = /[0-9\.]+/g;

function asNum(str){
	if (str){
		var numStrs = str.match(numRgx);
		if (numStrs && numStrs.length > 0){
			return parseFloat(numStrs[0]);	
		}
	}

	return null;
	
}

function sortBy(arr, key){
	arr.sort(function(a, b){ 
		return (a[key].toLowerCase() > b[key].toLowerCase())?1:-1;}
	);		
}
// --------- /Utils --------- //
