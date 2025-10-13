import requests
import sys
import json

root = "https://environment.data.gov.uk/flood-monitoring"
all_tide_stations_uri = "/id/stations?type=TideGauge&unitName=mAOD"

with requests.get(root+all_tide_stations_uri) as res:
    if res.status_code == 200:
        response = res.json()
    else:
        sys.exit(-1)
        


with open("stations.csv", "w") as f:
    f.write("notation;label;lat;long;qualifier;unitName\n")
    for station in response["items"]:
        label = station["label"]
        notation = station["notation"]
        lat = station["lat"]
        long = station["long"]
        qualifier = station["measures"][0]["qualifier"]
        unitName = station["measures"][0]["unitName"]

        f.write(f"{notation};{label};{lat};{long};{qualifier};{unitName}\n")