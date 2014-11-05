from pysal import W, w_union, higher_order
from pysal import open as po
from pysal import rook_from_shapefile as rook
from pysal import queen_from_shapefile as queen
from pysal.weights.user import knnW_from_shapefile
from pysal.weights.user import threshold_binaryW_from_shapefile 
from pysal.weights.user import threshold_continuousW_from_shapefile
from pysal.weights.user import adaptive_kernelW_from_shapefile 
from pysal.weights import insert_diagonal 

DISTANCE_METRICS = ['Euclidean Distance', 'Arc Distance (miles)', \
                    'Arc Distance (kilometers)']
def CreateWeights(shp_path, weights_name, w_unique_ID, weights_type, \
                  cont_type = None, cont_order = None, cont_ilo = None, \
                  dist_metric = None, dist_method = None, dist_value = None,\
                  kernel_type = None, kernel_nn = None):
    if shp_path == None or len(shp_path) == 0:
        raise "Shape file path cannot be empty."
    if weights_name == None or len(weights_name) == 0:
        raise "Weights name cannot be empty."
    weights_type = int(weights_type)
    if weights_type < 0 or weights_type > 2:
        raise "Weights Type is illegal."
    
    dbf_path = shp_path[:-3] + "dbf"
    dbf = po(dbf_path, 'r') 
    for item in dbf.header:
        if item.lower() == w_unique_ID.lower():
            w_unique_ID = item
            break
        
    if weights_type == 0: 
        # contiguity-based weights | GAL file
        cont_type = int(cont_type)
        if cont_type == 0:
            # rook
            w = rook( shp_path, w_unique_ID )
        else:
            w = queen( shp_path, w_unique_ID )
        orig_w = w
        w_order = int(cont_order)
        if w_order > 1:
            w = higher_order(w, w_order)
        if cont_ilo == "true":
            for order in xrange(w_order -1, 1, -1):
                lowerOrderW = higher_order(oirg_w, order)
                w = w_union(w, lowerOrderW)
            w = w_union(w, orig_w)
            
    elif weights_type == 1:
        # distance-based weights | GAL file GWT file
        radius = None # If supplied arc_distances will be calculated
        p = 2 # Euclidean distance, 1: Manhanttan distance
        params = {'idVariable': w_unique_ID, 'radius': radius, 'p': p}
        dist_method = int(dist_method)
        if dist_method == 0:
            # kNN
            params['k'] = int(dist_value)
            w = knnW_from_shapefile( shp_path, **params )
            print w
        elif dist_method == 1:
            # threshold
            dist_value = float(dist_value)
            w = threshold_binaryW_from_shapefile( shp_path, dist_value, **params )
        elif dist_method == 2:
            # inverse_distance
            items = dist_value.split(",")
            dist_value = float(items[0])
            power = 1 if len(items) <= 1 else float(items[1])
            params['alpha'] = -1 * power
            w = threshold_continuousW_from_shapefile( shp_path, dist_value, **params )
    
    elif weights_type == 2:
        #kernel-based weights | GWT file
        kerns = ['uniform', 'triangular', 'quadratic', 'quartic', 'gaussian']
        kern = kerns[int(kernel_type)]
        k = int(kernel_nn) 
        w = adaptive_kernelW_from_shapefile( shp_path, k = k, function = kern, \
                                            idVariable = w_unique_ID) 
        w = insert_diagonal( w, wsp = False )
        method_options = [kern, k]
    
    #w_object = {'w' : w, 'shapefile' : shp_path, 'id' : w_unique_ID, 'method' : weights_type, 'method options' : method_options}
    
    #return w_object
    return w

def __test__():
    shp_path = "../media/temp/columbus.shp"
    weights_name = "columbus.w"
    w_id = "POLYID"
    # w_type 0 contiguity
    # cont_type 0 rook, 1 queen
    # cont_order integer
    # cont_ilo "true" "false"
    CreateWeights(shp_path, weights_name, w_id, "0", "0", "1", "true")    
    CreateWeights(shp_path, weights_name, w_id, 0, 1, 1, "false")    
    CreateWeights(shp_path, weights_name, w_id, 0, 1, 3, "false")    
    
    # w_type 1 distance
    # dist_metric 0 Euclidean, 1 Arc -miles, 2 Arc - kilo
    # dist_method 0 knn 1 binary 2 inverse dist
    # dist_value for 0 & 1 methods: integer and float numbers, 2 float,integer
    CreateWeights(shp_path, weights_name, w_id, 1, dist_metric=0, dist_method=0, dist_value="4")    
    CreateWeights(shp_path, weights_name, w_id, 1, dist_metric=0, dist_method=1, dist_value=100.0)    
    CreateWeights(shp_path, weights_name, w_id, 1, dist_metric=0, dist_method=2, dist_value="100.0,1")    
   
    # w_type 2 kernel
    CreateWeights(shp_path, weights_name, w_id, 2, kernel_type=0, kernel_nn=4)
    print "all done"
    
if __name__ == "__main__":
    __test__()