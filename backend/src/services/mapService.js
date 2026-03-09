const axios = require("axios");
const config = require("../config");
const logger = require("../utils/logger");
const { calculateDistance } = require("../utils/helpers");
const { ExternalServiceError } = require("../utils/errors");

class MapService {
  constructor() {
    this.apiKey = config.mapTiler.apiKey;
    this.baseUrl = config.mapTiler.baseUrl;

    this.client = axios.create({
      baseURL: this.baseUrl,
      timeout: 10000,
    });
  }

  /**
   * Geocode an address to coordinates
   */
  async geocode(address) {
    try {
      const response = await this.client.get(
        "/geocoding/" + encodeURIComponent(address) + ".json",
        {
          params: {
            key: this.apiKey,
            limit: 1,
          },
        },
      );

      if (response.data.features && response.data.features.length > 0) {
        const feature = response.data.features[0];
        return {
          lat: feature.geometry.coordinates[1],
          lng: feature.geometry.coordinates[0],
          formatted_address: feature.place_name,
          city: this.extractCity(feature),
          state: this.extractState(feature),
          country: this.extractCountry(feature),
        };
      }

      return null;
    } catch (error) {
      logger.error("MapTiler geocode error:", error);
      throw new ExternalServiceError("MapTiler", "Geocoding failed");
    }
  }

  /**
   * Reverse geocode coordinates to address
   */
  async reverseGeocode(lat, lng) {
    try {
      const response = await this.client.get(`/geocoding/${lng},${lat}.json`, {
        params: {
          key: this.apiKey,
          limit: 1,
        },
      });

      if (response.data.features && response.data.features.length > 0) {
        const feature = response.data.features[0];
        return {
          formatted_address: feature.place_name,
          city: this.extractCity(feature),
          state: this.extractState(feature),
          country: this.extractCountry(feature),
          pincode: this.extractPincode(feature),
        };
      }

      return null;
    } catch (error) {
      logger.error("MapTiler reverse geocode error:", error);
      throw new ExternalServiceError("MapTiler", "Reverse geocoding failed");
    }
  }

  /**
   * Calculate distance between two points
   */
  getDistance(lat1, lng1, lat2, lng2) {
    return calculateDistance(lat1, lng1, lat2, lng2);
  }

  /**
   * Get route between two points
   */
  async getRoute(origin, destination, mode = "driving") {
    try {
      // MapTiler uses different profile names
      const profile = mode === "walking" ? "foot" : "driving";

      const response = await this.client.get(
        `/routing/${profile}/${origin.lng},${origin.lat};${destination.lng},${destination.lat}`,
        {
          params: {
            key: this.apiKey,
            overview: "full",
            geometries: "geojson",
          },
        },
      );

      if (response.data.routes && response.data.routes.length > 0) {
        const route = response.data.routes[0];
        return {
          distance: route.distance, // meters
          duration: route.duration, // seconds
          distanceKm: (route.distance / 1000).toFixed(2),
          durationMinutes: Math.ceil(route.duration / 60),
          geometry: route.geometry,
        };
      }

      return null;
    } catch (error) {
      logger.error("MapTiler routing error:", error);
      // Return straight-line distance as fallback
      return {
        distance:
          this.getDistance(
            origin.lat,
            origin.lng,
            destination.lat,
            destination.lng,
          ) * 1000,
        duration: null,
        distanceKm: this.getDistance(
          origin.lat,
          origin.lng,
          destination.lat,
          destination.lng,
        ),
        durationMinutes: null,
        geometry: null,
      };
    }
  }

  /**
   * Search for places nearby
   */
  async searchNearby(lat, lng, query, radius = 5000) {
    try {
      const response = await this.client.get(
        "/geocoding/" + encodeURIComponent(query) + ".json",
        {
          params: {
            key: this.apiKey,
            proximity: `${lng},${lat}`,
            limit: 10,
          },
        },
      );

      if (response.data.features) {
        return response.data.features
          .map((feature) => ({
            name: feature.text,
            address: feature.place_name,
            lat: feature.geometry.coordinates[1],
            lng: feature.geometry.coordinates[0],
            distance: this.getDistance(
              lat,
              lng,
              feature.geometry.coordinates[1],
              feature.geometry.coordinates[0],
            ),
          }))
          .filter((place) => place.distance <= radius / 1000)
          .sort((a, b) => a.distance - b.distance);
      }

      return [];
    } catch (error) {
      logger.error("MapTiler search error:", error);
      return [];
    }
  }

  /**
   * Get static map image URL
   */
  getStaticMapUrl(lat, lng, options = {}) {
    const { zoom = 14, width = 600, height = 400, markers = true } = options;

    let url = `${this.baseUrl}/static/${lng},${lat},${zoom}/${width}x${height}.png?key=${this.apiKey}`;

    if (markers) {
      url += `&markers=${lng},${lat}`;
    }

    return url;
  }

  /**
   * Get jobs within radius
   */
  filterJobsByDistance(jobs, workerLat, workerLng, maxDistanceKm = 10) {
    return jobs
      .map((job) => {
        const distance = this.getDistance(
          workerLat,
          workerLng,
          parseFloat(job.location_lat),
          parseFloat(job.location_lng),
        );
        return {
          ...job,
          distance,
        };
      })
      .filter((job) => job.distance <= maxDistanceKm)
      .sort((a, b) => a.distance - b.distance);
  }

  /**
   * Calculate bounding box for radius search
   */
  getBoundingBox(lat, lng, radiusKm) {
    // Earth's radius in km
    const R = 6371;

    // Convert radius to radians
    const radDist = radiusKm / R;

    // Convert lat/lng to radians
    const radLat = (lat * Math.PI) / 180;
    const radLng = (lng * Math.PI) / 180;

    // Calculate min/max lat
    const minLat = radLat - radDist;
    const maxLat = radLat + radDist;

    // Calculate min/max lng
    const deltaLng = Math.asin(Math.sin(radDist) / Math.cos(radLat));
    const minLng = radLng - deltaLng;
    const maxLng = radLng + deltaLng;

    return {
      minLat: (minLat * 180) / Math.PI,
      maxLat: (maxLat * 180) / Math.PI,
      minLng: (minLng * 180) / Math.PI,
      maxLng: (maxLng * 180) / Math.PI,
    };
  }

  /**
   * Extract city from geocoding feature
   */
  extractCity(feature) {
    if (feature.context) {
      const place = feature.context.find(
        (c) => c.id.startsWith("place") || c.id.startsWith("locality"),
      );
      return place?.text || null;
    }
    return null;
  }

  /**
   * Extract state from geocoding feature
   */
  extractState(feature) {
    if (feature.context) {
      const region = feature.context.find((c) => c.id.startsWith("region"));
      return region?.text || null;
    }
    return null;
  }

  /**
   * Extract country from geocoding feature
   */
  extractCountry(feature) {
    if (feature.context) {
      const country = feature.context.find((c) => c.id.startsWith("country"));
      return country?.text || null;
    }
    return null;
  }

  /**
   * Extract pincode from geocoding feature
   */
  extractPincode(feature) {
    if (feature.context) {
      const postcode = feature.context.find((c) => c.id.startsWith("postcode"));
      return postcode?.text || null;
    }
    return null;
  }

  /**
   * Validate coordinates
   */
  isValidCoordinates(lat, lng) {
    return (
      typeof lat === "number" &&
      typeof lng === "number" &&
      lat >= -90 &&
      lat <= 90 &&
      lng >= -180 &&
      lng <= 180
    );
  }
}

module.exports = new MapService();
