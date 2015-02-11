require.config({ 
  //By default load any module IDs from ../media/js/rarity
  baseUrl: '../media/js/lib',
  //except, if the module ID starts with "app",
  //load it from the ../media/js/app directory. paths
  //config is relative to the baseUrl, and
  //never includes a ".js" extension since
  //the paths config could be for a directory.
  paths: {
    rarity: '../rarity'
  }
});
 
// Start the main app logic.
require(['parallel', 'rarity/esda/moran','rarity/weights/weights'], 
function(parallel, Moran, W) {
  var t0 = performance.now();
  for (var i=0; i< 100000; i++) Math.random();
  var t1 = performance.now();
  console.log((t1 - t0)/1000);
  
  // Moran function
  var  m = new Moran();
  console.log(m);
});