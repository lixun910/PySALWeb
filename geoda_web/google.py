"""
google: Tools for extracting information through Google Places API

Author(s):
    Luc Anselin luc.anselin@asu.edu
    Xun Li xun.li@asu.edu

"""

__author__ = "Luc Anselin <luc.anselin@asu.edu, Xun Li <xun.li@asu.edu"

import urllib2
import json, math
from multiprocessing import Pool, Queue, Manager, Process, pool

__all__ = ['querypoints','queryradius','googlepoints','ptdict2geojson']

    
# degree to radian conversion
d2r = lambda x: x * math.pi / 180.0

# radian to degree conversion
r2d = lambda x: x * 180.0 / math.pi

def haversine(x):
    x = math.sin(x/2)
    return x*x

def radangle(p0,p1):
    x0, y0 = d2r(p0['lng']),d2r(p0['lat'])
    x1, y1 = d2r(p1['lng']),d2r(p1['lat'])
    d = 2.0 * math.asin(math.sqrt(haversine(y1 - y0) + 
                        math.cos(y0) * math.cos(y1)*haversine(x1 - x0)))
    return d

def harcdist(p0,p1,radius=6371.0):
    d = radangle(p0,p1)
    d = d*radius
    return d    
    
def queryradius(p0, p1):
    return harcdist(p0, p1) * 1000.0

def getDeltaDegreesByDist(p0, max_arc=5000.0):
    lat, lng = p0['lat'], p0['lng']
    max_arc = max_arc * 1.414
    
    r = 6371.0 * 1000.0
    lat_delta_deg = max_arc * 180.0 / (2 * math.pi * r) 
    
    rr = r * math.cos(lat) 
    lng_delta_deg = max_arc * 180.0 / (2 * math.pi * rr)
   
    return {'lat': lat_delta_deg, 'lng': lng_delta_deg}
    
def googlepoints(p, apikey, sradius, q, findings):
    q = q.replace(" ", "%20")
    url = 'https://maps.googleapis.com/maps/api/place/radarsearch/json?location=%s,%s&radius=%s&keyword=%s&key=%s' % (p['lat'], p['lng'], sradius, q, apikey)
    
    status = 'OK' 
    
    rsp = urllib2.urlopen(url)
    content = rsp.read()
    data = json.loads(content)
    if 'results' in data:         # avoid empty records
        results = data['results']
        if data['status'] == 'OVER_QUERY_LIMIT':
            return data['status'], findings
        if len(results) == 200:
            status = 'FINER_QUERY_NEEDED'
            print "WARNING: query truncated at 200"
        for item in results:
            place_id = item['place_id']
            loc = item['geometry']['location']
            # use place id as key in the dictionary
            findings[place_id] = loc
            
    return status

def async_googlepoints(args):
    lat, lng, lat_seg_range, lng_seg_range, q, apikey, sradius, result_q, status_q = args
    
    q = q.replace(" ", "%20")
    url = 'https://maps.googleapis.com/maps/api/place/radarsearch/json?location=%s,%s&radius=%s&keyword=%s&key=%s' % (lat, lng, sradius, q, apikey)
    
    rsp = urllib2.urlopen(url)
    content = rsp.read()
    data = json.loads(content)
    
    status = data['status']
    
    if 'results' in data:         # avoid empty records
        results = data['results']
        if len(results) == 200:
            status = "FINER_QUERY_NEEDED"
            print "WARNING: query truncated at 200"
        for item in results:
            place_id = item['place_id']
            loc = item['geometry']['location']
            # use place id as key in the shared queue
            result_q.put([place_id, loc])
            
    status_q.put([status, (lat, lng, lat_seg_range, lng_seg_range, q, apikey)])
            
def async_searchByKeyword(pool, q, bounds, apikey, findings, k=None):
    # bounds [sw.lat, sw.lng, ne.lat, ne.lng]
    lat_range = bounds[2] - bounds[0]
    lng_range = bounds[3] - bounds[1]
 
    if k == None: 
        deltas = getDeltaDegreesByDist({'lat': bounds[0], 'lng' : bounds[1]}) 
        lat_seg_range = deltas['lat']
        lng_seg_range = deltas['lng']
        if lat_seg_range > lat_range: 
            lat_seg_range = lat_range
        if lng_seg_range > lng_range: 
            lng_seg_range = lng_range
            
        sradius = 5000.0
    else:
        k = float(k) 
        seg_range = lat_range / k if lat_range < lng_range else lng_range /k
        lat_seg_range = seg_range
        lng_seg_range = seg_range
        sradius = queryradius(
          {'lat':bounds[0], 'lng':bounds[1]}, 
          {'lat':bounds[0]+lat_seg_range/2.0, 'lng':bounds[1]+lng_seg_range/2.0}
        );
        
    # from sw.lng to ne.lng
    lng_points = []
    next_lng = bounds[1]
    
    while next_lng < bounds[3]:
        next_lng += lng_seg_range
        lng_points.append(next_lng - lng_seg_range/2.0)
        
    # from sw.lat to ne.lat
    lat_points = []
    next_lat = bounds[0]
    
    while next_lat < bounds[2]:
        next_lat += lat_seg_range
        lat_points.append(next_lat - lat_seg_range/2.0)
        
    #allCount = len(lng_points) * len(lat_points)
    # location= lat, lon
    
    manager = Manager()
    result_q = manager.Queue()
    status_q = manager.Queue()

    param_list = []    
    for lng in lng_points:
        for lat in lat_points:
            param_list.append([
                lat, lng, lat_seg_range, lng_seg_range,
                q, apikey, sradius, result_q, status_q
            ])
    pool.map(async_googlepoints, param_list)
    
    final_status = "OK"
    while not status_q.empty():
        status, params = status_q.get()
        if status == "OVER_QUERY_LIMIT":
            final_status = status
        elif status == "FINER_QUERY_NEEDED":
            lat, lng, lat_seg_range, lng_seg_range, q, apikey = params
            finer_bounds = [
                lat - lat_seg_range/2.0, 
                lng - lng_seg_range/2.0, 
                lat + lat_seg_range/2.0, 
                lng + lng_seg_range/2.0
            ]
            async_searchByKeyword(pool, q, finer_bounds, apikey, findings, k=2)
        else:
            print status
            
    while not result_q.empty(): 
        place_id, location = result_q.get()
        findings[place_id] = location
        
    return final_status

def searchByKeyword(q, bounds, apikey, findings, k=None):
    # bounds [sw.lat, sw.lng, ne.lat, ne.lng]
    lat_range = bounds[2] - bounds[0]
    lng_range = bounds[3] - bounds[1]
 
    if k == None: 
        deltas = getDeltaDegreesByDist({'lat': bounds[0], 'lng' : bounds[1]}) 
        lat_seg_range = deltas['lat']
        lng_seg_range = deltas['lng']
        if lat_seg_range > lat_range: 
            lat_seg_range = lat_range
        if lng_seg_range > lng_range: 
            lng_seg_range = lng_range
            
        sradius = 5000.0
    else:
        k = float(k) 
        seg_range = lat_range / k if lat_range < lng_range else lng_range /k
        lat_seg_range = seg_range
        lng_seg_range = seg_range
        sradius = queryradius(
          {'lat':bounds[0], 'lng':bounds[1]}, 
          {'lat':bounds[0]+lat_seg_range/2.0, 'lng':bounds[1]+lng_seg_range/2.0}
        );
        
    # from sw.lng to ne.lng
    lng_points = []
    next_lng = bounds[1]
    
    while next_lng < bounds[3]:
        next_lng += lng_seg_range
        lng_points.append(next_lng - lng_seg_range/2.0)
        
    # from sw.lat to ne.lat
    lat_points = []
    next_lat = bounds[0]
    
    while next_lat < bounds[2]:
        next_lat += lat_seg_range
        lat_points.append(next_lat - lat_seg_range/2.0)
        
    #allCount = len(lng_points) * len(lat_points)
    # location= lat, lon
    
    final_status = "OK"
    for lng in lng_points:
        for lat in lat_points:
            status = googlepoints({'lat':lat, 'lng':lng}, apikey, sradius, q, findings)
            if status == "OVER_QUERY_LIMIT":
                final_status = status
                break
            elif status == "FINER_QUERY_NEEDED":
                finer_bounds = [
                    lat - lat_seg_range/2.0, 
                    lng - lng_seg_range/2.0, 
                    lat + lat_seg_range/2.0, 
                    lng + lng_seg_range/2.0
                ]
                searchByKeyword(q, finer_bounds, apikey, findings, k=2)
                
    return final_status

def saveGeoJSON(d,values=[],ofile="output.geojson"):
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
