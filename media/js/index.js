
    
require.config({ 
  //By default load any module IDs from ../media/js/rarity
  baseUrl: "../../media/js",
  //except, if the module ID starts with "app",
  //load it from the ../media/js/app directory. paths
  //config is relative to the baseUrl, and
  //never includes a ".js" extension since
  //the paths config could be for a directory.
  paths : {
    geoda: 'geoda',
    rtree : 'lib/rtree',
    jquery : 'lib/jquery.min',
    jqueryui : 'lib/jquery-ui-1.10.4.custom.min',
    jquerymobile : 'lib/jquery.mobile-1.4.5.min',
    //bootstrap : 'lib/bootstrap.min',
    kdtree : 'lib/kdtree',
    mapshaper: 'lib/mapshaper',
    proj4: 'lib/proj4',
    d3: 'lib/d3.v3.min',
    //cartodb: 'lib/cartodb',
    //leaflet: 'lib/leaflet',
    'jquery.switchButton' : 'lib/jquery.switchButton',
    'jquery.colorpicker' : 'lib/jquery.colorpicker.min',
    'jquery.ui.touch-punch' : 'lib/jquery.ui.touch-punch.min',
    'jquery.slidereveal' : 'lib/jquery.slidereveal.min',
    'list' : 'lib/list.min',
    'colorbrewer'  : 'lib/colorbrewer',
    md5 : 'lib/md5.min',
    ss : 'lib/simple_statistics',
    //zip : 'lib/zip/zip',
  },
  shim : {
    kdtree : {exports: 'kdtree'},
    mapshaper : {exports: 'mapshaper'},
    proj4 : {exports: 'proj4'},
    rtree : {exports : 'RTree'},
    d3 : {exports : 'd3'},
    //cartodb: {},
    //leaflet: {exports: 'leaflet'},
    "jqueryui" : {deps: ['jquery']},
    "jquery.switchButton" : {deps: ['jquery']},
    "jquery.colorpicker" : {deps: ['jquery']},
    "jquery.ui.touch-punch" : {deps: ['jqueryui']},
    "list" : {},
    'colorbrewer': {},
    ss : {exports : 'ss'},
    //zip : {},
  },
});


require(["ui/main"]);

