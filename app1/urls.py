from django.urls import path
from .views import weather_page, get_weather_ajax,get_forecast_ajax

urlpatterns = [
    path("", weather_page, name="weather"),
    path("api/weather/", get_weather_ajax, name="weather_ajax"),
    path("api/forecast/", get_forecast_ajax, name="forecast"),

]
