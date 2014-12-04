import json
import math
import time
import sys
import random
import shapefile
import numpy as np 
from scipy.spatial import ckdtree
import os
import shutil
import pysal
    
def get_len(S, E):
    dy = E[1] - S[1]
    dx = E[0] - S[0]
    return math.sqrt(dy*dy + dx*dx)
    
def sqr(x):
    return x * x

def dist2(v, w):
    return sqr(v[0] - w[0]) + sqr(v[1] - w[1])

def distToSegmentSquared(p, v, w):
    l2 = dist2(v, w);
    if l2 == 0:
        return dist2(p, v)
    t = ((p[0] - v[0]) * (w[0] - v[0]) + (p[1] - v[1]) * (w[1] - v[1])) / l2
    if t < 0: return dist2(p, v)
    if t > 1: return dist2(p, w)
    return dist2(p, [v[0] + t * (w[0] - v[1]), v[1] + t * (w[1] - v[1])])

def dist3(x1,y1, x2,y2, x3,y3): # x3,y3 is the point
    px = x2-x1
    py = y2-y1

    something = px*px + py*py
    
    if something == 0:
        px = x3-x1
        py = y3-y1
        return math.sqrt( px*px + py*py)

    u =  ((x3 - x1) * px + (y3 - y1) * py) / float(something)

    if u > 1:
        u = 1
    elif u < 0:
        u = 0

    x = x1 + u * px
    y = y1 + u * py

    dx = x - x3
    dy = y - y3

    # Note: If the actual distance does not matter,
    # if you only want to compare what this function
    # returns to other results of this function, you
    # can just return the squared distance instead
    # (i.e. remove the sqrt) to gain a little performance

    dist = math.sqrt(dx*dx + dy*dy)

    return dist

def distToSegment(l, w):
    n = len(l)
    min_dist = sys.maxint
    for i in range(n-1):
        p = l[i]
        v = l[i+1]
        #dist = math.sqrt(distToSegmentSquared(p, v, w))
        dist = dist3(p[0], p[1], v[0], v[1], w[0], w[1])
        if dist < min_dist:
            min_dist = dist
    return min_dist

def ccw(A,B,C):
    return (C[1]-A[1]) * (B[0]-A[0]) > (B[1]-A[1]) * (C[0]-A[0])

# Return true if line segments AB and CD intersect
def intersect(A,B,C,D):
    return ccw(A,C,D) != ccw(B,C,D) and ccw(A,B,C) != ccw(A,B,D)

# build W
def getbbox(l):
    # get bbox
    minX = 0
    minY = 0
    maxX = 0
    maxY = 0
    for i,p in enumerate(l):
        if i == 0:
            minX = p[0]
            minY= p[1]
            maxX = p[0]
            maxY= p[1]
        else:
            if p[0] < minX: minX = p[0] 
            if p[1] < minY: minY = p[1] 
            if p[0] > maxX: maxX = p[0] 
            if p[1] > maxY: maxY = p[1] 
    return (minX, minY, maxX, maxY)

def getCenter(l):
    minX, minY, maxX, maxY = getbbox(l)
    return (minX + (maxX - minX) / 2.0, minY + (maxY - minY) / 2.0)


def lineIntersect(la, lb):
    minX, minY, maxX, maxY = getbbox(la)
    minX1, minY1, maxX1, maxY1 = getbbox(lb)
    if minX > maxX1 or minY > maxY1 or maxX < minX1 or maxY < minY1:
        return False
    for i in range(len(la) -1):
        A = la[i]
        B = la[i+1]
        for j in range(len(lb) -1):
            C = lb[j]
            D = lb[j+1]
            if intersect(A,B,C,D):
                return True
    return False
 


class NetworkCluster:
    def __init__(self, shpPath):
        self.shp_path = shpPath;
        self.shp = pysal.open(shpPath)
        #if self.shp.header['Shape Type'] 
        #self.network_data = self.ReadJsonNetwork(networkJsonFile)
        """
        {
          line1: [5029221,1,0,0], #[osm_id, oneway, bridge, point_count]
          line2: [5029222,1,0,0], 
          ...
        }
        """
        self.segment_dict = {}
        self.segment_lines = []
        
        """
        search_dict
        {
            point1: set([line2, line5]),
            point2: set([line8, line15]),
            ... 
        }
        """
        self.search_dict = {}
        self.line_points = None
        self.kd_line_points = None
        self.SEG_LENGTH = None
        self.neighbors = {}
        
                       
    def ReadJsonNetwork(self, jsonFileName):
        f = open(jsonFileName)
        json_data = f.read()
        f.close()
        try:
            return json.loads(json_data)
        except:
            return json.loads(unicode(json_data,'latin-1'))
    
    def SegmentNetwork(self, SEG_LENGTH):
        self.SEG_LENGTH = SEG_LENGTH
        seg_dict = {}
        network_dict = {}
        cnt = 0 
        for shape in self.shp:
            osm_id = cnt
            cnt += 1
            coords = shape.vertices
            # segment 
            if isinstance(coords[0][0], float):
                coords_cand = [coords]
            elif isinstance(coords[0][0][0], float):
                coords_cand = coords
            for c in coords_cand:
                seg_list = []
                sub_line = [] 
                rest_len = SEG_LENGTH
                sub_len = 0 
               
                start = 0
                end = len(c) -1
                
                i = start
                while i < end:
                    S = c[i]
                    E = c[i+1]
                    if sub_len == 0:
                        sub_len = get_len(S, E) 
                    
                    if sub_len <= rest_len:
                        if len(sub_line) == 0:
                            sub_line.append(S)
                        sub_line.append(E)
                        rest_len = rest_len - sub_len
                        sub_len = 0
                        start = start + 1
                        i = i+1
                        if i == end:
                            seg_list.append(sub_line)
                    else:
                        # find next break point
                        dy = E[1] - S[1]
                        dx = E[0] - S[0]
                        offX = rest_len * (dx / sub_len)
                        offY = rest_len * (dy / sub_len)
                        
                        N = []
                        N.append(S[0] + offX)
                        N.append(S[1] + offY)
                        
                        if len(sub_line) == 0:
                            sub_line.append(S)
                            sub_line.append(N)
                        else:
                            sub_line.append(N)
                        
                        seg_list.append(sub_line)
                        sub_line = []
                        
                        #c[start][0] = N[0]
                        #c[start][1] = N[1]
                        c[start] = N
                            
                        if rest_len < SEG_LENGTH:
                            rest_len = SEG_LENGTH
                        if sub_len >= SEG_LENGTH:
                            sub_len = sub_len - rest_len
                        else:
                            sub_len = 0
                                
                #print seg_list
                for seg in seg_list:
                    l = tuple(tuple(i) for i in seg)
                    if not osm_id in network_dict:
                        network_dict[osm_id] = [l]
                    else:
                        network_dict[osm_id].append(l)
                    seg_dict[l] = [osm_id, 0]
        self.segment_dict = seg_dict
        self.segment_lines = seg_dict.keys()
        self.search_dict = self.build_dict()
        # build a kd-tree for points on lines
        self.line_points = np.array(self.search_dict.keys())
        self.kd_line_points = ckdtree.cKDTree(self.line_points)
        return len(self.segment_lines)
        
    def build_dict(self):
        search_dict = {}
        for l in self.segment_lines:
            for p in l: 
                if p not in search_dict:
                    search_dict[p] = set()
                search_dict[p].add(l)
        return search_dict
        
    def SnapPointsToNetwork(self, points):
        seg_dict = self.segment_dict
        search_dict = self.search_dict
        line_points = self.line_points
        kd = self.kd_line_points
        
        n_lp = len(line_points)
        # snapping points to roads
        for p in points:
            q = kd.query(p, k=10, distance_upper_bound=self.SEG_LENGTH)
            dist = q[0]
            idx = q[1]
            if dist[0] < 1:
                # if point is right on a line seg, pick a line and snap the point
                i = idx[0] 
                lp = tuple(line_points[i])
                l = random.sample(search_dict[lp],1)[0]
                seg_dict[l][-1] += 1
                continue
            # find all nearest line segs 
            lines = set()
            for i in idx:
                if i < n_lp:
                    lp = tuple(line_points[i])
                    l = search_dict[lp]
                    for j in l:
                        lines.add(j)
            # if no nearest line seg, continue
            if len(lines) == 0:
                continue
            lines = list(lines)
            
            snap_dist = sys.maxint
            snap_l = None
            for l in lines:
                dist = distToSegment(l, p)
                if dist < 1:
                    snap_l = l
                    break
                elif dist < snap_dist:
                    snap_l = l 
                    snap_dist = dist
            seg_dict[snap_l][-1] += 1
       
    def CreateWeights(self): 
        seg_lines = self.segment_lines
        SEG_LENGTH = self.SEG_LENGTH
        search_dict = self.search_dict
        line_points = self.line_points
        kd = self.kd_line_points
        
        neighbors = {}
        seg_lines_dict = {}
        
        for lid,l in enumerate(seg_lines):
            seg_lines_dict[l] = lid
            neighbors[lid] = []
        
        radius = SEG_LENGTH * 1.5
        for lid,l in enumerate(seg_lines):
            # find direct neighbors: share vertices
            direct_neighbors = set()
            for p in l:
                for cl in search_dict[p]:
                    if cl != l:
                        direct_neighbors.add(cl)
            # simplify line
            n_p = len(l)
            if n_p > 2:
                x = l[0][0]
                y = l[0][1]
                dx = l[1][0] - x
                dy = l[1][1] - y 
                ratio = dx / dy
                new_l=[l[0]]
                for i in range(2,n_p):
                    ddx = l[i][0] - x
                    ddy = l[i][1] - y
                    dratio = ddx / ddy
                    if abs(ratio - dratio) > 0.01:
                        new_l.append(l[i-1])
                        x = l[i-1][0]
                        y = l[i-1][1]
                        ratio = (l[i][0] - x) / (l[i][1] - y) 
                new_l.append(l[-1])
            else:
                new_l = l
            # find intersect neighbors
            center_p = getCenter(new_l)
            idx = kd.query_ball_point(center_p, radius)
            cand_lines = set()
            for i in idx:
                line_point = tuple(line_points[i])
                if line_point != p:
                    cand_lines = cand_lines.union(search_dict[line_point])
            cand_lines = cand_lines.difference(direct_neighbors)
            
            # remove previously found
            if lid in neighbors:
                for nn in neighbors[lid]:
                    pl = seg_lines[nn]
                    if pl in cand_lines:
                        cand_lines.remove(pl)
            
            # detect intersection
            for cl in cand_lines:
                if lineIntersect(new_l, cl):
                    direct_neighbors.add(cl)
                    
            if len(direct_neighbors) > 0:
                nn = [seg_lines_dict[n] for n in direct_neighbors]
                neighbors[lid] += nn
                for k in nn:
                    neighbors[k].append(lid)
    
        for i in neighbors.keys():
            neighbors[i]  = list(set(neighbors[i]))
            
        self.neighbors = neighbors

    def ExportWeights(self, wFileName):
        import pysal
        w = pysal.W(self.neighbors)
        gal = pysal.open(wFileName,'w')
        gal.write(w)
        gal.close()
        
    def ExportCountsToShp(self, shpFileName, counts=True):
        seg_dict = self.segment_dict
        seg_lines = self.segment_lines
        
        shapewriter = shapefile.Writer()
        shapewriter.field("id", "N")
        if counts:
            shapewriter.field("cnt","N") 
        
        for i,l in enumerate(seg_lines):
            record = shapefile._Shape()
            record.shapeType = 3 # LineString
            record.points = l
            record.parts = [0]
            shapewriter._shapes.append(record)
            if counts:
                shapewriter.record(id=i, cnt=seg_dict[l][-1])
            else:
                shapewriter.record(id=i)
        shapewriter.save(shpFileName) 
        
        ori_file = self.shp_path[:-3] + 'prj'
        if os.path.exists(ori_file):
            new_file = shpFileName[:-3] + 'prj'
            if ori_file != new_file:
                shutil.copy(ori_file, new_file)
  

def GetJsonPoints(pointsJsonFile, encoding=None):
    points = []
    # get all points data
    f = open(pointsJsonFile)
    json_data = f.read()
    f.close()
    if encoding:
        points_data = json.loads(json_data, encoding=encoding)
    else:
        points_data = json.loads(json_data)
        
    for feature in points_data["features"]:
        coords = feature["geometry"]["coordinates"]
        points.append(tuple(coords))
    """
    # get morning points data ( 4:00 ~ 11:00)
    t_start = 15
    t_end = 21
    f = open("man_points.csv")
    line =  f.readline()
    line =  f.readline()
    while len(line) > 0:
        items = line.strip().split(",")
        if items[3]:
            x = float(items[0])
            y = float(items[1])
            t = int(items[3].split(":")[0])
            if t >= t_start and t <=t_end:
                points.append((x,y))
        line =  f.readline()
    f.close()
    """
    return points

"""
output_shp = "seg_road_LISA2.shp"

#roadJsonFile = 'data/nyc_road_projected.geojson'
#roadWFileName = "seg_road.gal"
#pointsJsonFile = "mva.geojson"

roadJsonFile = 'man_road.geojson'
roadWFileName = "man_road1.gal"
pointsJsonFile = "man_points.geojson"
        

network = NetworkCluster(roadJsonFile)
network.SegmentNetwork(1000)
#network.CreateWeights()
#network.ExportWeights(roadWFileName)

points = GetJsonPoints(pointsJsonFile)
network.SnapPointsToNetwork(points)
network.ExportCountsToShp(output_shp)
    
siglevel = 0.01

def get_G_clusters(y,w):
    cluster = []
    lg = pysal.esda.getisord.G_Local(y, w, star=True)
    for i,z in enumerate(lg.Zs):
        if lg.p_sim[i] > siglevel:
            cluster.append(0)
        else:
            if z >= 0:
                cluster.append(1) #hotspot
            else:
                cluster.append(2) #coldspot
    return cluster
   
def get_LISA_clusters(y,w):
    cluster = []
    lm = Moran_Local(y, w)
    for i in range(lm.n):
        if lm.p_sim[i] and lm.p_sim[i] < siglevel:
            cluster.append(lm.q[i]) 
        else:
            cluster.append(0)
    return cluster

#cluster = get_G_clusters(y,w)
#cluster = get_LISA_clusters(y,w)

def pyshp_write_lines(shp_filename, cluster):
    shapewriter = shapefile.Writer()
    shapewriter.field("id", "N")
    shapewriter.field("cnt","N") 
    shapewriter.field("cluster","N") 
   
    for i,l in enumerate(seg_lines):
        record = shapefile._Shape()
        record.shapeType = 3 # LineString
        record.points = l
        record.parts = [0]
        shapewriter._shapes.append(record)
        shapewriter.record(id=i, cnt=seg_dict[l][-1], cluster=cluster[i])
    shapewriter.save(shp_filename) 
  
#pyshp_write_lines(output_shp, cluster)
"""