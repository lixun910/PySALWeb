import pysal
import numpy as np
import time

w = pysal.queen_from_shapefile(pysal.examples.get_path("sids2.shp"))
f = pysal.open(pysal.examples.get_path("sids2.dbf"))
y = np.array(f.by_col("SIDR74"))

def test_moran():
    t0 = time.time()
    mi = pysal.Moran(y,  w)
    t1 = time.time()
    print "moran: %s" % (t1-t0)


def test_moran_local():
    t0 = time.time()
    mi = pysal.Moran_Local(y,  w)
    t1 = time.time()
    print "moran local: %s" % (t1-t0)


test_moran()
test_moran_local()

