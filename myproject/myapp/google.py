"""
google: Tools for extracting information through Google Places API

Author(s):
    Luc Anselin luc.anselin@asu.edu
    Xun Li xun.li@asu.edu

"""

__author__ = "Luc Anselin <luc.anselin@asu.edu, Xun Li <xun.li@asu.edu"

import urllib2
import json, math
from pysal.cg.sphere import radangle, r2d, d2r

__all__ = ['querypoints','queryradius','googlepoints','ptdict2geojson']

def lonlat(pointslist):
    newpts = [(i[1],i[0]) for i in pointslist]
    return newpts    

def geointerpolate(p0,p1,t,lonx=True):
    if not(lonx):
        p = lonlat([p0,p1])
        p0 = p[0]
        p1 = p[1]
        
    d = radangle(p0,p1)
    k = 1.0 / math.sin(d)
    t = t*d
    A = math.sin(d-t) * k
    B = math.sin(t) * k
    
    x0, y0 = d2r(p0[0]),d2r(p0[1])
    x1, y1 = d2r(p1[0]),d2r(p1[1])
    
    x = A * math.cos(y0) * math.cos(x0) + B * math.cos(y1) * math.cos(x1)
    y = A * math.cos(y0) * math.sin(x0) + B * math.cos(y1) * math.sin(x1)
    z = A * math.sin(y0) + B * math.sin(y1)

    newpx = r2d(math.atan2(y, x))
    newpy = r2d(math.atan2(z, math.sqrt(x*x + y*y)))
    if not(lonx):
        return newpy,newpx
    return newpx,newpy

def geogrid(pup, pdown, k, lonx=True):
    if lonx:
        corners = [pup,pdown]
    else:
        corners = lonlat([pup,pdown])
    tpoints = [float(i)/k for i in range(k)[1:]]
    leftcorners = [corners[0],(corners[0][0],corners[1][1])]
    rightcorners = [(corners[1][0],corners[0][1]),corners[1]]
    leftside = [leftcorners[0]]
    rightside = [rightcorners[0]]
    for t in tpoints:
        newpl = geointerpolate(leftcorners[0],leftcorners[1],t)
        leftside.append(newpl)
        newpr = geointerpolate(rightcorners[0],rightcorners[1],t)
        rightside.append(newpr)
    leftside.append(leftcorners[1])
    rightside.append(rightcorners[1])
    
    grid = []
    for i in range(len(leftside)):
        grid.append(leftside[i])
        for t in tpoints:
            newp = geointerpolate(leftside[i],rightside[i],t)
            grid.append(newp)
        grid.append(rightside[i])
    if not(lonx):
        grid = lonlat(grid)
    return grid    
    
def harcdist(p0,p1,lonx=True,radius=6371.0):
    if not(lonx):
        p = lonlat([p0,p1])
        p0 = p[0]
        p1 = p[1]
            
    d = radangle(p0,p1)
    if radius is not None:
        d = d*radius
    return d    
    
def querypoints(p,bbox=True,lonx=False,k=5):
    """
    Utility function to generate a list of grid query points from a bounding box
    essentially a wrapper around geogrid with a check for bounding box dimension
    
    Parameters
    ----------
    p      : list of points in alt-lon or lon-lat
    bbox   : flag for bounding box (upper left, lower right), default = True
    lonx   : flag for lat-lon order, default is False for lat-lon (True is lon-lat)
    k      : grid size (points grid will be k+1 by k+1)
    
    Returns
    -------
    grid   : list of lat-lon of a grid of query points, row by row, from top to bottom
    
    """
    if bbox:
        if not len(p)==2:
            raise Exception, "invalid format for bounding box"
        # create grid points from bounding box
        grid = geogrid(p[0],p[1],k=k,lonx=lonx)
        # the list must be in lat-lon format
        if lonx:
            grid = lonlat(grid)
    else:
        return p
    return grid
    
def queryradius(grid,k,lonx=False):
    """
    Utility function to find a good query range distance for grid points
    
    Parameters
    ----------
    grid    : list of lat-lon tuplets for regular grid points
              (created with querypoints)
    k       : dimension of the grid, the list will consist of k+1 x k+1 tuplets
    lonx    : flag for lat-lon order, default is False for lat-lon (lon-lat is True)
    
    Returns
    -------
            : maximum distance from the horizontal and vertical sides of
              the lower right grid cell in meters
              (to be used as the sradius argument in googlepoints)
    
    """
    # compute distances in horizontal and vertical direction
    # use the lower right grid cell
    # along longitude
    p0 = grid[-2]
    p1 = grid[-1]
    # along latitude
    p3 = grid[-(k+2)]
    # horizontal distance
    dist1 = harcdist(p0,p1,lonx=lonx)
    # vertical distance
    dist2 = harcdist(p3,p1,lonx=lonx)
    return round(max([dist1,dist2])*1000.0)

def googlepoints(querypoints,apikey,sradius,q,newid=False,verbose=True):
    """
    Queries the Google Places API for locations (lat-lon) of a 
    given type of facility
    
    Parameters
    ----------
    querypoints  : a list of tuples with point coordinates in lat-lon format 
                   (not lon-lat!)
    apikey       : the user's Google Places API key
    sradius      : search radius in meters
    stype        : facility type from list supported by Google Places API
    newid        : flag for sequential integer as new key
                   default = True
                   should be set to False when result dictionary will
                   be used as input to googlevalues
    verbose      : flag for amount of detail in output
                   default = True, for each point query, the status and
                   number of points found is printed
                   False: only a warning is printed when search is truncated
                   at 200
    
    Returns
    -------
    findings     : a directory with the facility Google ID as the key
                   contains lat and lng
                   
    Example
    -------
    
    It is not possible to give an actual example, since that requires the
    user's unique API key. However, to illustrate the type of call and
    return consider:
    
    liquorlist = googlepoints([(41.981417, -87.893517)],'apikeyhere',5000,'liquor_store')
    
    which will query a radius of 5000m (5km) around the specified query point for the
    locations of all liquor stores in the Google data base
    
    This retuns a dictionary:
    
    {u'ChIJ-etp1PLJD4gRLYGl7Jm1oG4': {u'lat': 41.986742, u'lng': -87.836312},
     u'ChIJ0fyhh9awD4gR6-vaMEbGNBE': {u'lat': 42.022235, u'lng': -87.941302},
    ...
     u'ChIJxfyRaki2D4gRiaHLJANgJns': {u'lat': 42.010285, u'lng': -87.875896}}
     
    The key in the dictionary is the Google ID of the facility
    """
    base_url = 'https://maps.googleapis.com/maps/api/place/radarsearch/json?location=%s,%s&radius=%s&%s&key=%s'
    # list of urls to query
    query_urls = [base_url%(lat,lon,sradius,q,apikey) for lat,lon in querypoints]
    findings = {}
    status = 'OK' 
    
    for url in query_urls:
        rsp = urllib2.urlopen(url)
        content = rsp.read()
        data = json.loads(content)
        if 'results' in data:         # avoid empty records
            results = data['results']
            if data['status'] == 'OVER_QUERY_LIMIT':
                return data['status'], findings
            if verbose:
                #print data['status'], len(results)
                pass
            if len(results) == 200:
                status = 'FINER_QUERY_NEEDED'
                print "WARNING: query truncated at 200"
            for item in results:
                place_id = item['place_id']
                loc = item['geometry']['location']
                # use place id as key in the dictionary
                findings[place_id] = loc
            
    # replace key with integer sequence number
    if newid:
        ii = 0
        newdict = {}
        for placeid in findings.keys():
            dd = findings[placeid]
            dd['placeid']=placeid  
            newdict[ii]=dd
            ii = ii + 1
    else:
        return status, findings
    
    return status, newdict
    
def ptdict2geojson(d,location=["lng","lat"],values=[],ofile="output.geojson"):
    """
    Turns the dictionary output from googlepoints into a geojson point file
    
    Parameters
    ----------
    d          : dict object created by googlepoints
    location   : list with long, lat coordinates in decimal degrees
                 (no check for order)
    values     : list of keys for data items other than the id
                 (do not include the id)
                 default: no values (id only)
    ofile      : file name for the output file (include geojson extension)
                 default: "output.geojson"
    
    Returns
    -------
               : geojson point file
    
    Remarks
    -------
    Assumes that the dictionary is complete, i.e., every key has a value associated
    with it. No checks are made for missing keys.
    
    """
    # extract location info
    lng = location[0]
    lat = location[1]
    # initialize geo dictionary for point features
    geo = {"type": "FeatureCollection","features":[]}
    # loop over dictionary
    for id,loc in d.iteritems():
        feature = { "type" : "Feature", 
        "geometry": { "type": "Point", "coordinates": [ loc['lng'],loc['lat']]}}
        properties = {"id": id}
        for info in values:
            properties[info] = loc[info]
        feature["properties"] = properties
        geo["features"].append(feature)
    # output file
    with open(ofile,'w') as outfile:
        json.dump(geo,outfile,sort_keys=True,indent=4,ensure_ascii=False)
    outfile.close()
    return
    
def googlept(pointlist,q,apikey,lonx=False,bbox=True,k=5,sradius=5000,verbose=True,ofile="output.geojson"):
    """
    User function to query google points
    
    Parameters
    ----------
    pointlist   : a list of tuples with lat-lon (or lon-lat) for query points
                  or a list with the upper left and lower right points of a bounding box
    stype       : string with the type of query from the list of supported queries
                  by the Google Places API
    apikey      : user's Google Places API key
    lonx        : flag for order or lat-lon points in tuple
                  default = False for lat-lon order (lon-lat is True)
    bbox        : flag for use of bounding box as input
                  default = True for bounding box; False is list of points
                  when using a single point, must be in a list [(lat,lon)]
    k           : default size for the search grid (for bbox=True)
    sradius     : default search radius, for point list only
                  with bbox=True search radius is determined internally
    verbose     : flag for details in google query
                  default is True for query status and number of points returned
    ofile       : output file name
    
    Returns
    -------
                : geojson point file
    
    """
    # create the grid search box
    grid = querypoints(pointlist,bbox=bbox,lonx=lonx,k=k)
    # compute search radius (only when bounding box specified)
    if bbox:
        sradius = queryradius(grid,k=k,lonx=lonx)
    # query google places
    status, ptdict = googlepoints(grid,apikey,sradius,q,newid=True,verbose=verbose)
    if status == 'OVER_QUERY_LIMIT':
        return status
    # create output file
    ptdict2geojson(ptdict,location=["lng","lat"],values=["placeid"],ofile=ofile)
    return status
    
if __name__ == '__main__':
    print "Welcome to PySAL Google Points Query"
    apikey = raw_input("Enter your API key: ")
    stype = raw_input("Enter the type of query: ")
    print "For each query point, enter the lat,lon separated by a comma"
    print "For a bounding box, enter the upper left corner first,\nthen the lower right"
    plist = []
    while True:
        p = raw_input("Enter lat,lon: ")
        if p:
            pp = tuple(map(float,p.split(",")))
            print pp
            plist.append(pp)
        else:
            break
    if len(plist) == 2:
        bb = raw_input("Is this a bounding box (enter Yes or No): ")
        if bb.upper() == 'NO' or bb.upper() == 'N':
            bbox = False
        else:
            bbox = True
    else:
        bbox = False
    k = 5
    sr = 5000.0
    if bbox:
        gp = raw_input("Enter the number of grid points or return for default: ")
        if gp:
            k = int(gp)
    else:
        sr = raw_input("Enter the search radius in meters\nor return for default: ")
        if sr:
            sradius = float(sr)
    
    outfile = raw_input("Enter the name for the output file : ")
    googlept(plist,"type="+stype,apikey,lonx=False,bbox=bbox,k=k,sradius=sr,
          verbose=True,ofile=outfile)
    print "Output is in file %s " % outfile
    
    
        
    
    
