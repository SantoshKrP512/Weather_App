/**
 * SkyGuard Pro - Core Weather Intelligence Engine
 */

const CONFIG = {
    API_KEY: '7f37666b148ef7b26142f7f143f232dc',
    BASE_URL: 'https://api.openweathermap.org/data/2.5/',
    UNITS: 'metric',
};

const state = {
    city: 'London',
    units: 'metric',
    weatherData: null,
    forecastData: null,
    aqiData: null,
};

// DOM Elements
const elements = {
    searchForm: document.getElementById('search-form'),
    cityInput: document.getElementById('city-input'),
    geoBtn: document.getElementById('geo-btn'),
    cityName: document.getElementById('city-name'),
    currentDate: document.getElementById('current-date'),
    mainTemp: document.getElementById('main-temp'),
    weatherDesc: document.getElementById('weather-desc'),
    maxTemp: document.getElementById('max-temp'),
    minTemp: document.getElementById('min-temp'),
    windSpeed: document.getElementById('wind-speed'),
    humidity: document.getElementById('humidity'),
    pressure: document.getElementById('pressure'),
    visibility: document.getElementById('visibility'),
    uvIndex: document.getElementById('uv-index'),
    aqiValue: document.getElementById('aqi-value'),
    sunrise: document.getElementById('sunrise-time'),
    sunset: document.getElementById('sunset-time'),
    mapIframe: document.getElementById('map-iframe'),
    forecastContainer: document.getElementById('forecast-container'),
    healthContainer: document.getElementById('health-advice-container'),
    bgContainer: document.getElementById('bg-container'),
    unitC: document.getElementById('unit-c'),
    unitF: document.getElementById('unit-f'),
};

// --- Initialization ---
document.addEventListener('DOMContentLoaded', () => {
    initApp();
    setupEventListeners();
});

function initApp() {
    updateDate();
    // Default load
    fetchWeatherData(state.city);
    // Try geolocation
    tryGeolocation();
}

function setupEventListeners() {
    elements.searchForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const city = elements.cityInput.value.trim();
        if (city) {
            state.city = city;
            fetchWeatherData(city);
        }
    });

    elements.geoBtn.addEventListener('click', tryGeolocation);

    elements.unitC.addEventListener('click', () => switchUnits('metric'));
    elements.unitF.addEventListener('click', () => switchUnits('imperial'));
}

// --- Core Data Fetching ---
async function fetchWeatherData(cityOrLat, lon = null) {
    try {
        let url;
        if (lon !== null) {
            url = `${CONFIG.BASE_URL}weather?lat=${cityOrLat}&lon=${lon}&units=${state.units}&appid=${CONFIG.API_KEY}`;
        } else {
            url = `${CONFIG.BASE_URL}weather?q=${cityOrLat}&units=${state.units}&appid=${CONFIG.API_KEY}`;
        }

        const response = await fetch(url);
        if (!response.ok) throw new Error('City not found');
        const data = await response.json();
        
        state.weatherData = data;
        state.city = data.name;
        
        // Parallel fetching for secondary data
        await Promise.all([
            fetchForecast(data.coord.lat, data.coord.lon),
            fetchAQI(data.coord.lat, data.coord.lon)
        ]);

        updateUI();
    } catch (error) {
        console.error('Weather Fetch Error:', error);
        alert(error.message);
    }
}

async function fetchForecast(lat, lon) {
    const url = `${CONFIG.BASE_URL}forecast?lat=${lat}&lon=${lon}&units=${state.units}&appid=${CONFIG.API_KEY}`;
    const response = await fetch(url);
    state.forecastData = await response.json();
}

async function fetchAQI(lat, lon) {
    const url = `${CONFIG.BASE_URL}air_pollution?lat=${lat}&lon=${lon}&appid=${CONFIG.API_KEY}`;
    const response = await fetch(url);
    state.aqiData = await response.json();
}

// --- UI Updates ---
function updateUI() {
    const d = state.weatherData;
    const unitSymbol = state.units === 'metric' ? '°' : '°'; // Simplified for display

    elements.cityName.textContent = d.name;
    elements.mainTemp.textContent = `${Math.round(d.main.temp)}${unitSymbol}`;
    elements.weatherDesc.textContent = d.weather[0].description;
    elements.maxTemp.textContent = `${Math.round(d.main.temp_max)}${unitSymbol}`;
    elements.minTemp.textContent = `${Math.round(d.main.temp_min)}${unitSymbol}`;
    
    elements.windSpeed.textContent = `${d.wind.speed} ${state.units === 'metric' ? 'm/s' : 'mph'}`;
    elements.humidity.textContent = `${d.main.humidity}%`;
    elements.pressure.textContent = `${d.main.pressure} hPa`;
    elements.visibility.textContent = `${(d.visibility / 1000).toFixed(1)} km`;
    
    // AQI Logic
    if (state.aqiData) {
        const aqi = state.aqiData.list[0].main.aqi;
        const aqiText = ['Good', 'Fair', 'Moderate', 'Poor', 'Very Poor'][aqi - 1];
        elements.aqiValue.textContent = aqiText;
    }

    // Sunrise/Sunset
    elements.sunrise.textContent = formatTime(d.sys.sunrise, d.timezone);
    elements.sunset.textContent = formatTime(d.sys.sunset, d.timezone);

    // Update Map
    elements.mapIframe.src = `https://www.google.com/maps?q=${d.coord.lat},${d.coord.lon}&t=&z=11&ie=UTF8&iwloc=&output=embed`;

    updateBackground(d.weather[0].main);
    renderForecast();
    generateHealthAdvice();
    updateWeatherThought();
}

function updateWeatherThought() {
    const thoughts = [
        "Life isn't about waiting for the storm to pass, it's about learning to dance in the rain.",
        "There's no such thing as bad weather, only unsuitable clothing.",
        "Sunsets are proof that endings can be beautiful too.",
        "A change in the weather is sufficient to recreate the world and ourselves.",
        "Wherever you go, no matter what the weather, always bring your own sunshine.",
        "The sky is an infinite movie to me. I never get tired of looking at what's happening there.",
        "Nature is so powerful, so strong. Capturing its essence is not easy - your work becomes a dance with light and the weather.",
        "To appreciate the beauty of a snowflake it is necessary to stand out in the cold."
    ];
    const element = document.getElementById('weather-thought');
    if (element) {
        const randomThought = thoughts[Math.floor(Math.random() * thoughts.length)];
        element.textContent = `"${randomThought}"`;
    }
}

function renderForecast() {
    if (!state.forecastData) return;
    
    const dailyData = state.forecastData.list.filter((_, i) => i % 8 === 0).slice(0, 5);
    elements.forecastContainer.innerHTML = dailyData.map(day => `
        <div class="forecast-card">
            <div class="forecast-date">${new Date(day.dt * 1000).toLocaleDateString('en-US', { weekday: 'short' })}</div>
            <img src="http://openweathermap.org/img/wn/${day.weather[0].icon}@2x.png" width="50">
            <div class="forecast-temp">${Math.round(day.main.temp)}°</div>
            <div class="text-dim" style="font-size: 0.8rem; text-transform: capitalize;">${day.weather[0].description}</div>
        </div>
    `).join('');
}

function generateHealthAdvice() {
    const w = state.weatherData;
    const aqi = state.aqiData ? state.aqiData.list[0].main.aqi : 1;
    let advice = [];

    // AQI Advice
    if (aqi >= 4) {
        advice.push({ icon: '😷', title: 'Poor Air Quality', text: 'Sensitive groups should avoid outdoor activity.', color: '#ef4444' });
    } else if (aqi <= 2) {
        advice.push({ icon: '🧘', title: 'Clean Air', text: 'Perfect time for outdoor yoga or deep breathing.', color: '#10b981' });
    }

    // Temperature Advice
    if (w.main.temp > 30) {
        advice.push({ icon: '💧', title: 'High Heat', text: 'Hydrate frequently. Wear light clothing.', color: '#f59e0b' });
    } else if (w.main.temp < 10) {
        advice.push({ icon: '🧣', title: 'Chilly Weather', text: 'Keep yourself warm with layers.', color: '#3b82f6' });
    }

    // Rain Advice
    if (w.weather[0].main === 'Rain') {
        advice.push({ icon: '☔', title: 'Rain Expected', text: 'Carry an umbrella. Roads might be slippery.', color: '#6366f1' });
    }

    // Fallback if no specific advice
    if (advice.length === 0) {
        advice.push({ icon: '✨', title: 'Enjoy your day', text: 'Weather conditions are stable and pleasant.', color: '#10b981' });
    }

    elements.healthContainer.innerHTML = advice.map(a => `
        <div class="advice-item" style="background: ${a.color}15; border-left-color: ${a.color}">
            <span class="advice-icon">${a.icon}</span>
            <div>
                <strong style="display: block;">${a.title}</strong>
                <span class="text-dim" style="font-size: 0.9rem;">${a.text}</span>
            </div>
        </div>
    `).join('');
}

// --- Helpers ---
function updateDate() {
    const options = { weekday: 'long', day: 'numeric', month: 'long' };
    elements.currentDate.textContent = new Date().toLocaleDateString('en-US', options);
}

function formatTime(unix, timezone) {
    const date = new Date((unix + timezone) * 1000);
    return date.getUTCHours().toString().padStart(2, '0') + ':' + date.getUTCMinutes().toString().padStart(2, '0');
}

function updateBackground(condition) {
    const c = condition.toLowerCase();
    let gradient = 'var(--clear-sky)';
    
    if (c.includes('cloud')) gradient = 'var(--cloudy)';
    if (c.includes('rain') || c.includes('drizzle')) gradient = 'var(--rainy)';
    if (c.includes('storm')) gradient = 'var(--stormy)';
    if (new Date().getHours() > 18 || new Date().getHours() < 6) gradient = 'var(--night)';
    
    elements.bgContainer.style.background = gradient;
}

function switchUnits(unit) {
    if (state.units === unit) return;
    state.units = unit;
    
    elements.unitC.style.background = unit === 'metric' ? 'var(--primary)' : 'transparent';
    elements.unitC.style.color = unit === 'metric' ? 'white' : 'var(--text-dim)';
    elements.unitF.style.background = unit === 'imperial' ? 'var(--primary)' : 'transparent';
    elements.unitF.style.color = unit === 'imperial' ? 'white' : 'var(--text-dim)';
    
    fetchWeatherData(state.city);
}

function tryGeolocation() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                fetchWeatherData(position.coords.latitude, position.coords.longitude);
            },
            () => {
                fetchWeatherData(state.city); // Fallback
            }
        );
    }
}
