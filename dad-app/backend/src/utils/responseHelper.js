// responseHelper: Standardizes the JSON shape of every API response.
// All controllers should use these helpers instead of building raw objects.

exports.success = (data) => ({
  ok: true,
  data,
});

exports.failure = (message) => ({
  ok: false,
  error: message,
});
