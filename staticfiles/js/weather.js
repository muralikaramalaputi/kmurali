// =====================================
// ENHANCED WEATHER APP (FINAL)
// =====================================

// -------- GLOBAL STATE --------
let currentUnit = 'c';          // c | f (backend-driven)
let weatherData = null;
let lastCity = null;
let hourlyChart = null;
let autoRefreshTimer = null;

// -------- PAGE LOAD --------
window.addEventListener('DOMContentLoaded', () => {
    document.getElementById('city').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') getWeather();
    });
});

// =====================================
// MAIN WEATHER FETCH
// =====================================
function getWeather() {
    const cityInput = document.getElementById("city");
    const city = cityInput.value.trim();
    const errorDiv = document.getElementById("error");
    const resultDiv = document.getElementById("result");
    const searchBtn = document.querySelector(".search-btn");

    errorDiv.classList.add("d-none");
    resultDiv.classList.add("d-none");

    if (!city) {
        showError("⚠️ Please enter a city name");
        cityInput.focus();
        return;
    }

    lastCity = city;

    const originalText = searchBtn.innerHTML;
    searchBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Loading...';
    searchBtn.disabled = true;

    fetch(`/api/weather/?city=${encodeURIComponent(city)}&unit=${currentUnit}`)
        .then(res => res.json())
        .then(data => {
            searchBtn.innerHTML = originalText;
            searchBtn.disabled = false;

            if (data.error) {
                showError(data.error);
                return;
            }

            weatherData = data;
            displayWeather(data);
            getForecast(city);
            startAutoRefresh();
            cityInput.value = '';
        })
        .catch(err => {
            searchBtn.innerHTML = originalText;
            searchBtn.disabled = false;
            showError("🌐 Network error");
            console.error(err);
        });
}

// =====================================
// DISPLAY CURRENT WEATHER
// =====================================
function displayWeather(data) {
    document.getElementById("result").classList.remove("d-none");

    document.getElementById("cityName").innerHTML =
        `<i class="fas fa-map-marker-alt"></i> ${data.city}`;

    document.getElementById("time").innerHTML =
        `<i class="far fa-clock"></i> ${data.time}`;

    document.getElementById("icon").src = data.icon;
    document.getElementById("condition").innerText = data.condition;

    document.getElementById("temp").innerText = data.temp;
    document.getElementById("tempUnit").innerText = currentUnit === 'f' ? 'F' : 'C';

    document.getElementById("humidity").innerText = data.humidity;
    document.getElementById("wind").innerText = data.wind;

    document.getElementById("feelsLike").innerText = data.feels_like;
    document.getElementById("pressure").innerText = data.pressure;
    document.getElementById("clouds").innerText = data.clouds;
    document.getElementById("uv").innerText = data.uv;

    // Provider / station / confidence
    const sourceInfo = document.getElementById("sourceInfo");
    if (sourceInfo) {
        sourceInfo.innerText =
            `Source: ${data.provider} | Station: ${data.station} | Confidence: ${data.confidence}%`;
    }
}

// =====================================
// ERROR HANDLING
// =====================================
function showError(message) {
    const errorDiv = document.getElementById("error");
    errorDiv.innerHTML = `<i class="fas fa-exclamation-circle"></i> ${message}`;
    errorDiv.classList.remove("d-none");

    setTimeout(() => {
        errorDiv.classList.add("d-none");
    }, 5000);
}

// =====================================
// UNIT TOGGLE (BACKEND AWARE)
// =====================================
function toggleUnit(unit) {
    currentUnit = unit === 'fahrenheit' ? 'f' : 'c';

    document.querySelectorAll('.unit-btn').forEach(btn =>
        btn.classList.remove('active')
    );
    event.target.classList.add('active');

    if (lastCity) {
        fetch(`/api/weather/?city=${encodeURIComponent(lastCity)}&unit=${currentUnit}`)
            .then(res => res.json())
            .then(data => {
                weatherData = data;
                displayWeather(data);
                getForecast(lastCity);
            });
    }
}

// =====================================
// FORECAST + HOURLY CHART
// =====================================
function getForecast(city) {
    fetch(`/api/forecast/?city=${encodeURIComponent(city)}&unit=${currentUnit}`)
        .then(res => res.json())
        .then(data => {
            if (data.error) return;

            renderForecast(data.forecast);
            renderHourlyChart(data.hourly);
        })
        .catch(err => console.error("Forecast error:", err));
}

// -------- DAILY FORECAST --------
function renderForecast(days) {
    const container = document.getElementById("forecastContainer");
    const section = document.getElementById("forecastSection");

    container.innerHTML = "";

    days.forEach(day => {
        container.innerHTML += `
            <div class="forecast-card">
                <div class="forecast-date">${day.date}</div>
                <img src="${day.icon}" alt="">
                <div class="forecast-temp">
                    ${day.max_temp}°${day.temp_unit} / ${day.min_temp}°${day.temp_unit}
                </div>
                <div class="forecast-humidity">💧 ${day.avg_humidity}%</div>
            </div>
        `;
    });

    section.classList.remove("d-none");
}

// -------- HOURLY CHART --------
function renderHourlyChart(hourly) {
    const ctx = document.getElementById("hourlyChart");
    if (!ctx) return;

    const labels = hourly.map(h => h.time);
    const temps = hourly.map(h => h.temp);

    if (hourlyChart) hourlyChart.destroy();

    hourlyChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels,
            datasets: [{
                label: `Hourly Temperature (°${currentUnit === 'f' ? 'F' : 'C'})`,
                data: temps,
                tension: 0.4,
                fill: true
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: { display: true }
            }
        }
    });
}

// =====================================
// AUTO REFRESH (EVERY 5 MIN)
// =====================================
function startAutoRefresh() {
    if (autoRefreshTimer) clearInterval(autoRefreshTimer);

    autoRefreshTimer = setInterval(() => {
        if (lastCity) {
            fetch(`/api/weather/?city=${encodeURIComponent(lastCity)}&unit=${currentUnit}`)
                .then(res => res.json())
                .then(data => {
                    weatherData = data;
                    displayWeather(data);
                });
        }
    }, 300000); // 5 minutes
}

// =====================================
// DARK MODE
// =====================================
function toggleDarkMode() {
    document.body.classList.toggle("dark");
}

// =====================================
// KEYBOARD SHORTCUT
// =====================================
document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        document.getElementById('city').focus();
    }
});
