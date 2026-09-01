"""Unit tests for CeruleanClient."""

import datetime
from shapely.geometry import LineString
from ais_oil_attribution.data.satellite.cerulean_client import CeruleanClient, SlickDetection


def test_fetch_slick_pre_2023_returns_none():
    client = CeruleanClient()
    # 2010 Deepwater Horizon date is before Cerulean 2023 coverage start
    time_2010 = datetime.datetime(2010, 4, 24, 16, 43, 0, tzinfo=datetime.timezone.utc)
    result = client.fetch_slick_near(lat=28.7998, lon=-88.3943, time=time_2010, radius_km=25.0)
    assert result is None


def test_extract_centerline():
    client = CeruleanClient()
    # LineString in (lon, lat)
    geom = LineString([(-88.0, 28.0), (-88.05, 28.05), (-88.1, 28.1)])
    centerline = client._extract_centerline(geom)

    assert centerline.shape == (3, 2)
    # Check conversion to (lat, lon)
    assert (centerline[0] == [28.0, -88.0]).all()
    assert (centerline[2] == [28.1, -88.1]).all()