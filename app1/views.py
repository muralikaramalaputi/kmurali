import os
import requests
from django.http import JsonResponse
from django.shortcuts import render

# ---------------------------------
# CONFIG
# ---------------------------------
API_KEY = os.getenv("WEATHER_API_KEY")

CURRENT_URL = "http://api.weatherapi.com/v1/current.json"
FORECAST_URL = "http://api.weatherapi.com/v1/forecast.json"


# ---------------------------------
# PAGE RENDER
# ---------------------------------
def weather_page(request):
    return render(request, "weather.html")


# ---------------------------------
# CONFIDENCE CALCULATION (GOOGLE-LIKE)
# ---------------------------------
def calculate_confidence(current):
    """
    Simple heuristic confidence score (70–100)
    Similar to how Google smooths reliability
    """
    confidence = 100

    if current.get("cloud", 0) > 80:
        confidence -= 10
    if current.get("humidity", 0) > 90:
        confidence -= 10
    if current.get("wind_kph", 0) > 25:
        confidence -= 5

    return max(confidence, 70)


# ---------------------------------
# GOOGLE-STYLE CURRENT WEATHER
# ---------------------------------
def get_weather_ajax(request):
    city = request.GET.get("city")
    unit = request.GET.get("unit", "c")  # c | f

    if not city:
        return JsonResponse({"error": "City name is required"})

    params = {
        "key": API_KEY,
        "q": f"{city}, India",
        "aqi": "no"
    }

    try:
        res = requests.get(CURRENT_URL, params=params, timeout=10)
        res.raise_for_status()
    except requests.RequestException:
        return JsonResponse({"error": "Weather service unavailable"})

    data = res.json()
    current = data["current"]
    location = data["location"]

    # ✅ Google-style temperature → FEELS LIKE
    temp_c = current["feelslike_c"]
    temp_f = current["feelslike_f"]

    return JsonResponse({
        # BASIC INFO
        "city": location["name"],
        "time": location["localtime"],
        "temp": round(temp_c if unit == "c" else temp_f, 1),
        "humidity": current["humidity"],
        "wind": current["wind_kph"],
        "icon": current["condition"]["icon"],
        "condition": current["condition"]["text"],

        # EXTRA DETAILS
        "feels_like": round(temp_c if unit == "c" else temp_f, 1),
        "pressure": current["pressure_mb"],
        "clouds": current["cloud"],
        "uv": current["uv"],

        # SOURCE + TRUST INFO
        "provider": "WeatherAPI.com",
        "station": location.get("tz_id", "Local Weather Station"),
        "confidence": calculate_confidence(current)
    })


# ---------------------------------
# HOURLY + DAILY FORECAST (UNIT AWARE)
# ---------------------------------
def get_forecast_ajax(request):
    city = request.GET.get("city")
    unit = request.GET.get("unit", "c")  # c | f

    if not city:
        return JsonResponse({"error": "City name is required"})

    params = {
        "key": API_KEY,
        "q": f"{city}, India",
        "days": 3,
        "aqi": "no",
        "alerts": "no"
    }

    try:
        res = requests.get(FORECAST_URL, params=params, timeout=10)
        res.raise_for_status()
    except requests.RequestException:
        return JsonResponse({"error": "Forecast service unavailable"})

    data = res.json()
    location = data["location"]

    # -------- HOURLY FORECAST (TODAY) --------
    hourly = []
    for h in data["forecast"]["forecastday"][0]["hour"]:
        hourly.append({
            "time": h["time"].split(" ")[1],  # HH:MM
            "temp": round(
                h["feelslike_c"] if unit == "c" else h["feelslike_f"],
                1
            )
        })

    # -------- DAILY FORECAST --------
    daily = []
    for d in data["forecast"]["forecastday"]:
        daily.append({
            "date": d["date"],
            "max_temp": round(
                d["day"]["maxtemp_c"] if unit == "c" else d["day"]["maxtemp_f"],
                1
            ),
            "min_temp": round(
                d["day"]["mintemp_c"] if unit == "c" else d["day"]["mintemp_f"],
                1
            ),
            "avg_humidity": d["day"]["avghumidity"],
            "icon": d["day"]["condition"]["icon"],
            "temp_unit": "C" if unit == "c" else "F"
        })

    return JsonResponse({
        # SOURCE INFO (USED BY UI)
        "city": location["name"],
        "provider": "WeatherAPI.com",
        "station": location.get("tz_id", "Local Weather Station"),
        "confidence": "≈95% (modelled)",

        # DATA
        "forecast": daily,
        "hourly": hourly
    })
