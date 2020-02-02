# Google Maps

#### Api key

The default geocoder for Poracle uses OSM; however, you can enable Google Maps api.  
Please log in to [Google Developers console](https://console.developers.google.com/) and make sure you have the following API's enabled:  
   
* Google Maps Javascript API 
* Google Maps Geocoding API
* Google Reverse Geocoding API
* Google Static Maps API  



You can test if your API key manually by adding your key to the below urls:  

###### Geocoding

```
https://maps.googleapis.com/maps/api/geocode/json?address=Tallinn+Estonia&key=YOURKEYHERE
```  

###### Reverse Geocoding

```
https://maps.googleapis.com/maps/api/geocode/json?latlng=59.432982,24.7535747&key=YOURKEYHERE
```

###### Static Maps

```
https://maps.googleapis.com/maps/api/staticmap?center=59.432982,24.7535747&markers=color:red|59.432982,24.7535747&maptype=roadmap&zoom=15&size=250x175&key=YOURKEYHERE
```  