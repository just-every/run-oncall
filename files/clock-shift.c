// One-off local probe only: shift wall time for the host, Worker and SQLite.
// Elapsed/monotonic clocks and sleeps are untouched. Not part of the product.
#define _GNU_SOURCE
#include <dlfcn.h>
#include <stdlib.h>
#include <time.h>
#include <sys/time.h>
static long shift(void) {
  const char *value = getenv("ONCALL_PROBE_CLOCK_SHIFT_SECONDS");
  return value ? strtol(value, NULL, 10) : 0;
}
int clock_gettime(clockid_t id, struct timespec *value) {
  static int (*original)(clockid_t, struct timespec *);
  if (!original) original = dlsym(RTLD_NEXT, "clock_gettime");
  int result = original(id, value);
  if (!result && (id == CLOCK_REALTIME || id == CLOCK_REALTIME_COARSE)) value->tv_sec += shift();
  return result;
}
int gettimeofday(struct timeval *value, void *zone) {
  static int (*original)(struct timeval *, void *);
  if (!original) original = dlsym(RTLD_NEXT, "gettimeofday");
  int result = original(value, zone);
  if (!result) value->tv_sec += shift();
  return result;
}
time_t time(time_t *value) {
  static time_t (*original)(time_t *);
  if (!original) original = dlsym(RTLD_NEXT, "time");
  time_t result = original(NULL);
  if (result != (time_t)-1) result += shift();
  if (value) *value = result;
  return result;
}
