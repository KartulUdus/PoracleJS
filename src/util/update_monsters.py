"""
This script will update Poracles monsters.json file.

Before running, make sure you have pogodata >= 0.5.3 installed.
You'll need Poracle's util.json in the same directory.
The script will then create a monsters_new.json file you can rename.

Possible TODOs:
- Don't convert emojis to unicode when formatting JSON
- Better formname support

Credits to ccev/Malte for creating it and philcerf for checking
if the output is correct.

"""
from pogodata import PogoData
import json

with open("util.json", "r") as f:
    util = json.load(f)

types = util["types"]

data = PogoData()
final = {}
for mon in data.mons:
    if mon.type.name == "TEMP_EVOLUTION":
        continue
    formname = mon.template.replace(mon.base_template, "").replace("_FEMALE", "").replace("_MALE", "").strip("_")
    formname = formname.lower().capitalize()

    types_mon = []
    for t in mon.types:
        poracle_type = types[t.name]
        types_mon.append({
            "id": t.id,
            "name": t.name,
            "emoji": poracle_type["emoji"],
            "color": poracle_type["color"]
        })
    final[f"{mon.id}_{mon.form}"] = {
        "name": mon.name,
        "form": {
            "id": mon.form,
            "name": formname
        },
        "id": mon.id,
        "stats": mon.raw.get("stats", {}),
        "types": types_mon
    }

with open("monsters_new.json", "w+") as f:
    f.write(json.dumps(final, indent=4))
