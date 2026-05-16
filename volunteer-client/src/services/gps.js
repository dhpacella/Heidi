let watchId = null;
let intervalId = null;

export function startGpsTracking(volunteerId, logGpsFn) {
  if (!navigator.geolocation) return;
  watchId = navigator.geolocation.watchPosition(
    pos => logGpsFn(volunteerId, pos.coords.latitude, pos.coords.longitude),
    null,
    { enableHighAccuracy: true, maximumAge: 10000 }
  );
  intervalId = setInterval(() => {
    navigator.geolocation.getCurrentPosition(pos => {
      logGpsFn(volunteerId, pos.coords.latitude, pos.coords.longitude);
    });
  }, 30000);
}

export function stopGpsTracking() {
  if (watchId !== null) {
    navigator.geolocation.clearWatch(watchId);
    watchId = null;
  }
  if (intervalId !== null) {
    clearInterval(intervalId);
    intervalId = null;
  }
}
