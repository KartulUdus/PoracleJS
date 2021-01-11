#!/usr/bin/python3


import warnings
import sys
import argparse
import json
import re





#parse command arguments
parser = argparse.ArgumentParser(description="Generates Poracle’s V3 “src/util/forms.json” from RocketMAD’s “static/data/pokemon.json”.")
parser.add_argument("--ignore-form", action="append", type=str, help="ignore forms of the given name", metavar="name")
args = parser.parse_args()

if not args.ignore_form:
    args.ignore_form = []


#read RocketMAD Pokémon data
data = json.load(sys.stdin)


#generate Poracle v3 forms.json data
output = {}

for n in data:
    #check whether forms are specified
    if "forms" not in data[n]:
        #warnings.warn("Missing “forms” for Pokémon “{}”.".format(n))
        continue
    
    pokemon_forms = {}
    
    for i in data[n]["forms"]:
        if "formName" not in data[n]["forms"][i]:
            warnings.warn("Missing “formName” for form “{}” of Pokémon “{}”.".format(i, n))
            continue
        
        form_name = data[n]["forms"][i]["formName"]
        
        #form name translation
        if form_name == "Normal":
            warnings.warn("Form “{}” of Pokémon “{}” uses special name “Normal”.".format(i, n))
        elif form_name == "":
            form_name = "Normal"
        elif n == "201":
            if form_name == "!":
                form_name = "Exclamation"
            if form_name == "?":
                form_name = "Question"
        #replace invalid characters
        form_name = re.sub(" ", "_", form_name)
        
        #ignore form names
        if form_name in args.ignore_form:
            continue
        
        #check if form name has already been added, and if so take the one with the lower ID
        add_form = True
        for duplicate_i in pokemon_forms:
            if pokemon_forms[duplicate_i] == form_name:
                warnings.warn("Pokémon “{}” has a form “{}” with two different IDs, namely “{}” and “{}”.".format(n, form_name, duplicate_i, i))
                if int(i) < int(duplicate_i):
                    #use the newly found form with the lower ID
                    del pokemon_forms[duplicate_i]
                else:
                    add_form = False
                break
        
        #add form
        if add_form:
            pokemon_forms[i] = form_name
    
    output[n] = pokemon_forms


#print Poracle V3 forms JSON
json.dump(output, sys.stdout)








#This program is free software: you can redistribute it and/or modify it under
#the terms of the GNU General Public License as published by the Free Software
#Foundation, either version 3 of the License, or (at your option) any later
#version.
#This program is distributed in the hope that it will be useful, but WITHOUT ANY
#WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A
#PARTICULAR PURPOSE.
#See the GNU General Public License for more details.
#You should have received a copy of the GNU General Public License along with
#this program. If not, see <http://www.gnu.org/licenses/>.
